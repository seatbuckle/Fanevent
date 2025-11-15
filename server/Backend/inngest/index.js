import { Inngest } from "inngest";
import User from "../models/User.js";
// 🔹 Clerk server SDK
import { clerk } from "../../api/clerk.js";

// creates client to send and receive events
export const inngest = new Inngest({ id: "fanevent-app" });

// inngest function to save user data to database
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    const userData = {
      _id: id,
      email: email_addresses?.[0]?.email_address ?? "",
      name: `${first_name ?? ""} ${last_name ?? ""}`.trim(),
      image: image_url ?? "",
    };

    // 1) Persist user
    await User.create(userData);

    // 2) 🔹 Ensure default role in Clerk publicMetadata
    try {
      await clerk.users.updateUserMetadata(id, {
        publicMetadata: { role: "user" }, // default role
      });
    } catch (err) {
      // Don't fail the whole function if role set hiccups—log and continue
      console.error("Failed to set default role on Clerk user:", err);
    }
  }
);

// Inngest Function to delete user from database
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  }
);

// inngest Function to update user in database
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    const userData = {
      email: email_addresses?.[0]?.email_address ?? "",
      name: `${first_name ?? ""} ${last_name ?? ""}`.trim(),
      image: image_url ?? "",
    };

    // Use upsert to avoid duplicate key errors when Clerk sends updates
    await User.findByIdAndUpdate(id, userData, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
);

// inngest function to save user data to a database
export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdation];
