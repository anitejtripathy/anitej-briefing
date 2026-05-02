// frontend/src/pages/Metrics.jsx
import Topbar from '../components/Topbar'
export default function Metrics() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Topbar title="Metrics Dashboard" subtitle="SSO / Login · Trino — Phase 3" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 64 }}>
        <span style={{ fontSize: 48, opacity: 0.2 }}>📊</span>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: '#3D4152', margin: 0 }}>Metrics Dashboard</p>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3D4152', margin: 0 }}>SSO / Login · Trino — Phase 3</p>
      </div>
    </div>
  )
}
