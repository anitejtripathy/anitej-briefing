// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import MorningBrief from './pages/MorningBrief'
import Inbox from './pages/Inbox'
import Tasks from './pages/Tasks'
import Meetings from './pages/Meetings'
import Metrics from './pages/Metrics'
import CompetitiveIntel from './pages/CompetitiveIntel'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div style={{
          display: 'flex', height: '100dvh', /* dynamic viewport height — fixes iOS safari */
          overflow: 'hidden', position: 'relative',
        }}>
          <Sidebar />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <Routes>
              <Route path="/"         element={<MorningBrief />} />
              <Route path="/inbox"    element={<Inbox />} />
              <Route path="/tasks"    element={<Tasks />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/metrics"  element={<Metrics />} />
              <Route path="/intel"    element={<CompetitiveIntel />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
