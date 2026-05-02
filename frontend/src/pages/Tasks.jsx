// frontend/src/pages/Tasks.jsx
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTasks, patchTask, createTask, swapTaskPriorities } from '../lib/github'
import Topbar from '../components/Topbar'

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

const PRIORITY_META = {
  1: { label: 'P1', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  2: { label: 'P2', color: '#F5A623', bg: 'rgba(245,166,35,0.12)' },
  3: { label: 'P3', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  4: { label: 'P4', color: '#4F8EF7', bg: 'rgba(79,142,247,0.12)' },
  5: { label: 'P5', color: '#3D4152', bg: 'rgba(61,65,82,0.12)' },
}

// ── TOAST ──────────────────────────────────────────────
function Toast({ message, type, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 5000); return () => clearTimeout(t) }, [onDismiss])
  return (
    <div onClick={onDismiss} style={{
      position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)',
      background: type === 'error' ? C.red : C.green,
      color: '#fff', padding: '10px 20px', borderRadius: 8,
      fontFamily: MONO, fontSize: 12, zIndex: 9999,
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)', cursor: 'pointer',
      maxWidth: '90vw', textAlign: 'center', lineHeight: 1.4,
    }}>{message}</div>
  )
}

// ── COMPLETION CONFIRM ──────────────────────────────────
function ConfirmDone({ task, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      zIndex: 9000, display: 'flex', alignItems: 'flex-end',
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: C.surface,
        borderTop: `1px solid ${C.border2}`,
        borderRadius: '16px 16px 0 0',
        padding: '20px 20px max(20px, env(safe-area-inset-bottom))',
      }}>
        <div style={{ width: 36, height: 4, background: C.border2, borderRadius: 2, margin: '0 auto 20px' }} />
        <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: C.primary, margin: '0 0 8px' }}>
          Mark as complete?
        </p>
        <p style={{ fontFamily: SANS, fontSize: 14, color: C.secondary, margin: '0 0 24px', lineHeight: 1.5 }}>
          "{task.text}"
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, minHeight: 50, background: C.surface2, border: `1px solid ${C.border}`,
            borderRadius: 12, color: C.secondary,
            fontFamily: DISP, fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, minHeight: 50, background: C.green, border: 'none',
            borderRadius: 12, color: '#fff',
            fontFamily: DISP, fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}>✓ Done</button>
        </div>
      </div>
    </div>
  )
}

