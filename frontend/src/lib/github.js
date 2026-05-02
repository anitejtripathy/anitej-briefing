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
  const data = JSON.parse(atob(json.content.replace(/\n/g, '')))
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
    due: null,
    snooze_until: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  }
  await writeJson('tasks/tasks.json', [...tasks, newTask], 'chore(tasks): add new task')
  return newTask
}

// Swap priorities of two tasks (for reordering)
export async function swapTaskPriorities(idA, idB) {
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
