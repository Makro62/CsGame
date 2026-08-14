import { useState } from 'react'
import { GlassPanel } from '../shared/GlassPanel'
import { cn } from '../../../utils/cn'

interface MainMenuProps {
  onPlayMultiplayer: () => void
  onPlayTraining: () => void
}

/**
 * MainMenu - Game main menu with animated background
 * Allows player to select game mode and enter nickname
 */
export function MainMenu({ onPlayMultiplayer, onPlayTraining }: MainMenuProps) {
  const [selectedMode, setSelectedMode] = useState<'training' | 'multiplayer'>(
    'multiplayer'
  )
  const [nickname, setNickname] = useState('')

  const handlePlay = () => {
    if (!nickname.trim()) {
      alert('Please enter a player name')
      return
    }

    if (selectedMode === 'multiplayer') {
      onPlayMultiplayer()
    } else {
      onPlayTraining()
    }
  }

  return (
    <div className="absolute inset-0 bg-primary flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-bg-secondary via-bg-primary to-black" />
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        {/* Floating particles */}
        <div className="absolute inset-0 animate-particles">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 10}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-6xl font-black font-display tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-terrorist via-white to-counter">
            CS WEB
          </h1>
          <p className="text-text-muted text-sm tracking-[0.3em] mt-2">
            FIRST PERSON SHOOTER
          </p>
        </div>

        {/* Menu Card */}
        <GlassPanel className="w-[400px] p-6" intensity="high" glow>
          {/* Nickname Input */}
          <div className="mb-6">
            <label className="text-xs text-text-muted tracking-wider mb-2 block">
              PLAYER NAME
            </label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value.slice(0, 16))}
              placeholder="Enter your name..."
              className="w-full bg-bg-secondary border border-white/10 rounded px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-gold/50 transition-colors"
            />
          </div>

          {/* Mode Selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setSelectedMode('training')}
              className={cn(
                'p-4 rounded-lg border transition-all duration-200 text-center',
                selectedMode === 'training'
                  ? 'border-accent-gold bg-accent-gold/10'
                  : 'border-white/10 hover:border-white/30'
              )}
            >
              <div className="text-2xl mb-1">🎯</div>
              <div className="font-bold text-sm">TRAINING</div>
              <div className="text-[10px] text-text-muted mt-1">
                Practice Range
              </div>
            </button>
            <button
              onClick={() => setSelectedMode('multiplayer')}
              className={cn(
                'p-4 rounded-lg border transition-all duration-200 text-center',
                selectedMode === 'multiplayer'
                  ? 'border-accent-gold bg-accent-gold/10'
                  : 'border-white/10 hover:border-white/30'
              )}
            >
              <div className="text-2xl mb-1">⚔️</div>
              <div className="font-bold text-sm">MULTIPLAYER</div>
              <div className="text-[10px] text-text-muted mt-1">
                5v5 Bomb Defusal
              </div>
            </button>
          </div>

          {/* Play Button */}
          <button
            onClick={handlePlay}
            className={cn(
              'w-full py-4 rounded-lg font-black text-lg tracking-wider transition-all duration-300',
              'bg-gradient-to-r from-terrorist to-counter hover:from-terrorist/90 hover:to-counter/90',
              'shadow-lg shadow-terrorist/20 hover:shadow-xl hover:shadow-terrorist/30',
              'transform hover:scale-[1.02] active:scale-[0.98]'
            )}
          >
            PLAY
          </button>
        </GlassPanel>

        {/* Footer */}
        <div className="text-text-muted text-xs">
          v2.2 • Built with React Three Fiber & Colyseus
        </div>
      </div>
    </div>
  )
}
