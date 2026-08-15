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

  const isMultiplayer = mode === 'multiplayer' && connected
  if (!isMultiplayer && mode !== 'training') return null

  const displayHp = isMultiplayer ? localHp : 100
  const displayArmor = isMultiplayer ? localArmor : 0
  const isDefusal = isMultiplayer && round.gameMode === 'bomb_defusal'
  const isFfa = isMultiplayer && round.gameMode === 'ffa'
  const isTdm = isMultiplayer && round.gameMode === 'tdm'

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
      {/* Top bar - Round info (Multiplayer only) */}
      {isMultiplayer && (
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

          {/* Center info */}
          <div
            style={{
              background: 'rgba(0,0,0,0.7)',
              padding: '6px 24px',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {isFfa ? (
              <>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                  FFA - {ffaTop ? `Leader: ${ffaTop.name} (${ffaTop.score})` : 'Free For All'}
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: round.roundTimeLeft <= 10 ? '#ef4444' : 'white',
                  }}
                >
                  {formatTime(round.roundTimeLeft)}
                </div>
              </>
            ) : isTdm ? (
              <>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                  TDM - First to 50
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: round.roundTimeLeft <= 10 ? '#ef4444' : 'white',
                  }}
                >
                  {formatTime(round.roundTimeLeft)}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                  {round.phase === 'buy'
                    ? `BUY PHASE (${round.buyPhaseTimeLeft}s)`
                    : round.bombPlanted
                      ? `BOMB PLANTED - SITE ${round.bombSite || 'A'}`
                      : `ROUND ${round.roundNumber}`}
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color:
                      round.phase === 'buy'
                        ? '#fbbf24'
                        : round.bombPlanted
                          ? '#ef4444'
                          : round.roundTimeLeft <= 10
                            ? '#ef4444'
                            : 'white',
                  }}
                >
                  {round.phase === 'buy'
                    ? `${round.buyPhaseTimeLeft}s`
                    : round.bombPlanted
                      ? `${Math.max(0, Math.ceil(round.bombTimeLeft))}s`
                      : formatTime(round.roundTimeLeft)}
                </div>
              </>
            )}
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
              T {round.teamRedScore}
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
        </div>
      )}

      {/* Lag / High ping banner */}
      {isMultiplayer && showLagBanner && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239,68,68,0.85)',
            color: 'white',
            padding: '4px 16px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          HIGH PING: {ping}ms - Connection unstable
        </div>
      )}

      {/* Halftime indicator */}
      {isMultiplayer && round.isHalfTime && (
        <div
          style={{
            position: 'fixed',
            top: '50px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.85)',
            padding: '12px 32px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#fbbf24',
            zIndex: 100,
            textAlign: 'center',
            border: '1px solid rgba(251,191,36,0.4)',
            pointerEvents: 'none',
          }}
        >
          <div>HALF TIME - SWITCHING SIDES</div>
          <div style={{ fontSize: '13px', color: '#aaa', marginTop: '4px' }}>
            CT {round.teamBlueScore} - {round.teamRedScore} T
          </div>
        </div>
      )}

      {/* Ready indicator */}
      {isMultiplayer && round.phase === 'waiting' && !localReady && (
        <div
          style={{
            position: 'fixed',
            bottom: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.8)',
            padding: '12px 24px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '14px',
            color: 'white',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div>Waiting for players ({round.readyCount ?? 0} ready)</div>
          <button
            onClick={() => sendReady()}
            style={{
              padding: '6px 20px',
              backgroundColor: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}
          >
            READY (F key)
          </button>
        </div>
      )}

      {/* Reconnecting banner */}
      {isMultiplayer && reconnecting && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(234,88,12,0.9)',
            padding: '8px 24px',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: 'bold',
            color: 'white',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          RECONNECTING...
        </div>
      )}

      {/* Bottom bar - HP, Armor, Ammo, Weapons */}
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
                    displayHp > 60
                      ? '#4ade80'
                      : displayHp > 25
                        ? '#fbbf24'
                        : '#ef4444',
                  fontWeight: 'bold',
                  fontSize: '24px',
                }}
              >
                {displayHp}
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
                  width: `${displayHp}%`,
                  height: '100%',
                  background: displayHp > 60 ? '#4ade80' : displayHp > 25 ? '#fbbf24' : '#ef4444',
                  transition: 'width 0.2s ease-out'
                }} />
              </div>
            </div>
            {displayArmor > 0 && (
              <div style={{ color: '#60a5fa', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px' }}>🛡</span>
                {localHelmet ? 'HELM' : 'KEVLAR'} {displayArmor}
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
            {grenadeCount > 0 && (
              <div style={{ color: '#a78bfa', fontWeight: 'bold' }}>
                4: {grenadeType.toUpperCase()} x{grenadeCount}
              </div>
            )}
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
                          width: reloadStartTime && activeWeapon && WEAPONS[activeWeapon]?.reload ? `${Math.min(100, ((Date.now() - reloadStartTime) / (WEAPONS[activeWeapon].reload * 1000)) * 100)}%` : '0%',
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

      {/* Overtime / Sudden Death indicator (Multiplayer only) */}
      {isMultiplayer && round.isSuddenDeath && (
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
      {isMultiplayer && round.isOvertime && !round.isSuddenDeath && (
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

      {/* Extra HUD components (Multiplayer only) */}
      {isMultiplayer && (
        <>
          <RadioCommand />
          <SpectatorHUD />
        </>
      )}
    </>
  )
}
