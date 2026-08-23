import { useEffect } from 'react'
import { Switch, Route, useLocation, Redirect } from 'wouter'
import { MainMenu } from './screens/MainMenu'
import { TrainingRange } from './game/training/TrainingRange'
import { ZombieSurvivalMode } from './screens/ZombieSurvivalMode'
import { Offline5v5Mode } from './screens/Offline5v5Mode'
import { L4DMode } from './screens/L4DMode'
import { useGameStore } from './stores/useGameStore'
import './index.css'

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
  if (location === '/training') return <TrainingRange />
  if (location === '/offline5v5') return <Offline5v5Mode />
  if (location === '/zombie') return <ZombieSurvivalMode />
  if (location === '/l4d') return <L4DMode />
  return <MainMenu />
}

export default function App() {
  return (
    <>
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
