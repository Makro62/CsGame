import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useGameStore } from '../stores/useGameStore'
import { useNetworkStore } from '../stores/useNetworkStore'

export default function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const [, setLocation] = useLocation()
  const {
    sensitivity,
    slideControl,
    masterVolume,
    sfxVolume,
    musicVolume,
    crosshairColor,
    crosshairStyle,
    setCrosshairColor,
    setCrosshairStyle,
  } = useSettingsStore()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't intercept 'p' if user is typing in an input
      if (
        (e.key === 'p' || e.key === 'P' || e.key === 'Escape') &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        if (e.key === 'Escape' && !open) return
        setOpen(v => {
          const next = !v
          if (next && document.pointerLockElement) {
            document.exitPointerLock()
          }
          return next
        })
      }
    }
    const onOpen = () => {
      if (document.pointerLockElement) {
        document.exitPointerLock()
      }
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('openSettings', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('openSettings', onOpen)
    }
  }, [open])

  const handleResume = () => {
    setOpen(false)
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.requestPointerLock()
    }
  }

  const handleLeaveToMenu = () => {
    setOpen(false)
    useGameStore.getState().setMode('menu')
    useNetworkStore.getState().disconnect()
    setLocation('/')
  }

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
        backgroundColor: 'rgba(4, 8, 16, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Rajdhani', 'Chakra Petch', 'Inter', system-ui, sans-serif",
        padding: '16px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
      onClick={handleResume}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(165deg, rgba(13, 20, 36, 0.98) 0%, rgba(8, 12, 22, 0.99) 100%)',
          border: '1.5px solid rgba(56, 189, 248, 0.4)',
          boxShadow: '0 0 35px rgba(56, 189, 248, 0.25), 0 20px 50px rgba(0, 0, 0, 0.8)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 580,
          maxHeight: 'min(88vh, 620px)',
          display: 'flex',
          flexDirection: 'column',
          color: '#e2e8f0',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(56, 189, 248, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, color: '#38bdf8' }}>⚙️</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.12em', color: '#ffffff' }}>
                GAME SETTINGS
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.05em' }}>
                CS WEB FPS CONFIGURATION
              </div>
            </div>
          </div>
          <button
            onClick={handleResume}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 6,
              color: '#cbd5e1',
              width: 30,
              height: 30,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold',
              transition: 'all 0.15s',
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flex: 1,
          }}
        >
          {/* Mouse & Aim Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span>🖱️</span> MOUSE & AIM
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={sliderHeaderStyle}>
                  <span>Sensitivity (Look Speed)</span>
                  <span style={badgeStyle}>{sensitivity.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={sensitivity}
                  onChange={e => handleSensitivityChange(parseFloat(e.target.value))}
                  style={sliderTrackStyle}
                />
              </div>

              <div>
                <div style={sliderHeaderStyle}>
                  <span>Slide Control & Movement Inertia</span>
                  <span style={badgeStyle}>{slideControl}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={slideControl}
                  onChange={e => handleSlideControlChange(parseInt(e.target.value, 10))}
                  style={sliderTrackStyle}
                />
              </div>
            </div>
          </div>

          {/* Audio Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span>🔊</span> AUDIO
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={sliderHeaderStyle}>
                  <span>Master Volume</span>
                  <span style={badgeStyle}>{masterVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={masterVolume}
                  onChange={e => handleMasterVolumeChange(parseInt(e.target.value, 10))}
                  style={sliderTrackStyle}
                />
              </div>

              <div>
                <div style={sliderHeaderStyle}>
                  <span>SFX / Gunshots Volume</span>
                  <span style={badgeStyle}>{sfxVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={sfxVolume}
                  onChange={e => handleSfxVolumeChange(parseInt(e.target.value, 10))}
                  style={sliderTrackStyle}
                />
              </div>

              <div>
                <div style={sliderHeaderStyle}>
                  <span>Music Volume</span>
                  <span style={badgeStyle}>{musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={musicVolume}
                  onChange={e => handleMusicVolumeChange(parseInt(e.target.value, 10))}
                  style={sliderTrackStyle}
                />
              </div>
            </div>
          </div>

          {/* Crosshair Settings */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span>🎯</span> CROSSHAIR
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Style</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['dynamic', 'cross', 'dot'] as const).map(style => (
                    <button
                      key={style}
                      onClick={() => setCrosshairStyle(style)}
                      style={{
                        flex: 1,
                        padding: '5px 0',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: crosshairStyle === style ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.06)',
                        border: crosshairStyle === style ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                        color: crosshairStyle === style ? '#ffffff' : '#94a3b8',
                      }}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Color</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['#00ff00', '#00ffff', '#ff0055', '#ffffff', '#ffff00'].map(color => (
                    <button
                      key={color}
                      onClick={() => setCrosshairColor(color)}
                      style={{
                        flex: 1,
                        height: 24,
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: color,
                        border: crosshairColor === color ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.5)',
                        boxShadow: crosshairColor === color ? `0 0 8px ${color}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Keybinds Reference */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span>⌨️</span> KEYBINDS / KONTROL
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px 12px',
                fontSize: 11,
              }}
            >
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>WASD</span>
                <span style={keyLabelStyle}>Gerak (Move)</span>
              </div>
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>MOUSE</span>
                <span style={keyLabelStyle}>Arah Pandangan</span>
              </div>
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>LMB</span>
                <span style={keyLabelStyle}>Tembak (Shoot)</span>
              </div>
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>RMB</span>
                <span style={{ ...keyLabelStyle, color: '#38bdf8', fontWeight: 'bold' }}>ADS / Zoom In / Scope</span>
              </div>
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>R</span>
                <span style={keyLabelStyle}>Reload Senjata</span>
              </div>
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>SPACE</span>
                <span style={keyLabelStyle}>Lompat (Jump)</span>
              </div>
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>SHIFT</span>
                <span style={keyLabelStyle}>Sprint / Lari Cepat</span>
              </div>
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>CTRL</span>
                <span style={keyLabelStyle}>Jongkok (Crouch/Slide)</span>
              </div>
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>1 / 2 / 3</span>
                <span style={keyLabelStyle}>Primary / Secondary / Knife</span>
              </div>
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>B</span>
                <span style={keyLabelStyle}>Buy Menu (Shop)</span>
              </div>
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>P / ESC</span>
                <span style={keyLabelStyle}>Settings / Pause Menu</span>
              </div>
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>F</span>
                <span style={keyLabelStyle}>Interaksi / Revive</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(10, 16, 28, 0.95)',
            gap: 12,
          }}
        >
          <button
            onClick={handleLeaveToMenu}
            style={{
              padding: '9px 18px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: '0.06em',
              transition: 'all 0.15s',
            }}
          >
            ← KELUAR KE MENU
          </button>
          <button
            onClick={handleResume}
            style={{
              flex: 1,
              maxWidth: 240,
              padding: '10px 20px',
              background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              boxShadow: '0 0 16px rgba(56, 189, 248, 0.35)',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: '0.1em',
              transition: 'all 0.15s',
            }}
          >
            LANJUT MAIN [RESUME]
          </button>
        </div>
      </div>
    </div>
  )
}

const sectionStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.28)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: 8,
  padding: '12px 14px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.1em',
  color: '#38bdf8',
  marginBottom: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const sliderHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 11,
  color: '#cbd5e1',
  marginBottom: 4,
}

const badgeStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 800,
  fontSize: 11,
  color: '#38bdf8',
  background: 'rgba(56, 189, 248, 0.15)',
  padding: '1px 6px',
  borderRadius: 4,
  border: '1px solid rgba(56, 189, 248, 0.3)',
}

const sliderTrackStyle: React.CSSProperties = {
  width: '100%',
  accentColor: '#38bdf8',
  cursor: 'pointer',
  height: 6,
}

const keybindItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const keyBoxStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9.5,
  fontWeight: 800,
  color: '#38bdf8',
  background: '#070f1e',
  border: '1px solid rgba(56, 189, 248, 0.35)',
  padding: '2px 6px',
  borderRadius: 3,
  whiteSpace: 'nowrap',
}

const keyLabelStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 11,
}
