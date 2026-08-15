import { useEffect, useCallback } from 'react'
import { Switch, Route, useLocation, Redirect } from 'wouter'
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

function SyncModeToURL() {
  const [location, setLocation] = useLocation()

  // Sync URL → store mode
  useEffect(() => {
    const mode = useGameStore.getState().mode
    if (location === '/' && mode !== 'menu') {
      useGameStore.getState().setMode('menu')
    } else if (location === '/training' && mode !== 'training') {
      useGameStore.getState().setMode('training')
    } else if (location === '/play' && mode !== 'multiplayer') {
      useGameStore.getState().setMode('multiplayer')
    }
  }, [location])

  // Sync store mode → URL (for programmatic setMode calls)
  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prev) => {
      if (state.mode === prev.mode) return
      if (state.mode === 'menu' && location !== '/') {
        setLocation('/')
      } else if (state.mode === 'training' && location !== '/training') {
        setLocation('/training')
      } else if (state.mode === 'multiplayer' && location !== '/play') {
        setLocation('/play')
      }
    })
    return unsub
  }, [location, setLocation])

  return null
}

function GameRoutes() {
  const [location] = useLocation()

  // Render the right component based on URL
  if (location === '/training') return <TrainingRange />
  if (location === '/play') return <MultiplayerMode />
  return <MainMenu />
}

export default function App() {
  return (
    <>
      <SyncModeToURL />
      <Switch>
        <Route path="/" component={GameRoutes} />
        <Route path="/training" component={GameRoutes} />
        <Route path="/play" component={GameRoutes} />
        <Redirect to="/" />
      </Switch>
    </>
  )
}
