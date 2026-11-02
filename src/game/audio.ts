export type Cue = 'good' | 'bad' | 'info' | 'pickup' | 'delivered';

export interface SoundBoard {
  play(cue: Cue): void;
  setEngine(level: number): void;
  setMuted(muted: boolean): void;
  dispose(): void;
}

interface Tone {
  freq: number;
  endFreq?: number;
  start: number;
  duration: number;
  type: OscillatorType;
  gain: number;
}

const CUES: Record<Cue, Tone[]> = {
  good: [
    { freq: 880, start: 0, duration: 0.18, type: 'sine', gain: 0.18 },
    { freq: 1320, start: 0.09, duration: 0.25, type: 'sine', gain: 0.16 },
  ],
  delivered: [523, 659, 784, 1046].map((freq, index) => ({
    freq,
    start: index * 0.09,
    duration: 0.32,
    type: 'triangle' as const,
    gain: 0.16,
  })),
  pickup: [
    { freq: 660, start: 0, duration: 0.12, type: 'square', gain: 0.07 },
    { freq: 990, start: 0.1, duration: 0.18, type: 'square', gain: 0.07 },
  ],
  bad: [{ freq: 150, endFreq: 50, start: 0, duration: 0.35, type: 'sine', gain: 0.5 }],
  info: [{ freq: 620, start: 0, duration: 0.12, type: 'sine', gain: 0.1 }],
};

const MASTER_VOLUME = 0.7;

export function createSoundBoard(): SoundBoard {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let engineOsc: OscillatorNode | null = null;
  let engineGain: GainNode | null = null;
  let muted = false;

  const ensureContext = (): AudioContext => {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return ctx;
    }
    const context = new AudioContext();
    const out = context.createGain();
    out.gain.value = muted ? 0 : MASTER_VOLUME;
    out.connect(context.destination);

    const osc = context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 38;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = context.createGain();
    gain.gain.value = 0;
    osc.connect(filter).connect(gain).connect(out);
    osc.start();

    ctx = context;
    master = out;
    engineOsc = osc;
    engineGain = gain;
    return context;
  };

  return {
    play(cue) {
      const context = ensureContext();
      const out = master;
      if (!out) return;
      const now = context.currentTime;
      for (const tone of CUES[cue]) {
        const start = now + tone.start;
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = tone.type;
        osc.frequency.setValueAtTime(tone.freq, start);
        if (tone.endFreq) osc.frequency.exponentialRampToValueAtTime(tone.endFreq, start + tone.duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
        osc.connect(gain).connect(out);
        osc.start(start);
        osc.stop(start + tone.duration + 0.05);
      }
    },
    setEngine(level) {
      const context = ensureContext();
      if (!engineOsc || !engineGain) return;
      const now = context.currentTime;
      engineOsc.frequency.setTargetAtTime(38 + level * 62, now, 0.08);
      engineGain.gain.setTargetAtTime(0.02 + level * 0.035, now, 0.1);
    },
    setMuted(value) {
      muted = value;
      if (!ctx || !master) return;
      master.gain.setTargetAtTime(value ? 0 : MASTER_VOLUME, ctx.currentTime, 0.05);
    },
    dispose() {
      void ctx?.close();
      ctx = null;
      master = null;
      engineOsc = null;
      engineGain = null;
    },
  };
}
