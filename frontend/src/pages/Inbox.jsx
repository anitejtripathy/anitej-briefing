// frontend/src/pages/Inbox.jsx
import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { fetchInbox, fetchInboxOverrides, patchInboxOverrides, createTaskFromInboxItem } from '../lib/github'
import Topbar from '../components/Topbar'

// ── CACHE & SEEN (localStorage) ────────────────────────
const CACHE_KEY = 'inbox_cache_v3'   // bumped — removes fabricated Slack data from cache
const SEEN_KEY  = 'inbox_seen_v2'   // bumped — resets all accidentally-marked items

function readCache()  { try { const r = localStorage.getItem(CACHE_KEY); return r ? JSON.parse(r) : null } catch { return null } }
function writeCache(data) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, fetched_at: new Date().toISOString() })) } catch {} }
function readSeen()   { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')) } catch { return new Set() } }
function saveSeen(s)  { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...s])) } catch {} }

function cacheAgeLabel(fetched_at) {
  if (!fetched_at) return 'Never synced'
  const m = Math.round((Date.now() - new Date(fetched_at)) / 60000)
  if (m < 1)    return 'Just synced'
  if (m < 60)   return `Synced ${m}m ago`
  if (m < 1440) return `Synced ${Math.round(m/60)}h ago`
  return `Synced ${Math.round(m/1440)}d ago`
}

function timeLabel(received_at) {
  if (!received_at) return ''
  const d = new Date(received_at)
  const h = (Date.now() - d) / 3600000
  if (h < 1)  return `${Math.round(h*60)}m ago`
  if (h < 24) return `${Math.round(h)}h ago`
  if (h < 48) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── THEME ──────────────────────────────────────────────
const C = {
  bg: '#08090C', surface: '#0E1016', surface2: '#13151D',
  border: '#1C1F2E', border2: '#252840',
  blue: '#4F8EF7', green: '#10B981', red: '#EF4444',
  amber: '#F5A623', purple: '#A78BFA', muted: '#3D4152',
  secondary: '#6B7280', primary: '#E8EAEF',
}
const MONO = 'IBM Plex Mono, monospace'
const SANS = 'IBM Plex Sans, sans-serif'
const DISP = 'Syne, sans-serif'
const SOURCE_META = {
  email:  { label: '📧 Email',  color: C.blue,   bg: 'rgba(79,142,247,0.1)'  },
  slack:  { label: '💬 Slack',  color: C.purple, bg: 'rgba(167,139,250,0.1)' },
  devrev: { label: '🎯 DevRev', color: C.amber,  bg: 'rgba(245,166,35,0.1)'  },
}
const BUCKET_META = {
  needs_action: { label: '🔴 Action needed', color: C.red   },
  fyi:          { label: '🔵 FYI',           color: C.blue  },
  noise:        { label: '⬜ Dismiss',        color: C.muted },
}
const itemKey = item => `${item.source}_${item.id}`

// ── SUB-ITEM ───────────────────────────────────────────
function SubItem({ text, snippet }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => snippet && setOpen(!open)}
      style={{ borderTop: `1px solid ${C.border}`, padding: '7px 14px 7px 26px', cursor: snippet ? 'pointer' : 'default' }}>
      <p style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, margin: 0 }}>→ {text}</p>
      {open && snippet && <p style={{ fontFamily: SANS, fontSize: 12, color: C.muted, margin: '5px 0 0', lineHeight: 1.5 }}>{snippet}</p>}
    </div>
  )
}

