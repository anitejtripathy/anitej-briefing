// frontend/src/pages/Meetings.jsx
import Topbar from '../components/Topbar'
export default function Meetings({ onMenuClick }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Topbar title="Meeting Intelligence" subtitle="Calendar · Transcripts — Phase 3" onMenuClick={onMenuClick} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 64 }}>
        <span style={{ fontSize: 48, opacity: 0.2 }}>📅</span>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: '#3D4152', margin: 0 }}>Meeting Intelligence</p>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3D4152', margin: 0 }}>Calendar · Transcripts — Phase 3</p>
      </div>
    </div>
  )
}
