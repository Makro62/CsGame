import { useSettingsStore } from "../stores/useSettingsStore";
import type { GameMode } from "../stores/useGameStore";

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let currentTrackId: string | null = null;
let isPlaying = false;
let stopCurrentTrack: (() => void) | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtxClass();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    updateMusicVolume();
  }
  return audioCtx;
}

export function updateMusicVolume() {
  if (!audioCtx || !masterGain) return;
  const { masterVolume, musicVolume } = useSettingsStore.getState();
  const effective = (masterVolume / 100) * (musicVolume / 100) * 0.28;
  masterGain.gain.setTargetAtTime(effective, audioCtx.currentTime, 0.1);
}

// ─── Distortion Curve ───
function makeDistortionCurve(amount = 25): Float32Array {
  const k = typeof amount === "number" ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// ─── Percussion Generators ───

function playKick(ctx: AudioContext, dest: GainNode, time: number, vol = 0.85, pitch = 160) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(pitch, time);
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.08);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
  osc.connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.22);
}

function playSnare(ctx: AudioContext, dest: GainNode, time: number, vol = 0.6, pitch = 220) {
  const bufferSize = ctx.sampleRate * 0.18;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(1200, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  noise.connect(filter).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + 0.18);

  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(pitch, time);
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, time + 0.08);
  oscGain.gain.setValueAtTime(vol * 0.7, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  osc.connect(oscGain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.12);
}

function playHiHat(ctx: AudioContext, dest: GainNode, time: number, open = false, vol = 0.25) {
  const duration = open ? 0.22 : 0.04;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(7500, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  noise.connect(filter).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + duration);
}

function playCrash(ctx: AudioContext, dest: GainNode, time: number, vol = 0.5) {
  const duration = 1.6;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(5500, time);
  filter.Q.setValueAtTime(1.2, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  noise.connect(filter).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + duration);
}

// ─── Synth Helpers ───

function playBrassNote(ctx: AudioContext, dest: GainNode, freq: number, time: number, duration = 0.35, vol = 0.35) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc1.type = "sawtooth";
  osc2.type = "sawtooth";
  osc1.frequency.setValueAtTime(freq, time);
  osc2.frequency.setValueAtTime(freq * 1.008, time);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(800, time);
  filter.frequency.linearRampToValueAtTime(3200, time + 0.05);
  filter.frequency.exponentialRampToValueAtTime(1100, time + duration);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain).connect(dest);
  osc1.start(time);
  osc2.start(time);
  osc1.stop(time + duration);
  osc2.stop(time + duration);
}

function playBassNote(ctx: AudioContext, dest: GainNode, freq: number, time: number, duration = 0.22, vol = 0.5) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const shaper = ctx.createWaveShaper();
  const gain = ctx.createGain();
  osc1.type = "sawtooth";
  osc2.type = "square";
  osc1.frequency.setValueAtTime(freq, time);
  osc2.frequency.setValueAtTime(freq * 0.5, time);
  shaper.curve = makeDistortionCurve(18);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(700, time);
  filter.frequency.exponentialRampToValueAtTime(280, time + duration);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc1.connect(shaper);
  osc2.connect(shaper);
  shaper.connect(filter).connect(gain).connect(dest);
  osc1.start(time);
  osc2.start(time);
  osc1.stop(time + duration);
  osc2.stop(time + duration);
}

function playSynthLeadNote(ctx: AudioContext, dest: GainNode, freq: number, time: number, duration = 0.2, vol = 0.25) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, time);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2400, time);
  filter.Q.setValueAtTime(4, time);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(filter).connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + duration);
}

function playPad(ctx: AudioContext, dest: GainNode, freq: number, time: number, duration = 2, vol = 0.12) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc1.type = "sine";
  osc2.type = "triangle";
  osc1.frequency.setValueAtTime(freq, time);
  osc2.frequency.setValueAtTime(freq * 1.005, time);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(800, time);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.3);
  gain.gain.setValueAtTime(vol, time + duration - 0.3);
  gain.gain.linearRampToValueAtTime(0, time + duration);
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain).connect(dest);
  osc1.start(time);
  osc2.start(time);
  osc1.stop(time + duration);
  osc2.stop(time + duration);
}

// ============================================================================
// 1. MAIN MENU: Ambient Electronic Chill (100 BPM)
// ============================================================================

function createMenuTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 2);
  trackGain.connect(output);

  const BPM = 100;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  const padNotes = [
    220, 261.63, 329.63, 261.63, 196, 246.94, 293.66, 246.94,
  ];

  const melodyPattern: Array<number | null> = [
    659.25, null, 587.33, null, 523.25, null, 440, null,
    493.88, null, 523.25, null, 587.33, null, 659.25, null,
    783.99, null, 659.25, null, 587.33, null, 523.25, null,
    440, null, 493.88, null, 523.25, null, 440, null,
  ];

  const bassPattern = [
    55, null, null, 55, null, 73.42, null, null,
    49, null, null, 49, null, 65.41, null, null,
  ];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 32;

    if (s16 % 8 === 0) playKick(ctx, trackGain, now, 0.6, 120);
    if (s16 % 8 === 4) playSnare(ctx, trackGain, now, 0.35, 180);
    playHiHat(ctx, trackGain, now, false, 0.12);

    if (s16 % 16 === 0) {
      const padNote = padNotes[(s16 / 16) % padNotes.length];
      playPad(ctx, trackGain, padNote, now, stepTime * 14, 0.15);
    }

    const mel = melodyPattern[s16 % melodyPattern.length];
    if (mel) playSynthLeadNote(ctx, trackGain, mel, now, stepTime * 1.5, 0.1);

    const bNote = bassPattern[s16 % bassPattern.length];
    if (bNote) playBassNote(ctx, trackGain, bNote, now, stepTime * 2, 0.3);

    step++;
  }, stepTime * 1000);

  return () => {
    clearInterval(timer);
    const t = ctx.currentTime;
    trackGain.gain.setTargetAtTime(0.001, t, 0.5);
    setTimeout(() => {
      try {
        trackGain.disconnect();
      } catch {
        /* ignore audio cleanup */
      }
    }, 800);
  };
}

// ============================================================================
// 2. TRAINING: Liquid Drum & Bass (174 BPM)
// ============================================================================

function createTrainingTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);
  trackGain.connect(output);

  const BPM = 174;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  const bassNotes = [55, 73.42, 65.41, 49];

  const arpNotes = [
    440, 523.25, 659.25, 880, 659.25, 523.25,
    349.23, 440, 523.25, 698.46, 523.25, 440,
    392, 493.88, 587.33, 783.99, 587.33, 493.88,
    329.63, 440, 523.25, 659.25, 523.25, 440,
  ];

  const leadPattern: Array<number | null> = [
    880, null, 783.99, null, 659.25, null, 587.33, null,
    659.25, null, 783.99, null, 880, null, null, null,
    1046.5, null, 880, null, 783.99, null, 659.25, null,
    587.33, null, 659.25, null, 523.25, null, null, null,
  ];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 32;

    if (s16 === 0 || s16 === 10) playKick(ctx, trackGain, now, 0.8, 150);
    if (s16 === 4 || s16 === 12) playSnare(ctx, trackGain, now, 0.6, 250);
    playHiHat(ctx, trackGain, now, s16 % 4 === 2, 0.18);

    if (s16 % 4 === 0) {
      const bn = bassNotes[Math.floor(s16 / 4) % bassNotes.length];
      playBassNote(ctx, trackGain, bn, now, stepTime * 3, 0.5);
    }

    const arp = arpNotes[s16 % arpNotes.length];
    playSynthLeadNote(ctx, trackGain, arp, now, 0.08, 0.12);

    const lead = leadPattern[s16 % leadPattern.length];
    if (lead) playSynthLeadNote(ctx, trackGain, lead * 0.5, now, 0.2, 0.15);

    step++;
  }, stepTime * 1000);

  return () => {
    clearInterval(timer);
    const t = ctx.currentTime;
    trackGain.gain.setTargetAtTime(0.001, t, 0.4);
    setTimeout(() => {
      try {
        trackGain.disconnect();
      } catch {
        /* ignore audio cleanup */
      }
    }, 600);
  };
}

// ============================================================================
// 3. 5V5 OFFLINE: Dark Synthwave Cyberpunk (120 BPM)
// ============================================================================

