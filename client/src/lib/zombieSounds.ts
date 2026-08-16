// ============================================================================
// Zombie Mode Sound Manager (Web Audio API - no external files)
// ============================================================================

class ZombieSoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.3;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = "sine", volumeMult = 1) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.value = this.volume * volumeMult;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  private playNoise(duration: number, volumeMult = 1) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = this.volume * volumeMult * 0.3;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {}
  }

  // Game sounds
  shoot() {
    this.playNoise(0.08, 0.8);
    this.playTone(150, 0.05, "sawtooth", 0.6);
  }

  reload() {
    this.playTone(800, 0.05, "square", 0.3);
    setTimeout(() => this.playTone(1200, 0.05, "square", 0.3), 100);
  }

  zombieHit() {
    this.playTone(200, 0.1, "sawtooth", 0.4);
  }

  zombieDeath() {
    this.playTone(120, 0.3, "sawtooth", 0.5);
    this.playTone(80, 0.4, "sawtooth", 0.3);
  }

  playerHit() {
    this.playTone(300, 0.15, "square", 0.6);
  }

  playerDeath() {
    this.playTone(200, 0.5, "sawtooth", 0.7);
    this.playTone(100, 0.8, "sawtooth", 0.5);
  }

  waveStart() {
    this.playTone(440, 0.1, "sine", 0.5);
    setTimeout(() => this.playTone(660, 0.1, "sine", 0.5), 100);
    setTimeout(() => this.playTone(880, 0.2, "sine", 0.5), 200);
  }

  waveClear() {
    this.playTone(523, 0.15, "sine", 0.6);
    setTimeout(() => this.playTone(659, 0.15, "sine", 0.6), 150);
    setTimeout(() => this.playTone(784, 0.3, "sine", 0.6), 300);
  }

  powerUp() {
    this.playTone(523, 0.1, "sine", 0.5);
    setTimeout(() => this.playTone(784, 0.1, "sine", 0.5), 80);
    setTimeout(() => this.playTone(1047, 0.2, "sine", 0.5), 160);
  }

  purchase() {
    this.playTone(880, 0.08, "sine", 0.4);
    setTimeout(() => this.playTone(1100, 0.12, "sine", 0.4), 80);
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
  }

  setEnabled(e: boolean) {
    this.enabled = e;
  }
}

export const zombieSounds = new ZombieSoundManager();
