import { useSettingsStore } from "../stores/useSettingsStore";
import type { GameMode } from "../stores/useGameStore";

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let masterCompressor: DynamicsCompressorNode | null = null;
let currentTrackId: string | null = null;
let isPlaying = false;
let stopCurrentTrack: (() => void) | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtxClass();

    // Master Compressor prevents distortion when multiple heavy synth tracks layer
    masterCompressor = audioCtx.createDynamicsCompressor();
    masterCompressor.threshold.setValueAtTime(-14, audioCtx.currentTime);
    masterCompressor.knee.setValueAtTime(6, audioCtx.currentTime);
    masterCompressor.ratio.setValueAtTime(5, audioCtx.currentTime);
    masterCompressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
    masterCompressor.release.setValueAtTime(0.12, audioCtx.currentTime);

    masterGain = audioCtx.createGain();
    masterGain.connect(masterCompressor);
    masterCompressor.connect(audioCtx.destination);
    updateMusicVolume();
  }
  return audioCtx;
}

export function updateMusicVolume() {
  if (!audioCtx || !masterGain) return;
  const { masterVolume, musicVolume } = useSettingsStore.getState();
  // Boosted from 0.28 to 0.45 so music has full punch and presence
  const effective = (masterVolume / 100) * (musicVolume / 100) * 0.45;
  masterGain.gain.setTargetAtTime(effective, audioCtx.currentTime, 0.1);
}

// ─── Heavy Overdrive WaveShaper ───
function makeDistortionCurve(amount = 35): Float32Array {
  const k = typeof amount === "number" ? amount : 35;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// ─── Punchy Percussion Generators ───

function playKick(ctx: AudioContext, dest: GainNode, time: number, vol = 0.95, pitch = 180) {
  // Low-end sub drop
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(pitch, time);
  osc.frequency.exponentialRampToValueAtTime(38, time + 0.09);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.26);
  osc.connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.26);

  // Transient punch click for presence in mix
  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.type = "triangle";
  click.frequency.setValueAtTime(500, time);
  click.frequency.exponentialRampToValueAtTime(70, time + 0.035);
  clickGain.gain.setValueAtTime(vol * 0.75, time);
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
  click.connect(clickGain).connect(dest);
  click.start(time);
  click.stop(time + 0.035);
}

function playSnare(ctx: AudioContext, dest: GainNode, time: number, vol = 0.75, pitch = 215) {
  const duration = 0.22;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(900, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol * 0.85, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  noise.connect(filter).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + duration);

  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(pitch, time);
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.45, time + 0.1);
  oscGain.gain.setValueAtTime(vol * 0.8, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
  osc.connect(oscGain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.14);
}

function playHiHat(ctx: AudioContext, dest: GainNode, time: number, open = false, vol = 0.28) {
  const duration = open ? 0.25 : 0.045;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(open ? 6500 : 8000, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  noise.connect(filter).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + duration);
}

function playCrash(ctx: AudioContext, dest: GainNode, time: number, vol = 0.55) {
  const duration = 1.8;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(5000, time);
  filter.Q.setValueAtTime(1.4, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  noise.connect(filter).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + duration);
}

// ─── Heavy Bassline Generator ───
function playBassNote(ctx: AudioContext, dest: GainNode, freq: number, time: number, duration = 0.22, vol = 0.55) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const shaper = ctx.createWaveShaper();
  const gain = ctx.createGain();

  osc1.type = "sawtooth";
  osc2.type = "square";
  osc1.frequency.setValueAtTime(freq, time);
  osc2.frequency.setValueAtTime(freq * 0.5, time); // Sub-octave reinforcement

  shaper.curve = makeDistortionCurve(24);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, time);
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

