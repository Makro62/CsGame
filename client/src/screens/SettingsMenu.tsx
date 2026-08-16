import { useEffect, useState } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useNetworkStore } from '../stores/useNetworkStore'

export default function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const { sensitivity, slideControl, masterVolume, sfxVolume, musicVolume } =
    useSettingsStore()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') setOpen(v => !v)
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('openSettings', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('openSettings', onOpen)
    }
  }, [])

  const handleLeaveToMenu = () => {
    setOpen(false)
    useNetworkStore.getState().disconnect()
    window.location.href = '/'
  }

  // Read setters from store at event time to avoid closure staleness
  const handleSensitivityChange = (value: number) => {
    useSettingsStore.getState().setSensitivity(value)
  }

  const handleSlideControlChange = (value: number) => {
    useSettingsStore.getState().setSlideControl(value)
  }

  const handleMasterVolumeChange = (value: number) => {
    useSettingsStore.getState().setMasterVolume(value)
  }

  const handleSfxVolumeChange = (value: number) => {
    useSettingsStore.getState().setSfxVolume(value)
  }

  const handleMusicVolumeChange = (value: number) => {
    useSettingsStore.getState().setMusicVolume(value)
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0f172a',
          padding: 24,
          borderRadius: 12,
          minWidth: 520,
          color: 'white',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 24 }}>Settings</h2>

        {/* Mouse Settings */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, color: '#60a5fa', marginBottom: 12 }}>
            MOUSE
          </h3>
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6 }}>Sensitivity</div>
            <input
              type="range"
              min={0.1}
              max={5}
              step={0.1}
              value={sensitivity}
              onChange={e =>
                handleSensitivityChange(parseFloat(e.target.value))
              }
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 12, color: '#aaa' }}>
              {sensitivity.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Movement Settings */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, color: '#60a5fa', marginBottom: 12 }}>
            MOVEMENT
          </h3>
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6 }}>Slide Control</div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={slideControl}
              onChange={e =>
                handleSlideControlChange(parseInt(e.target.value, 10))
              }
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 12, color: '#aaa' }}>{slideControl}</div>
          </div>
        </div>

        {/* Audio Settings */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, color: '#60a5fa', marginBottom: 12 }}>
            AUDIO
          </h3>
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6 }}>Master Volume</div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={masterVolume}
              onChange={e =>
                handleMasterVolumeChange(parseInt(e.target.value, 10))
              }
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 12, color: '#aaa' }}>{masterVolume}%</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6 }}>SFX Volume</div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={sfxVolume}
              onChange={e =>
                handleSfxVolumeChange(parseInt(e.target.value, 10))
              }
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 12, color: '#aaa' }}>{sfxVolume}%</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6 }}>Music Volume</div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={musicVolume}
              onChange={e =>
                handleMusicVolumeChange(parseInt(e.target.value, 10))
              }
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 12, color: '#aaa' }}>{musicVolume}%</div>
          </div>
        </div>

        {/* Keybinds */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, color: '#60a5fa', marginBottom: 12 }}>
            KEYBINDS
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              fontSize: 12,
            }}
          >
            <div style={{ color: '#aaa' }}>WASD - Move</div>
            <div style={{ color: '#aaa' }}>Mouse - Look</div>
            <div style={{ color: '#aaa' }}>LMB - Shoot</div>
            <div style={{ color: '#aaa' }}>RMB - ADS</div>
            <div style={{ color: '#aaa' }}>R - Reload</div>
            <div style={{ color: '#aaa' }}>Space - Jump</div>
            <div style={{ color: '#aaa' }}>Shift - Sprint</div>
            <div style={{ color: '#aaa' }}>Ctrl - Crouch</div>
            <div style={{ color: '#aaa' }}>1/2/3 - Weapon Slot</div>
            <div style={{ color: '#aaa' }}>B - Buy Menu</div>
            <div style={{ color: '#aaa' }}>P - Settings</div>
            <div style={{ color: '#aaa' }}>Tab - Scoreboard</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <button
            onClick={handleLeaveToMenu}
            style={{
              padding: '10px 18px',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ← KELUAR KE MENU
          </button>
          <button
            onClick={() => setOpen(false)}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            LANJUT MAIN [RESUME]
          </button>
        </div>
      </div>
    </div>
  )
}
