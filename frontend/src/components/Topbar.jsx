// frontend/src/components/Topbar.jsx
export default function Topbar({ title, subtitle, onMenuClick, children }) {
  return (
    <>
      <style>{`
        .topbar-hamburger { display: none; }
        @media (max-width: 767px) { .topbar-hamburger { display: flex; } }
      `}</style>
      <header style={{
        height: 48, borderBottom: '1px solid #1C1F2E',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10,
        background: 'rgba(8,9,12,0.9)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 20, flexShrink: 0,
      }}>
        <button
          className="topbar-hamburger"
          onClick={onMenuClick}
          aria-label="Open menu"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#6B7280', padding: '4px 6px', borderRadius: 6,
            flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ display: 'block', width: 18, height: 2, background: 'currentColor', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 18, height: 2, background: 'currentColor', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 18, height: 2, background: 'currentColor', borderRadius: 2 }} />
        </button>

        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, margin: 0, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#E8EAEF' }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3D4152', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subtitle}
            </p>
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {children}
        </div>
      </header>
    </>
  )
}
