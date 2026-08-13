import { useEffect, useState } from 'react'
import { useNetworkStore } from '../stores/useNetworkStore'

export default function RadioCommand() {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const room = useNetworkStore(s => s.room)

  useEffect(() => {
    const RADIO_TEXTS: Record<number, string> = {
      1: "Affirmative!",
      2: "Need backup!",
      3: "Enemy spotted!",
    };

    const handleRadioEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { sender: string; code: number; team: string };
      const text = RADIO_TEXTS[detail.code] || `Radio ${detail.code}`;
      setMsg(`[${detail.sender}]: ${text}`);
      setTimeout(() => setMsg(null), 3500);
    };

    window.addEventListener("radioCommand", handleRadioEvent);

    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (open && ['1', '2', '3'].includes(e.key)) {
        const code = parseInt(e.key, 10);
        room?.send('radio', { code });
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener("radioCommand", handleRadioEvent);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, room]);

  if (!open && !msg) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 120,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        pointerEvents: 'none',
        fontFamily: 'monospace',
      }}
    >
      {open && (
        <div
          style={{
            background: 'rgba(0,0,0,0.7)',
            padding: '8px 12px',
            borderRadius: 8,
            color: 'white',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 12 }}>Radio:</div>
          <div style={{ fontSize: 12, color: '#60a5fa' }}>[1] Affirm</div>
          <div style={{ fontSize: 12, color: '#fbbf24' }}>[2] Need backup</div>
          <div style={{ fontSize: 12, color: '#ef4444' }}>
            [3] Enemy spotted
          </div>
        </div>
      )}

      {msg && (
        <div
          style={{
            marginTop: 8,
            background: 'rgba(0,0,0,0.7)',
            padding: '6px 10px',
            borderRadius: 8,
            color: '#fff',
            fontSize: 12,
          }}
        >
          {msg}
        </div>
      )}
    </div>
  )
}
