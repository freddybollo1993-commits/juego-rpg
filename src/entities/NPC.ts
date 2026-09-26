// NPC.ts - Tribal Elders, Chiefs and Guides for the 5 Autonomous Regions (GDD Sec. 2 & 9.2)

import { TRIBES_DATA, TribeData } from '../data/tribes';

export class NPC {
  public id: string;
  public tribeId: string;
  public name: string;
  public title: string;
  public x: number;
  public y: number;
  public width: number = 32;
  public height: number = 48;
  public tribeData: TribeData;

  constructor(tribeId: string, x: number, y: number) {
    this.tribeId = tribeId;
    this.x = x;
    this.y = y;
    this.tribeData = TRIBES_DATA[tribeId];
    this.id = `npc_${tribeId}`;
    this.name = this.tribeData.leaderName;
    this.title = this.tribeData.leaderTitle;
  }

  public isNearPlayer(playerX: number, playerY: number, distance: number = 65): boolean {
    const dx = this.x - playerX;
    const dy = this.y - playerY;
    return Math.sqrt(dx * dx + dy * dy) <= distance;
  }

  public draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + this.height / 2 - 2, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tribe-specific colors and attire
    let robeColor = '#555';
    let trimColor = '#d4af37';
    let iconSymbol = '👑';

    if (this.tribeId === 'frost') {
      robeColor = '#a8dadc'; // White fur robe
      trimColor = '#457b9d';
      iconSymbol = '❄️';
    } else if (this.tribeId === 'forest') {
      robeColor = '#2d6a4f'; // Green leaf hunter tunic
      trimColor = '#d8f3dc';
      iconSymbol = '🍃';
    } else if (this.tribeId === 'swamp') {
      robeColor = '#4a572a'; // Mossy shaman robe
      trimColor = '#9d4edd';
      iconSymbol = '🧪';
    } else if (this.tribeId === 'canyon') {
      robeColor = '#d4a373'; // Desert desert nomad silk
      trimColor = '#e76f51';
      iconSymbol = '☀️';
    } else if (this.tribeId === 'caverns') {
      robeColor = '#495057'; // Heavy stone plate
      trimColor = '#00b4d8';
      iconSymbol = '💎';
    }

    // Robe
    ctx.fillStyle = robeColor;
    ctx.fillRect(screenX - 14, screenY - 18, 28, 30);

    // Trim
    ctx.fillStyle = trimColor;
    ctx.fillRect(screenX - 14, screenY + 8, 28, 4);

    // Head
    ctx.fillStyle = '#f1c27d';
    ctx.beginPath();
    ctx.arc(screenX, screenY - 26, 11, 0, Math.PI * 2);
    ctx.fill();

    // Staff or sacred relic in hand
    ctx.strokeStyle = '#b08968';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX + 16, screenY + 12);
    ctx.lineTo(screenX + 16, screenY - 32);
    ctx.stroke();

    // Staff Gem
    ctx.fillStyle = trimColor;
    ctx.beginPath();
    ctx.arc(screenX + 16, screenY - 34, 5, 0, Math.PI * 2);
    ctx.fill();

    // Speech Prompt Bubble when close
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${iconSymbol} ${this.name}`, screenX, screenY - 45);

    ctx.restore();
  }
}
