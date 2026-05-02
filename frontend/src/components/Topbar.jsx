// frontend/src/components/Topbar.jsx
export default function Topbar({ title, subtitle, children }) {
  return (
    <header style={{
      height: 48, borderBottom: '1px solid #1C1F2E',
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
      background: 'rgba(8,9,12,0.9)', backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, margin: 0, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
        {subtitle && <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3D4152', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</p>}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {children}
      </div>
    </header>
  )
}
