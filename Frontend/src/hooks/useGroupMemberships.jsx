import { useCallback, useEffect, useMemo, useState } from 'react'

const KEY = (uid) => `fe.memberships.${uid || 'anon'}`

const read = (uid) => {
  try {
    const raw = localStorage.getItem(KEY(uid))
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

const write = (uid, ids) => {
  try {
    localStorage.setItem(KEY(uid), JSON.stringify(Array.from(new Set(ids))))
  } catch {}
}

/**
 * Persisted group memberships per user (localStorage).
 * @param {string|null|undefined} userId - pass your auth user id; falls back to 'anon'
 */
export default function useGroupMemberships(userId) {
  const [ids, setIds] = useState(() => read(userId))

  // reload when userId changes
  useEffect(() => {
    setIds(read(userId))
  }, [userId])

  const save = useCallback((next) => {
    setIds(next)
    write(userId, next)
  }, [userId])

  const isMember = useCallback((groupId) => ids.includes(groupId), [ids])
  const join = useCallback((groupId) => {
    if (!groupId) return
    if (!ids.includes(groupId)) save([...ids, groupId])
  }, [ids, save])

  const leave = useCallback((groupId) => {
    if (!groupId) return
    if (ids.includes(groupId)) save(ids.filter(id => id !== groupId))
  }, [ids, save])

  const toggle = useCallback((groupId) => {
    if (!groupId) return
    isMember(groupId) ? leave(groupId) : join(groupId)
  }, [isMember, join, leave])

  return useMemo(() => ({
    ids, isMember, join, leave, toggle
  }), [ids, isMember, join, leave, toggle])
}
