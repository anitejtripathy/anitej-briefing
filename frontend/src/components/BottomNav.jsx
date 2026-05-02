// frontend/src/components/BottomNav.jsx
import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/',         icon: '🌅', label: 'Brief' },
  { to: '/inbox',    icon: '📬', label: 'Inbox' },
  { to: '/tasks',    icon: '✅', label: 'Tasks' },
  { to: '/meetings', icon: '📅', label: 'Meetings' },
  { to: '/metrics',  icon: '📊', label: 'Metrics' },
]

export default function BottomNav() {
  return (
    <>
      <style>{`
        .bottom-nav { display: none; }
        @media (max-width: 767px) {
          .bottom-nav {
            display: flex;
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
            background: rgba(8,9,12,0.97);
            backdrop-filter: blur(20px);
            border-top: 1px solid #1C1F2E;
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
        }
      `}</style>
      <nav className="bottom-nav">
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            style={({ isActive }) => ({
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              minHeight: 60, /* proper touch target height */
              padding: '8px 0',
              gap: 3,
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
              textDecoration: 'none',
              color: isActive ? '#4F8EF7' : '#3D4152',
              transition: 'color 0.15s',
              WebkitTapHighlightColor: 'transparent',
            })}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
