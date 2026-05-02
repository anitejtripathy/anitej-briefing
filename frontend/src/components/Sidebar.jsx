// frontend/src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/',         icon: '🌅', label: 'Morning Brief',    section: 'Today' },
  { to: '/inbox',    icon: '📬', label: 'Inbox',             section: null },
  { to: '/tasks',    icon: '✅', label: 'Tasks',             section: null },
  { to: '/meetings', icon: '📅', label: 'Meetings',          section: null },
  { to: '/metrics',  icon: '📊', label: 'Metrics',           section: 'Analytics' },
  { to: '/intel',    icon: '🔍', label: 'Competitive Intel', section: 'Intelligence' },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 8px #4F8EF7 }
          50%      { box-shadow: 0 0 16px #4F8EF7, 0 0 24px rgba(79,142,247,0.25) }
        }
        .sidebar {
          width: 224px;
          height: 100dvh;
          border-right: 1px solid #1C1F2E;
          background: rgba(8,9,12,0.98);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          transition: none;
        }
        @media (max-width: 767px) {
          .sidebar {
            position: fixed;
            top: 0; left: 0;
            z-index: 200;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
            box-shadow: 4px 0 24px rgba(0,0,0,0.6);
          }
          .sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>

      <aside className={`sidebar${open ? ' open' : ''}`}>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          style={{
            display: 'none',
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#3D4152', fontSize: 20, lineHeight: 1, padding: 4,
          }}
          className="sidebar-close"
          aria-label="Close menu"
        >✕</button>

        <style>{`
          @media (max-width: 767px) { .sidebar-close { display: block !important; } }
        `}</style>

        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #1C1F2E' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4F8EF7', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }} />
            Anitej Briefing
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: '#3D4152', marginTop: 2 }}>
            PM · Razorpay
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 16px', padding: '6px 10px', background: '#0E1016', border: '1px solid #1C1F2E', borderRadius: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#3D4152' }}>
            Last synced <strong style={{ color: '#10B981' }}>7:00 AM</strong>
          </span>
        </div>

        <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
          {NAV.map(item => (
            <div key={item.to}>
              {item.section && (
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#3D4152', padding: '12px 6px 4px' }}>
                  {item.section}
                </div>
              )}
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 7,
                  fontSize: 13, border: '1px solid transparent',
                  textDecoration: 'none', marginBottom: 2,
                  transition: 'all 0.12s',
                  ...(isActive
                    ? { color: '#fff', background: 'rgba(79,142,247,0.08)', borderColor: 'rgba(79,142,247,0.2)', borderLeft: '2px solid #4F8EF7' }
                    : { color: '#3D4152', background: 'transparent', borderColor: 'transparent' }
                  ),
                })}
              >
                <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </NavLink>
            </div>
          ))}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #1C1F2E' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3D4152' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </aside>
    </>
  )
}
