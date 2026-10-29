// SoundManager.ts - Audio procedural con Web Audio API: pasos y ambiente sombrio por bioma.

export class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentBiomeTrack: string = '';
  private ambientGain: GainNode | null = null;
  private ambientOscillators: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private ambientInterval: number | null = null;

  /** Debe llamarse tras un gesto del usuario (los navegadores bloquean audio antes) */
  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    // Si el bioma se pidio antes de que existiera el contexto, arranca su ambiente ahora
    if (this.currentBiomeTrack && this.ambientOscillators.length === 0) {
      const biome = this.currentBiomeTrack;
      this.currentBiomeTrack = '';
      this.setBiomeMusic(biome);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.12, this.ctx ? this.ctx.currentTime : 0, 0.1);
    }
    return this.isMuted;
  }

  public playHaptic(durationMs: number = 30) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // la vibracion puede no estar permitida
      }
    }
  }

  public playFootstep(terrain: string = 'dirt') {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
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

  // --- Ambiente procedural por bioma ---

  public setBiomeMusic(biomeId: string) {
    if (this.currentBiomeTrack === biomeId) return;
    this.currentBiomeTrack = biomeId;
    if (!this.ctx) return;

    this.stopAmbient();

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : 0.12, this.ctx.currentTime);
    this.ambientGain.connect(this.ctx.destination);

    let freqs: number[] = [55, 110, 164.81]; // base grave y oscura
    if (biomeId === 'frost') {
      freqs = [65.41, 130.81, 196.0, 392.0];
    } else if (biomeId === 'forest') {
      freqs = [73.42, 146.83, 220.0, 293.66];
    } else if (biomeId === 'swamp') {
      freqs = [58.27, 116.54, 174.61, 233.08];
    } else if (biomeId === 'canyon') {
      freqs = [82.41, 123.47, 164.81, 246.94];
    } else if (biomeId === 'caverns') {
      freqs = [43.65, 87.31, 130.81, 261.63];
    } else if (biomeId === 'alien_core') {
      freqs = [48.99, 97.99, 146.83, 293.66, 587.33];
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

    // Latido grave y lento, como un corazon lejano
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
        // ya estaba detenido
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
