// SoundManager.ts - Web Audio API Procedural Audio Engine
// Generates ambient soundscapes for each biome, survival audio cues,
// combat impacts, runic tuning chords, artifact sacrifice blasts, and alien sci-fi synthesizers.

export class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentBiomeTrack: string = '';
  private ambientGain: GainNode | null = null;
  private ambientOscillators: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private ambientInterval: number | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.18, this.ctx ? this.ctx.currentTime : 0, 0.1);
    }
    return this.isMuted;
  }

  public playHaptic(durationMs: number = 30) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Ignore if vibration not permitted
      }
    }
  }

  // --- Procedural Sound Effects ---

  public playFootstep(terrain: string = 'dirt') {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = terrain === 'snow' ? 'sine' : terrain === 'rock' ? 'triangle' : 'sine';
    const baseFreq = terrain === 'snow' ? 180 : terrain === 'mud' ? 90 : 120;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playAttack() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    // White noise swoosh
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  public playHit() {
    if (this.isMuted || !this.ctx) return;
    this.playHaptic(40);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playForage() {
    if (this.isMuted || !this.ctx) return;
    this.playHaptic(20);
    const now = this.ctx.currentTime;
    [400, 600, 800].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(0.08, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.07);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + (i + 1) * 0.07);
    });
  }

  public playCampfire() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playRunicTuning() {
    if (this.isMuted || !this.ctx) return;
    this.playHaptic(80);
    const now = this.ctx.currentTime;
    // Harmonic chord: C, E, G, B (Mystic ancient harmony)
    const freqs = [261.63, 329.63, 392.0, 493.88];
    freqs.forEach(freq => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    });
  }

  public playRunicLock() {
    if (this.isMuted || !this.ctx) return;
    this.playHaptic([40, 60, 80] as unknown as number);
    const now = this.ctx.currentTime;
    // Heavy stone click / lock sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playSacrificeExplosion() {
    if (this.isMuted || !this.ctx) return;
    this.playHaptic([100, 50, 200] as unknown as number);
    const now = this.ctx.currentTime;
    // Deep sub-bass drop + distortion shockwave
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.8);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);

    // High shimmer release
    const shimmer = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(880, now);
    shimmer.frequency.exponentialRampToValueAtTime(1760, now + 0.4);
    sGain.gain.setValueAtTime(0.15, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    shimmer.connect(sGain);
    sGain.connect(this.ctx.destination);
    shimmer.start(now);
    shimmer.stop(now + 0.5);
  }

  public playAlienBeam() {
    if (this.isMuted || !this.ctx) return;
    this.playHaptic(60);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.25);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playBossPhaseChange() {
    if (this.isMuted || !this.ctx) return;
    this.playHaptic([100, 100, 100, 100] as unknown as number);
    const now = this.ctx.currentTime;
    [150, 300, 600, 1200].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.18, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.4);
    });
  }

  // --- Procedural Biome Ambient Soundscape Engine ---

  public setBiomeMusic(biomeId: string) {
    if (this.currentBiomeTrack === biomeId) return;
    this.currentBiomeTrack = biomeId;
    if (!this.ctx) return;

    this.stopAmbient();

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : 0.12, this.ctx.currentTime);
    this.ambientGain.connect(this.ctx.destination);

    // Drone chords based on biome
    let freqs: number[] = [55, 110, 164.81]; // Default dark low
    if (biomeId === 'frost') {
      freqs = [65.41, 130.81, 196.0, 392.0]; // Icy crystalline C-G
    } else if (biomeId === 'forest') {
      freqs = [73.42, 146.83, 220.0, 293.66]; // D minor earthy
    } else if (biomeId === 'swamp') {
      freqs = [58.27, 116.54, 174.61, 233.08]; // Bb dark swamp
    } else if (biomeId === 'canyon') {
      freqs = [82.41, 123.47, 164.81, 246.94]; // E phrygian desert
    } else if (biomeId === 'caverns') {
      freqs = [43.65, 87.31, 130.81, 261.63]; // F sub-cavern
    } else if (biomeId === 'alien_core') {
      freqs = [48.99, 97.99, 146.83, 293.66, 587.33]; // Sci-fi G eerie
    }

    freqs.forEach((f, index) => {
      const osc = this.ctx!.createOscillator();
      const oscGain = this.ctx!.createGain();
      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, this.ctx!.currentTime);
      oscGain.gain.setValueAtTime(0.04 / (index + 1), this.ctx!.currentTime);
      osc.connect(oscGain);
      oscGain.connect(this.ambientGain!);
      osc.start();
      this.ambientOscillators.push(osc);
    });

    // Background procedural rhythm pulse (tribal heartbeat)
    if (biomeId !== 'alien_core') {
      this.ambientInterval = window.setInterval(() => {
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const kick = this.ctx.createOscillator();
        const kGain = this.ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(80, t);
        kick.frequency.exponentialRampToValueAtTime(30, t + 0.15);
        kGain.gain.setValueAtTime(0.05, t);
        kGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        kick.connect(kGain);
        kGain.connect(this.ctx.destination);
        kick.start(t);
        kick.stop(t + 0.15);
      }, 2400);
    }
  }

  public stopAmbient() {
    this.ambientOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignore stopped errors
      }
    });
    this.ambientOscillators = [];
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }
}

export const soundManager = new SoundManager();
