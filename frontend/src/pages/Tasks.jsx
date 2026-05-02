// frontend/src/pages/Tasks.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTasks, patchTask, createTask, swapTaskPriorities } from '../lib/github'
import Topbar from '../components/Topbar'

const PRIORITY_COLORS = { 1: '#EF4444', 2: '#F5A623' }

export default function Tasks() {
  const [newText, setNewText] = useState('')
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks'] })

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    staleTime: 30_000,
  })

  const markDone = useMutation({
    mutationFn: (id) => patchTask(id, { status: 'done', completed_at: new Date().toISOString() }),
    onSuccess: invalidate,
  })

  const add = useMutation({
    mutationFn: createTask,
    onSuccess: invalidate,
  })

  const reorder = useMutation({
    mutationFn: ({ idA, idB }) => swapTaskPriorities(idA, idB),
    onSuccess: invalidate,
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
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3D4152' }}>Loading from GitHub…</p>
    </div>
  )

  if (isError) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#EF4444' }}>Failed to load. Check VITE_GITHUB_PAT in .env.local</p>
    </div>
  )

  const cardStyle = { background: '#0E1016', border: '1px solid #1C1F2E', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }
  const headerStyle = { padding: '8px 12px', background: '#13151D', borderBottom: '1px solid #1C1F2E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
  const rowStyle = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px', borderBottom: '1px solid #1C1F2E' }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar title="Tasks" subtitle={`${open.length} open · ${done.length} done`}>
        {isMutating && <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4F8EF7' }}>Saving…</span>}
      </Topbar>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 80px' }}>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, fontWeight: 500, color: '#EF4444' }}>Open</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3D4152' }}>{open.length} tasks</span>
          </div>

          {open.map((task, idx) => (
            <div key={task.id} style={rowStyle}>
              {/* Priority arrows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                <button onClick={() => idx > 0 && reorder.mutate({ idA: task.id, idB: open[idx-1].id })}
                  disabled={idx === 0}
                  style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: '#3D4152', fontSize: 10, padding: '1px 3px', opacity: idx === 0 ? 0.2 : 1 }}>▲</button>
                <button onClick={() => idx < open.length-1 && reorder.mutate({ idA: task.id, idB: open[idx+1].id })}
                  disabled={idx === open.length-1}
                  style={{ background: 'none', border: 'none', cursor: idx === open.length-1 ? 'default' : 'pointer', color: '#3D4152', fontSize: 10, padding: '1px 3px', opacity: idx === open.length-1 ? 0.2 : 1 }}>▼</button>
              </div>

              {/* Checkbox */}
              <button onClick={() => markDone.mutate(task.id)}
                style={{ width: 16, height: 16, borderRadius: 3, border: '1.5px solid #252840', background: 'none', cursor: 'pointer', flexShrink: 0, marginTop: 1 }} />

              {/* Priority badge */}
              <span style={{
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
                padding: '2px 6px', borderRadius: 3, flexShrink: 0, marginTop: 1,
                border: `1px solid ${PRIORITY_COLORS[task.priority] ? PRIORITY_COLORS[task.priority] + '50' : '#1C1F2E'}`,
                color: PRIORITY_COLORS[task.priority] || '#3D4152',
                background: PRIORITY_COLORS[task.priority] ? PRIORITY_COLORS[task.priority] + '18' : '#13151D',
              }}>P{task.priority}</span>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.4 }}>{task.text}</p>
                {task.due && <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#F5A623', margin: '3px 0 0' }}>Due {task.due}</p>}
                {task.source !== 'manual' && <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#3D4152', margin: '2px 0 0' }}>From {task.source}</p>}
              </div>
            </div>
          ))}

          {/* Add task input */}
          <div style={{ padding: '10px 12px', background: '#0E1016', borderTop: '1px solid #1C1F2E' }}>
            <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={handleKey}
              placeholder="+ Add a task… (press Enter)"
              style={{
                width: '100%', background: '#13151D', border: '1px solid #1C1F2E',
                borderRadius: 7, padding: '8px 12px',
                fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, color: '#E8EAEF',
                outline: 'none',
              }} />
          </div>
        </div>

        {done.length > 0 && (
          <div style={{ ...cardStyle, opacity: 0.5 }}>
            <div style={headerStyle}>
              <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, fontWeight: 500, color: '#3D4152' }}>Completed ({done.length})</span>
            </div>
            {done.slice(0, 5).map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid #1C1F2E' }}>
                <div style={{ width: 16, height: 16, borderRadius: 3, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, color: '#10B981', fontWeight: 700 }}>✓</div>
                <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#3D4152', margin: 0, textDecoration: 'line-through' }}>{task.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
