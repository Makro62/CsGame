import { useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { getMapById } from './game/map/MapRegistry'
import { PlayerController } from './game/player/PlayerController'
import { RemotePlayers } from './game/player/RemotePlayers'
import { WeaponModel } from './game/weapons/WeaponModel'
import { ShootingSystem } from './game/weapons/ShootingSystem'
import { ReloadSystem } from './game/weapons/ReloadSystem'
import { GrenadeSystem } from './game/weapons/GrenadeSystem'
import { Crosshair } from './components/Crosshair'
import { HUDLayout } from './ui/components/hud/HUDLayout'
import { HitMarker } from './components/HitMarker'
import { BuyMenu } from './components/BuyMenu'
import { DamageVignette } from './components/DamageVignette'
import { DeathScreen } from './components/DeathScreen'
import { Leaderboard } from './components/Leaderboard'
import SniperScope from './components/SniperScope'
import Minimap from './components/Minimap'
import KillConfirm from './components/KillConfirm'
import { AudioManager } from './components/AudioManager'
import { RoundEndScreen } from './components/RoundEndScreen'
import { ClickToPlayOverlay } from './components/ClickToPlayOverlay'
import VoteKick from './components/VoteKick'
import { FlashEffect } from './components/FlashEffect'
import FootstepPlayer from './components/FootstepPlayer'
import { KillCam } from './components/KillCam'
import { KOTH } from './components/KOTH'
import { TracerManager } from './game/effects/TracerManager'
import SettingsMenu from './screens/SettingsMenu'
import { MainMenu } from './screens/MainMenu'
import { TrainingRange } from './game/training/TrainingRange'
import { useWeaponSwitch } from './hooks/useWeaponSwitch'
import { useGameStore } from './stores/useGameStore'
import { useNetworkStore } from './stores/useNetworkStore'
import './index.css'

function MultiplayerMode() {
  const { buyMenuOpen, closeBuyMenu } = useWeaponSwitch()
  const { round, connected, measurePing } = useNetworkStore()
  const currentMap = useGameStore((s) => s.currentMap)
  const MapComponent = getMapById(currentMap).component
  const noop = useCallback(() => {}, [])

  // Measure ping periodically when connected
  useEffect(() => {
    if (!connected) return

    measurePing()
    const interval = setInterval(() => {
      measurePing()
    }, 2000)

    return () => clearInterval(interval)
  }, [connected, measurePing])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#000',
      }}
    >
      <Canvas shadows camera={{ fov: 75 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <directionalLight castShadow position={[10, 10, 10]} intensity={1.5} />
        <Physics gravity={[0, -9.81, 0]}>
          <MapComponent />
          <PlayerController />
          <RemotePlayers />
          <WeaponModel />
        </Physics>
        <ShootingSystem />
        <ReloadSystem />
        <GrenadeSystem />
        <TracerManager />
      </Canvas>
      <Crosshair />
      <SniperScope />
      <HitMarker />
      <HUDLayout />
      <KillConfirm />
      <DamageVignette />
      <DeathScreen />
      <KillCam />
      <KOTH />
      <Leaderboard />
      <Minimap />
      <AudioManager />
      <FootstepPlayer />
      <RoundEndScreen />
      <SettingsMenu />
      <VoteKick />
      <FlashEffect />
      {buyMenuOpen && round.phase === 'buy' && (
        <BuyMenu onClose={closeBuyMenu} />
      )}
      <ClickToPlayOverlay onLock={noop} />
    </div>
  )
}

export default function App() {
  const mode = useGameStore(s => s.mode)

  if (mode === 'menu') {
    return <MainMenu />
  }

  if (mode === 'training') {
    return <TrainingRange />
  }

  return <MultiplayerMode />
}
