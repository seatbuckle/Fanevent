// src/store/useRoleStore.js
import { create } from "zustand";

/**
 * Super simple role store. We derive the role from Clerk on the client.
 * No backend fetch, no token needed.
 */
export const useRoleStore = create((set) => ({
  role: "user",      // 'user' | 'organizer' | 'admin'
  loading: true,     // gate initial render

  setRole: (role) => set({ role }),
  setLoading: (loading) => set({ loading }),

  /** Derive role from Clerk user object */
  syncRoleFromClerk: (user) => {
    const role = user?.publicMetadata?.role ?? "user";
    set({ role, loading: false });
  },
}));
