import { useState, useEffect } from 'react'
import { useNetworkStore } from '../stores/useNetworkStore'

export default function VoteKick() {
  const voteRequest = useNetworkStore(s => s.voteRequest)
  const sendVote = useNetworkStore(s => s.sendVote)
  const [voted, setVoted] = useState(false)
  const [countdown, setCountdown] = useState(30)

  useEffect(() => {
    setVoted(false)
    setCountdown(30)
  }, [voteRequest])

  useEffect(() => {
    if (!voteRequest || voted) return
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [voteRequest, voted])

  if (!voteRequest) return null

  const vote = (yes: boolean) => {
    sendVote(voteRequest.targetId, yes)
    setVoted(true)
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        top: '40%',
        transform: 'translate(-50%, -50%)',
        zIndex: 500,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          background: 'rgba(15,23,42,0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '24px',
          minWidth: '320px',
          textAlign: 'center',
          fontFamily: 'monospace',
          color: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: '#fbbf24',
          }}
        >
          VOTE KICK
        </div>
        <div
          style={{
            fontSize: '14px',
            color: '#ccc',
            marginBottom: '16px',
          }}
        >
          Kick <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{voteRequest.targetNickname}</span>?
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#888',
            marginBottom: '16px',
          }}
        >
          Time remaining: <span style={{ color: countdown > 10 ? '#4ade80' : '#ef4444' }}>{countdown}s</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          {voted ? (
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '10px 24px',
                borderRadius: '6px',
                color: '#9ca3af',
                fontSize: '14px',
              }}
            >
              Vote sent...
            </div>
          ) : (
            <>
              <button
                onClick={() => vote(true)}
                style={{
                  background: 'rgba(34,197,94,0.2)',
                  border: '1px solid rgba(34,197,94,0.5)',
                  color: '#4ade80',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(34,197,94,0.4)'
                  e.currentTarget.style.borderColor = 'rgba(34,197,94,0.8)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(34,197,94,0.2)'
                  e.currentTarget.style.borderColor = 'rgba(34,197,94,0.5)'
                }}
              >
                YES
              </button>
              <button
                onClick={() => vote(false)}
                style={{
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid rgba(239,68,68,0.5)',
                  color: '#ef4444',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.4)'
                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.8)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'
                }}
              >
                NO
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
