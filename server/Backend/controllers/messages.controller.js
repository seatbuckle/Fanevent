import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Group from "../models/Groups.js";
import { clerkClient as clerk } from "@clerk/express";

// Create or return an existing conversation
export async function getOrCreateConversation(req, res) {
  try {
    const { participants = [], title, groupId } = req.body;

    // If groupId provided, try to find or create a conversation tied to that group
    if (groupId) {
      // find existing conversation for this group
      const existing = await Conversation.findOne({ groupId });
      if (existing) return res.json({ ok: true, conversation: existing });

      // load group and its members
      const g = await Group.findById(groupId).lean();
      if (!g) return res.status(404).json({ ok: false, message: 'Group not found' });
      const members = Array.isArray(g.members) ? g.members.filter(Boolean) : [];
      if (members.length < 1) {
        return res.status(400).json({ ok: false, message: 'Group has no members' });
      }

      const convo = await Conversation.create({ participants: members, title: g.name || title || undefined, groupId });
      return res.json({ ok: true, conversation: convo });
    }

    // Otherwise, create conversation from participants array
    if (!Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ ok: false, message: "participants (array of user ids) required" });
    }

    // Try to find an existing conversation with same participants
    const query = { participants: { $size: participants.length, $all: participants } };
    const existing = await Conversation.findOne(query);
    if (existing) {
      return res.json({ ok: true, conversation: existing });
    }

    const conversation = await Conversation.create({ participants, title: title || undefined });
    return res.json({ ok: true, conversation });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: 'Failed to create conversation' });
  }
}

// List conversations for user
export async function listConversations(req, res) {
  try {
    const userId = req.auth.userId;

    // Find conversations where the current user is a participant, newest first
    const conversations = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate('lastMessage')
      .lean();

    return res.json({ ok: true, conversations });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: 'Failed to list conversations' });
  }
}

// Get messages
export async function getMessages(req, res) {
  try {
    const userId = req.auth.userId;
    const { id } = req.params; 
    const limit = Math.min(100, parseInt(req.query.limit || '50'));
    const before = req.query.before; 

    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    // Make the query for messages in this conversation. If "before" is provided, return messages older than that date.
    const query = { conversationId: id };
    if (before) {
      const beforeDate = isNaN(Date.parse(before)) ? undefined : new Date(before);
      if (beforeDate) query.createdAt = { $lt: beforeDate };
    }

    const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit).lean();
     
      const fromIds = Array.from(new Set(messages.map((m) => m.from).filter(Boolean)));
      const userMap = {};
      await Promise.all(fromIds.map(async (uid) => {
        try {
          const u = await clerk.users.getUser(uid);
          const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.username || '';
          const image = u?.profileImageUrl || u?.imageUrl || (u?.image && u.image.url) || '';
          userMap[uid] = { id: uid, name, image };
        } catch (e) {
          userMap[uid] = { id: uid, name: '', image: '' };
        }
      }));

      const enriched = messages.map((m) => ({ ...m, sender: userMap[m.from] || null }));
      return res.json({ ok: true, messages: enriched });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: 'Failed to fetch messages' });
  }
}

// Send a message to a conversation
export async function sendMessage(req, res) {
  try {
    const from = req.auth.userId;
    const { id } = req.params; 
    const { body = '', attachments = [] } = req.body;

    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.participants.includes(from)) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    const message = await Message.create({ conversationId: id, from, body, attachments });

    const otherParticipants = conversation.participants.filter(p => p !== from);
    const incUpdates = Object.fromEntries(otherParticipants.map(p => [`unread.${p}`, 1]));

    await Conversation.findByIdAndUpdate(
      id,
      { $set: { lastMessage: message._id }, $inc: incUpdates },
      { new: true }
    );
    // attach sender profile
    let sender = null;
    try {
      const u = await clerk.users.getUser(from);
      const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.username || '';
      const image = u?.profileImageUrl || u?.imageUrl || '';
      sender = { id: from, name, image };
    } catch (e) {}

    return res.json({ ok: true, message: { ...message.toObject(), sender } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: 'Failed to send message' });
  }
}

// Read Reciepts
export async function markRead(req, res) {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    if (!conversation.unread) {
      conversation.unread = {};
    }

    if (typeof conversation.unread.set === 'function') {
      conversation.unread.set(userId, 0);
    } else {

      conversation.unread[userId] = 0;
    }

    await conversation.save();

    await Message.updateMany(
      { conversationId: id, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: 'Failed to mark read' });
  }
}
