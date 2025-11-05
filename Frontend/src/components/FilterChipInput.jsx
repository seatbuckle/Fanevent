// components/FilterChipInput.jsx
import React, { useMemo, useRef, useState, useEffect } from 'react'

const FilterChipInput = ({
  value = [],
  onChange,
  placeholder = 'Enter…',
  helper,
  suggestList = [],          // ← new: list of suggestions to show while typing
}) => {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // filter suggestions by draft (case-insensitive), exclude already-selected
  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase()
    if (!q) return []
    return suggestList
      .filter(s => !value.includes(s))
      .filter(s => s.toLowerCase().includes(q))
      .slice(0, 8)
  }, [draft, suggestList, value])

  const commit = (t) => {
    const txt = t.trim()
    if (!txt) return
    const next = Array.from(new Set([...(value || []), txt]))
    onChange?.(next)
    setDraft('')
    setOpen(false)
  }

  const commitSuggestion = (idx = 0) => {
    if (suggestions.length > 0) {
      commit(suggestions[idx])
    } else {
      commit(draft)
    }
  }

  // click outside to close suggest box
  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div ref={containerRef} style={{ marginTop: 8, position: 'relative' }}>
      {/* chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {(value || []).map((chip) => (
          <span key={chip} style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '4px 8px', borderRadius: 999, background: '#FCE7F3',
            color: '#9D174D', fontSize: 12
          }}>
            {chip}
            <button
              onClick={() => onChange?.(value.filter(v => v !== chip))}
              style={{ marginLeft: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9D174D' }}
              aria-label={`Remove ${chip}`}
            >×</button>
          </span>
        ))}
      </div>

      {/* input */}
      <input
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commitSuggestion(0) }
          if (e.key === ',' ) { e.preventDefault(); commit(draft) }
          if (e.key === 'Backspace' && !draft && value?.length) {
            onChange?.(value.slice(0, -1))
          }
          if (e.key === 'Escape') setOpen(false)
        }}
        onBlur={() => {}}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 8,
          border: '1px solid #E5E7EB', fontSize: 14, outline: 'none'
        }}
      />

      {/* helper text */}
      {helper ? (
        <div style={{ marginTop: 6, color: '#6B7280', fontSize: 12 }}>{helper}</div>
      ) : null}

      {/* suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 6,
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
            boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
            maxHeight: 180, overflowY: 'auto', zIndex: 10
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={s}
              onMouseDown={(e) => { e.preventDefault(); commit(s) }}
              style={{
                padding: '8px 10px', fontSize: 14, cursor: 'pointer',
                borderBottom: i === suggestions.length - 1 ? 'none' : '1px solid #F3F4F6'
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FilterChipInput
