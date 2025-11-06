// components/AdvancedSearchSheet.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import FilterChipInput from './FilterChipInput'

// simple helpers
const norm = (s = '') => s.toString().toLowerCase()
const includes = (hay, needle) => norm(hay).includes(norm(needle))

// date window check (Today / This Week / This Month). Unknown strings pass.
const inDateWindow = (dateStr, filters) => {
  if (!filters?.length) return true
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return true
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const day = startOfDay.getDay() || 7
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - (day - 1))
  const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 7)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const t = d.getTime()
  return filters.every(f => {
    const x = norm(f)
    if (x === 'today') return t >= startOfDay.getTime() && t < endOfDay.getTime()
    if (x === 'this week') return t >= startOfWeek.getTime() && t < endOfWeek.getTime()
    if (x === 'this month') return t >= startOfMonth.getTime() && t < endOfMonth.getTime()
    return true
  })
}

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>{children}</div>
)

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <SectionTitle>{title}</SectionTitle>
    {children}
  </div>
)

/* ---------- Thumbnail helpers ---------- */
const getInitials = (s = '') => {
  const parts = s.trim().split(/\s+/)
  const a = parts[0]?.[0] || ''
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : ''
  return (a + b).toUpperCase()
}

const Thumb = ({ title, url, size = 36 }) => {
  const initials = getInitials(title || '')
  if (url) {
    return (
      <img
        src={url}
        alt={title || 'thumbnail'}
        width={size}
        height={size}
        style={{
          width: size, height: size, borderRadius: 8,
          objectFit: 'cover', flexShrink: 0, background: '#F3F4F6'
        }}
      />
    )
  }
  return (
    <div
      aria-label={title || 'thumbnail'}
      style={{
        width: size, height: size, borderRadius: 8,
        background: 'linear-gradient(135deg, #FCE7F3, #E9D5FF)',
        color: '#111827', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0
      }}
    >
      {initials || '•'}
    </div>
  )
}

/**
 * Props:
 *  - isOpen, onClose, onApply (unchanged)
 *  - events: array of event objects (optional but recommended)
 *  - groups: array of group objects (optional)
 * Expected event fields used: _id, title, date, groupName, location, tags[], categories[], image/coverImage/banner/photoUrl/thumbnail
 * Expected group fields used: _id, name, membersCount, tags[], image/avatar/logo/photoUrl/thumbnail
 */
const AdvancedSearchSheet = ({ isOpen, onClose, onApply, events = [], groups = [], initialKind = 'All Results' }) => {
  const [mounted, setMounted] = useState(false)
  const host = useRef(null)

  // portal host
  useEffect(() => {
    const el = document.createElement('div')
    el.id = 'advanced-search-sheet'
    document.body.appendChild(el)
    host.current = el
    setMounted(true)
    return () => { document.body.removeChild(el); host.current = null }
  }, [])

  // lock scroll
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  // esc to close
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen || !mounted || !host.current) return null
  return createPortal(
    <SheetContent onClose={onClose} onApply={onApply} events={events} groups={groups} initialKind={initialKind} />,
    host.current
  )
}

