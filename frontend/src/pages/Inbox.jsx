// frontend/src/pages/Inbox.jsx
import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchInbox, createTaskFromInboxItem } from '../lib/github'
import Topbar from '../components/Topbar'

// ── CACHE & SEEN (localStorage) ────────────────────────
const CACHE_KEY = 'inbox_cache_v1'
const SEEN_KEY  = 'inbox_seen_v1'

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
function InboxItem({ item, onAddTask, onAddTaskAndSeen, onMarkSeen }) {
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
    }}>
      {/* Header */}
      <div style={{ padding: '11px 12px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8 }}
        onClick={() => setExpanded(!expanded)}>
        <div style={{ flex: 1, minWidth: 0 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: C.muted, whiteSpace: 'nowrap' }}>{timeLabel(item.received_at)}</span>
          <button onClick={e => { e.stopPropagation(); onMarkSeen(item.id) }}
            title="Mark as seen"
            style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', lineHeight: 1 }}>
            👁
          </button>
        </div>
      </div>

      {/* Sub-items */}
      {subs.map((s, i) => <SubItem key={i} text={s.text} snippet={s.snippet} />)}

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 14px' }}>
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

// ── MAIN ───────────────────────────────────────────────
export default function Inbox() {
  const [sourceFilter, setSourceFilter] = useState('all')
  const [bucketFilter, setBucketFilter] = useState('all')
  const [sortBy,       setSortBy]       = useState('date')
  const [sortDir,      setSortDir]      = useState('desc')
  const [seenIds,      setSeenIds]      = useState(() => readSeen())
  const [showActioned, setShowActioned] = useState(false)
  const [toast,        setToast]        = useState(null)
  const qc       = useQueryClient()
  const isMobile = window.innerWidth < 768

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

  const fetchedAt = cachedEntry?.fetched_at || (dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null)

  // Seen helpers
  const markSeen = useCallback((id) => {
    setSeenIds(prev => { const next = new Set(prev); next.add(id); saveSeen(next); return next })
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

  // Split active / actioned
  const { active, actioned } = useMemo(() => ({
    active:   items.filter(i => !seenIds.has(i.id)),
    actioned: items.filter(i =>  seenIds.has(i.id)),
  }), [items, seenIds])

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
    return [...list].sort((a, b) => (new Date(b.received_at) - new Date(a.received_at)) * m)
  }, [active, sourceFilter, bucketFilter, sortBy, sortDir])

  const actionCount  = active.filter(i => i.bucket === 'needs_action').length
  const vipCount     = active.filter(i => i.is_vip).length
  const counts       = { email: active.filter(i => i.source==='email').length, slack: active.filter(i => i.source==='slack').length, devrev: active.filter(i => i.source==='devrev').length }

  // Tab button
  const Tab = ({ v, cur, set, children }) => (
    <button onClick={() => set(v)} style={{ padding: '8px 14px', border: 'none', background: cur===v ? C.blue+'22' : 'transparent', cursor: 'pointer', fontFamily: MONO, fontSize: 10, whiteSpace: 'nowrap', color: cur===v ? C.blue : C.muted, borderBottom: `2px solid ${cur===v ? C.blue : 'transparent'}`, transition: 'all 0.12s' }}>{children}</button>
  )

  // Sort button with direction toggle
  const SortBtn = ({ by, label }) => {
    const active = sortBy === by
    const dir    = active ? sortDir : 'desc'
    return (
      <button onClick={() => { active ? setSortDir(d => d==='desc'?'asc':'desc') : (setSortBy(by), setSortDir('desc')) }}
        style={{ padding: '8px 12px', border: 'none', background: active ? C.blue+'22' : 'transparent', cursor: 'pointer', fontFamily: MONO, fontSize: 10, whiteSpace: 'nowrap', color: active ? C.blue : C.muted, borderBottom: `2px solid ${active ? C.blue : 'transparent'}`, transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 3 }}>
        {label} <span style={{ fontSize: 10 }}>{active ? (dir==='desc' ? '↓' : '↑') : '↕'}</span>
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
      <Topbar title="Inbox" subtitle={`${actionCount} action · ${vipCount} VIP · ${active.length} active`}>
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
            </p>
            {filtered.map(item => (
              <InboxItem key={`${item.source}-${item.id}`} item={item}
                onAddTask={(item, text) => addTask.mutate({ item, text })}
                onAddTaskAndSeen={addTaskAndSeen}
                onMarkSeen={markSeen} />
            ))}
          </>
        )}

        {/* Actioned section */}
        {actioned.length > 0 && (
          <div style={{ marginTop:16 }}>
            <button onClick={() => setShowActioned(s => !s)} style={{
              width:'100%', padding:'10px 14px', background:C.surface,
              border:`1px solid ${C.border}`, borderRadius:10,
              display:'flex', alignItems:'center', justifyContent:'space-between',
              cursor:'pointer', fontFamily:MONO, fontSize:10, color:C.muted,
            }}>
              <span>👁 Actioned — {actioned.length} item{actioned.length!==1?'s':''}</span>
              <span style={{ fontSize:11 }}>{showActioned?'▲':'▼'}</span>
            </button>
            {showActioned && (
              <div style={{ marginTop:8 }}>
                {actioned.map(item => {
                  const s = SOURCE_META[item.source] || SOURCE_META.email
                  return (
                    <div key={`seen-${item.source}-${item.id}`} style={{
                      background:C.surface, border:`1px solid ${C.border}`, borderRadius:8,
                      padding:'9px 14px', marginBottom:5, opacity:0.5,
                      display:'flex', alignItems:'center', gap:10,
                    }}>
                      <span style={{ fontFamily:MONO, fontSize:9, color:s.color, background:s.bg, padding:'1px 6px', borderRadius:4, flexShrink:0 }}>{s.label}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontFamily:SANS, fontSize:12, color:C.muted, margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          <strong style={{ color:C.secondary }}>{item.sender}</strong> — {item.subject || item.channel}
                        </p>
                      </div>
                      <span style={{ fontFamily:MONO, fontSize:9, color:C.muted, flexShrink:0 }}>{timeLabel(item.received_at)}</span>
                      <button onClick={() => unmarkSeen(item.id)} title="Move back to inbox"
                        style={{ fontFamily:MONO, fontSize:9, padding:'2px 7px', borderRadius:4, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, cursor:'pointer', flexShrink:0 }}>
                        ↩
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
