// frontend/src/pages/Tasks.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTasks, patchTask, createTask, swapTaskPriorities } from '../lib/github'
import Topbar from '../components/Topbar'

const P_COLOR = { 1: '#EF4444', 2: '#F5A623' }
const P_BG    = { 1: 'rgba(239,68,68,0.12)', 2: 'rgba(245,166,35,0.12)' }

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])
  const bg = type === 'error' ? '#EF4444' : '#10B981'
  return (
    <div onClick={onDismiss} style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      background: bg, color: '#fff', padding: '10px 20px', borderRadius: 8,
      fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, zIndex: 999,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)', cursor: 'pointer',
      maxWidth: '90vw', textAlign: 'center', lineHeight: 1.4,
    }}>
      {message}
    </div>
  )
}

export default function Tasks({ onMenuClick }) {
  const [newText, setNewText] = useState('')
  const [toast, setToast] = useState(null)
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks'] })
  const showError = (msg) => setToast({ message: msg, type: 'error' })
  const showSuccess = (msg) => setToast({ message: msg, type: 'success' })

  const { data: tasks = [], isLoading, isError, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    staleTime: 30_000,
  })

  const markDone = useMutation({
    mutationFn: (id) => patchTask(id, { status: 'done', completed_at: new Date().toISOString() }),
    onSuccess: () => { invalidate(); showSuccess('Task completed ✓') },
    onError: (e) => showError(`Save failed: ${e.message}. Check PAT permissions.`),
  })

  const add = useMutation({
    mutationFn: createTask,
    onSuccess: () => { invalidate(); showSuccess('Task saved to GitHub ✓') },
    onError: (e) => showError(`Could not save: ${e.message}`),
  })

  const reorder = useMutation({
    mutationFn: ({ idA, idB }) => swapTaskPriorities(idA, idB),
    onSuccess: invalidate,
    onError: (e) => showError(`Reorder failed: ${e.message}`),
  })

  const handleKey = (e) => {
    if (e.key === 'Enter' && newText.trim()) {
      add.mutate(newText.trim())
      setNewText('')
    }
  }

  const open = [...tasks.filter(t => t.status === 'open')].sort((a, b) => a.priority - b.priority)
  const done = tasks.filter(t => t.status === 'done')
  const isMutating = markDone.isPending || add.isPending || reorder.isPending

  if (isLoading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#3D4152' }}>Loading tasks from GitHub…</p>
    </div>
  )

  if (isError) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24 }}>
      <span style={{ fontSize: 36, opacity: 0.4 }}>⚠️</span>
      <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#EF4444', margin: 0 }}>Failed to load tasks</p>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3D4152', margin: 0, textAlign: 'center' }}>
        {error?.message || 'Unknown error'}
      </p>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3D4152', margin: 0, textAlign: 'center' }}>
        Check VITE_GITHUB_PAT in .env.local (local) or Actions secrets (deployed)
      </p>
    </div>
  )

  // ── MOBILE-FIRST LAYOUT ──
  const isMobile = window.innerWidth < 768

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar title="Tasks" subtitle={`${open.length} open · ${done.length} done`} onMenuClick={onMenuClick}>
        {isMutating && (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4F8EF7', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#4F8EF7', animation: 'pulse 1s ease-in-out infinite' }} />
            Saving…
          </span>
        )}
      </Topbar>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 12px 100px' : '16px 20px 20px' }}>

        {/* ADD TASK — prominent on mobile */}
        <div style={{
          background: '#0E1016', border: '1px solid #252840', borderRadius: 12,
          padding: isMobile ? '12px' : '14px 16px',
          marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <span style={{ fontSize: 18 }}>+</span>
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Add a task… (tap Enter to save)"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              fontFamily: 'IBM Plex Sans, sans-serif',
              fontSize: isMobile ? 16 : 14, /* 16px prevents iOS zoom */
              color: '#E8EAEF', outline: 'none',
            }}
          />
          {newText.trim() && (
            <button
              onClick={() => { add.mutate(newText.trim()); setNewText('') }}
              disabled={add.isPending}
              style={{
                background: '#4F8EF7', color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13,
                minHeight: 44, /* touch target */
              }}
            >
              {add.isPending ? '…' : 'Save'}
            </button>
          )}
        </div>

        {/* OPEN TASKS */}
        {open.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#3D4152', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
            No open tasks — add one above
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: '#3D4152', margin: '0 0 4px' }}>
              OPEN — {open.length} tasks
            </p>
            {open.map((task, idx) => (
              <TaskRow
                key={task.id}
                task={task}
                idx={idx}
                total={open.length}
                isMobile={isMobile}
                onDone={() => markDone.mutate(task.id)}
                onMoveUp={() => idx > 0 && reorder.mutate({ idA: task.id, idB: open[idx-1].id })}
                onMoveDown={() => idx < open.length-1 && reorder.mutate({ idA: task.id, idB: open[idx+1].id })}
                isProcessing={markDone.isPending || reorder.isPending}
              />
            ))}
          </div>
        )}

        {/* DONE TASKS */}
        {done.length > 0 && (
          <div style={{ opacity: 0.5 }}>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: '#3D4152', margin: '0 0 6px' }}>
              COMPLETED — {done.length}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {done.slice(0, 5).map(task => (
                <div key={task.id} style={{
                  background: '#0E1016', border: '1px solid #1C1F2E', borderRadius: 10,
                  padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#10B981', flexShrink: 0 }}>✓</div>
                  <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, color: '#3D4152', margin: 0, textDecoration: 'line-through' }}>{task.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function TaskRow({ task, idx, total, isMobile, onDone, onMoveUp, onMoveDown, isProcessing }) {
  const pColor = P_COLOR[task.priority] || '#3D4152'
  const pBg    = P_BG[task.priority]   || '#13151D'

  return (
    <div style={{
      background: '#0E1016', border: '1px solid #1C1F2E', borderRadius: 12,
      padding: isMobile ? '14px 12px' : '12px 14px',
      display: 'flex', alignItems: 'flex-start', gap: isMobile ? 12 : 10,
    }}>
      {/* Done checkbox — large enough to tap */}
      <button
        onClick={onDone}
        disabled={isProcessing}
        style={{
          width: 24, height: 24, minWidth: 24, /* bigger tap target */
          borderRadius: 6, border: '1.5px solid #252840',
          background: 'none', cursor: 'pointer', flexShrink: 0,
          marginTop: 1, padding: 0,
        }}
        aria-label="Mark complete"
      />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'IBM Plex Sans, sans-serif',
          fontSize: isMobile ? 15 : 13,
          color: '#C4C9D4', margin: '0 0 4px', lineHeight: 1.4,
          wordBreak: 'break-word',
        }}>
          {task.text}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
            padding: '2px 7px', borderRadius: 4,
            border: `1px solid ${pColor}50`,
            color: pColor, background: pBg,
          }}>
            P{task.priority}
          </span>
          {task.due && <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#F5A623' }}>Due {task.due}</span>}
          {task.source !== 'manual' && <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3D4152' }}>From {task.source}</span>}
        </div>
      </div>

      {/* Reorder — vertical on mobile, visible arrows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <button
          onClick={onMoveUp}
          disabled={idx === 0 || isProcessing}
          style={{
            width: isMobile ? 36 : 28, height: isMobile ? 28 : 22,
            background: idx === 0 ? 'transparent' : '#13151D',
            border: `1px solid ${idx === 0 ? 'transparent' : '#1C1F2E'}`,
            borderRadius: 6, cursor: idx === 0 ? 'default' : 'pointer',
            color: idx === 0 ? '#1C1F2E' : '#6B7280', fontSize: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Move up"
        >▲</button>
        <button
          onClick={onMoveDown}
          disabled={idx === total - 1 || isProcessing}
          style={{
            width: isMobile ? 36 : 28, height: isMobile ? 28 : 22,
            background: idx === total - 1 ? 'transparent' : '#13151D',
            border: `1px solid ${idx === total - 1 ? 'transparent' : '#1C1F2E'}`,
            borderRadius: 6, cursor: idx === total - 1 ? 'default' : 'pointer',
            color: idx === total - 1 ? '#1C1F2E' : '#6B7280', fontSize: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Move down"
        >▼</button>
      </div>
    </div>
  )
}