function create5v5TacticalTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);
  trackGain.connect(output);

  const BPM = 120;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  const droneOsc = ctx.createOscillator();
  const droneFilter = ctx.createBiquadFilter();
  const droneGain = ctx.createGain();
  droneOsc.type = "sawtooth";
  droneOsc.frequency.setValueAtTime(55, ctx.currentTime);
  droneFilter.type = "lowpass";
  droneFilter.frequency.setValueAtTime(200, ctx.currentTime);
  droneGain.gain.setValueAtTime(0.2, ctx.currentTime);
  droneOsc.connect(droneFilter).connect(droneGain).connect(trackGain);
  droneOsc.start();

  const bassPattern = [
    55, null, 55, null, 65.41, null, 55, null,
    73.42, null, 65.41, null, 55, null, 49, null,
  ];

  const chordHits: Array<{ notes: number[]; dur: number } | null> = [
    { notes: [220, 277.18, 329.63], dur: 0.6 }, null, null, null,
    null, null, { notes: [196, 246.94, 293.66], dur: 0.5 }, null,
    null, null, { notes: [174.61, 220, 261.63], dur: 0.6 }, null,
    null, null, null, null,
    { notes: [220, 277.18, 329.63], dur: 0.8 }, null, null, null,
    null, null, null, null,
    { notes: [246.94, 311.13, 369.99], dur: 0.5 }, null, null, null,
    null, null, { notes: [220, 277.18, 329.63], dur: 0.7 }, null,
    null, null, null, null,
  ];

  const leadPattern: Array<number | null> = [
    659.25, null, 587.33, null, 523.25, null, 440, null,
    493.88, null, 523.25, null, 587.33, null, 659.25, null,
    523.25, null, 493.88, null, 440, null, 392, null,
    440, null, 523.25, null, 587.33, null, 659.25, null,
  ];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 32;

    if (s16 === 0 || s16 === 6 || s16 === 10 || s16 === 16 || s16 === 22 || s16 === 26) {
      playKick(ctx, trackGain, now, 0.85);
    }
    if (s16 === 4 || s16 === 12 || s16 === 20 || s16 === 28) {
      playSnare(ctx, trackGain, now, 0.65, 220);
    }
    playHiHat(ctx, trackGain, now, s16 === 14 || s16 === 30, 0.2);

    const bNote = bassPattern[s16 % bassPattern.length];
    if (bNote) playBassNote(ctx, trackGain, bNote, now, stepTime * 1.8, 0.55);

    const chord = chordHits[s16 % chordHits.length];
    if (chord) {
      for (const n of chord.notes) {
        playBrassNote(ctx, trackGain, n, now, chord.dur, 0.25);
      }
    }

    const lead = leadPattern[s16 % leadPattern.length];
    if (lead) playSynthLeadNote(ctx, trackGain, lead, now, 0.25, 0.18);

    step++;
  }, stepTime * 1000);

  return () => {
    clearInterval(timer);
    const t = ctx.currentTime;
    trackGain.gain.setTargetAtTime(0.001, t, 0.4);
    setTimeout(() => {
      try {
        droneOsc.stop();
        trackGain.disconnect();
      } catch {
        /* ignore audio cleanup */
      }
    }, 600);
  };
}

// ============================================================================
// 4. ZOMBIE SURVIVAL: Heavy Metal Industrial (160 BPM)
// ============================================================================

function createZombieTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
  trackGain.connect(output);

  const BPM = 160;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  const sub = ctx.createOscillator();
  const subFilter = ctx.createBiquadFilter();
  const subGain = ctx.createGain();
  sub.type = "sawtooth";
  sub.frequency.setValueAtTime(41.2, ctx.currentTime);
  subFilter.type = "lowpass";
  subFilter.frequency.setValueAtTime(200, ctx.currentTime);
  subGain.gain.setValueAtTime(0.4, ctx.currentTime);
  sub.connect(subFilter).connect(subGain).connect(trackGain);
  sub.start();

  const metalBass = [
    41.2, null, 41.2, 41.2, 49, null, 41.2, null,
    55, null, 41.2, null, 49, 41.2, 36.7, null,
  ];

  const riffNotes: Array<number | null> = [
    329.63, 329.63, null, 392, null, 329.63, null, null,
    293.66, 293.66, null, 329.63, null, 293.66, null, null,
    261.63, 261.63, null, 329.63, null, 261.63, null, null,
    246.94, 246.94, null, 293.66, null, 246.94, null, null,
  ];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 32;

    if (s16 === 0 || s16 === 2 || s16 === 6 || s16 === 8 || s16 === 10 || s16 === 14 ||
        s16 === 16 || s16 === 18 || s16 === 22 || s16 === 24 || s16 === 26 || s16 === 30) {
      playKick(ctx, trackGain, now, 0.9, 180);
    }
    if (s16 === 4 || s16 === 12 || s16 === 20 || s16 === 28) {
      playSnare(ctx, trackGain, now, 0.75, 200);
    }
    if (s16 % 2 === 1) playHiHat(ctx, trackGain, now, false, 0.22);

    if (s16 === 0 || s16 === 16) playCrash(ctx, trackGain, now, 0.4);

    const bNote = metalBass[s16 % metalBass.length];
    if (bNote) playBassNote(ctx, trackGain, bNote, now, stepTime * 1.5, 0.65);

    const riff = riffNotes[s16 % riffNotes.length];
    if (riff) playBrassNote(ctx, trackGain, riff, now, stepTime * 1.2, 0.35);

    step++;
  }, stepTime * 1000);

  return () => {
    clearInterval(timer);
    const t = ctx.currentTime;
    trackGain.gain.setTargetAtTime(0.001, t, 0.3);
    setTimeout(() => {
      try {
        sub.stop();
        trackGain.disconnect();
      } catch {
        /* ignore audio cleanup */
      }
    }, 500);
  };
}

