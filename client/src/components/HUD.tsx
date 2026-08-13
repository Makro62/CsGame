import { useWeaponStore } from '../stores/useWeaponStore'
import { useNetworkStore } from '../stores/useNetworkStore'
import { useGameStore } from '../stores/useGameStore'
import { WEAPONS } from '@cs-game/shared'
import RadioCommand from './RadioCommand'
import SpectatorHUD from './SpectatorHUD'
import { useEffect, useState } from 'react'

export function HUD() {
  const { activeWeapon, currentAmmo, maxAmmo, isReloading, reloadStartTime, isSwitching, primaryWeapon, secondaryWeapon, knifeSlot, grenadeType } =
    useWeaponStore()
  const {
    round,
    connected,
    reconnecting,
    localHp,
    localMoney,
    localHasBomb,
    localArmor,
    localHelmet,
    localGrenadeHE,
    localGrenadeSmoke,
    localGrenadeFlash,
    localReady,
    sendReady,
    playerScores,
    remotePlayers,
  } = useNetworkStore()
  const mode = useGameStore(s => s.mode)
  const ping = useNetworkStore(s => s.ping)

  const [showLagBanner, setShowLagBanner] = useState(false)

  useEffect(() => {
    let t: number | undefined
    if (ping > 120) {
      t = window.setTimeout(() => setShowLagBanner(true), 3000)
    } else {
      setShowLagBanner(false)
      if (t) clearTimeout(t)
    }
    return () => {
      if (t) clearTimeout(t)
    }
  }, [ping])

  if (mode !== 'multiplayer' || !connected) return null

  const isDefusal = round.gameMode === 'bomb_defusal'
  const isFfa = round.gameMode === 'ffa'
  const isTdm = round.gameMode === 'tdm'

  const grenadeCount =
    grenadeType === 'he' ? localGrenadeHE : grenadeType === 'smoke' ? localGrenadeSmoke : localGrenadeFlash
  const grenadeTotal = localGrenadeHE + localGrenadeSmoke + localGrenadeFlash

  const tdmScoreT = playerScores.get('T_score') ?? 0
  const tdmScoreCT = playerScores.get('CT_score') ?? 0

  // FFA leader (highest score) for the top bar
  let ffaTop: { name: string; score: number } | null = null
  if (isFfa) {
    let best = 0
    let bestName = ''
    playerScores.forEach((score, id) => {
      if (id.startsWith('T_') || id.startsWith('CT_')) return
      if (score > best) {
        best = score
        bestName = remotePlayers.get(id)?.nickname ?? '?'
      }
    })
    ffaTop = bestName ? { name: bestName, score: best } : null
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <>
      {/* Top bar - Round info */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 24px',
          fontFamily: 'monospace',
          fontSize: '14px',
          color: 'white',
          textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
          zIndex: 100,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)',
        }}
      >
        {/* Left score */}
        {isDefusal && (
          <div
            style={{
              background: 'rgba(59,130,246,0.8)',
              padding: '6px 20px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '22px',
              minWidth: '80px',
              textAlign: 'center',
              border: '1px solid rgba(59,130,246,0.5)',
            }}
          >
            CT {round.teamBlueScore}
          </div>
        )}
        {isFfa && ffaTop && (
          <div
            style={{
              background: 'rgba(59,130,246,0.8)',
              padding: '6px 20px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '16px',
              border: '1px solid rgba(59,130,246,0.5)',
            }}
          >
            TOP {ffaTop.name}: {ffaTop.score}
          </div>
        )}
        {isTdm && (
          <div
            style={{
              background: 'rgba(239,68,68,0.8)',
              padding: '6px 20px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '22px',
              minWidth: '80px',
              textAlign: 'center',
              border: '1px solid rgba(239,68,68,0.5)',
            }}
          >
            T {tdmScoreT}
          </div>
        )}

        {/* Round timer */}
        <div
          style={{
            background: 'rgba(0,0,0,0.8)',
            padding: '8px 24px',
            borderRadius: '8px',
            fontSize: '18px',
            minWidth: '120px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '2px', textTransform: 'uppercase' }}>
            {round.phase === 'buy'
              ? 'BUY PHASE'
              : round.phase === 'active'
                ? isDefusal
                  ? `ROUND ${round.roundNumber}`
                  : round.gameMode.toUpperCase()
                : round.phase
                  ? round.phase.toUpperCase()
                  : 'WAITING'}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
            {round.phase === 'buy'
              ? formatTime(round.buyPhaseTimeLeft)
              : round.phase === 'active'
                ? formatTime(round.roundTimeLeft)
                : ''}
          </div>
        </div>

        {/* Right score */}
        {isDefusal && (
          <div
            style={{
              background: 'rgba(239,68,68,0.8)',
              padding: '6px 20px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '22px',
              minWidth: '80px',
              textAlign: 'center',
              border: '1px solid rgba(239,68,68,0.5)',
            }}
          >
            {round.teamRedScore} T
          </div>
        )}
        {isFfa && (
          <div
            style={{
              background: 'rgba(0,0,0,0.6)',
              padding: '6px 20px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#93c5fd',
              border: '1px solid rgba(147,197,253,0.3)',
            }}
          >
            FFA
          </div>
        )}
        {isTdm && (
          <div
            style={{
              background: 'rgba(59,130,246,0.8)',
              padding: '6px 20px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '22px',
              minWidth: '80px',
              textAlign: 'center',
              border: '1px solid rgba(59,130,246,0.5)',
            }}
          >
            CT {tdmScoreCT}
          </div>
        )}
      </div>

      {/* Bomb status */}
      {round.bombPlanted && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239,68,68,0.9)',
            padding: '8px 24px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
            zIndex: 100,
            animation: 'pulse 1s infinite',
            pointerEvents: 'none',
            border: '1px solid rgba(239,68,68,0.5)',
          }}
        >
          BOMB PLANTED - SITE {round.bombSite} -{' '}
          {formatTime(round.bombTimeLeft)}
        </div>
      )}

      {/* Lag banner */}
      {showLagBanner && (
        <div
          style={{
            position: 'fixed',
            top: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239,68,68,0.95)',
            padding: '10px 24px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: 'bold',
            color: 'white',
            zIndex: 150,
            pointerEvents: 'none',
            animation: 'pulse 1s infinite',
            border: '1px solid rgba(239,68,68,0.5)',
          }}
        >
          NETWORK LAG DETECTED
        </div>
      )}

      {/* Reconnecting overlay */}
      {reconnecting && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.9)',
            padding: '20px 36px',
            borderRadius: '12px',
            fontFamily: 'monospace',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#fbbf24',
            zIndex: 300,
            animation: 'pulse 1s infinite',
            border: '1px solid rgba(251,191,36,0.3)',
          }}
        >
          RECONNECTING...
        </div>
      )}

      {/* Ready UI (buy phase) */}
      {isDefusal && round.phase === 'buy' && (
        <div
          style={{
            position: 'fixed',
            top: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            zIndex: 100,
          }}
        >
          {!localReady ? (
            <button
              onClick={() => sendReady()}
              style={{
                background: 'rgba(34,197,94,0.8)',
                border: '1px solid rgba(34,197,94,0.5)',
                color: 'white',
                padding: '10px 28px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              READY ({round.readyCount})
            </button>
          ) : (
            <div
              style={{
                background: 'rgba(34,197,94,0.3)',
                border: '1px solid rgba(34,197,94,0.5)',
                color: '#4ade80',
                padding: '10px 28px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              READY ✓ ({round.readyCount})
            </div>
          )}
        </div>
      )}

      {/* Bottom HUD */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          padding: '16px 24px',
          fontFamily: 'monospace',
          color: 'white',
          textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
          zIndex: 100,
          pointerEvents: 'none',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.3) 0%, transparent 100%)',
        }}
      >
        {/* Left side - Health & Money */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              background: 'rgba(0,0,0,0.7)',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              display: 'flex',
              gap: '20px',
              alignItems: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div>
              <span
                style={{
                  color:
                    localHp > 60
                      ? '#4ade80'
                      : localHp > 25
                        ? '#fbbf24'
                        : '#ef4444',
                  fontWeight: 'bold',
                  fontSize: '24px',
                }}
              >
                {localHp}
              </span>
              <span style={{ color: '#888', margin: '0 6px', fontSize: '12px' }}>HP</span>
              {/* Health bar */}
              <div style={{ 
                width: '100px', 
                height: '4px', 
                background: 'rgba(255,255,255,0.1)', 
                borderRadius: '2px',
                overflow: 'hidden',
                marginTop: '4px'
              }}>
                <div style={{
                  width: `${localHp}%`,
                  height: '100%',
                  background: localHp > 60 ? '#4ade80' : localHp > 25 ? '#fbbf24' : '#ef4444',
                  transition: 'width 0.2s ease-out'
                }} />
              </div>
            </div>
            {localArmor > 0 && (
              <div style={{ color: '#60a5fa', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px' }}>🛡</span>
                {localHelmet ? 'HELM' : 'KEVLAR'} {localArmor}
              </div>
            )}
            {grenadeTotal > 0 && (
              <div style={{ color: '#a78bfa', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px' }}>💣</span>
                GRENS x{grenadeTotal}
              </div>
            )}
            {isDefusal && (
              <div style={{ color: '#4ade80', fontSize: '16px', fontWeight: 'bold' }}>
                ${localMoney.toLocaleString()}
              </div>
            )}
            {localHasBomb && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.8)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                C4
              </div>
            )}
          </div>
        </div>

        {/* Right side - Ammo */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            alignItems: 'flex-end',
          }}
        >
          {/* Weapon slots indicator */}
          <div
            style={{
              background: 'rgba(0,0,0,0.7)',
              padding: '8px 16px',
              borderRadius: '8px',
              display: 'flex',
              gap: '12px',
              fontSize: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ color: activeWeapon === primaryWeapon ? '#4ade80' : '#666', fontWeight: activeWeapon === primaryWeapon ? 'bold' : 'normal' }}>
              1: {primaryWeapon ? primaryWeapon.toUpperCase() : '-'}
            </div>
            <div style={{ color: activeWeapon === secondaryWeapon ? '#4ade80' : '#666', fontWeight: activeWeapon === secondaryWeapon ? 'bold' : 'normal' }}>
              2: {secondaryWeapon ? secondaryWeapon.toUpperCase() : '-'}
            </div>
            <div style={{ color: activeWeapon === knifeSlot ? '#4ade80' : '#666', fontWeight: activeWeapon === knifeSlot ? 'bold' : 'normal' }}>
              3: {knifeSlot ? knifeSlot.toUpperCase() : '-'}
            </div>
            <div style={{ color: grenadeCount > 0 ? '#a78bfa' : '#666', fontWeight: grenadeCount > 0 ? 'bold' : 'normal' }}>
              4: {grenadeType.toUpperCase()} x{grenadeCount}
            </div>
          </div>

          {activeWeapon && (
            <div
              style={{
                background: 'rgba(0,0,0,0.7)',
                padding: '10px 20px',
                borderRadius: '8px',
                textAlign: 'right',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                  color: '#aaa',
                  textTransform: 'uppercase',
                }}
              >
                {activeWeapon}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
                {isReloading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ color: '#fbbf24', fontSize: '14px' }}>RELOADING...</span>
                    <div style={{ width: '120px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: reloadStartTime && activeWeapon ? `${Math.min(100, ((Date.now() - reloadStartTime) / (WEAPONS[activeWeapon].reload * 1000)) * 100)}%` : '0%',
                          height: '100%',
                          background: '#fbbf24',
                          transition: 'width 0.1s linear',
                        }}
                      />
                    </div>
                  </div>
                ) : isSwitching ? (
                  <span style={{ color: '#60a5fa' }}>SWITCHING...</span>
                ) : (
                  <span>
                    <span
                      style={{ color: currentAmmo <= 5 ? '#ef4444' : 'white' }}
                    >
                      {currentAmmo}
                    </span>
                    <span style={{ color: '#666' }}> / {maxAmmo}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overtime / Sudden Death indicator */}
      {round.isSuddenDeath && (
        <div
          style={{
            position: 'fixed',
            top: '50px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239,68,68,0.95)',
            padding: '10px 28px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'white',
            zIndex: 100,
            animation: 'pulse 0.5s infinite',
            pointerEvents: 'none',
            border: '1px solid rgba(239,68,68,0.5)',
          }}
        >
          SUDDEN DEATH
        </div>
      )}
      {round.isOvertime && !round.isSuddenDeath && (
        <div
          style={{
            position: 'fixed',
            top: '50px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(249,115,22,0.9)',
            padding: '8px 24px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            zIndex: 100,
            pointerEvents: 'none',
            border: '1px solid rgba(249,115,22,0.5)',
          }}
        >
          OVERTIME
        </div>
      )}

      {/* Extra HUD components */}
      <RadioCommand />
      <SpectatorHUD />
    </>
  )
}