function playRockChord(ctx: AudioContext, dest: GainNode, root: number, time: number, duration = 0.28, vol = 0.32) {
  const fifth = root * 1.4983;
  const oscs = [root, fifth, root * 2].map((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 2 ? "triangle" : "sawtooth";
    o.frequency.setValueAtTime(f, time);
    return o;
  });
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, time);
  filter.frequency.linearRampToValueAtTime(2200, time + 0.04);
  filter.frequency.exponentialRampToValueAtTime(700, time + duration);
  const shaper = ctx.createWaveShaper();
  shaper.curve = makeDistortionCurve(22);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  for (const o of oscs) o.connect(shaper);
  shaper.connect(filter).connect(gain).connect(dest);
  for (const o of oscs) {
    o.start(time);
    o.stop(time + duration);
  }
}

// ─── Industrial horror stab (Alien Shooter) ───
function playIndustrialStab(ctx: AudioContext, dest: GainNode, freq: number, time: number, duration = 0.18, vol = 0.22) {
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc2.type = "square";
  osc.frequency.setValueAtTime(freq, time);
  osc2.frequency.setValueAtTime(freq * 1.414, time); // tritone — horror
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(700, time);
  filter.frequency.exponentialRampToValueAtTime(1800, time + 0.04);
  filter.Q.setValueAtTime(4, time);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(gain).connect(dest);
  osc.start(time);
  osc2.start(time);
  osc.stop(time + duration);
  osc2.stop(time + duration);
}

// ─── Ambient Pad / Drone ───
function playPad(ctx: AudioContext, dest: GainNode, freq: number, time: number, duration = 2, vol = 0.16) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc2.type = "triangle";
  osc1.frequency.setValueAtTime(freq, time);
  osc2.frequency.setValueAtTime(freq * 1.006, time);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1000, time);

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.25);
  gain.gain.setValueAtTime(vol, time + duration - 0.25);
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
// 1. MAIN MENU: Cinematic tactical lobby (CS-style, 92 BPM)
// Sparse pads, ticking hats, no party melody.
// ============================================================================

function createMenuTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.2);
  trackGain.connect(output);

  const BPM = 92;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  const padChords = [
    [110, 164.81, 220],
    [98, 146.83, 196],
    [87.31, 130.81, 174.61],
    [82.41, 123.47, 164.81],
  ];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 32;

    if (s16 === 0) playKick(ctx, trackGain, now, 0.55, 110);
    if (s16 === 16) playKick(ctx, trackGain, now, 0.42, 100);
    if (s16 === 8 || s16 === 24) playSnare(ctx, trackGain, now, 0.22, 170);
    if (s16 % 4 === 0) playHiHat(ctx, trackGain, now, false, 0.08);

    if (s16 % 16 === 0) {
      const chord = padChords[Math.floor(step / 16) % padChords.length];
      for (const n of chord) playPad(ctx, trackGain, n, now, stepTime * 15, 0.12);
    }

    if (s16 === 0 || s16 === 12) {
      playBassNote(ctx, trackGain, 55, now, stepTime * 6, 0.28);
    }
    if (s16 === 16) playBassNote(ctx, trackGain, 49, now, stepTime * 6, 0.26);

    step++;
  }, stepTime * 1000);

  return () => {
    clearInterval(timer);
    const t = ctx.currentTime;
    trackGain.gain.setTargetAtTime(0.001, t, 0.5);
    setTimeout(() => {
      try { trackGain.disconnect(); } catch { /* ignore */ }
    }, 800);
  };
}

// ============================================================================
// 2. TRAINING RANGE: Focused mid-tempo range mix (124 BPM)
// Clean pulse so shots stay readable — not frantic DnB.
// ============================================================================

function createTrainingTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.4);
  trackGain.connect(output);

  const BPM = 124;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  const bassNotes = [65.41, 65.41, 73.42, 58.27];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 32;

    if (s16 % 4 === 0) playKick(ctx, trackGain, now, 0.7, 140);
    if (s16 % 8 === 4) playSnare(ctx, trackGain, now, 0.4, 200);
    if (s16 % 2 === 0) playHiHat(ctx, trackGain, now, false, 0.12);

    if (s16 % 8 === 0) {
      const bn = bassNotes[Math.floor(s16 / 8) % bassNotes.length];
      playBassNote(ctx, trackGain, bn, now, stepTime * 6, 0.36);
    }

    if (s16 % 16 === 0) playPad(ctx, trackGain, 196, now, stepTime * 14, 0.1);

    step++;
  }, stepTime * 1000);

  return () => {
    clearInterval(timer);
    const t = ctx.currentTime;
    trackGain.gain.setTargetAtTime(0.001, t, 0.4);
    setTimeout(() => {
      try { trackGain.disconnect(); } catch { /* ignore */ }
    }, 600);
  };
}

// ============================================================================
// 3. 5V5 COMPETITIVE: Tense industrial CS pulse (100 BPM)
// Low drone, clock hats, almost no melody — leaves room for gunfire.
// ============================================================================

function create5v5TacticalTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.6);
  trackGain.connect(output);

  const BPM = 100;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  const droneOsc = ctx.createOscillator();
  const droneFilter = ctx.createBiquadFilter();
  const droneGain = ctx.createGain();
  droneOsc.type = "sine";
  droneOsc.frequency.setValueAtTime(55, ctx.currentTime);
  droneFilter.type = "lowpass";
  droneFilter.frequency.setValueAtTime(140, ctx.currentTime);
  droneGain.gain.setValueAtTime(0.2, ctx.currentTime);
  droneOsc.connect(droneFilter).connect(droneGain).connect(trackGain);
  droneOsc.start();

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 32;

    if (s16 === 0 || s16 === 16) playKick(ctx, trackGain, now, 0.62, 120);
    if (s16 === 8 || s16 === 24) playSnare(ctx, trackGain, now, 0.28, 180);
    if (s16 % 2 === 0) playHiHat(ctx, trackGain, now, false, 0.07);

    if (s16 === 0) playBassNote(ctx, trackGain, 55, now, stepTime * 8, 0.32);
    if (s16 === 16) playBassNote(ctx, trackGain, 41.2, now, stepTime * 8, 0.3);

    if (s16 % 16 === 0) playPad(ctx, trackGain, 110, now, stepTime * 14, 0.08);

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
      } catch { /* ignore */ }
    }, 600);
  };
}

// ============================================================================
// 4. ZOMBIE SURVIVAL: Dark industrial horror (Alien Shooter, 122 BPM)
// Tritone stabs, pulsing bass, industrial percussion — not DOOM metal.
// ============================================================================

function createZombieTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
  trackGain.connect(output);

  const BPM = 122;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  const sub = ctx.createOscillator();
  const subFilter = ctx.createBiquadFilter();
  const subGain = ctx.createGain();
  sub.type = "sine";
  sub.frequency.setValueAtTime(36.71, ctx.currentTime); // C#1
  subFilter.type = "lowpass";
  subFilter.frequency.setValueAtTime(90, ctx.currentTime);
  subGain.gain.setValueAtTime(0.28, ctx.currentTime);
  sub.connect(subFilter).connect(subGain).connect(trackGain);
  sub.start();

  const bassPulse = [
    69.3, null, 69.3, null, 69.3, null, 77.78, null,
    82.41, null, 69.3, null, 61.74, null, 69.3, null,
  ];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 32;

    if (s16 % 4 === 0) playKick(ctx, trackGain, now, 0.82, 150);
    if (s16 % 8 === 4) playSnare(ctx, trackGain, now, 0.48, 190);
    if (s16 % 2 === 1) playHiHat(ctx, trackGain, now, false, 0.14);
    if (s16 === 0) playCrash(ctx, trackGain, now, 0.22);

    const bNote = bassPulse[s16 % bassPulse.length];
    if (bNote) playBassNote(ctx, trackGain, bNote, now, stepTime * 1.8, 0.42);

    if (s16 === 6 || s16 === 22) {
      playIndustrialStab(ctx, trackGain, 138.59, now, stepTime * 3, 0.2);
    }
    if (s16 === 14) playIndustrialStab(ctx, trackGain, 103.83, now, stepTime * 4, 0.18);

    if (s16 % 16 === 0) {
      playPad(ctx, trackGain, 138.59, now, stepTime * 14, 0.1);
      playPad(ctx, trackGain, 196, now, stepTime * 14, 0.06);
    }

    step++;
  }, stepTime * 1000);

  return () => {
    clearInterval(timer);
    const t = ctx.currentTime;
    trackGain.gain.setTargetAtTime(0.001, t, 0.4);
    setTimeout(() => {
      try {
        sub.stop();
        trackGain.disconnect();
      } catch { /* ignore */ }
    }, 600);
  };
}

