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

// ─── Distortion Curve Generator for Gritty CS Bass & Guitars ───
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

  // Snare body tone
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

// ─── Heavy CS Brass Stabs ───

function playBrassNote(
  ctx: AudioContext,
  dest: GainNode,
  freq: number,
  time: number,
  duration = 0.35,
  vol = 0.35
) {
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

// ─── Gritty Distorted Bass Note ───

function playBassNote(
  ctx: AudioContext,
  dest: GainNode,
  freq: number,
  time: number,
  duration = 0.22,
  vol = 0.5
) {
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

// ─── Melodic Synth Lead Note (for Training & Cyber Synthwave) ───

function playSynthLeadNote(
  ctx: AudioContext,
  dest: GainNode,
  freq: number,
  time: number,
  duration = 0.2,
  vol = 0.25
) {
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

// ============================================================================
// 1. MAIN MENU: CS:GO Epic Industrial Anthem (126 BPM)
// ============================================================================

function createMenuTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
  trackGain.connect(output);

  const BPM = 126;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  const padOsc1 = ctx.createOscillator();
  const padOsc2 = ctx.createOscillator();
  const padFilter = ctx.createBiquadFilter();
  const padGain = ctx.createGain();

  padOsc1.type = "sawtooth";
  padOsc2.type = "sawtooth";
  padOsc1.frequency.setValueAtTime(164.81, ctx.currentTime);
  padOsc2.frequency.setValueAtTime(165.4, ctx.currentTime);

  padFilter.type = "lowpass";
  padFilter.frequency.setValueAtTime(650, ctx.currentTime);
  padGain.gain.setValueAtTime(0.18, ctx.currentTime);

  padOsc1.connect(padFilter);
  padOsc2.connect(padFilter);
  padFilter.connect(padGain).connect(trackGain);

  padOsc1.start();
  padOsc2.start();

  const E1 = 41.2;
  const G1 = 49.0;
  const A1 = 55.0;
  const D1 = 36.7;
  const B0 = 30.87;
  const C1 = 32.7;

  const bassPattern: Array<number | null> = [
    E1, null, E1, null, G1, null, A1, E1,
    null, E1, G1, null, D1, null, E1, B0,
    C1, null, C1, null, D1, null, D1, D1,
    E1, null, E1, null, G1, A1, G1, E1,
  ];

  const E3 = 164.81;
  const G3 = 196.0;
  const A3 = 220.0;
  const B3 = 246.94;
  const C4 = 261.63;
  const D4 = 293.66;
  const E4 = 329.63;

  const brassPattern: Array<{ note: number; dur: number } | null> = [
    { note: E3, dur: 0.5 }, null, null, null,
    { note: G3, dur: 0.3 }, null,
    { note: B3, dur: 0.5 }, null, null, null,
    { note: D4, dur: 0.4 }, null,
    { note: C4, dur: 0.3 }, { note: B3, dur: 0.3 },
    { note: A3, dur: 0.4 }, null,
    { note: G3, dur: 0.4 }, null,
    { note: E3, dur: 0.8 }, null, null, null,
    null, null, null, null,
    { note: A3, dur: 0.5 }, null,
    { note: C4, dur: 0.4 }, null,
    { note: E4, dur: 0.6 }, null, null, null,
    { note: D4, dur: 0.4 }, { note: C4, dur: 0.4 },
    { note: B3, dur: 0.5 }, null,
    { note: E3, dur: 0.9 }, null, null, null,
    null, null, null, null,
  ];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 32;
    const barStep = step % 64;

    if (s16 === 0 || s16 === 6 || s16 === 10 || s16 === 16 || s16 === 22 || s16 === 26) {
      playKick(ctx, trackGain, now, 0.8);
    }
    if (s16 === 4 || s16 === 12 || s16 === 20 || s16 === 28) {
      playSnare(ctx, trackGain, now, 0.65);
    }
    const isOffbeat = s16 % 2 === 1;
    playHiHat(ctx, trackGain, now, s16 === 14 || s16 === 30, isOffbeat ? 0.18 : 0.28);

    if (barStep === 0) playCrash(ctx, trackGain, now, 0.45);

    const bassNote = bassPattern[s16];
    if (bassNote) playBassNote(ctx, trackGain, bassNote, now, stepTime * 1.8, 0.55);

    const brass = brassPattern[barStep];
    if (brass) playBrassNote(ctx, trackGain, brass.note, now, brass.dur, 0.4);

    step++;
  }, stepTime * 1000);

  return () => {
    clearInterval(timer);
    const t = ctx.currentTime;
    trackGain.gain.setTargetAtTime(0.001, t, 0.3);
    setTimeout(() => {
      try {
        padOsc1.stop();
        padOsc2.stop();
        trackGain.disconnect();
      } catch {}
    }, 500);
  };
}

