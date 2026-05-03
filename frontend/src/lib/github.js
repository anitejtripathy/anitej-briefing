// frontend/src/lib/github.js

const PAT = import.meta.env.VITE_GITHUB_PAT
const REPO = import.meta.env.VITE_GITHUB_DATA_REPO
const BASE = `https://api.github.com/repos/${REPO}/contents/data`

const headers = {
  Authorization: `token ${PAT}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
}

// Read a JSON file from the data repo
export async function readJson(relativePath) {
  const res = await fetch(`${BASE}/${relativePath}`, { headers })
  if (res.status === 404) return { data: [], sha: null }
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} on ${relativePath}`)
  const json = await res.json()
  const bytes = Uint8Array.from(atob(json.content.replace(/\n/g, '')), c => c.charCodeAt(0))
  const data  = JSON.parse(new TextDecoder('utf-8').decode(bytes))
  return { data, sha: json.sha }
}

// Write (overwrite) a JSON file, creating a git commit
export async function writeJson(relativePath, data, message) {
  const { sha } = await readJson(relativePath)
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))))
  const body = { message, content }
  if (sha) body.sha = sha
  const res = await fetch(`${BASE}/${relativePath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`GitHub write error: ${res.status} on ${relativePath}`)
  return res.json()
}

// Fetch all tasks from tasks/tasks.json
export async function fetchTasks() {
  const { data } = await readJson('tasks/tasks.json')
  return Array.isArray(data) ? data : []
}

// Update a single task field and commit
export async function patchTask(taskId, patch) {
  const { data: tasks } = await readJson('tasks/tasks.json')
  const target = tasks.find(t => t.id === taskId)
  if (!target) throw new Error(`Task not found: ${taskId}`)
  const updated = tasks.map(t => t.id === taskId ? { ...t, ...patch } : t)
  await writeJson('tasks/tasks.json', updated, `chore(tasks): update ${taskId}`)
  return updated.find(t => t.id === taskId)
}

// Append a new task and commit
export async function createTask(text) {
  const { data: tasks } = await readJson('tasks/tasks.json')
  const open = tasks.filter(t => t.status === 'open')
  const maxPriority = open.length ? Math.max(...open.map(t => t.priority)) : 0
  const newTask = {
    id: crypto.randomUUID(),
    text,
    source: 'manual',
    source_ref: null,
    priority: maxPriority + 1,
    status: 'open',
    category: null,
    due: null,
    due_time: null,
    snooze_until: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  }
  await writeJson('tasks/tasks.json', [...tasks, newTask], 'chore(tasks): add new task')
  return newTask
}

// Swap priorities of two tasks (for reordering)
export async function swapTaskPriorities(idA, idB) {
  if (idA === idB) return  // no-op, skip the write
  const { data: tasks } = await readJson('tasks/tasks.json')
  const taskA = tasks.find(t => t.id === idA)
  const taskB = tasks.find(t => t.id === idB)
  if (!taskA || !taskB) throw new Error(`Task not found: ${idA} or ${idB}`)
  const updated = tasks.map(t => {
    if (t.id === idA) return { ...t, priority: taskB.priority }
    if (t.id === idB) return { ...t, priority: taskA.priority }
    return t
  })
  await writeJson('tasks/tasks.json', updated, `chore(tasks): reorder ${idA} ↔ ${idB}`)
}

// Fetch classified inbox items from the last N days, merged + sorted newest first
export async function fetchInbox(days = 3) {
  const results = []
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]

    const [emails, slack, devrev] = await Promise.all([
      readJson(`inbox/emails-${dateStr}.json`).catch(() => ({ data: [] })),
      readJson(`inbox/slack-${dateStr}.json`).catch(() => ({ data: [] })),
      readJson(`inbox/devrev-${dateStr}.json`).catch(() => ({ data: [] })),
    ])

    results.push(
      ...(Array.isArray(emails.data) ? emails.data : []),
      ...(Array.isArray(slack.data) ? slack.data : []),
      ...(Array.isArray(devrev.data) ? devrev.data : []),
    )
  }

  return results
    .filter(item => item.bucket !== 'noise' && item.bucket !== 'unclassified')
    .sort((a, b) => new Date(b.received_at) - new Date(a.received_at))
}

// Fetch morning brief markdown for a given date (defaults to today)
export async function fetchBrief(dateStr = null) {
  const d    = dateStr || new Date().toISOString().split('T')[0]
  const REPO = import.meta.env.VITE_GITHUB_DATA_REPO
  const PAT  = import.meta.env.VITE_GITHUB_PAT
  const res  = await fetch(
    `https://api.github.com/repos/${REPO}/contents/data/briefs/${d}.md`,
    { headers: { Authorization: `token ${PAT}`, Accept: 'application/vnd.github.v3+json' } }
  )
  if (res.status === 404) return { markdown: null, date: d }
  if (!res.ok) throw new Error(`Brief fetch error: ${res.status}`)
  const json     = await res.json()
  const bytes    = Uint8Array.from(atob(json.content.replace(/\n/g, '')), c => c.charCodeAt(0))
  const markdown = new TextDecoder('utf-8').decode(bytes)
  return { markdown, date: d }
}

// Add a task from an inbox item
export async function createTaskFromInboxItem(item, text) {
  const { data: tasks } = await readJson('tasks/tasks.json')
  const open = tasks.filter(t => t.status === 'open')
  const maxPriority = open.length ? Math.max(...open.map(t => t.priority)) : 0
  const newTask = {
    id: crypto.randomUUID(),
    text,
    source: item.source,
    source_ref: item.id,
    priority: item.is_vip ? Math.min(maxPriority + 1, 2) : maxPriority + 1,
    status: 'open',
    category: null,
    due: null,
    due_time: null,
    snooze_until: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  }
  await writeJson('tasks/tasks.json', [...tasks, newTask], `chore(tasks): add task from ${item.source}`)
  return newTask
}
