// TurnSystem.ts - Reloj por turnos: cada accion del jugador es un turno y consume tiempo de juego.

import { DayNightCycle } from '../systems/DayNightCycle';

/** Minutos de juego que cuesta cada accion. Ajustar aqui para cambiar el ritmo del juego. */
export const TIME_COST = {
  move: 10,
  wait: 10
} as const;

export type TurnAction = keyof typeof TIME_COST;

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  life: number; // 1 -> 0
  vy: number;
}

export class TurnSystem {
  public turnCount: number = 1;
  public floatingTexts: FloatingText[] = [];

  public onTurnCompleted?: (turn: number) => void;

  constructor(private readonly clock: DayNightCycle) {}

  /** Una accion del jugador: avanza el turno y el reloj del mundo. Devuelve los minutos consumidos. */
  public advanceTurn(action: TurnAction): number {
    const minutes = TIME_COST[action];
    this.turnCount++;
    this.clock.advanceMinutes(minutes);
    this.onTurnCompleted?.(this.turnCount);
    return minutes;
  }

  public reset(turnCount: number = 1) {
    this.turnCount = turnCount;
    this.floatingTexts.length = 0;
  }

  /** Texto flotante sobre una posicion del mundo (numeros, avisos de recoleccion...) */
  public addFloatingText(text: string, worldX: number, worldY: number, color: string = '#ffd700') {
    this.floatingTexts.push({ text, x: worldX, y: worldY, color, life: 1.0, vy: -26 });
  }

  public updateFloatingTexts(delta: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const f = this.floatingTexts[i];
      f.life -= delta * 1.6;
      f.y += f.vy * delta;
      if (f.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  public drawFloatingTexts(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (this.floatingTexts.length === 0) return;
    ctx.save();
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    for (const f of this.floatingTexts) {
      const px = f.x - cameraX;
      const py = f.y - cameraY;
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = '#000000';
      ctx.fillText(f.text, px + 1, py + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, px, py);
    }
    ctx.restore();
  }
}