const SheetContent = ({ onClose, onApply, events, groups, initialKind = 'All Results' }) => {
  const [kind, setKind] = useState(initialKind)
  const [query, setQuery] = useState('')

  // removed categories
  const [tags, setTags] = useState([])
  const [tagsCustom, setTagsCustom] = useState([])

  const [dates, setDates] = useState([])
  const [datesCustom, setDatesCustom] = useState([])

  const allTags = useMemo(() => {
    const fromEvents = (events || []).flatMap(e => e?.tags || [])
    const fromGroups = (groups || []).flatMap(g => g?.tags || [])
    return Array.from(new Set([...fromEvents, ...fromGroups])).sort()
  }, [events, groups])

  const applied = useMemo(() => ({
    query,
    kind,
    categories: [], // keep key for stable URL logic
    tags: [...tags, ...tagsCustom],
    dates: [...dates, ...datesCustom],
  }), [query, kind, tags, tagsCustom, dates, datesCustom])

  const clearAll = () => {
    setQuery('')
    setKind('All Results')
    setTags([]); setTagsCustom([])
    setDates([]); setDatesCustom([])
  }

  const apply = () => { onApply?.(applied); onClose?.() }

  // LIVE PREVIEW: filter as you type
  const matchesEvent = (ev) => {
    const hay = [
      ev.title, ev.groupName, ev.location, ev.description,
      ...(ev.tags || []), ...(ev.categories || [])
    ].filter(Boolean).join(' | ')
    const textOK = query ? includes(hay, query) : true
    const tagFilter = [...tags, ...tagsCustom]
    const tagsOK = tagFilter.length ? tagFilter.every(t => (ev.tags || []).map(norm).includes(norm(t))) : true
    const dateOK = inDateWindow(ev.date, [...dates, ...datesCustom])
    return textOK && tagsOK && dateOK
  }

  const matchesGroup = (g) => {
    const hay = [g.name, g.description, ...(g.tags || [])].filter(Boolean).join(' | ')
    const textOK = query ? includes(hay, query) : true
    const tagFilter = [...tags, ...tagsCustom]
    const tagsOK = tagFilter.length ? tagFilter.every(t => (g.tags || []).map(norm).includes(norm(t))) : true
    return textOK && tagsOK
  }

  const resultsEvents = useMemo(
    () => (events || []).filter(matchesEvent).slice(0, 6),
    [events, query, tags, tagsCustom, dates, datesCustom]
  )
  const resultsGroups = useMemo(
    () => (groups || []).filter(matchesGroup).slice(0, 6),
    [groups, query, tags, tagsCustom]
  )

  const wantEvents = kind === 'All Results' || kind === 'Events'
  const wantGroups = kind === 'All Results' || kind === 'Groups'

  const railWidth = 320
  const onOverlayClick = (e) => { if (e.target === e.currentTarget) onClose?.() }

  /* ---------- Small result card with thumbnail ---------- */
  const ResultCard = ({ title, subtitle, right, thumbUrl }) => (
    <div
      style={{
        border: '1px solid #F3F4F6', borderRadius: 12, padding: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, background: '#fff'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Thumb title={title} url={thumbUrl} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600, fontSize: 14, color: '#111827',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                fontSize: 12, color: '#6B7280', marginTop: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
      {right ? (
        <div style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{right}</div>
      ) : null}
    </div>
  )

  return (
    <div
      onMouseDown={onOverlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(15,23,42,0.40)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: '95vw', maxWidth: 1200, maxHeight: '85vh',
          background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        {/* Header */}
        {/* Header */}
        <div
          style={{
            padding: 12,
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {/* Search bar + button */}
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.6,
                pointerEvents: 'none',
              }}
            >
              🔍
            </div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  apply()
                }
              }}
              placeholder="Search for events, groups, or interests..."
              style={{
                width: '100%',
                padding: '12px 14px 12px 38px',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={apply}
            style={{
              height: 40,
              padding: '0 14px',
              borderRadius: 10,
              border: 'none',
              background: '#EC4899',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Search
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 8,
              fontSize: 18,
              flexShrink: 0,
              lineHeight: 0,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>


        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #F3F4F6', padding: '8px 16px', display: 'flex', gap: 8 }}>
          {['All Results', 'Events', 'Groups'].map(k => (
            <button
              key={k}
              onClick={() => setKind(k)}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: kind === k ? '1px solid #EC4899' : '1px solid transparent',
                background: kind === k ? '#FCE7F3' : 'transparent',
                color: '#EC4899',
                cursor: 'pointer'
              }}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Body: independent scrolling panes */}
        <div style={{ display: 'flex', minHeight: 0, flex: 1, overflow: 'hidden' }}>
          {/* Left rail (scrollable) */}
          <div
            style={{
              width: 320, padding: 16, borderRight: '1px solid #F3F4F6',
              overflowY: 'auto' // ← scrollable
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>Filter By</div>
              <button
                onClick={clearAll}
                style={{ border: 'none', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontSize: 12 }}
              >
                Clear
              </button>
            </div>

            {/* Tags (with autosuggest from data) */}
            <Section title="Tags">
              <div style={{ display: 'grid', gap: 8, maxHeight: 140, overflowY: 'auto', paddingRight: 4 }}>
                {allTags.map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={tags.includes(t)}
                      onChange={(e) => setTags(prev => e.target.checked ? [...prev, t] : prev.filter(x => x !== t))}
                    />
                    {t}
                  </label>
                ))}
              </div>

              <FilterChipInput
                value={tagsCustom}
                onChange={setTagsCustom}
                placeholder="Enter custom tag…"
                helper="Press Enter to add — suggestions appear as you type"
                suggestList={allTags}
              />
            </Section>

            {/* Date */}
            <Section title="Date">
              <div style={{ display: 'grid', gap: 8 }}>
                {['Today', 'This Week', 'This Month'].map(d => (
                  <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={dates.includes(d)}
                      onChange={(e) => setDates(prev => e.target.checked ? [...prev, d] : prev.filter(x => x !== d))}
                    />
                    {d}
                  </label>
                ))}
              </div>
              <FilterChipInput
                value={datesCustom}
                onChange={setDatesCustom}
                placeholder="Custom (e.g., 2025-03-01)"
                helper="Supports free text like 'Next weekend'"
                suggestList={[]} // no date suggestions here
              />
            </Section>

            <button
              onClick={apply}
              style={{
                width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 10,
                border: 'none', cursor: 'pointer', background: '#EC4899', color: 'white', fontWeight: 600
              }}
            >
              Apply Filters
            </button>
          </div>

          {/* Results pane (scrollable) */}
          <div style={{ flex: 1, minWidth: 0, padding: 16, overflow: 'auto' }}>
            {!query ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                Start typing to search
              </div>
            ) : (
              <>
                {kind === 'All Results' && (
                  <>
                    <SectionTitle>Events</SectionTitle>
                    {resultsEvents.length ? (
                      <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                        {resultsEvents.map(ev => (
                          <div
                            key={ev._id}
                            onClick={() => { /* quick apply with this title */ setQuery(ev.title); apply() }}
                            style={{ cursor: 'pointer' }}
                          >
                            <ResultCard
                              title={ev.title}
                              subtitle={[ev.groupName, ev.location].filter(Boolean).join(' • ')}
                              right={ev.date ? new Date(ev.date).toLocaleDateString() : undefined}
                              thumbUrl={ev.image || ev.coverImage || ev.banner || ev.photoUrl || ev.thumbnail}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#9CA3AF', marginBottom: 16 }}>No matching events.</div>
                    )}

                    <SectionTitle>Groups</SectionTitle>
                    {resultsGroups.length ? (
                      <div style={{ display: 'grid', gap: 10 }}>
                        {resultsGroups.map(g => (
                          <div
                            key={g._id}
                            onClick={() => { setQuery(g.name); apply() }}
                            style={{ cursor: 'pointer' }}
                          >
                            <ResultCard
                              title={g.name}
                              subtitle={(g.membersCount != null ? `${g.membersCount} members` : (g.tags || []).join(', '))}
                              right="Group"
                              thumbUrl={g.image || g.avatar || g.logo || g.photoUrl || g.thumbnail}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#9CA3AF' }}>No matching groups.</div>
                    )}
                  </>
                )}

                {kind === 'Events' && (
                  resultsEvents.length ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {resultsEvents.map(ev => (
                        <div
                          key={ev._id}
                          onClick={() => { setQuery(ev.title); apply() }}
                          style={{ cursor: 'pointer' }}
                        >
                          <ResultCard
                            title={ev.title}
                            subtitle={[ev.groupName, ev.location].filter(Boolean).join(' • ')}
                            right={ev.date ? new Date(ev.date).toLocaleDateString() : undefined}
                            thumbUrl={ev.image || ev.coverImage || ev.banner || ev.photoUrl || ev.thumbnail}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#9CA3AF' }}>No matching events.</div>
                  )
                )}

                {kind === 'Groups' && (
                  resultsGroups.length ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {resultsGroups.map(g => (
                        <div
                          key={g._id}
                          onClick={() => { setQuery(g.name); apply() }}
                          style={{ cursor: 'pointer' }}
                        >
                          <ResultCard
                            title={g.name}
                            subtitle={(g.membersCount != null ? `${g.membersCount} members` : (g.tags || []).join(', '))}
                            right="Group"
                            thumbUrl={g.image || g.avatar || g.logo || g.photoUrl || g.thumbnail}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#9CA3AF' }}>No matching groups.</div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdvancedSearchSheet
