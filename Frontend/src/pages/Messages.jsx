import React from "react";
import {
  Container,
  Grid,
  Box,
  Heading,
  Text,
  Avatar,
  IconButton,
  VStack,
  HStack,
  Badge,
  Flex,
  Input,
  Button,
  Spinner,
} from "@chakra-ui/react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { api } from "@/lib/api";

export default function Messages() {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  const [conversations, setConversations] = React.useState([]);
  const [loadingConvos, setLoadingConvos] = React.useState(false);
  const [selectedConv, setSelectedConv] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [text, setText] = React.useState("");

  function formatDateTime(ts) {
    const d = new Date(ts || Date.now());
    const date = d.toLocaleDateString();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${date} ${hours}:${minutes} ${ampm}`;
  }

  // Helper to generate fake messages for dev/testing
  function generateDevMessages(conversationId, count = 50) {
    const now = Date.now();
    const msgs = [];
    for (let i = 0; i < count; i++) {
      const isMine = i % 3 === 0; // some outgoing, some incoming
      msgs.push({
        _id: `${conversationId}-msg-${i}`,
        body: `${isMine ? "You" : "Alice"}: Sample message #${i + 1} for ${conversationId}`,
        createdAt: new Date(now - (count - i) * 60000).toISOString(),
        from: isMine ? (user?.id || 'me') : 'alice-id',
        sender: isMine ? { id: user?.id || 'me', name: user?.fullName || user?.firstName || 'You', image: '' } : { id: 'alice-id', name: 'Alice', image: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?cs=srgb&dl=pexels-olly-733872.jpg&fm=jpg' },
      });
    }
    return msgs;
  }

  React.useEffect(() => {
    loadConversations();
  }, []);

  const convListRef = React.useRef(null);
  const messagesListRef = React.useRef(null);
  const [hoveredMessageId, setHoveredMessageId] = React.useState(null);
  const [reportingMessageId, setReportingMessageId] = React.useState(null);

  // Auto-scroll messages to bottom when messages change or when switching conversations
  React.useEffect(() => {
    try {
      const el = messagesListRef.current;
      if (el) {
        // small timeout to allow DOM to render
        setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
      }
    } catch (e) { /* ignore */ }
  }, [messages, selectedConv]);

  // Report a message (quick flow: prompt for category and reason)
  async function reportMessage(m, targetChoice = 'user') {
    if (!isSignedIn) { openSignIn(); return; }
    try {
      const conv = conversations.find(c => (c._id||c.id) === selectedConv) || {};
      const fromId = m.from || m.fromId || (m.sender && m.sender.id);
      const sender = m.sender || { id: fromId, name: '' };

      const CATEGORY_ENUM = [
        "Harassment",
        "Spam",
        "Misinformation",
        "Hate",
        "Scam/Fraud",
        "Sexual Content",
        "Violence",
        "Other",
      ];

      const catPrompt = `Report category (choose one): ${CATEGORY_ENUM.join(', ')}`;
      const chosen = window.prompt(catPrompt, "Harassment");
      if (!chosen || !CATEGORY_ENUM.includes(chosen)) {
        alert('Invalid or cancelled category. Report aborted.');
        return;
      }

      const reason = window.prompt('Please describe why you are reporting this message (min 10 chars):', (m.body||m.text||m.message||'').slice(0,200));
      if (!reason || reason.trim().length < 10) {
        alert('Report reason must be at least 10 characters.');
        return;
      }

      // Determine target based on user's choice
      let targetId, targetName;
      if (targetChoice === 'group' && conv.isGroup) {
        targetId = conv._id;
        targetName = conv.title || conv.name || 'Group';
      } else {
        targetId = sender.id || fromId;
        targetName = sender.name || 'User';
      }

      const payload = {
        reportType: 'Message',
        targetId,
        targetName,
        reportCategory: chosen,
        reason: reason.trim(),
        messageId: m._id || m.id,
        messageBody: m.body || m.text || m.message || '',
        conversationId: selectedConv,
        messageSenderId: sender.id || fromId,
        messageSenderName: sender.name || '',
        messageCreatedAt: m.createdAt || m.created_at || new Date().toISOString(),
      };

      await api('/api/reports', { method: 'POST', body: payload, auth: 'required' });
      alert('Report submitted — thank you.');
    } catch (err) {
      console.error('Report failed', err);
      alert('Failed to submit report: ' + (err.message || err));
    } finally {
      setReportingMessageId(null);
      setHoveredMessageId(null);
    }
  }

  async function loadConversations() {
    setLoadingConvos(true);
    try {
      // load user's groups instead of existing conversations
      const res = await api('/api/groups/me/mine', { auth: 'required' });
      const items = res.items || [];
      // normalize groups as conversation-like items
      const groups = items.map(g => ({
        _id: g._id,
        title: g.name,
        name: g.name,
        members: g.members || [],
        updatedAt: g.updatedAt,
        lastMessage: g.lastMessage || null,
        isGroup: true,
      }));
      // In development, append dummy conversations for testing so dev groups are always visible
      if (process.env.NODE_ENV !== 'production') {
        const devGroups = [];
        for (let i = 1; i <= 5; i++) {
          devGroups.push({
            _id: `dev-group-${i}`,
            title: `Test Group ${i}`,
            name: `Test Group ${i}`,
            members: [],
            updatedAt: new Date(Date.now() - i * 60000).toISOString(),
            lastMessage: { body: `Welcome to Test Group ${i}` },
            isGroup: true,
          });
        }
        setConversations([...(groups || []), ...devGroups]);
        return;
      }

      setConversations(groups || []);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoadingConvos(false);
    }
  }

  async function loadMessages(conversationId) {
    setLoadingMessages(true);
    try {
      const res = await api(`/api/messages/conversations/${conversationId}/messages?limit=100`, { auth: 'required' });
      setMessages((res.messages || []).slice().reverse());
      setSelectedConv(conversationId);
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleSend() {
    if (!selectedConv) return;
    if (!isSignedIn) { openSignIn(); return; }
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await api(`/api/messages/conversations/${selectedConv}/messages`, { method: 'POST', body: { body: text }, auth: 'required' });
      const msg = res.message;
      if (msg) setMessages((m) => [...m, msg]);
      setText('');
    } catch (err) {
      console.error('Send failed', err);
    } finally {
      setSending(false);
    }
  }

  return (
    <Container maxW="1100px" pt={{ base: 24, md: 28 }} pb={16}>
      <Heading mb={6} size="lg">Messages</Heading>

      <Grid templateColumns={{ base: "1fr", md: "320px 1fr" }} gap={6}>
        {/* Conversations list (left column) */}
        <Box borderWidth="1px" borderColor="gray.100" rounded="xl" overflow="hidden" bg="white">
          <Box p={4} borderBottom="1px solid" borderColor="gray.100">
            <div style={{display: 'flex', alignItems: 'center'}}>
              <Heading size="sm">Conversations</Heading>
              <div style={{flex: 1}} />
            </div>
          </Box>

          {loadingConvos ? (
            <Box p={6} textAlign="center"><Spinner /></Box>
          ) : (
            <div ref={convListRef} style={{maxHeight:520, overflowY:'auto'}}>
              {conversations.map((c) => (
                  <div key={c._id || c.id} onClick={async () => {
                    // dev-mode: handle fake dev-group ids locally
                    if (String(c._id || '').startsWith('dev-group-')) {
                      const convoId = c._id;
                      setSelectedConv(convoId);
                      // generate many messages so we can test message-list scrolling
                      setMessages(generateDevMessages(convoId, 80));
                      return;
                    }

                    // if this is a group, create/get conversation for the group first
                    if (c.isGroup) {
                      try {
                        const cc = await api('/api/messages/conversations', { method: 'POST', body: { groupId: c._id }, auth: 'required' });
                        const convo = cc.conversation;
                        if (convo && convo._id) {
                          // store convo id on the group item for later
                          c._conversationId = convo._id;
                          await loadMessages(convo._id);
                        }
                      } catch (err) {
                        console.error('Failed to create/get conversation for group', err);
                      }
                    } else {
                      await loadMessages(c._id || c.id);
                    }
                  }} style={{cursor:'pointer', display:'flex', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
                  <div style={{width:32, height:32, borderRadius:16, background:'#EEE', display:'flex', alignItems:'center', justifyContent:'center', marginRight:12}}>
                    {((c.title || c.name || '')).split(' ').map(n => n[0]).slice(0,2).join('')}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex', alignItems:'center'}}>
                      <div style={{fontWeight:600}}>{c.title || c.name || 'Conversation'}</div>
                      <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:8}}>
                        {c.unread && c.unread > 0 && (
                          <div style={{background:'#FCE7F3', color:'#C026D3', padding:'4px 8px', borderRadius:999}}>{/* if unread is object, try fallback */}{typeof c.unread === 'number' ? c.unread : (c.unread?.total || 1)}</div>
                        )}
                        <div style={{fontSize:12, color:'#6B7280'}}>{new Date(c.updatedAt || Date.now()).toLocaleString()}</div>
                      </div>
                    </div>
                    <div style={{fontSize:14, color:'#4B5563', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220}}>{(c.lastMessage?.body || c.last || '').slice(0,120)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Box>

        {/* Right column: messages panel */}
        <Box borderWidth="1px" borderColor="gray.100" rounded="xl" overflow="hidden" bg="white" minH="420px" display="flex" flexDirection="column">
          <Box p={4} borderBottom="1px solid" borderColor="gray.100">
            <Heading size="sm">{selectedConv ? (conversations.find(c => (c._id||c.id) === selectedConv)?.title || 'Conversation') : 'No conversation selected'}</Heading>
          </Box>

          <Box p={4} flexGrow={1} overflowY="auto" ref={messagesListRef} style={{maxHeight:520}}>
            {loadingMessages ? (
              <div style={{textAlign:'center'}}><div>Loading...</div></div>
            ) : selectedConv ? (
              <div style={{display:'flex', flexDirection:'column', gap:12}}>
                {messages.map((m) => {
                  const fromId = m.from || m.fromId || (m.sender && m.sender.id);
                  const isMine = !!user && fromId === (user.id || user?.id);
                  const sender = m.sender || { id: fromId, name: '', image: '' };
                  const timeText = formatDateTime(m.createdAt || m.created_at || Date.now());
                  if (!isMine) {
                    return (
                      <div key={m._id || m.id} onMouseEnter={() => setHoveredMessageId(m._id || m.id)} onMouseLeave={() => setHoveredMessageId(null)} style={{display:'flex', alignItems:'flex-start', gap:12,position:'relative'}}>
                        <img alt={sender.name || 'User'} src={sender.image || ''} style={{width:32,height:32,borderRadius:16,objectFit:'cover',background:'#EEE'}} />
                        <div>
                          <div style={{fontSize:14,fontWeight:600}}>{sender.name || 'User'}</div>
                          <div style={{background:'#EC4899',color:'#fff',padding:'12px 16px',borderRadius:14,minWidth:180,maxWidth:'70%',lineHeight:1.4,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
                            <div style={{fontSize:15,marginBottom:6}}>{m.body || m.text || m.message || '(empty)'}</div>
                              <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <div style={{fontSize:11,color:'#FFF',opacity:0.85,whiteSpace:'nowrap'}}>{timeText}</div>
                                {hoveredMessageId === (m._id || m.id) && reportingMessageId !== (m._id || m.id) && (
                                  <button onClick={() => setReportingMessageId(m._id || m.id)} style={{background:'transparent',border:'none',color:'#FCE7F3',cursor:'pointer',fontSize:12,textDecoration:'underline'}}>Report</button>
                                )}
                              </div>
                          </div>
                        </div>
                        {reportingMessageId === (m._id || m.id) && (
                          <div style={{display:'flex',gap:6,position:'absolute',right:0,top:40,zIndex:1000,background:'#fff',border:'1px solid #E5E7EB',borderRadius:8,padding:'6px 4px',boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                            <button onClick={() => reportMessage(m, 'user')} style={{background:'#F3F4F6',border:'1px solid #D1D5DB',padding:'6px 10px',borderRadius:5,cursor:'pointer',color:'#000',fontSize:11,whiteSpace:'nowrap',transition:'all 0.2s',fontWeight:500}}>Report User</button>
                            {conversations.find(c => (c._id||c.id) === selectedConv)?.isGroup && (
                              <button onClick={() => reportMessage(m, 'group')} style={{background:'#F3F4F6',border:'1px solid #D1D5DB',padding:'6px 10px',borderRadius:5,cursor:'pointer',color:'#000',fontSize:11,whiteSpace:'nowrap',transition:'all 0.2s',fontWeight:500}}>Report Group</button>
                            )}
                            <button onClick={() => setReportingMessageId(null)} style={{background:'transparent',border:'1px solid #D1D5DB',color:'#6B7280',cursor:'pointer',fontSize:11,padding:'6px 10px',whiteSpace:'nowrap',borderRadius:5,transition:'all 0.2s'}}>Cancel</button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={m._id || m.id} onMouseEnter={() => setHoveredMessageId(m._id || m.id)} onMouseLeave={() => setHoveredMessageId(null)} style={{display:'flex', flexDirection:'column', alignItems:'flex-end',position:'relative'}}>
                        <div style={{background:'#F3F4F6',color:'#111',padding:'12px 16px',borderRadius:14,minWidth:180,maxWidth:'70%',lineHeight:1.4,boxShadow:'0 1px 2px rgba(0,0,0,0.04)',whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
                        <div style={{fontSize:15,marginBottom:6}}>{m.body || m.text || m.message || '(empty)'}</div>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{fontSize:11,color:'#000',opacity:0.9,whiteSpace:'nowrap'}}>{timeText}</div>
                            {hoveredMessageId === (m._id || m.id) && reportingMessageId !== (m._id || m.id) && (
                              <button onClick={() => setReportingMessageId(m._id || m.id)} style={{background:'transparent',border:'none',color:'#6B7280',cursor:'pointer',fontSize:12,textDecoration:'underline'}}>Report</button>
                            )}
                          </div>
                      </div>
                      {reportingMessageId === (m._id || m.id) && (
                        <div style={{display:'flex',gap:6,position:'absolute',right:0,top:40,zIndex:1000,background:'#fff',border:'1px solid #E5E7EB',borderRadius:8,padding:'6px 4px',boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                          <button onClick={() => reportMessage(m, 'user')} style={{background:'#F3F4F6',border:'1px solid #D1D5DB',padding:'6px 10px',borderRadius:5,cursor:'pointer',color:'#000',fontSize:11,whiteSpace:'nowrap',transition:'all 0.2s',fontWeight:500}}>Report User</button>
                          {conversations.find(c => (c._id||c.id) === selectedConv)?.isGroup && (
                            <button onClick={() => reportMessage(m, 'group')} style={{background:'#F3F4F6',border:'1px solid #D1D5DB',padding:'6px 10px',borderRadius:5,cursor:'pointer',color:'#000',fontSize:11,whiteSpace:'nowrap',transition:'all 0.2s',fontWeight:500}}>Report Group</button>
                          )}
                          <button onClick={() => setReportingMessageId(null)} style={{background:'transparent',border:'1px solid #D1D5DB',color:'#6B7280',cursor:'pointer',fontSize:11,padding:'6px 10px',whiteSpace:'nowrap',borderRadius:5,transition:'all 0.2s'}}>Cancel</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%'}}><div style={{color:'#6B7280'}}>Select a conversation to view messages.</div></div>
            )}
          </Box>

          <Box p={4} borderTop="1px solid" borderColor="gray.100">
            <HStack>
              <Input placeholder="Type a message..." value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
              <Button colorScheme="pink" onClick={handleSend} isLoading={sending}>Send</Button>
            </HStack>
          </Box>
        </Box>
      </Grid>
    </Container>
  );
}
