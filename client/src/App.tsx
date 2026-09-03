import { lazy, Suspense, useEffect } from 'react'
import { Switch, Route, useLocation, Redirect } from 'wouter'
import { MainMenu } from './screens/MainMenu'
import { AudioManager } from './components/AudioManager'
import { HitMarker } from './components/HitMarker'
import { DamageIndicator } from './components/DamageIndicator'
import SettingsMenu from './screens/SettingsMenu'
import { useGameStore } from './stores/useGameStore'
import './index.css'

const TrainingRange = lazy(() =>
  import('./game/training/TrainingRange').then((m) => ({ default: m.TrainingRange })),
)
const Offline5v5Mode = lazy(() =>
  import('./screens/Offline5v5Mode').then((m) => ({ default: m.Offline5v5Mode })),
)
const ZombieSurvivalMode = lazy(() =>
  import('./screens/ZombieSurvivalMode').then((m) => ({ default: m.ZombieSurvivalMode })),
)
const L4DMode = lazy(() =>
  import('./screens/L4DMode').then((m) => ({ default: m.L4DMode })),
)

function ModeFallback() {
  return (
    <div
      style={{
        width: '100dvw',
        height: '100dvh',
        background: '#0a0e14',
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Rajdhani, sans-serif',
        fontWeight: 700,
        letterSpacing: 2,
      }}
    >
      MEMUAT…
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
    } else if (location === '/offline5v5' && mode !== 'offline5v5') {
      useGameStore.getState().setMode('offline5v5')
    } else if (location === '/zombie' && mode !== 'zombie') {
      useGameStore.getState().setMode('zombie')
    } else if (location === '/l4d' && mode !== 'l4d') {
      useGameStore.getState().setMode('l4d')
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
      } else if (state.mode === 'offline5v5' && location !== '/offline5v5') {
        setLocation('/offline5v5')
      } else if (state.mode === 'zombie' && location !== '/zombie') {
        setLocation('/zombie')
      } else if (state.mode === 'l4d' && location !== '/l4d') {
        setLocation('/l4d')
      }
    })
    return unsub
  }, [location, setLocation])

  return null
}

function GameRoutes() {
  const [location] = useLocation()

  // Render the right component based on URL — all offline
  if (location === '/training') return <Suspense fallback={<ModeFallback />}><TrainingRange /></Suspense>
  if (location === '/offline5v5') return <Suspense fallback={<ModeFallback />}><Offline5v5Mode /></Suspense>
  if (location === '/zombie') return <Suspense fallback={<ModeFallback />}><ZombieSurvivalMode /></Suspense>
  if (location === '/l4d') return <Suspense fallback={<ModeFallback />}><L4DMode /></Suspense>
  return <MainMenu />
}

export default function App() {
  return (
    <>
      <AudioManager />
      <HitMarker />
      <DamageIndicator />
      <SettingsMenu />
      <SyncModeToURL />
      <Switch>
        <Route path="/" component={GameRoutes} />
        <Route path="/training" component={GameRoutes} />
        <Route path="/offline5v5" component={GameRoutes} />
        <Route path="/zombie" component={GameRoutes} />
        <Route path="/l4d" component={GameRoutes} />
        <Redirect to="/" />
      </Switch>
    </>
  )
}