// ============================================================================
// 5. LEFT 4 DEAD: Fast Punk Rock (180 BPM)
// ============================================================================

function createL4DTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
  trackGain.connect(output);

  const BPM = 180;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  const punkBass = [
    73.42, 73.42, 73.42, 82.41, 73.42, 73.42, 65.41, 65.41,
    82.41, 82.41, 82.41, 92.5, 82.41, 82.41, 73.42, 73.42,
  ];

  const powerChords: Array<{ notes: number[]; dur: number } | null> = [
    { notes: [293.66, 440], dur: 0.3 }, null, null, null,
    { notes: [329.63, 493.88], dur: 0.3 }, null, null, null,
    { notes: [261.63, 392], dur: 0.3 }, null, null, null,
    { notes: [246.94, 369.99], dur: 0.3 }, null, null, null,
    { notes: [293.66, 440], dur: 0.4 }, null, null, null,
    { notes: [329.63, 493.88], dur: 0.3 }, null, null, null,
    { notes: [261.63, 392], dur: 0.5 }, null, null, null,
    null, null, null, null,
  ];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 32;

    if (s16 % 4 === 0) playKick(ctx, trackGain, now, 0.88, 170);
    if (s16 % 8 === 4) playSnare(ctx, trackGain, now, 0.7, 240);
    playHiHat(ctx, trackGain, now, s16 % 4 === 2, 0.24);

    if (s16 === 0 || s16 === 16) playCrash(ctx, trackGain, now, 0.45);

    const bNote = punkBass[s16 % punkBass.length];
    playBassNote(ctx, trackGain, bNote, now, stepTime * 1.3, 0.55);

    const chord = powerChords[s16 % powerChords.length];
    if (chord) {
      for (const n of chord.notes) {
        playBrassNote(ctx, trackGain, n, now, chord.dur, 0.3);
      }
    }

    step++;
  }, stepTime * 1000);

  return () => {
    clearInterval(timer);
    const t = ctx.currentTime;
    trackGain.gain.setTargetAtTime(0.001, t, 0.3);
    setTimeout(() => {
      try {
        trackGain.disconnect();
      } catch {
        /* ignore audio cleanup */
      }
    }, 500);
  };
}

// ─── Play / Switch Music ───

export function playMusicForMode(mode: GameMode) {
  const ctx = getContext();
  if (ctx.state === "suspended") ctx.resume();
  if (!masterGain) return;

  const trackId = mode || "menu";
  if (trackId === currentTrackId && isPlaying) return;

  if (stopCurrentTrack) {
    stopCurrentTrack();
    stopCurrentTrack = null;
  }

  currentTrackId = trackId;
  isPlaying = true;

  if (trackId === "zombie") {
    stopCurrentTrack = createZombieTrack(ctx, masterGain);
  } else if (trackId === "l4d") {
    stopCurrentTrack = createL4DTrack(ctx, masterGain);
  } else if (trackId === "training") {
    stopCurrentTrack = createTrainingTrack(ctx, masterGain);
  } else if (trackId === "offline5v5") {
    stopCurrentTrack = create5v5TacticalTrack(ctx, masterGain);
  } else {
    stopCurrentTrack = createMenuTrack(ctx, masterGain);
  }
}

export function stopMusic() {
  if (stopCurrentTrack) {
    stopCurrentTrack();
    stopCurrentTrack = null;
  }
  currentTrackId = null;
  isPlaying = false;
}

if (typeof window !== "undefined") {
  useSettingsStore.subscribe(() => {
    updateMusicVolume();
  });
}
