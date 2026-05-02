// frontend/src/App.jsx
import { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Sidebar from './components/Sidebar'
import MorningBrief from './pages/MorningBrief'
import Inbox from './pages/Inbox'
import Tasks from './pages/Tasks'
import Meetings from './pages/Meetings'
import Metrics from './pages/Metrics'
import CompetitiveIntel from './pages/CompetitiveIntel'
import './styles/globals.css'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', position: 'relative', background: '#08090C' }}>
      {/* Backdrop — mobile only, closes sidebar on tap */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 150,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Routes>
          <Route path="/"         element={<MorningBrief onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/inbox"    element={<Inbox        onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/tasks"    element={<Tasks        onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/meetings" element={<Meetings     onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/metrics"  element={<Metrics      onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/intel"    element={<CompetitiveIntel onMenuClick={() => setSidebarOpen(true)} />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Layout />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