// ============================================================================
// 2. TRAINING RANGE: Tactical Cyber Synthwave Drill (118 BPM)
// ============================================================================

function createTrainingTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
  trackGain.connect(output);

  const BPM = 118;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  // Cyber bassline progression (Am - F - C - G)
  const A1 = 55.0;
  const F1 = 43.65;
  const C2 = 65.41;
  const G1 = 49.0;

  const arpNotes = [
    220, 261.63, 329.63, 440, 329.63, 261.63, 329.63, 440,
    174.61, 220, 261.63, 349.23, 261.63, 220, 261.63, 349.23,
    261.63, 329.63, 392, 523.25, 392, 329.63, 392, 523.25,
    196, 246.94, 293.66, 392, 293.66, 246.94, 293.66, 392,
  ];

  const leadMelody: Array<number | null> = [
    440, null, 523.25, null, 659.25, null, 523.25, 440,
    null, 392, null, 440, null, 523.25, null, null,
    523.25, null, 587.33, null, 659.25, null, 783.99, null,
    659.25, null, 587.33, null, 523.25, null, null, null,
  ];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 32;

    // Steady electro groove kick
    if (s16 % 4 === 0) playKick(ctx, trackGain, now, 0.75, 140);

    // Snare on 2 and 4
    if (s16 % 8 === 4) playSnare(ctx, trackGain, now, 0.55, 240);

    // Tight 16th hats
    playHiHat(ctx, trackGain, now, s16 % 8 === 2, 0.16);

    // Arpeggiator pulse
    const note = arpNotes[s16 % arpNotes.length];
    playSynthLeadNote(ctx, trackGain, note, now, 0.1, 0.14);

    // Bass note on root beats
    if (s16 % 8 === 0) {
      const root = s16 < 8 ? A1 : s16 < 16 ? F1 : s16 < 24 ? C2 : G1;
      playBassNote(ctx, trackGain, root, now, 0.45, 0.45);
    }

    // Melodic lead stabs
    const lead = leadMelody[s16];
    if (lead) {
      playSynthLeadNote(ctx, trackGain, lead * 1.5, now, 0.35, 0.22);
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
      } catch {}
    }, 500);
  };
}

// ============================================================================
// 3. 5V5 OFFLINE: CS:GO Competitive Match Tension (128 BPM)
// ============================================================================

function create5v5TacticalTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
  trackGain.connect(output);

  const BPM = 128;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  // Dark suspense low drone
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(41.2, ctx.currentTime); // E1
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(220, ctx.currentTime);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  osc.connect(filter).connect(gain).connect(trackGain);
  osc.start();

  const E1 = 41.2;
  const G1 = 49.0;
  const Bb1 = 58.27;
  const A1 = 55.0;

  // Aggressive syncopated match bass
  const matchBass = [
    E1, null, E1, null, G1, null, E1, Bb1,
    null, A1, null, G1, E1, null, E1, null,
  ];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 16;
    const barStep = step % 64;

    // Military kick
    if (s16 === 0 || s16 === 3 || s16 === 8 || s16 === 10) {
      playKick(ctx, trackGain, now, 0.85);
    }
    // Hard rimshot / snare
    if (s16 === 4 || s16 === 12) {
      playSnare(ctx, trackGain, now, 0.7, 260);
    }
    // Ticking bomb hi-hats
    playHiHat(ctx, trackGain, now, s16 === 14, 0.2);

    // Tactical bass riff
    const bNote = matchBass[s16];
    if (bNote) playBassNote(ctx, trackGain, bNote, now, stepTime * 1.6, 0.6);

    // Match start / round tension brass hit
    if (barStep === 0 || barStep === 32) {
      playBrassNote(ctx, trackGain, 164.81, now, 0.7, 0.45); // E3
      playBrassNote(ctx, trackGain, 246.94, now, 0.7, 0.35); // B3
    }

    step++;
  }, stepTime * 1000);

  return () => {
    clearInterval(timer);
    const t = ctx.currentTime;
    trackGain.gain.setTargetAtTime(0.001, t, 0.3);
    setTimeout(() => {
      try {
        osc.stop();
        trackGain.disconnect();
      } catch {}
    }, 500);
  };
}

