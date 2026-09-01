import { useEffect, useState } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useGameStore } from '../stores/useGameStore'
import { useUiOverlayStore } from '../stores/useUiOverlayStore'
import { HUD_Z, modalBackdrop, overlayButton } from '../ui/hudTheme'

export default function SettingsMenu() {
  const [open, setOpen] = useState(false)
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
    useUiOverlayStore.getState().setSettingsOpen(open)
  }, [open])

  useEffect(() => () => {
    useUiOverlayStore.getState().setSettingsOpen(false)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        e.stopImmediatePropagation()
        setOpen(false)
        return
      }
      if (e.key === 'p' || e.key === 'P') {
        setOpen(v => {
          const next = !v
          if (next && document.pointerLockElement) document.exitPointerLock()
          return next
        })
      }
    }
    const onOpen = () => {
      if (document.pointerLockElement) document.exitPointerLock()
      setOpen(true)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('openSettings', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('openSettings', onOpen)
    }
  }, [open])

  const handleClose = () => setOpen(false)

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
      style={modalBackdrop(HUD_Z.settings)}
      onClick={handleClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(165deg, rgba(13, 20, 36, 0.98) 0%, rgba(8, 12, 22, 0.99) 100%)',
          border: '1.5px solid rgba(56, 189, 248, 0.4)',
          boxShadow: '0 0 35px rgba(56, 189, 248, 0.25), 0 20px 50px rgba(0, 0, 0, 0.8)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 'min(92vw, 580px)',
          maxHeight: 'min(88dvh, 620px)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22, color: '#38bdf8' }}>⚙️</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.12em', color: '#ffffff' }}>
                  PENGATURAN
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    letterSpacing: '0.08em',
                  }}
                >
                  {useGameStore.getState().mode === 'training'
                    ? 'MODE: TRAINING RANGE'
                    : useGameStore.getState().mode === 'offline5v5'
                    ? 'MODE: 5V5 OFFLINE'
                    : useGameStore.getState().mode === 'zombie'
                    ? 'MODE: ZOMBIE SURVIVAL'
                    : useGameStore.getState().mode === 'l4d'
                    ? 'MODE: L4D KAMPANYE'
                    : 'MENU UTAMA'}
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.05em', marginTop: 2 }}>
                CS WEB FPS • TACTICAL CONFIGURATION
              </div>
            </div>
          </div>
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
                <span style={keyBoxStyle}>ESC</span>
                <span style={keyLabelStyle}>Pause Menu</span>
              </div>
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>P</span>
                <span style={keyLabelStyle}>Pengaturan</span>
              </div>
              <div style={keybindItemStyle}>
                <span style={keyBoxStyle}>F</span>
                <span style={keyLabelStyle}>Interaksi / Revive</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer — one close action only */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(10, 16, 28, 0.95)',
          }}
        >
          <button type="button" onClick={handleClose} style={overlayButton('primary')}>
            TUTUP [ESC]
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
