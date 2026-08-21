import '@testing-library/jest-dom';

// Global AudioContext mock for test environments
class MockAudioNode {
  connect() { return this; }
  disconnect() {}
}

class MockAudioParam {
  value = 1;
  setValueAtTime() { return this; }
  exponentialRampToValueAtTime() { return this; }
  linearRampToValueAtTime() { return this; }
}

class MockAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  state = 'running';
  destination = new MockAudioNode();
  listener = {
    positionX: new MockAudioParam(),
    positionY: new MockAudioParam(),
    positionZ: new MockAudioParam(),
    forwardX: new MockAudioParam(),
    forwardY: new MockAudioParam(),
    forwardZ: new MockAudioParam(),
    upX: new MockAudioParam(),
    upY: new MockAudioParam(),
    upZ: new MockAudioParam(),
  };

  createGain() {
    return {
      gain: new MockAudioParam(),
      connect: () => new MockAudioNode(),
      disconnect: () => {},
    };
  }

  createOscillator() {
    return {
      frequency: new MockAudioParam(),
      type: 'sine',
      connect: () => new MockAudioNode(),
      start: () => {},
      stop: () => {},
      disconnect: () => {},
    };
  }

  createBuffer(channels: number, length: number) {
    return {
      getChannelData: () => new Float32Array(length),
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: () => new MockAudioNode(),
      start: () => {},
      stop: () => {},
      disconnect: () => {},
    };
  }

  createBiquadFilter() {
    return {
      frequency: new MockAudioParam(),
      type: 'lowpass',
      connect: () => new MockAudioNode(),
      disconnect: () => {},
    };
  }

  createPanner() {
    return {
      positionX: new MockAudioParam(),
      positionY: new MockAudioParam(),
      positionZ: new MockAudioParam(),
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      refDistance: 1,
      maxDistance: 100,
      rolloffFactor: 1,
      coneInnerAngle: 360,
      coneOuterAngle: 0,
      coneOuterGain: 0,
      connect: () => new MockAudioNode(),
      disconnect: () => {},
    };
  }

  async resume() {
    this.state = 'running';
  }
}

if (typeof window !== 'undefined') {
  (window as any).AudioContext = MockAudioContext;
  (window as any).webkitAudioContext = MockAudioContext;
}

if (typeof globalThis !== 'undefined') {
  (globalThis as any).AudioContext = MockAudioContext;
  (globalThis as any).webkitAudioContext = MockAudioContext;
}