// ============================================================================
// 4. ZOMBIE SURVIVAL: Outpost Z-7 Dark Industrial Horde Thrash (138 BPM)
// ============================================================================

function createZombieTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
  trackGain.connect(output);

  const BPM = 138;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  const sub = ctx.createOscillator();
  const subFilter = ctx.createBiquadFilter();
  const subGain = ctx.createGain();
  sub.type = "sawtooth";
  sub.frequency.setValueAtTime(36.7, ctx.currentTime); // D1
  subFilter.type = "lowpass";
  subFilter.frequency.setValueAtTime(180, ctx.currentTime);
  subGain.gain.setValueAtTime(0.45, ctx.currentTime);
  sub.connect(subFilter).connect(subGain).connect(trackGain);
  sub.start();

  const D1 = 36.7;
  const Eb1 = 38.89;
  const F1 = 43.65;
  const Ab1 = 51.91;

  const zBassPattern = [
    D1, null, D1, D1, Eb1, null, D1, null,
    F1, null, D1, null, Eb1, D1, Ab1, null,
  ];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 16;

    // Double-kick industrial drum
    if (s16 === 0 || s16 === 2 || s16 === 6 || s16 === 8 || s16 === 10 || s16 === 14) {
      playKick(ctx, trackGain, now, 0.9, 180);
    }
    // High impact snare
    if (s16 === 4 || s16 === 12) {
      playSnare(ctx, trackGain, now, 0.75, 200);
    }
    // Frenzied hats
    playHiHat(ctx, trackGain, now, s16 === 10, 0.25);

    // Distorted thrash bass
    const note = zBassPattern[s16];
    if (note) playBassNote(ctx, trackGain, note, now, stepTime * 1.5, 0.65);

    // Discordant horror bells & brass
    if (s16 === 0) {
      playBrassNote(ctx, trackGain, 293.66, now, 0.6, 0.35); // D4
      playBrassNote(ctx, trackGain, 311.13, now, 0.6, 0.3); // Eb4
    }

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
      } catch {}
    }, 500);
  };
}

// ============================================================================
// 5. LEFT 4 DEAD (L4D): Outbreak Panic & Chase Rock (144 BPM)
// ============================================================================

function createL4DTrack(ctx: AudioContext, output: GainNode): () => void {
  const trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0, ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
  trackGain.connect(output);

  const BPM = 144;
  const stepTime = 60 / BPM / 4;
  let step = 0;

  // Fast punk/rock driving bass (B Minor)
  const B1 = 61.74;
  const D2 = 73.42;
  const E2 = 82.41;
  const Fs2 = 92.5;

  const l4dBass = [
    B1, B1, B1, B1, D2, D2, E2, E2,
    Fs2, Fs2, E2, E2, D2, D2, B1, B1,
  ];

  const timer = setInterval(() => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const s16 = step % 16;
    const barStep = step % 32;

    // Four on the floor driving rock kick
    if (s16 % 4 === 0) playKick(ctx, trackGain, now, 0.88, 170);

    // Fast rock backbeat snare (beats 2 and 4)
    if (s16 % 8 === 4) playSnare(ctx, trackGain, now, 0.75, 230);

    // Open rock hi-hats
    playHiHat(ctx, trackGain, now, s16 % 4 === 2, 0.26);

    // Crash every 32 steps
    if (barStep === 0) playCrash(ctx, trackGain, now, 0.5);

    // Driving punk-rock bassline
    const bNote = l4dBass[s16];
    playBassNote(ctx, trackGain, bNote, now, stepTime * 1.3, 0.58);

    // Urgent adrenaline guitar riff
    if (s16 === 0 || s16 === 6 || s16 === 12) {
      playSynthLeadNote(ctx, trackGain, 493.88, now, 0.25, 0.3); // B4
      playSynthLeadNote(ctx, trackGain, 587.33, now, 0.25, 0.25); // D5
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
      } catch {}
    }, 500);
  };
}

// ─── Play / Switch Music Function for each Game Mode ───

export function playMusicForMode(mode: GameMode) {
  const ctx = getContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
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

// Automatically subscribe to settings store volume changes
if (typeof window !== "undefined") {
  useSettingsStore.subscribe(() => {
    updateMusicVolume();
  });
}
