import { useEffect, useState } from 'react'
import { useNetworkStore } from '../stores/useNetworkStore'
import { useGameStore } from '../stores/useGameStore'

export function RoundEndScreen() {
  const round = useNetworkStore(s => s.round)
  const localTeam = useNetworkStore(s => s.localTeam)
  const disconnect = useNetworkStore(s => s.disconnect)
  const setMode = useGameStore(s => s.setMode)
  const [countdown, setCountdown] = useState(4)

  useEffect(() => {
    if (round.phase !== 'roundEnd') return
    setCountdown(4)
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(id)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [round.phase, round.roundNumber])

  if (round.phase !== 'roundEnd' && round.phase !== 'matchEnd') return null

  const isMatchEnd = round.phase === 'matchEnd'
  // teamRedScore = T wins, teamBlueScore = CT wins
  const tScore = round.teamRedScore ?? 0
  const ctScore = round.teamBlueScore ?? 0
  let winner: 'ct' | 't' = ctScore >= tScore ? 'ct' : 't'
  const localWon = localTeam && localTeam.toLowerCase() === winner

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.7)',
  }

  const contentStyle: React.CSSProperties = {
    textAlign: 'center',
    pointerEvents: 'none',
  }

  const headingStyle: React.CSSProperties = {
    fontSize: isMatchEnd ? '4rem' : '3rem',
    fontWeight: 900,
    letterSpacing: '0.1em',
    marginBottom: '0.5rem',
    color: winner === 'ct' ? '#5b9bd5' : '#f0c040',
    textShadow: '0 0 20px rgba(0,0,0,0.8)',
  }

  const scoreStyle: React.CSSProperties = {
    fontSize: '1.8rem',
    color: '#fff',
    marginBottom: '1rem',
  }

  const subStyle: React.CSSProperties = {
    fontSize: '1.2rem',
    color: '#ccc',
  }

  const buttonStyle: React.CSSProperties = {
    pointerEvents: 'auto',
    marginTop: '1.5rem',
    padding: '12px 32px',
    fontSize: '1.1rem',
    fontWeight: 700,
    border: '2px solid #fff',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    cursor: 'pointer',
    letterSpacing: '0.05em',
  }

  return (
    <div style={overlayStyle}>
      <div style={contentStyle}>
        {isMatchEnd ? (
          <>
            <div style={headingStyle}>{localWon ? 'VICTORY' : 'DEFEAT'}</div>
            <div style={scoreStyle}>
              CT {ctScore} — {tScore} T
            </div>
            <div style={subStyle}>Final Score</div>
            <button
              style={buttonStyle}
              onClick={() => {
                setMode('menu')
                disconnect()
              }}
            >
              BACK TO MENU
            </button>
          </>
        ) : (
          <>
            <div style={headingStyle}>
              {winner === 'ct' ? 'CT WIN' : 'T WIN'}
            </div>
            <div style={scoreStyle}>
              CT {ctScore} — {tScore} T
            </div>
            <div style={subStyle}>Next round in {countdown}s</div>
          </>
        )}
      </div>
    </div>
  )
}