// ── INBOX ITEM ─────────────────────────────────────────
function InboxItem({ item, onAddTask, onAddTaskAndSeen, onMarkSeen, onRelabel, dragHandleProps = {}, isDragging }) {
  const [expanded, setExpanded] = useState(false)
  const [taskText, setTaskText] = useState(item.task_text || '')
  const [showTask, setShowTask] = useState(false)
  const [taskMode, setTaskMode] = useState('task') // 'task' | 'task_seen'
  const isMobile = window.innerWidth < 768
  const src      = SOURCE_META[item.source] || SOURCE_META.email
  const isAction = item.bucket === 'needs_action'
  const subs     = item.sub_items || []

  const handleTaskSave = () => {
    const t = taskText.trim() || item.task_text
    if (!t) return
    taskMode === 'task_seen' ? onAddTaskAndSeen(item, t) : onAddTask(item, t)
    setTaskText(''); setShowTask(false)
  }

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${item.is_vip ? C.amber+'60' : isAction ? C.red+'40' : C.border}`,
      borderLeft: `3px solid ${item.is_vip ? C.amber : isAction ? C.red : C.border}`,
      borderRadius: 10, marginBottom: 8, overflow: 'hidden',
      opacity: isDragging ? 0.4 : 1,
    }}>
      {/* Header */}
      <div style={{ padding: '11px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>

        {/* Drag handle */}
        <div
          {...dragHandleProps}
          style={{
            flexShrink: 0, cursor: 'grab', touchAction: 'none',
            color: C.border2, fontSize: 18, lineHeight: 1,
            paddingTop: 2, userSelect: 'none', display: 'flex', alignItems: 'flex-start',
          }}
        >⠿</div>

        {/* Main content — tap to expand */}
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
            {item.is_vip && <span style={{ fontFamily: MONO, fontSize: 9, color: C.amber, background: 'rgba(245,166,35,0.15)', border: `1px solid ${C.amber}40`, padding: '1px 6px', borderRadius: 4 }}>★ VIP</span>}
            <span style={{ fontFamily: SANS, fontSize: isMobile ? 14 : 13, fontWeight: 600, color: C.primary }}>{item.sender}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: src.color, background: src.bg, padding: '1px 6px', borderRadius: 4 }}>{src.label}</span>
            {isAction && <span style={{ fontFamily: MONO, fontSize: 9, color: C.red, background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.red}40`, padding: '1px 6px', borderRadius: 4 }}>Action</span>}
            {item.bucket === 'fyi' && <span style={{ fontFamily: MONO, fontSize: 9, color: C.blue, background: 'rgba(79,142,247,0.1)', border: `1px solid ${C.blue}40`, padding: '1px 6px', borderRadius: 4 }}>FYI</span>}
            {subs.length > 0 && <span style={{ fontFamily: MONO, fontSize: 9, color: C.muted, background: C.surface2, border: `1px solid ${C.border}`, padding: '1px 6px', borderRadius: 4 }}>{subs.length} items</span>}
          </div>
          <p style={{ fontFamily: SANS, fontSize: isMobile ? 13 : 12, color: C.secondary, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.subject || item.channel || '(no subject)'}
          </p>
          <p style={{ fontFamily: SANS, fontSize: 12, color: C.muted, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: item.ai_summary ? 'italic' : 'normal' }}>
            {item.ai_summary || item.snippet}
          </p>
        </div>

        {/* Timestamp + seen button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: C.muted, whiteSpace: 'nowrap' }}>{timeLabel(item.received_at)}</span>
          <button
            onClick={e => { e.stopPropagation(); onMarkSeen(item.id) }}
            title="Mark as seen — moves to Actioned section"
            style={{
              minWidth: 44, minHeight: 34,   /* large enough tap target */
              fontFamily: SANS, fontSize: 12, fontWeight: 600,
              padding: '4px 10px', borderRadius: 6,
              border: `1px solid ${C.border2}`,
              background: C.surface2, color: C.secondary,
              cursor: 'pointer', lineHeight: 1,
              display: 'flex', alignItems: 'center', gap: 4,
              transition: 'all 0.12s',
            }}
          >
            👁 <span style={{ fontFamily: MONO, fontSize: 9 }}>Done</span>
          </button>
        </div>
      </div>

      {/* Sub-items */}
      {subs.map((s, i) => <SubItem key={i} text={s.text} snippet={s.snippet} />)}

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 14px' }}>

          {/* Label picker — first thing visible on expand */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontFamily: MONO, fontSize: 9, color: C.muted, margin: '0 0 7px', textTransform: 'uppercase', letterSpacing: 1 }}>Label</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(BUCKET_META).map(([b, m]) => {
                const active = item.bucket === b
                return (
                  <button key={b} onClick={() => !active && onRelabel(b)} disabled={active} style={{
                    fontFamily: MONO, fontSize: 10, padding: '6px 12px', borderRadius: 7, minHeight: 34,
                    background: active ? m.color + '22' : C.surface2,
                    border: `1.5px solid ${active ? m.color + '70' : C.border}`,
                    color: active ? m.color : C.secondary,
                    cursor: active ? 'default' : 'pointer',
                    fontWeight: active ? 700 : 400,
                    transition: 'all 0.12s',
                  }}>{m.label}</button>
                )
              })}
            </div>
          </div>

          {item.ai_summary && (
            <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.purple}`, borderRadius: 7, padding: '8px 12px', marginBottom: 12 }}>
              <p style={{ fontFamily: MONO, fontSize: 9, color: C.purple, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>✦ AI Summary</p>
              <p style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, margin: 0, lineHeight: 1.5 }}>{item.ai_summary}</p>
            </div>
          )}
          <p style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, margin: '0 0 12px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.snippet}</p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {item.thread_url && (
              <a href={item.thread_url} target="_blank" rel="noreferrer"
                style={{ fontFamily: MONO, fontSize: 11, padding: '6px 12px', borderRadius: 7, minHeight: 36, background: C.surface2, border: `1px solid ${C.border}`, color: C.secondary, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                Open ↗
              </a>
            )}
            <button onClick={() => { setTaskMode('task'); setShowTask(t => !t) }}
              style={{ fontFamily: MONO, fontSize: 11, padding: '6px 12px', borderRadius: 7, minHeight: 36, background: 'rgba(16,185,129,0.1)', border: `1px solid rgba(16,185,129,0.3)`, color: C.green, cursor: 'pointer' }}>
              ✅ Add Task
            </button>
            <button onClick={() => { setTaskMode('task_seen'); setShowTask(t => !t) }}
              style={{ fontFamily: MONO, fontSize: 11, padding: '6px 12px', borderRadius: 7, minHeight: 36, background: 'rgba(16,185,129,0.07)', border: `1px solid rgba(16,185,129,0.2)`, color: C.green, cursor: 'pointer' }}>
              ✅ Add Task & Done
            </button>
            <button onClick={() => onMarkSeen(item.id)}
              style={{ fontFamily: MONO, fontSize: 11, padding: '6px 12px', borderRadius: 7, minHeight: 36, background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer' }}>
              👁 Mark Seen
            </button>
          </div>
          {showTask && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <input value={taskText} onChange={e => setTaskText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTaskSave()}
                placeholder={item.task_text || 'Task description…'} autoFocus
                style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 7, padding: '8px 12px', fontFamily: SANS, fontSize: 14, color: C.primary, outline: 'none' }} />
              <button onClick={handleTaskSave}
                style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', cursor: 'pointer', fontFamily: DISP, fontWeight: 700, minHeight: 40 }}>
                {taskMode === 'task_seen' ? 'Save & Done' : 'Save'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── SORTABLE WRAPPER ───────────────────────────────────
function SortableInboxItem(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: itemKey(props.item) })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <InboxItem {...props} dragHandleProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  )
}

// ── MAIN ───────────────────────────────────────────────
export default function Inbox({ onMenuClick }) {
  const [sourceFilter, setSourceFilter] = useState('all')
  const [bucketFilter, setBucketFilter] = useState('all')
  const [sortBy,       setSortBy]       = useState('date')
  const [sortDir,      setSortDir]      = useState('desc')
  const [seenIds,      setSeenIds]      = useState(() => readSeen())
  const [showActioned, setShowActioned] = useState(false)
  const [toast,        setToast]        = useState(null)
  const qc       = useQueryClient()
  const isMobile = window.innerWidth < 768

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Cache-first: load from localStorage immediately, never auto-refetch
  const cachedEntry = useMemo(() => readCache(), [])

  const { data: items = [], isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['inbox'],
    queryFn: async () => {
      const data = await fetchInbox(35)
      writeCache(data)
      return data
    },
    initialData:            cachedEntry?.data ?? undefined,
    initialDataUpdatedAt:   cachedEntry?.fetched_at ? new Date(cachedEntry.fetched_at).getTime() : undefined,
    staleTime:              Infinity,  // manual Sync only
    gcTime:                 24 * 60 * 60 * 1000,
    retry: 1,
  })

  const { data: overrides = { order: [], buckets: {} } } = useQuery({
    queryKey: ['inbox-overrides'],
    queryFn: fetchInboxOverrides,
    staleTime: 30_000,
  })

  const fetchedAt = cachedEntry?.fetched_at || (dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null)

  // Seen helpers — toast on mark so user knows it worked
  const markSeen = useCallback((id) => {
    setSeenIds(prev => { const next = new Set(prev); next.add(id); saveSeen(next); return next })
    setToast('Moved to Actioned — tap ↩ Restore to undo')
  }, [])
  const unmarkSeen = useCallback((id) => {
    setSeenIds(prev => { const next = new Set(prev); next.delete(id); saveSeen(next); return next })
  }, [])

  // Mutations
  const addTask = useMutation({
    mutationFn: ({ item, text }) => createTaskFromInboxItem(item, text),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setToast('Task added ✓') },
    onError:   e  => setToast(`Failed: ${e.message}`),
  })

  const addTaskAndSeen = useCallback((item, text) => {
    addTask.mutate({ item, text })
    markSeen(item.id)
  }, [addTask, markSeen])

  const relabel = useMutation({
    mutationFn: ({ key, bucket }) => patchInboxOverrides({ buckets: { [key]: bucket } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox-overrides'] }),
    onError:   e => setToast(`Relabel failed: ${e.message}`),
  })

  const reorderInbox = useMutation({
    mutationFn: orderedKeys => patchInboxOverrides({ order: orderedKeys }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox-overrides'] }),
    onError:   e => setToast(`Reorder failed: ${e.message}`),
  })

  // Apply bucket overrides on top of raw items
  const itemsWithOverrides = useMemo(() =>
    items.map(item => ({ ...item, bucket: overrides.buckets[itemKey(item)] ?? item.bucket })),
    [items, overrides]
  )

  const orderMap = useMemo(() => {
    const m = {}
    overrides.order.forEach((key, i) => { m[key] = i })
    return m
  }, [overrides.order])

  // Split active / actioned
  const { active, actioned } = useMemo(() => ({
    active:   itemsWithOverrides.filter(i => !seenIds.has(i.id)),
    actioned: itemsWithOverrides.filter(i =>  seenIds.has(i.id)),
  }), [itemsWithOverrides, seenIds])

  // Filter + sort
  const filtered = useMemo(() => {
    let list = active
    if (sourceFilter !== 'all') list = list.filter(i => i.source === sourceFilter)
    if (bucketFilter !== 'all') list = list.filter(i => i.bucket === bucketFilter)
    const m = sortDir === 'desc' ? -1 : 1
    if (sortBy === 'priority') {
      const ord = { needs_action: 0, fyi: 1 }
      return [...list].sort((a, b) => {
        const bo = ((ord[a.bucket] ?? 2) - (ord[b.bucket] ?? 2)) * m
        return bo !== 0 ? bo : (new Date(b.received_at) - new Date(a.received_at)) * m
      })
    }
    // Date sort — respect custom order overrides
    return [...list].sort((a, b) => {
      const aIdx = orderMap[itemKey(a)] ?? Infinity
      const bIdx = orderMap[itemKey(b)] ?? Infinity
      if (aIdx !== Infinity || bIdx !== Infinity) return aIdx - bIdx
      return (new Date(b.received_at) - new Date(a.received_at)) * m
    })
  }, [active, sourceFilter, bucketFilter, sortBy, sortDir, orderMap])

  const handleDragEnd = ({ active: dragActive, over }) => {
    if (!over || dragActive.id === over.id) return
    // Reorder within the unfiltered active list to preserve positions of non-visible items
    const globalSorted = [...itemsWithOverrides.filter(i => !seenIds.has(i.id))].sort((a, b) => {
      const aIdx = orderMap[itemKey(a)] ?? Infinity
      const bIdx = orderMap[itemKey(b)] ?? Infinity
      if (aIdx !== Infinity || bIdx !== Infinity) return aIdx - bIdx
      return new Date(b.received_at) - new Date(a.received_at)
    })
    const ids = globalSorted.map(itemKey)
    const fromPos = ids.indexOf(dragActive.id)
    const toPos   = ids.indexOf(over.id)
    if (fromPos !== -1 && toPos !== -1) {
      reorderInbox.mutate(arrayMove(ids, fromPos, toPos))
    }
  }

  const actionCount  = active.filter(i => i.bucket === 'needs_action').length
  const vipCount     = active.filter(i => i.is_vip).length
  const counts       = { email: active.filter(i => i.source==='email').length, slack: active.filter(i => i.source==='slack').length, devrev: active.filter(i => i.source==='devrev').length }

  // Tab button
  const Tab = ({ v, cur, set, children }) => (
    <button onClick={() => set(v)} style={{ padding: '8px 14px', border: 'none', background: cur===v ? C.blue+'22' : 'transparent', cursor: 'pointer', fontFamily: MONO, fontSize: 10, whiteSpace: 'nowrap', color: cur===v ? C.blue : C.muted, borderBottom: `2px solid ${cur===v ? C.blue : 'transparent'}`, transition: 'all 0.12s' }}>{children}</button>
  )

  // Sort button with direction toggle
  const SortBtn = ({ by, label }) => {
    const isActive = sortBy === by
    const dir      = isActive ? sortDir : 'desc'
    return (
      <button onClick={() => { isActive ? setSortDir(d => d==='desc'?'asc':'desc') : (setSortBy(by), setSortDir('desc')) }}
        style={{ padding: '8px 12px', border: 'none', background: isActive ? C.blue+'22' : 'transparent', cursor: 'pointer', fontFamily: MONO, fontSize: 10, whiteSpace: 'nowrap', color: isActive ? C.blue : C.muted, borderBottom: `2px solid ${isActive ? C.blue : 'transparent'}`, transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 3 }}>
        {label} <span style={{ fontSize: 10 }}>{isActive ? (dir==='desc' ? '↓' : '↑') : '↕'}</span>
      </button>
    )
  }

  if (isLoading && !cachedEntry) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>Loading inbox for the first time…</p>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <Topbar title="Inbox" subtitle={`${actionCount} action · ${vipCount} VIP · ${active.length} active`} onMenuClick={onMenuClick}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: C.muted, display: isMobile ? 'none' : 'block' }}>
          {cacheAgeLabel(fetchedAt)}
        </span>
        <button onClick={() => refetch()} disabled={isFetching} style={{
          fontFamily: MONO, fontSize: 11, padding: '5px 12px', borderRadius: 7,
          border: `1px solid ${isFetching ? C.blue+'60' : C.border2}`,
          background: isFetching ? C.blue+'15' : C.surface2,
          color: isFetching ? C.blue : C.secondary,
          cursor: isFetching ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s',
        }}>
          <span style={{ display:'inline-block', animation: isFetching ? 'spin 1s linear infinite' : 'none' }}>⟳</span>
          {isFetching ? 'Syncing…' : 'Sync'}
        </button>
      </Topbar>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Filter bar */}
      <div style={{ borderBottom:`1px solid ${C.border}`, background:C.bg, flexShrink:0 }}>
        <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, overflowX:'auto' }}>
          <Tab v="all"    cur={sourceFilter} set={setSourceFilter}>All ({active.length})</Tab>
          <Tab v="email"  cur={sourceFilter} set={setSourceFilter}>📧 Email ({counts.email})</Tab>
          <Tab v="slack"  cur={sourceFilter} set={setSourceFilter}>💬 Slack ({counts.slack})</Tab>
          <Tab v="devrev" cur={sourceFilter} set={setSourceFilter}>🎯 DevRev ({counts.devrev})</Tab>
        </div>
        <div style={{ display:'flex', alignItems:'center', overflowX:'auto' }}>
          <Tab v="all"          cur={bucketFilter} set={setBucketFilter}>All</Tab>
          <Tab v="needs_action" cur={bucketFilter} set={setBucketFilter}>🔴 Action ({actionCount})</Tab>
          <Tab v="fyi"          cur={bucketFilter} set={setBucketFilter}>🔵 FYI</Tab>
          <div style={{ marginLeft:'auto', display:'flex', borderLeft:`1px solid ${C.border}` }}>
            <SortBtn by="date"     label="Date" />
            <SortBtn by="priority" label="Priority" />
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '12px 12px 100px' : '14px 20px 24px' }}>

        {filtered.length === 0 && actioned.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:C.muted, fontFamily:MONO, fontSize:11 }}>
            {items.length === 0 ? 'No data — hit Sync or run /scan' : 'All items actioned 👁'}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:C.muted, fontFamily:MONO, fontSize:11 }}>No items match filters</div>
        ) : (
          <>
            <p style={{ fontFamily:MONO, fontSize:9, color:C.muted, margin:'0 0 10px', textTransform:'uppercase', letterSpacing:1 }}>
              {filtered.length} item{filtered.length!==1?'s':''}
              {bucketFilter!=='all' ? ` · ${bucketFilter.replace('_',' ')}` : ''}
              {sourceFilter!=='all' ? ` · ${sourceFilter}` : ''}
              {' '}· {sortBy} {sortDir==='desc'?'↓':'↑'}
              {sortBy === 'date' && <span style={{ color: C.border2 }}> · drag ⠿ to reorder</span>}
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filtered.map(itemKey)} strategy={verticalListSortingStrategy}>
                {filtered.map(item => (
                  <SortableInboxItem
                    key={itemKey(item)}
                    item={item}
                    onAddTask={(item, text) => addTask.mutate({ item, text })}
                    onAddTaskAndSeen={addTaskAndSeen}
                    onMarkSeen={markSeen}
                    onRelabel={bucket => relabel.mutate({ key: itemKey(item), bucket })}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </>
        )}

        {/* Actioned section */}
        {actioned.length > 0 && (
          <div style={{ marginTop:16 }}>
            {/* Actioned header — toggle + clear all */}
            <div style={{ display:'flex', gap:8, alignItems:'stretch' }}>
              <button onClick={() => setShowActioned(s => !s)} style={{
                flex:1, padding:'10px 14px', background:C.surface,
                border:`1px solid ${C.border}`, borderRadius:10,
                display:'flex', alignItems:'center', justifyContent:'space-between',
                cursor:'pointer', fontFamily:MONO, fontSize:10, color:C.muted,
              }}>
                <span>👁 Actioned — {actioned.length} item{actioned.length!==1?'s':''} · tap to expand</span>
                <span style={{ fontSize:11 }}>{showActioned?'▲':'▼'}</span>
              </button>
              <button
                onClick={() => {
                  setSeenIds(new Set())
                  saveSeen(new Set())
                  setToast(`Moved ${actioned.length} item${actioned.length!==1?'s':''} back to inbox`)
                }}
                title="Move everything back to inbox"
                style={{
                  padding:'10px 14px', background:'rgba(239,68,68,0.08)',
                  border:`1px solid rgba(239,68,68,0.25)`, borderRadius:10,
                  cursor:'pointer', fontFamily:MONO, fontSize:10, color:C.red,
                  whiteSpace:'nowrap',
                }}
              >↩ Restore all</button>
            </div>

            {showActioned && (
              <div style={{ marginTop:8 }}>
                {actioned.map(item => {
                  const s = SOURCE_META[item.source] || SOURCE_META.email
                  return (
                    <div key={`seen-${item.source}-${item.id}`} style={{
                      background:C.surface, border:`1px solid ${C.border}`, borderRadius:8,
                      padding:'10px 14px', marginBottom:5, opacity:0.55,
                      display:'flex', alignItems:'center', gap:10,
                    }}>
                      <span style={{ fontFamily:MONO, fontSize:9, color:s.color, background:s.bg, padding:'1px 6px', borderRadius:4, flexShrink:0 }}>{s.label}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontFamily:SANS, fontSize:12, color:C.muted, margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          <strong style={{ color:C.secondary }}>{item.sender}</strong> — {item.subject || item.channel}
                        </p>
                      </div>
                      <span style={{ fontFamily:MONO, fontSize:9, color:C.muted, flexShrink:0 }}>{timeLabel(item.received_at)}</span>
                      {/* Restore button — large enough to tap */}
                      <button
                        onClick={() => { unmarkSeen(item.id); setToast('Moved back to inbox') }}
                        title="Move back to inbox"
                        style={{
                          minWidth:44, minHeight:32,
                          fontFamily:SANS, fontSize:11, fontWeight:600,
                          padding:'4px 10px', borderRadius:6,
                          border:`1px solid rgba(79,142,247,0.3)`,
                          background:'rgba(79,142,247,0.08)', color:C.blue,
                          cursor:'pointer', flexShrink:0,
                          display:'flex', alignItems:'center', gap:4,
                        }}>
                        ↩ <span style={{ fontFamily:MONO, fontSize:9 }}>Restore</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div onClick={() => setToast(null)} style={{
          position:'fixed', bottom:76, left:'50%', transform:'translateX(-50%)',
          background:C.green, color:'#fff', padding:'10px 20px', borderRadius:8,
          fontFamily:MONO, fontSize:12, zIndex:9999, cursor:'pointer',
        }}>{toast}</div>
      )}
    </div>
  )
}
