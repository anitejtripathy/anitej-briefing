// frontend/src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/',         icon: '🌅', label: 'Morning Brief', section: 'Today' },
  { to: '/inbox',    icon: '📬', label: 'Inbox',          section: null },
  { to: '/tasks',    icon: '✅', label: 'Tasks',           section: null },
  { to: '/meetings', icon: '📅', label: 'Meetings',        section: null },
  { to: '/metrics',  icon: '📊', label: 'Metrics',         section: 'Analytics' },
  { to: '/intel',    icon: '🔍', label: 'Competitive Intel', section: 'Intelligence' },
]

const styles = {
  sidebar: {
    width: 224, minHeight: '100vh',
    borderRight: '1px solid #1C1F2E',
    background: 'rgba(8,9,12,0.96)',
    display: 'flex', flexDirection: 'column',
    flexShrink: 0, position: 'relative', zIndex: 10,
  },
  logoWrap: { padding: '20px 16px 12px', borderBottom: '1px solid #1C1F2E' },
  logoMark: { fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 8 },
  logoDot: { width: 7, height: 7, borderRadius: '50%', background: '#4F8EF7', boxShadow: '0 0 8px #4F8EF7', animation: 'pulse 2s ease-in-out infinite' },
  logoSub: { fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: '#3D4152', marginTop: 2 },
  syncChip: { display: 'flex', alignItems: 'center', gap: 6, margin: '8px 16px', padding: '6px 10px', background: '#0E1016', border: '1px solid #1C1F2E', borderRadius: 6 },
  syncDot: { width: 5, height: 5, borderRadius: '50%', background: '#10B981' },
  syncText: { fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#3D4152' },
  nav: { flex: 1, padding: '8px 10px' },
  sectionLabel: { fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#3D4152', padding: '12px 6px 4px' },
  footer: { padding: '12px 16px', borderTop: '1px solid #1C1F2E' },
  footerDate: { fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3D4152' },
}

const navActiveStyle = { color: '#fff', background: 'rgba(79,142,247,0.08)', borderColor: 'rgba(79,142,247,0.2)', borderLeft: '2px solid #4F8EF7' }
const navInactiveStyle = { color: '#3D4152', background: 'transparent', borderColor: 'transparent' }

export default function Sidebar() {
  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 8px #4F8EF7}50%{box-shadow:0 0 16px #4F8EF7,0 0 24px rgba(79,142,247,0.25)}}
        .sidebar-root { display: flex; }
        @media (max-width: 767px) { .sidebar-root { display: none; } }
      `}</style>
      <aside className="sidebar-root" style={styles.sidebar}>
        <div style={styles.logoWrap}>
          <div style={styles.logoMark}>
            <span style={styles.logoDot} />
            Anitej Briefing
          </div>
          <div style={styles.logoSub}>PM · Razorpay</div>
        </div>
        <div style={styles.syncChip}>
          <span style={styles.syncDot} />
          <span style={styles.syncText}>Last synced <strong style={{color:'#10B981'}}>7:00 AM</strong></span>
        </div>
        <nav style={styles.nav}>
          {NAV.map(item => (
            <div key={item.to}>
              {item.section && <div style={styles.sectionLabel}>{item.section}</div>}
              <NavLink to={item.to} end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 7,
                  fontSize: 13, border: '1px solid transparent',
                  textDecoration: 'none', marginBottom: 2,
                  transition: 'all 0.12s',
                  ...(isActive ? navActiveStyle : navInactiveStyle),
                })}>
                <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </NavLink>
            </div>
          ))}
        </nav>
        <div style={styles.footer}>
          <div style={styles.footerDate}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </aside>
    </>
  )
}