// ============================================================================
// 5. LEFT 4 DEAD: Southern hard-rock / swamp gothic (138 BPM)
// Rock backbeat, minor power chords — L4D2 Midnight Riders energy, not punk.
// ============================================================================

function createL4DTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.4);
  trackGain.connect(output);

  const BPM = 138;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  // E minor: Em – G – D – A
  const chordRoots = [82.41, 98.0, 73.42, 110.0];
  const bassWalk = [
    82.41, null, 82.41, 82.41, 98.0, null, 98.0, 92.5,
    73.42, null, 73.42, 73.42, 110.0, null, 103.83, 98.0,
  ];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 32;
    const bar = Math.floor(step / 32) % 4;

    // Classic rock: kick 1 & 3, snare 2 & 4
    if (s16 === 0 || s16 === 8 || s16 === 16 || s16 === 24) playKick(ctx, trackGain, now, 0.8, 145);
    if (s16 === 8 || s16 === 24) playSnare(ctx, trackGain, now, 0.62, 210);
    if (s16 % 2 === 0) playHiHat(ctx, trackGain, now, s16 % 8 === 6, 0.16);
    if (s16 === 0 && bar === 0) playCrash(ctx, trackGain, now, 0.28);

    const bNote = bassWalk[s16 % bassWalk.length];
    if (bNote) playBassNote(ctx, trackGain, bNote, now, stepTime * 1.5, 0.44);

    if (s16 === 0 || s16 === 8 || s16 === 16 || s16 === 24) {
      const root = chordRoots[Math.floor(s16 / 8) % chordRoots.length];
      playRockChord(ctx, trackGain, root, now, stepTime * 7, 0.3);
    }

    if (s16 % 16 === 0) playPad(ctx, trackGain, 164.81, now, stepTime * 14, 0.08);

    step++;
  }, stepTime * 1000);

  return () => {
    clearInterval(timer);
    const t = ctx.currentTime;
    trackGain.gain.setTargetAtTime(0.001, t, 0.4);
    setTimeout(() => {
      try { trackGain.disconnect(); } catch { /* ignore */ }
    }, 600);
  };
}

// ─── Play / Switch Music ───

export function playMusicForMode(mode: GameMode) {
  const ctx = getContext();
  if (ctx.state === "suspended") ctx.resume();
  if (!masterGain) return;

  if (currentTrackId === mode && isPlaying) return;

  if (stopCurrentTrack) {
    stopCurrentTrack();
    stopCurrentTrack = null;
  }

  currentTrackId = mode;
  isPlaying = true;

  switch (mode) {
    case "menu":
      stopCurrentTrack = createMenuTrack(ctx, masterGain);
      break;
    case "training":
      stopCurrentTrack = createTrainingTrack(ctx, masterGain);
      break;
    case "offline5v5":
      stopCurrentTrack = create5v5TacticalTrack(ctx, masterGain);
      break;
    case "zombie":
      stopCurrentTrack = createZombieTrack(ctx, masterGain);
      break;
    case "l4d":
      stopCurrentTrack = createL4DTrack(ctx, masterGain);
      break;
    default:
      stopCurrentTrack = createMenuTrack(ctx, masterGain);
      break;
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
