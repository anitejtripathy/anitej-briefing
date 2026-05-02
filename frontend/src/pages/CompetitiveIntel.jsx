// frontend/src/pages/CompetitiveIntel.jsx
import Topbar from '../components/Topbar'
export default function CompetitiveIntel() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Topbar title="Competitive Intel" subtitle="GoKwik · Shiprocket · Shopflo — Phase 4" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 64 }}>
        <span style={{ fontSize: 48, opacity: 0.2 }}>🔍</span>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: '#3D4152', margin: 0 }}>Competitive Intel</p>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3D4152', margin: 0 }}>GoKwik · Shiprocket · Shopflo — Phase 4</p>
      </div>
    </div>
  )
}