// ── TASK EDIT SHEET ─────────────────────────────────────
function TaskEditSheet({ task, onSave, onClose }) {
  const [text,     setText]     = useState(task.text || '')
  const [priority, setPriority] = useState(task.priority || 1)
  const [category, setCategory] = useState(task.category || null)
  const [due,      setDue]      = useState(task.due || '')
  const [dueTime,  setDueTime]  = useState(task.due_time || '')
  const textRef = useRef(null)

  useEffect(() => { setTimeout(() => textRef.current?.focus(), 100) }, [])

  const hasChanges =
    text.trim() !== task.text || priority !== task.priority ||
    category !== (task.category || null) ||
    due !== (task.due || '') || dueTime !== (task.due_time || '')

  const handleSave = () => {
    if (!text.trim()) return
    onSave({ text: text.trim(), priority, category: category || null, due: due || null, due_time: dueTime || null })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      zIndex: 8000, display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxHeight: '92dvh', overflowY: 'auto',
        background: C.surface, borderTop: `1px solid ${C.border2}`,
        borderRadius: '16px 16px 0 0',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      }}>
        {/* Handle */}
        <div style={{ padding: '14px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, background: C.border2, borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 18px' }}>
          <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: C.primary, margin: 0 }}>Edit Task</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 22, padding: '2px 6px', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Text */}
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: C.muted, display: 'block', marginBottom: 8 }}>Task</label>
            <textarea
              ref={textRef}
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              style={{
                width: '100%', background: C.surface2, border: `1px solid ${C.border2}`,
                borderRadius: 10, padding: '12px 14px',
                fontFamily: SANS, fontSize: 15, color: C.primary,
                outline: 'none', resize: 'none', lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Priority */}
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: C.muted, display: 'block', marginBottom: 8 }}>Priority</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2,3,4,5].map(p => {
                const m = PRIORITY_META[p]
                const active = priority === p
                return (
                  <button key={p} onClick={() => setPriority(p)} style={{
                    flex: 1, minHeight: 46, cursor: 'pointer',
                    background: active ? m.bg : C.surface2,
                    border: `1.5px solid ${active ? m.color + '70' : C.border}`,
                    borderRadius: 10,
                    fontFamily: MONO, fontWeight: 700, fontSize: 13,
                    color: active ? m.color : C.muted,
                    transition: 'all 0.12s',
                  }}>{m.label}</button>
                )
              })}
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: C.muted, display: 'block', marginBottom: 8 }}>Category</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'internal', label: '🏢 Internal', color: C.blue },
                { value: 'external', label: '🌐 External', color: C.purple },
              ].map(opt => {
                const active = category === opt.value
                return (
                  <button key={opt.value}
                    onClick={() => setCategory(active ? null : opt.value)}
                    style={{
                      flex: 1, minHeight: 46, cursor: 'pointer',
                      background: active ? opt.color + '20' : C.surface2,
                      border: `1.5px solid ${active ? opt.color + '60' : C.border}`,
                      borderRadius: 10,
                      fontFamily: SANS, fontWeight: 500, fontSize: 14,
                      color: active ? opt.color : C.muted,
                      transition: 'all 0.12s',
                    }}>{opt.label}</button>
                )
              })}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: C.muted, display: 'block', marginBottom: 8 }}>Deadline</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="date" value={due} onChange={e => setDue(e.target.value)} style={{
                flex: 1, minHeight: 46, background: C.surface2, border: `1px solid ${due ? C.amber + '60' : C.border2}`,
                borderRadius: 10, padding: '0 12px',
                fontFamily: MONO, fontSize: 13, color: due ? C.amber : C.muted,
                outline: 'none', colorScheme: 'dark',
              }} />
              <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} style={{
                width: 110, minHeight: 46, background: C.surface2, border: `1px solid ${dueTime ? C.amber + '60' : C.border2}`,
                borderRadius: 10, padding: '0 10px',
                fontFamily: MONO, fontSize: 13, color: dueTime ? C.amber : C.muted,
                outline: 'none', colorScheme: 'dark',
              }} />
            </div>
            {(due || dueTime) && (
              <button onClick={() => { setDue(''); setDueTime('') }} style={{
                background: 'none', border: 'none', color: C.muted,
                cursor: 'pointer', fontFamily: MONO, fontSize: 10, padding: '6px 0',
              }}>Clear deadline ×</button>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingBottom: 8 }}>
            <button onClick={onClose} style={{
              flex: 1, minHeight: 52, background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: 12, color: C.secondary,
              fontFamily: DISP, fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={handleSave} disabled={!text.trim() || !hasChanges} style={{
              flex: 2, minHeight: 52,
              background: (text.trim() && hasChanges) ? C.blue : C.surface2,
              border: 'none', borderRadius: 12,
              color: (text.trim() && hasChanges) ? '#fff' : C.muted,
              fontFamily: DISP, fontWeight: 700, fontSize: 15,
              cursor: (text.trim() && hasChanges) ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── TASK ROW ────────────────────────────────────────────
function TaskRow({ task, idx, total, onEdit, onDoneRequest, onMoveUp, onMoveDown }) {
  const pm = PRIORITY_META[task.priority] || PRIORITY_META[5]
  const isMobile = window.innerWidth < 768

  const formatDeadline = () => {
    if (!task.due) return null
    const d = new Date(task.due + (task.due_time ? `T${task.due_time}` : 'T23:59'))
    const now = new Date()
    const overdue = d < now
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const sameDay = d.toDateString() === now.toDateString()
    const isTomorrow = d.toDateString() === tomorrow.toDateString()
    let label = sameDay ? 'Today' : isTomorrow ? 'Tomorrow'
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    if (task.due_time) label += ` ${task.due_time}`
    return { label, overdue }
  }
  const deadline = formatDeadline()

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: isMobile ? '14px 10px' : '12px 14px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      {/* Checkbox */}
      <button onClick={onDoneRequest} style={{
        width: 24, height: 24, minWidth: 24, borderRadius: 6,
        border: `1.5px solid ${C.border2}`, background: 'none',
        cursor: 'pointer', flexShrink: 0, marginTop: 2, padding: 0,
      }} aria-label="Mark complete" />

      {/* Content — tap to edit */}
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onEdit}>
        <p style={{
          fontFamily: SANS, fontSize: isMobile ? 15 : 13,
          color: C.primary, margin: '0 0 6px', lineHeight: 1.4, wordBreak: 'break-word',
        }}>{task.text}</p>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            fontFamily: MONO, fontSize: 9, padding: '2px 6px', borderRadius: 4,
            border: `1px solid ${pm.color}50`, color: pm.color, background: pm.bg,
          }}>{pm.label}</span>
          {task.category && (
            <span style={{
              fontFamily: MONO, fontSize: 9, padding: '2px 6px', borderRadius: 4,
              color: task.category === 'internal' ? C.blue : C.purple,
              background: task.category === 'internal' ? 'rgba(79,142,247,0.1)' : 'rgba(167,139,250,0.1)',
              border: `1px solid ${task.category === 'internal' ? C.blue : C.purple}40`,
            }}>{task.category === 'internal' ? '🏢' : '🌐'} {task.category}</span>
          )}
          {deadline && (
            <span style={{
              fontFamily: MONO, fontSize: 9, padding: '2px 6px', borderRadius: 4,
              color: deadline.overdue ? C.red : C.amber,
              background: deadline.overdue ? 'rgba(239,68,68,0.1)' : 'rgba(245,166,35,0.1)',
              border: `1px solid ${deadline.overdue ? C.red : C.amber}40`,
            }}>{deadline.overdue ? '⚠ ' : '⏰ '}{deadline.label}</span>
          )}
          {task.source && task.source !== 'manual' && (
            <span style={{ fontFamily: MONO, fontSize: 9, color: C.muted }}>from {task.source}</span>
          )}
        </div>
        <p style={{ fontFamily: MONO, fontSize: 9, color: C.border2, margin: '5px 0 0' }}>Tap to edit →</p>
      </div>

      {/* Reorder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        {[{dir:'up', dis: idx===0, lbl:'▲'}, {dir:'down', dis: idx===total-1, lbl:'▼'}].map(btn => (
          <button key={btn.dir}
            onClick={btn.dir==='up' ? onMoveUp : onMoveDown}
            disabled={btn.dis}
            style={{
              width: isMobile ? 32 : 26, height: isMobile ? 26 : 20,
              background: btn.dis ? 'transparent' : C.surface2,
              border: `1px solid ${btn.dis ? 'transparent' : C.border}`,
              borderRadius: 5, cursor: btn.dis ? 'default' : 'pointer',
              color: btn.dis ? C.border : C.secondary, fontSize: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{btn.lbl}</button>
        ))}
      </div>
    </div>
  )
}

// ── MAIN PAGE ───────────────────────────────────────────
export default function Tasks() {
  const [newText,     setNewText]     = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const [confirmTask, setConfirmTask] = useState(null)
  const [toast,       setToast]       = useState(null)

  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks'] })
  const showError  = msg => setToast({ message: msg, type: 'error' })
  const showOk     = msg => setToast({ message: msg, type: 'success' })

  const { data: tasks = [], isLoading, isError, error } = useQuery({
    queryKey: ['tasks'], queryFn: fetchTasks, staleTime: 30_000,
  })

  const markDone = useMutation({
    mutationFn: id => patchTask(id, { status: 'done', completed_at: new Date().toISOString() }),
    onSuccess: () => { invalidate(); showOk('Marked done ✓') },
    onError:   e => showError(`Failed: ${e.message}`),
  })

  const update = useMutation({
    mutationFn: ({ id, patch }) => patchTask(id, patch),
    onSuccess: () => { invalidate(); showOk('Saved ✓') },
    onError:   e => showError(`Save failed: ${e.message}`),
  })

  const add = useMutation({
    mutationFn: createTask,
    onSuccess: () => { invalidate(); showOk('Task added ✓') },
    onError:   e => showError(`Could not save: ${e.message}`),
  })

  const reorder = useMutation({
    mutationFn: ({ idA, idB }) => swapTaskPriorities(idA, idB),
    onSuccess: invalidate,
    onError:   e => showError(`Reorder failed: ${e.message}`),
  })

  const handleAddKey   = e => { if (e.key === 'Enter' && newText.trim()) { add.mutate(newText.trim()); setNewText('') } }
  const handleSaveEdit = patch => { update.mutate({ id: editingTask.id, patch }); setEditingTask(null) }
  const handleDone     = () => { markDone.mutate(confirmTask.id); setConfirmTask(null) }

  const open = [...tasks.filter(t => t.status === 'open')].sort((a,b) => a.priority - b.priority)
  const done = tasks.filter(t => t.status === 'done')
  const isMutating = markDone.isPending || update.isPending || add.isPending || reorder.isPending
  const isMobile   = window.innerWidth < 768

  if (isLoading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ fontFamily:MONO, fontSize:12, color:C.muted }}>Loading from GitHub…</p>
    </div>
  )

  if (isError) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, padding:24 }}>
      <span style={{ fontSize:36, opacity:0.4 }}>⚠️</span>
      <p style={{ fontFamily:DISP, fontWeight:700, fontSize:16, color:C.red, margin:0 }}>Failed to load tasks</p>
      <p style={{ fontFamily:MONO, fontSize:11, color:C.muted, margin:0, textAlign:'center' }}>{error?.message}</p>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <Topbar title="Tasks" subtitle={`${open.length} open · ${done.length} done`}>
        {isMutating && (
          <span style={{ fontFamily:MONO, fontSize:10, color:C.blue, display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:C.blue, display:'inline-block' }} />
            Saving…
          </span>
        )}
      </Topbar>

      <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '12px 12px 100px' : '16px 20px 24px' }}>

        {/* ADD TASK */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border2}`,
          borderRadius: 12, padding: '12px 14px', marginBottom: 14,
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <span style={{ color: C.muted, fontSize: 18, lineHeight: 1 }}>+</span>
          <input
            value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={handleAddKey}
            placeholder="Add a task… press Enter to save"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              fontFamily: SANS, fontSize: isMobile ? 16 : 14,
              color: C.primary, outline: 'none',
            }}
          />
          {newText.trim() && (
            <button onClick={() => { add.mutate(newText.trim()); setNewText('') }} disabled={add.isPending}
              style={{
                background: C.blue, color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
                fontFamily: DISP, fontWeight: 700, fontSize: 13, minHeight: 40,
              }}>Save</button>
          )}
        </div>

        {/* OPEN */}
        {open.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontFamily: MONO, fontSize: 11 }}>
            No open tasks — add one above
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: C.muted, margin: '0 0 8px' }}>
              OPEN — {open.length}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {open.map((task, idx) => (
                <TaskRow key={task.id} task={task} idx={idx} total={open.length}
                  onEdit={() => setEditingTask(task)}
                  onDoneRequest={() => setConfirmTask(task)}
                  onMoveUp={()   => idx > 0            && reorder.mutate({ idA: task.id, idB: open[idx-1].id })}
                  onMoveDown={()  => idx < open.length-1 && reorder.mutate({ idA: task.id, idB: open[idx+1].id })}
                />
              ))}
            </div>
          </div>
        )}

        {/* DONE */}
        {done.length > 0 && (
          <div style={{ opacity: 0.5 }}>
            <p style={{ fontFamily: MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: C.muted, margin: '0 0 8px' }}>
              COMPLETED — {done.length}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {done.slice(0, 8).map(task => (
                <div key={task.id} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: '11px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', fontSize: 10, color: C.green }}>✓</div>
                  <p style={{ fontFamily: SANS, fontSize: 13, color: C.muted, margin: 0, textDecoration: 'line-through', flex: 1 }}>{task.text}</p>
                  {task.category && <span style={{ fontFamily: MONO, fontSize: 9, color: C.muted }}>{task.category === 'internal' ? '🏢' : '🌐'}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {confirmTask && <ConfirmDone task={confirmTask} onConfirm={handleDone} onCancel={() => setConfirmTask(null)} />}
      {editingTask  && <TaskEditSheet task={editingTask} onSave={handleSaveEdit} onClose={() => setEditingTask(null)} />}
      {toast        && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
