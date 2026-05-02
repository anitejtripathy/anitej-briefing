// frontend/src/pages/Inbox.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchInbox, createTaskFromInboxItem } from '../lib/github'
import Topbar from '../components/Topbar'

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

function InboxItem({ item, onAddTask }) {
  const [expanded, setExpanded] = useState(false)
  const [taskText, setTaskText] = useState('')
  const [showTaskInput, setShowTaskInput] = useState(false)
  const isMobile = window.innerWidth < 768

  const src = SOURCE_META[item.source] || SOURCE_META.email
  const isAction = item.bucket === 'needs_action'

  const timeLabel = (() => {
    if (!item.received_at) return ''
    const d = new Date(item.received_at)
    const now = new Date()
    const diffH = (now - d) / 3600000
    if (diffH < 1) return `${Math.round(diffH * 60)}m ago`
    if (diffH < 24) return `${Math.round(diffH)}h ago`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  })()

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${item.is_vip ? C.amber + '60' : isAction ? C.red + '40' : C.border}`,
      borderLeft: `3px solid ${item.is_vip ? C.amber : isAction ? C.red : C.border}`,
      borderRadius: 10, marginBottom: 8, overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              {item.is_vip && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.amber, background: 'rgba(245,166,35,0.15)', border: `1px solid ${C.amber}40`, padding: '1px 6px', borderRadius: 4 }}>★ VIP</span>
              )}
              <span style={{ fontFamily: SANS, fontSize: isMobile ? 14 : 13, fontWeight: 600, color: C.primary }}>{item.sender}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: src.color, background: src.bg, padding: '1px 6px', borderRadius: 4 }}>{src.label}</span>
              {isAction && <span style={{ fontFamily: MONO, fontSize: 9, color: C.red, background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.red}40`, padding: '1px 6px', borderRadius: 4 }}>Action needed</span>}
              {item.bucket === 'fyi' && <span style={{ fontFamily: MONO, fontSize: 9, color: C.blue, background: 'rgba(79,142,247,0.1)', border: `1px solid ${C.blue}40`, padding: '1px 6px', borderRadius: 4 }}>FYI</span>}
            </div>
            <p style={{ fontFamily: SANS, fontSize: isMobile ? 13 : 12, color: C.secondary, margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.subject || item.channel || '(no subject)'}
            </p>
            {item.ai_summary ? (
              <p style={{ fontFamily: SANS, fontSize: 12, color: C.muted, margin: 0, fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.ai_summary}</p>
            ) : (
              <p style={{ fontFamily: SANS, fontSize: 12, color: C.muted, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.snippet}</p>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: C.muted }}>{timeLabel}</span>
            <span style={{ fontSize: 12, color: C.muted }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 14px' }}>
          {item.ai_summary && (
            <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.purple}`, borderRadius: 7, padding: '8px 12px', marginBottom: 12 }}>
              <p style={{ fontFamily: MONO, fontSize: 9, color: C.purple, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>✦ AI Summary</p>
              <p style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, margin: 0, lineHeight: 1.5 }}>{item.ai_summary}</p>
            </div>
          )}
          <p style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, margin: '0 0 14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.snippet}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {item.thread_url && item.thread_url.startsWith('http') && (
              <a href={item.thread_url} target="_blank" rel="noreferrer" style={{
                fontFamily: MONO, fontSize: 11, padding: '6px 12px', borderRadius: 7, minHeight: 36,
                background: C.surface2, border: `1px solid ${C.border}`, color: C.secondary,
                textDecoration: 'none', display: 'flex', alignItems: 'center',
              }}>Open ↗</a>
            )}
            <button onClick={() => setShowTaskInput(!showTaskInput)} style={{
              fontFamily: MONO, fontSize: 11, padding: '6px 12px', borderRadius: 7, minHeight: 36,
              background: 'rgba(16,185,129,0.1)', border: `1px solid rgba(16,185,129,0.3)`,
              color: C.green, cursor: 'pointer',
            }}>✅ Add Task</button>
          </div>
          {showTaskInput && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <input
                value={taskText} onChange={e => setTaskText(e.target.value)}
                placeholder={item.task_text || 'Task description…'}
                autoFocus
                style={{
                  flex: 1, background: C.surface2, border: `1px solid ${C.border2}`,
                  borderRadius: 7, padding: '8px 12px',
                  fontFamily: SANS, fontSize: 14, color: C.primary, outline: 'none',
                }}
              />
              <button
                onClick={() => {
                  const text = taskText.trim() || item.task_text
                  if (text) { onAddTask(item, text); setTaskText(''); setShowTaskInput(false) }
                }}
                style={{
                  background: C.green, color: '#fff', border: 'none', borderRadius: 7,
                  padding: '8px 16px', cursor: 'pointer', fontFamily: DISP, fontWeight: 700, minHeight: 40,
                }}>Save</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Inbox() {
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState(null)
  const qc = useQueryClient()
  const isMobile = window.innerWidth < 768

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['inbox'],
    queryFn: () => fetchInbox(3),
    staleTime: 5 * 60_000,
  })

  const addTask = useMutation({
    mutationFn: ({ item, text }) => createTaskFromInboxItem(item, text),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setToast('Task added ✓') },
    onError: e => setToast(`Failed: ${e.message}`),
  })

  const filtered = filter === 'all' ? items : items.filter(i => i.source === filter)
  const actionCount = items.filter(i => i.bucket === 'needs_action').length
  const vipCount    = items.filter(i => i.is_vip).length

  const tabs = [
    { key: 'all',    label: `All (${items.length})` },
    { key: 'email',  label: '📧 Email' },
    { key: 'slack',  label: '💬 Slack' },
    { key: 'devrev', label: '🎯 DevRev' },
  ]

  if (isLoading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>Loading inbox…</p>
    </div>
  )

  if (isError) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 36, opacity: 0.3 }}>📬</span>
      <p style={{ fontFamily: DISP, fontWeight: 700, color: C.red, margin: 0 }}>Failed to load inbox</p>
      <p style={{ fontFamily: MONO, fontSize: 11, color: C.muted, margin: 0 }}>Check GitHub PAT</p>
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar title="Inbox" subtitle={`${actionCount} need action · ${vipCount} VIP · last 3 days`} />

      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.bg, overflowX: 'auto', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontFamily: MONO, fontSize: 11, whiteSpace: 'nowrap',
            color: filter === tab.key ? C.blue : C.muted,
            borderBottom: `2px solid ${filter === tab.key ? C.blue : 'transparent'}`,
            transition: 'all 0.15s',
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 12px 100px' : '16px 20px 24px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted, fontFamily: MONO, fontSize: 11 }}>
            {items.length === 0 ? 'No inbox data yet — run make full-run to fetch' : `No ${filter} items in last 3 days`}
          </div>
        ) : (
          filtered.map(item => (
            <InboxItem
              key={`${item.source}-${item.id}`}
              item={item}
              onAddTask={(item, text) => addTask.mutate({ item, text })}
            />
          ))
        )}
      </div>

      {toast && (
        <div onClick={() => setToast(null)} style={{
          position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)',
          background: C.green, color: '#fff', padding: '10px 20px', borderRadius: 8,
          fontFamily: MONO, fontSize: 12, zIndex: 9999, cursor: 'pointer',
        }}>{toast}</div>
      )}
    </div>
  )
}
