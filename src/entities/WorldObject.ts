// WorldObject.ts - Interactive Campfires, Forage Bushes, Exotic Veins and Shipwreck Debris (GDD Sec. 7.2, 8.4, 10.4)

import { ITEMS_CATALOG } from '../data/items';
import { Player } from './Player';
import { soundManager } from '../audio/SoundManager';

export type WorldObjectType = 'campfire' | 'forage_bush' | 'branch_pile' | 'flint_rock' | 'exotic_node' | 'shipwreck_debris';

export class WorldObject {
  public id: string;
  public type: WorldObjectType;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public isInteractable: boolean = true;
  public isDepleted: boolean = false;
  public dropItemId?: string;
  public dropAmount: number = 1;

  // Campfire specific
  public isLit: boolean = false;
  public fireTimer: number = 0; // seconds remaining

  constructor(type: WorldObjectType, x: number, y: number, dropItemId?: string) {
    this.id = `obj_${Date.now()}_${Math.random()}`;
    this.type = type;
    this.x = x;
    this.y = y;
    this.dropItemId = dropItemId;

    switch (type) {
      case 'campfire':
        this.width = 40;
        this.height = 40;
        this.isLit = true;
        this.fireTimer = 300; // 5 mins
        break;
      case 'forage_bush':
        this.width = 36;
        this.height = 36;
        this.dropItemId = 'berries';
        this.dropAmount = 2;
        break;
      case 'branch_pile':
        this.width = 32;
        this.height = 24;
        this.dropItemId = 'branches';
        this.dropAmount = 3;
        break;
      case 'flint_rock':
        this.width = 30;
        this.height = 24;
        this.dropItemId = 'flint';
        this.dropAmount = 2;
        break;
      case 'shipwreck_debris':
        this.width = 54;
        this.height = 36;
        this.dropItemId = 'branches';
        this.dropAmount = 4;
        break;
      case 'exotic_node':
        this.width = 38;
        this.height = 38;
        this.dropAmount = 1;
        break;
    }
  }

  public isNear(playerX: number, playerY: number, radius: number = 55): boolean {
    const dx = this.x - playerX;
    const dy = this.y - playerY;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  }

  public interact(player: Player): string {
    if (this.isDepleted) return 'Agotado.';

    if (this.type === 'campfire') {
      soundManager.playCampfire();
      // Cook any raw meat in inventory
      const rawCount = player.getItemCount('raw_meat');
      if (rawCount > 0) {
        player.removeItem('raw_meat', rawCount);
        player.addItem('cooked_meat', rawCount);
        return `Descansas junto a la fogata. Asaste ${rawCount} trozos de carne y recuperaste calor corporal. ¡Puedes sintonizar habilidades en el Códice!`;
      }
      return 'Descansas junto a la fogata. El calor reconforta tu cuerpo. ¡Puedes sintonizar habilidades en el Códice!';
    }

    if (this.dropItemId) {
      player.addItem(this.dropItemId, this.dropAmount);
      this.isDepleted = true;
      soundManager.playForage();
      const itemName = ITEMS_CATALOG[this.dropItemId]?.name || this.dropItemId;
      return `Recolectaste ${this.dropAmount}x ${itemName}.`;
    }

    return '';
  }

  public draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (this.isDepleted && this.type !== 'campfire') return;

    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();

    if (this.type === 'campfire') {
      // Stones circle
      ctx.fillStyle = '#6c757d';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 16, 0, Math.PI * 2);
      ctx.fill();

      // Wood logs
      ctx.strokeStyle = '#4a2810';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(screenX - 10, screenY - 8);
      ctx.lineTo(screenX + 10, screenY + 8);
      ctx.moveTo(screenX - 10, screenY + 8);
      ctx.lineTo(screenX + 10, screenY - 8);
      ctx.stroke();

      // Flickering Fire
      if (this.isLit) {
        const flicker = Math.sin(Date.now() * 0.015) * 3;
        // Warm glow radius
        const glow = ctx.createRadialGradient(screenX, screenY, 4, screenX, screenY, 45);
        glow.addColorStop(0, 'rgba(255, 140, 0, 0.45)');
        glow.addColorStop(1, 'rgba(255, 80, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 45, 0, Math.PI * 2);
        ctx.fill();

        // Flames
        ctx.fillStyle = '#ffba08';
        ctx.beginPath();
        ctx.arc(screenX, screenY - 4 + flicker, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e63946';
        ctx.beginPath();
        ctx.arc(screenX, screenY - 2 + flicker * 0.5, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.type === 'forage_bush') {
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 15, 0, Math.PI * 2);
      ctx.fill();
      // Red berries
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.arc(screenX - 5, screenY - 4, 3, 0, Math.PI * 2);
      ctx.arc(screenX + 4, screenY - 2, 3, 0, Math.PI * 2);
      ctx.arc(screenX, screenY + 5, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'branch_pile') {
      ctx.strokeStyle = '#583101';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(screenX - 12, screenY - 4);
      ctx.lineTo(screenX + 10, screenY + 6);
      ctx.moveTo(screenX - 8, screenY + 6);
      ctx.lineTo(screenX + 12, screenY - 4);
      ctx.stroke();
    } else if (this.type === 'flint_rock') {
      ctx.fillStyle = '#495057';
      ctx.beginPath();
      ctx.moveTo(screenX - 10, screenY + 8);
      ctx.lineTo(screenX, screenY - 8);
      ctx.lineTo(screenX + 12, screenY + 6);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'shipwreck_debris') {
      ctx.fillStyle = '#3a2010';
      ctx.fillRect(screenX - 22, screenY - 10, 44, 20);
      ctx.strokeStyle = '#24140a';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX - 22, screenY - 10, 44, 20);
      // Mast piece
      ctx.strokeStyle = '#6f4e37';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(screenX - 16, screenY + 12);
      ctx.lineTo(screenX + 18, screenY - 18);
      ctx.stroke();
    } else if (this.type === 'exotic_node') {
      // Sparkling Exotic Mineral / Flower
      const pulse = Math.sin(Date.now() * 0.006);
      let color = '#ffd166';
      if (this.dropItemId === 'eternal_frost_flower') color = '#90e0ef';
      else if (this.dropItemId === 'fossil_ice') color = '#00b4d8';
      else if (this.dropItemId === 'ancient_resin') color = '#f77f00';
      else if (this.dropItemId === 'abyssal_gland') color = '#70e000';
      else if (this.dropItemId === 'phosphor_mud') color = '#06d6a0';
      else if (this.dropItemId === 'volcanic_pyrite') color = '#d62828';
      else if (this.dropItemId === 'resonant_crystal') color = '#b5179e';
      else if (this.dropItemId === 'luminescent_mycelium') color = '#7209b7';

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 11 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }
}
