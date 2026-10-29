// HUD.ts - Interfaz minima dibujada en el canvas: lugar, dia, hora y turno.

import { RegionData } from '../data/regions';
import { DayNightCycle } from '../systems/DayNightCycle';

export class HUD {
  public draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    region: RegionData,
    clock: DayNightCycle,
    turnCount: number
  ) {
    const boxW = Math.min(width - 24, 360);
    const boxX = (width - boxW) / 2;
    const boxY = 8;

    ctx.save();
    ctx.fillStyle = 'rgba(8, 10, 16, 0.82)';
    ctx.fillRect(boxX, boxY, boxW, 40);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, 39);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(region.name, width / 2, boxY + 17);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(
      `Día ${clock.dayCount}  ${clock.getPhaseIcon()} ${clock.getTimeString()}  ·  Turno ${turnCount}`,
      width / 2,
      boxY + 33
    );
    ctx.restore();
  }
}
