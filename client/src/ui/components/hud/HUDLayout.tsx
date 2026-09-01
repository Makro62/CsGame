// @ts-nocheck
import { useEffect, useState } from 'react'
import { useWeaponStore } from '../../../stores/useWeaponStore'
import { useNetworkStore } from '../../../stores/useNetworkStore'
import { useGameStore } from '../../../stores/useGameStore'
import { HealthBar } from './HealthBar'
import { AmmoCounter } from './AmmoCounter'
import { WeaponSlots } from './WeaponSlots'
import { RoundTimer } from './RoundTimer'
import { KillFeed } from './KillFeed'
import { MoneyDisplay } from './MoneyDisplay'
import { BombIndicator } from './BombIndicator'
import { NetworkMonitor } from './NetworkMonitor'
import { SpectatorHUD } from './SpectatorHUD'
import { ChatBox } from './ChatBox'
import RadioCommand from '../../../components/RadioCommand'
import { GlassPanel } from '../shared/GlassPanel'
import { Badge } from '../shared/Badge'

export function HUDLayout() {
  const {
    activeWeapon,
    currentAmmo,
    maxAmmo,
    isReloading,
    isSwitching,
    primaryWeapon,
    secondaryWeapon,
    knifeSlot,
    grenadeType,
    infiniteAmmo,
    reserveAmmo,
  } = useWeaponStore()

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
    localReserveAmmo,
    localReady,
    sendReady,
    playerScores,
    remotePlayers,
    ping,
  } = useNetworkStore()

  const mode = useGameStore(s => s.mode)

  const [showLagBanner, setShowLagBanner] = useState(false)
  const [fps, setFps] = useState(0)

  // FPS counter
  useEffect(() => {
    let frames = 0
    let lastTime = performance.now()
    let raf: number

    const tick = () => {
      frames++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        setFps(frames)
        frames = 0
        lastTime = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Lag banner
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

  const isOffline = mode === 'offline5v5'
  const isMultiplayer = mode === 'multiplayer' && connected
  const isCompetitive = isMultiplayer || isOffline

  // Kill feed data
  const killFeedEvents = useNetworkStore(s => s.killFeed).map(k => ({
    id: `${k.killerId}-${k.victimId}-${k.timestamp}`,
    killerName: k.killerName,
    victimName: k.victimName,
    weapon: k.weapon,
    headshot: k.headshot,
    teamKill: false,
  }))

  if (!isCompetitive && mode !== 'training') return null

  const displayHp = isCompetitive ? localHp : 100
  const displayArmor = isCompetitive ? localArmor : 0

  const isDefusal = round.gameMode === 'bomb_defusal'
  const isFfa = round.gameMode === 'ffa' || round.gameMode === 'gun_game'
  const isTdm = round.gameMode === 'tdm'

  const grenadeTotal = localGrenadeHE + localGrenadeSmoke + localGrenadeFlash

  // Weapon slots
  const weaponSlots = [
    { slot: 1, weaponName: primaryWeapon || '', isActive: activeWeapon === primaryWeapon },
    { slot: 2, weaponName: secondaryWeapon || '', isActive: activeWeapon === secondaryWeapon },
    { slot: 3, weaponName: knifeSlot || '', isActive: activeWeapon === knifeSlot },
    { slot: 4, weaponName: grenadeType.toUpperCase(), isActive: grenadeTotal > 0 },
  ]

  // FFA leader
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

  const timeLeft =
    round.phase === 'buy' ? round.buyPhaseTimeLeft : round.roundTimeLeft

  return (
    <>
      {/* Top bar - Score & Round info */}
      {isCompetitive && (
        <div className="fixed top-0 left-0 right-0 flex justify-center items-center z-[100] pointer-events-none" style={{ gap: "clamp(8px, 2vw, 16px)", padding: "clamp(6px, 1vh, 12px) clamp(8px, 2vw, 24px)" }}>
          {/* Score panels */}
          <ScorePanel
            isDefusal={isDefusal}
            isFfa={isFfa}
            isTdm={isTdm}
            teamRedScore={round.teamRedScore}
            teamBlueScore={round.teamBlueScore}
            ffaTop={ffaTop}
            side="left"
          />

          {/* Round timer */}
          <RoundTimer
            phase={round.phase}
            timeLeft={timeLeft}
            roundNumber={round.roundNumber}
            teamRedScore={round.teamRedScore}
            teamBlueScore={round.teamBlueScore}
            isOvertime={round.isOvertime}
            isSuddenDeath={round.isSuddenDeath}
            bombPlanted={round.bombPlanted}
            bombTimeLeft={round.bombTimeLeft}
          />

          {/* Score panels right */}
          <ScorePanel
            isDefusal={isDefusal}
            isFfa={isFfa}
            isTdm={isTdm}
            teamRedScore={round.teamRedScore}
            teamBlueScore={round.teamBlueScore}
            ffaTop={ffaTop}
            side="right"
          />
        </div>
      )}

      {/* Bomb status */}
      {isCompetitive && (
        <BombIndicator
          hasBomb={localHasBomb}
          bombPlanted={round.bombPlanted}
          bombSite={round.bombSite}
          bombTimeLeft={round.bombTimeLeft}
        />
      )}

      {/* Lag banner */}
      {showLagBanner && (
        <div className="fixed top-[120px] left-1/2 -translate-x-1/2 z-[150] pointer-events-none">
          <Badge variant="danger" size="lg" pulse>
            NETWORK LAG DETECTED
          </Badge>
        </div>
      )}

      {/* Reconnecting overlay */}
      {isMultiplayer && reconnecting && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[300] pointer-events-none">
          <GlassPanel className="px-9 py-5 text-center" variant="accent" intensity="high">
            <div className="text-xl font-bold text-accent-gold font-mono animate-pulse">
              RECONNECTING...
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Ready UI (buy phase) */}
      {isMultiplayer && isDefusal && round.phase === 'buy' && (
        <div className="fixed top-[120px] left-1/2 -translate-x-1/2 z-[100] pointer-events-auto">
          {!localReady ? (
            <button
              onClick={() => sendReady()}
              className="px-7 py-2.5 bg-health-full/80 hover:bg-health-full border border-health-full/50 rounded-lg font-mono text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-health-full/20"
            >
              READY ({round.readyCount})
            </button>
          ) : (
            <div className="px-7 py-2.5 bg-health-full/30 border border-health-full/50 rounded-lg font-mono text-sm font-bold text-health-full">
              READY ✓ ({round.readyCount})
            </div>
          )}
        </div>
      )}

      {/* Bottom HUD */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-between items-end z-[100] pointer-events-none" style={{ padding: "clamp(8px, 2vw, 16px) clamp(8px, 2vw, 24px)", gap: "clamp(8px, 2vw, 16px)" }}>
        {/* Left side - Health, Armor, Money */}
        <div className="flex flex-col" style={{ gap: "clamp(4px, 1vw, 6px)", maxWidth: "46dvw" }}>
          <HealthBar
            hp={displayHp}
            armor={displayArmor}
            hasHelmet={isCompetitive && localHelmet}
          />
          {isCompetitive && isDefusal && (
            <MoneyDisplay
              amount={localMoney}
              maxAmount={16000}
              canBuy={round.phase === 'buy'}
            />
          )}
        </div>

        {/* Right side - Weapon Slots & Ammo Counter */}
        <div className="flex flex-col items-end" style={{ gap: "clamp(4px, 1vw, 8px)", maxWidth: "46dvw" }}>
          <WeaponSlots slots={weaponSlots} />
          {activeWeapon && (
            <AmmoCounter
              current={currentAmmo}
              max={maxAmmo}
              reserve={isCompetitive ? localReserveAmmo : (infiniteAmmo ? Infinity : reserveAmmo)}
              isReloading={isReloading}
              isSwitching={isSwitching}
              weaponName={activeWeapon}
            />
          )}
        </div>
      </div>

      {/* Kill feed - top right */}
      {isCompetitive && (
        <div className="fixed z-[100] pointer-events-none" style={{ top: "clamp(60px, 10vh, 80px)", right: "clamp(8px, 2vw, 16px)" }}>
          <KillFeed events={killFeedEvents} />
        </div>
      )}

      {/* Network monitor in multiplayer (top right under killfeed) */}
      {isMultiplayer && (
        <div className="fixed z-[100] pointer-events-none opacity-80 hover:opacity-100 transition-opacity" style={{ top: "clamp(8px, 2vw, 16px)", right: "clamp(8px, 2vw, 16px)" }}>
          <NetworkMonitor
            ping={ping}
            fps={fps}
            showHistory={false}
          />
        </div>
      )}

      {/* Overtime / Sudden Death indicator */}
      {isMultiplayer && round.isSuddenDeath && (
        <div className="fixed top-[50px] left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <Badge variant="danger" size="lg" pulse>
            SUDDEN DEATH
          </Badge>
        </div>
      )}
      {isMultiplayer && round.isOvertime && !round.isSuddenDeath && (
        <div className="fixed top-[50px] left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <Badge variant="warning" size="md">
            OVERTIME
          </Badge>
        </div>
      )}

      {/* Extra HUD components */}
      {isMultiplayer && (
        <>
          <RadioCommand />
          <SpectatorHUD />
          <ChatBox />
        </>
      )}
    </>
  )
}

function ScorePanel({
  isDefusal,
  isFfa,
  isTdm,
  teamRedScore,
  teamBlueScore,
  ffaTop,
  side,
}: {
  isDefusal: boolean
  isFfa: boolean
  isTdm: boolean
  teamRedScore: number
  teamBlueScore: number
  ffaTop: { name: string; score: number } | null
  side: 'left' | 'right'
}) {
  if (side === 'left') {
    if (isDefusal) {
      return (
        <GlassPanel className="px-5 py-1.5 text-center" style={{ minWidth: "clamp(60px, 15vw, 80px)" }}>
          <span className="font-black font-display text-counter" style={{ fontSize: "clamp(16px, 2.5vw, 20px)" }}>
            CT {teamBlueScore}
          </span>
        </GlassPanel>
      )
    }
    if (isFfa && ffaTop) {
      return (
        <GlassPanel className="px-5 py-1.5" style={{ maxWidth: "36dvw" }}>
          <span className="font-bold text-text-primary" style={{ fontSize: "clamp(11px, 1.5vw, 14px)" }}>
            TOP {ffaTop.name}: {ffaTop.score}
          </span>
        </GlassPanel>
      )
    }
    if (isTdm) {
      return (
        <GlassPanel className="px-5 py-1.5 text-center" style={{ minWidth: "clamp(60px, 15vw, 80px)" }}>
          <span className="font-black font-display text-terrorist" style={{ fontSize: "clamp(16px, 2.5vw, 20px)" }}>
            T {teamRedScore}
          </span>
        </GlassPanel>
      )
    }
    return null
  }

  // Right side
  if (isDefusal) {
    return (
      <GlassPanel className="px-5 py-1.5 text-center" style={{ minWidth: "clamp(60px, 15vw, 80px)" }}>
        <span className="font-black font-display text-terrorist" style={{ fontSize: "clamp(16px, 2.5vw, 20px)" }}>
          {teamRedScore} T
        </span>
      </GlassPanel>
    )
  }
  if (isFfa) {
    return (
      <GlassPanel className="px-5 py-1.5" variant="dark">
        <span className="font-bold text-accent-cyan" style={{ fontSize: "clamp(11px, 1.5vw, 14px)" }}>FFA</span>
      </GlassPanel>
    )
  }
  if (isTdm) {
    return (
      <GlassPanel className="px-5 py-1.5 text-center" style={{ minWidth: "clamp(60px, 15vw, 80px)" }}>
        <span className="font-black font-display text-counter" style={{ fontSize: "clamp(16px, 2.5vw, 20px)" }}>
          CT {teamBlueScore}
        </span>
      </GlassPanel>
    )
  }
  return null
}
