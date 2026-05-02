// frontend/src/pages/MorningBrief.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { marked } from 'marked'
import { fetchBrief } from '../lib/github'
import Topbar from '../components/Topbar'

const C = {
  surface: '#0E1016', surface2: '#13151D', border: '#1C1F2E',
  blue: '#4F8EF7', red: '#EF4444', muted: '#3D4152',
  secondary: '#6B7280', primary: '#E8EAEF',
}
const MONO = 'IBM Plex Mono, monospace'
const SANS = 'IBM Plex Sans, sans-serif'
const DISP = 'Syne, sans-serif'

marked.setOptions({ breaks: true, gfm: true })

export default function MorningBrief() {
  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const isMobile = window.innerWidth < 768

  const { data, isLoading, isError } = useQuery({
    queryKey: ['brief', selectedDate],
    queryFn: () => fetchBrief(selectedDate),
    staleTime: 10 * 60_000,
  })

  const briefHtml = data?.markdown ? marked.parse(data.markdown) : null

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar title="Morning Brief" subtitle={`Daily digest · ${selectedDate}`}>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          max={todayStr}
          style={{
            background: C.surface2, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: '4px 10px',
            fontFamily: MONO, fontSize: 11, color: C.secondary,
            outline: 'none', colorScheme: 'dark', cursor: 'pointer',
          }}
        />
      </Topbar>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 16px 100px' : '24px 32px 32px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        {isLoading && (
          <p style={{ textAlign: 'center', padding: '48px 0', fontFamily: MONO, fontSize: 12, color: C.muted }}>Loading brief…</p>
        )}

        {isError && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontFamily: DISP, fontWeight: 700, color: C.red, margin: '0 0 8px' }}>Failed to load brief</p>
          </div>
        )}

        {!isLoading && !isError && !briefHtml && (
          <div style={{ textAlign: 'center', padding: '64px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 48, opacity: 0.2 }}>🌅</span>
            <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: C.muted, margin: 0 }}>No brief for {selectedDate}</p>
            <p style={{ fontFamily: MONO, fontSize: 11, color: C.muted, margin: 0 }}>
              Run <code style={{ background: C.surface2, padding: '2px 6px', borderRadius: 4 }}>make full-run</code> to generate
            </p>
          </div>
        )}

        {briefHtml && (
          <>
            <style>{`
              .brief h1 { font-family: ${DISP}; font-weight: 800; font-size: ${isMobile ? '22px' : '26px'}; color: ${C.primary}; margin: 0 0 4px; line-height: 1.2; }
              .brief h2 { font-family: ${DISP}; font-weight: 700; font-size: 15px; color: ${C.secondary}; margin: 28px 0 12px; border-bottom: 1px solid ${C.border}; padding-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
              .brief h3 { font-family: ${DISP}; font-weight: 600; font-size: 14px; color: ${C.primary}; margin: 16px 0 8px; }
              .brief p { font-family: ${SANS}; font-size: ${isMobile ? '15px' : '14px'}; color: ${C.secondary}; line-height: 1.7; margin: 0 0 10px; }
              .brief ul, .brief ol { padding-left: 20px; margin: 0 0 14px; }
              .brief li { font-family: ${SANS}; font-size: ${isMobile ? '15px' : '14px'}; color: ${C.secondary}; line-height: 1.6; margin-bottom: 6px; }
              .brief strong { color: ${C.primary}; font-weight: 600; }
              .brief em { color: ${C.muted}; font-style: italic; }
              .brief code { font-family: ${MONO}; font-size: 11px; background: ${C.surface2}; border: 1px solid ${C.border}; border-radius: 4px; padding: 1px 6px; color: ${C.blue}; }
              .brief hr { border: none; border-top: 1px solid ${C.border}; margin: 24px 0; }
              .brief table { width: 100%; border-collapse: collapse; margin: 12px 0; }
              .brief th { font-family: ${MONO}; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${C.muted}; text-align: left; padding: 6px 10px; border-bottom: 1px solid ${C.border}; }
              .brief td { font-family: ${MONO}; font-size: 12px; color: ${C.secondary}; padding: 8px 10px; border-bottom: 1px solid ${C.border}; }
              .brief td:first-child { color: ${C.primary}; }
              .brief blockquote { border-left: 2px solid ${C.border}; margin: 0 0 12px; padding: 4px 14px; }
            `}</style>
            <div className="brief" dangerouslySetInnerHTML={{ __html: briefHtml }} />
          </>
        )}
      </div>
    </div>
  )
}
