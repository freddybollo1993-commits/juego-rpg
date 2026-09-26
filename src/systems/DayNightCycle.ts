// DayNightCycle.ts - Dynamic Atmospheric Lighting & 24h Planetary Cycle (Fase 3.2)

export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night';

export class DayNightCycle {
  // Time represented in hours (0.00 to 24.00). Defaults to early morning (07:30)
  public timeOfDay: number = 7.5;
  // A full 24h in-game day lasts 720 real seconds (12 minutes)
  public timeScale: number = 24 / 720; // 0.0333 hours per real second
  public isPaused: boolean = false;

  public update(delta: number) {
    if (this.isPaused) return;

    this.timeOfDay += delta * this.timeScale;
    if (this.timeOfDay >= 24) {
      this.timeOfDay -= 24;
    }
  }

  public getPhase(): TimePhase {
    if (this.timeOfDay >= 5.0 && this.timeOfDay < 8.0) return 'dawn';
    if (this.timeOfDay >= 8.0 && this.timeOfDay < 17.5) return 'day';
    if (this.timeOfDay >= 17.5 && this.timeOfDay < 20.5) return 'dusk';
    return 'night';
  }

  public isNight(): boolean {
    return this.getPhase() === 'night';
  }

  public getPhaseIcon(): string {
    const phase = this.getPhase();
    switch (phase) {
      case 'dawn': return '🌅';
      case 'day': return '☀️';
      case 'dusk': return '🌇';
      case 'night': return '🌙';
    }
  }

  public getTimeString(): string {
    const totalMinutes = Math.floor(this.timeOfDay * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const padH = hours.toString().padStart(2, '0');
    const padM = minutes.toString().padStart(2, '0');
    return `${padH}:${padM}`;
  }

  /**
   * Ambient darkness alpha value for the full-screen lighting mask
   * 0.0 = bright midday, 0.88 = pitch-black midnight
   */
  public getAmbientDarkness(): number {
    const phase = this.getPhase();
    if (phase === 'day') {
      return 0.0;
    }
    if (phase === 'dawn') {
      // 5.0 (0.75 darkness) -> 8.0 (0.0 darkness)
      const prog = (this.timeOfDay - 5.0) / 3.0;
      return (1.0 - prog) * 0.72;
    }
    if (phase === 'dusk') {
      // 17.5 (0.0 darkness) -> 20.5 (0.78 darkness)
      const prog = (this.timeOfDay - 17.5) / 3.0;
      return prog * 0.78;
    }
    // Night (20.5 to 5.0)
    return 0.86;
  }

  /**
   * Ambient atmospheric color tint (rgba)
   */
  public getAmbientColor(): string {
    const phase = this.getPhase();
    if (phase === 'dawn') {
      return 'rgba(251, 146, 60, 0.18)'; // Rosy dawn orange
    }
    if (phase === 'day') {
      return 'rgba(255, 255, 255, 0)';
    }
    if (phase === 'dusk') {
      return 'rgba(225, 29, 72, 0.22)'; // Deep purple-red dusk
    }
    return 'rgba(15, 23, 42, 0.88)'; // Deep midnight navy
  }

  /**
   * Cold penalty multiplier: at night, body temperature decays 2.2x faster without heat
   */
  public getTemperatureDecayMultiplier(): number {
    return this.isNight() ? 2.2 : 1.0;
  }

  /**
   * Night-time hunting grants +35% XP bonus due to dangerous apex predators
   */
  public getXPMultiplier(): number {
    return this.isNight() ? 1.35 : 1.0;
  }

  public setTimeOfDay(hours: number) {
    this.timeOfDay = Math.max(0, Math.min(23.99, hours));
  }
}

export const dayNightCycle = new DayNightCycle();
