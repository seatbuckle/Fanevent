// src/hooks/useNotifications.js
import * as React from "react";
import { api } from "@/lib/api";

export function useNotifications() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [cursor, setCursor] = React.useState(null); // ISO timestamp for ?before=
  const [hasMore, setHasMore] = React.useState(true);

  const load = React.useCallback(
    async (append = false) => {
      if (loading) return;
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("limit", "25");
        if (append && cursor) qs.set("before", cursor);

        const res = await api(`/api/notifications?${qs.toString()}`);
        const list = res?.notifications || [];

        setItems((prev) => (append ? [...prev, ...list] : list));
        setHasMore(list.length >= 25);
        setCursor(list[list.length - 1]?.createdAt || null);
      } finally {
        setLoading(false);
      }
    },
    [loading, cursor]
  );

  const loadMore = React.useCallback(() => load(true), [load]);

  const markAll = React.useCallback(async () => {
    await api(`/api/notifications/mark-all-read`, { method: "POST" });
    setItems((arr) => arr.map((n) => ({ ...n, read: true })));
  }, []);

  const markOne = React.useCallback(async (id) => {
    if (!id) return;
    await api(`/api/notifications/${id}/read`, { method: "PATCH" });
    setItems((arr) => arr.map((n) => (n._id === id ? { ...n, read: true } : n)));
  }, []);

  const deleteOne = React.useCallback(async (id) => {
    if (!id) return;
    await api(`/api/notifications/${id}`, { method: "DELETE" });
    setItems((arr) => arr.filter((n) => n._id !== id));
  }, []);

  const unreadCount = React.useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  return {
    items,
    loading,
    hasMore,
    unreadCount,
    load,
    loadMore,
    markAll,
    markOne,
    deleteOne,
  };
}
