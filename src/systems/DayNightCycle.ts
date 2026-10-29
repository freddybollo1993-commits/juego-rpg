// DayNightCycle.ts - Reloj del mundo. El tiempo NO corre solo: avanza unicamente cuando
// el jugador realiza una accion (ver TurnSystem), cada accion cuesta unos minutos de juego.

export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night';

export const START_HOUR = 7.5; // el naufrago despierta al amanecer

export class DayNightCycle {
  /** Hora del dia en horas decimales (0.00 a 24.00) */
  public timeOfDay: number = START_HOUR;
  /** Dias completos transcurridos desde el inicio (el primer dia es 1) */
  public dayCount: number = 1;

  /** Avanza el reloj por una accion del jugador */
  public advanceMinutes(minutes: number) {
    this.timeOfDay += minutes / 60;
    while (this.timeOfDay >= 24) {
      this.timeOfDay -= 24;
      this.dayCount++;
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
    switch (this.getPhase()) {
      case 'dawn': return '🌅';
      case 'day': return '☀️';
      case 'dusk': return '🌇';
      case 'night': return '🌙';
    }
  }

  public getTimeString(): string {
    // round, not floor: 8.1666...h * 60 = 489.99999 would otherwise show 08:09 instead of 08:10
    const totalMinutes = Math.round(this.timeOfDay * 60) % (24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Oscuridad ambiental para la mascara de iluminacion
   * 0.0 = mediodia, 0.86 = medianoche
   */
  public getAmbientDarkness(): number {
    const phase = this.getPhase();
    if (phase === 'day') return 0.0;
    if (phase === 'dawn') {
      const prog = (this.timeOfDay - 5.0) / 3.0;
      return (1.0 - prog) * 0.72;
    }
    if (phase === 'dusk') {
      const prog = (this.timeOfDay - 17.5) / 3.0;
      return prog * 0.78;
    }
    return 0.86;
  }

  public setTime(hours: number, day: number = this.dayCount) {
    this.timeOfDay = Math.max(0, Math.min(23.99, hours));
    this.dayCount = Math.max(1, Math.floor(day));
  }

  public reset() {
    this.timeOfDay = START_HOUR;
    this.dayCount = 1;
  }
}

export const dayNightCycle = new DayNightCycle();
