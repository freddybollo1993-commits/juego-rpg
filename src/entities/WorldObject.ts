// WorldObject.ts - Interactive Campfires, Forage Bushes, Exotic Veins and Shipwreck Debris (GDD Sec. 7.2, 8.4, 10.4)

import { ITEMS_CATALOG } from '../data/items';
import { Player } from './Player';
import { soundManager } from '../audio/SoundManager';
import { dayNightCycle } from '../systems/DayNightCycle';

export type WorldObjectType =
  | 'campfire'
  | 'forage_bush'
  | 'branch_pile'
  | 'flint_rock'
  | 'exotic_node'
  | 'shipwreck_debris'
  | 'coastal_palm'
  | 'workbench'
  | 'anvil'
  | 'tanner'
  | 'alchemy_station'
  | 'bear_trap'
  | 'precursor_pedestal'
  | 'precursor_chest'
  | 'night_orchid_plant';

export class WorldObject {
  public id: string;
  public type: WorldObjectType;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public isInteractable: boolean = true;
  public isDepleted: boolean = false;
  public isActivated: boolean = false;
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
      case 'coastal_palm':
        this.width = 48;
        this.height = 80;
        this.dropItemId = 'branches';
        this.dropAmount = 2;
        break;
      case 'exotic_node':
        this.width = 38;
        this.height = 38;
        this.dropAmount = 1;
        break;
      case 'workbench':
        this.width = 52;
        this.height = 36;
        break;
      case 'anvil':
        this.width = 42;
        this.height = 36;
        break;
      case 'tanner':
        this.width = 46;
        this.height = 46;
        break;
      case 'alchemy_station':
        this.width = 44;
        this.height = 42;
        break;
      case 'bear_trap':
        this.width = 28;
        this.height = 28;
        break;
      case 'precursor_pedestal':
        this.width = 36;
        this.height = 44;
        break;
      case 'precursor_chest':
        this.width = 44;
        this.height = 32;
        break;
      case 'night_orchid_plant':
        this.width = 32;
        this.height = 32;
        this.dropItemId = 'night_orchid';
        this.dropAmount = 1;
        break;
    }
  }

  public get interactionText(): string {
    switch (this.type) {
      case 'workbench': return '🛠️ Mesa de Trabajo / Banco Tribal';
      case 'anvil': return '⚒️ Yunque Primitivo de los Clanes';
      case 'tanner': return '🪵 Bastidor de Cuero / Curtidor';
      case 'alchemy_station': return '🧪 Alambique y Caldero Alquímico';
      case 'bear_trap': return '⚙️ Trampa para Osos y Bestias';
      case 'campfire': return '🔥 Hoguera';
      case 'precursor_pedestal': return '💠 Pedestal de Glifos Precursores';
      case 'precursor_chest': return '🗝️ Cofre Ancestral Sellado';
      case 'night_orchid_plant': return '🪷 Orquídea de Luna (Bioluminiscente)';
      default: return this.type;
    }
  }

  public isNear(playerX: number, playerY: number, radius: number = 55): boolean {
    const dx = this.x - playerX;
    const dy = this.y - playerY;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  }

  public interact(player: Player): string {
    if (this.isDepleted) return 'Agotado.';

    if (this.type === 'workbench') {
      soundManager.playRunicTuning();
      return '🛠️ Banco de Trabajo: Puedes forjar Arcos y Flechas desde tu menú de crafteo.';
    }

    if (this.type === 'anvil') {
      soundManager.playRunicTuning();
      return '⚒️ Yunque de los Clanes: Permite forjar Puntas Reforzadas y Munición de Escarcha.';
    }

    if (this.type === 'tanner') {
      soundManager.playRunicTuning();
      return '🪵 Puesto de Curtidor: Permite curtir pieles y confeccionar la Mochila Expandida (+8 ranuras).';
    }

    if (this.type === 'alchemy_station') {
      soundManager.playRunicTuning();
      return '🧪 Caldero Alquímico: Permite destilar Tintura Térmica y Antídotos de Morgath.';
    }

    if (this.type === 'bear_trap') {
      this.isDepleted = true;
      player.addItem('bear_trap', 1);
      soundManager.playForage();
      return 'Desarmaste y recogiste la Trampa para Bestias.';
    }

    if (this.type === 'precursor_pedestal') {
      if (this.isActivated) {
        return 'Pedestal de Glifos ya activado: El núcleo irradia luz cian.';
      }
      this.isActivated = true;
      player.gainXP(25);
      soundManager.playRunicTuning();
      return '¡Pedestal de Glifos activado! La energía alienígena fluye (+25 XP).';
    }

    if (this.type === 'precursor_chest') {
      if (this.isDepleted) {
        return 'El Cofre Ancestral ya ha sido saqueado.';
      }
      if (player.hasItem('precursor_key')) {
        this.isDepleted = true;
        player.removeItem('precursor_key', 1);
        player.addItem('precursor_core', 1);
        player.addItem('ancient_battery', 2);
        player.gainXP(150);
        soundManager.playRunicLock();
        return '¡Cofre Ancestral abierto con la Llave! Obtuviste un Núcleo Precursor, 2 Baterías Estelares y +150 XP.';
      } else {
        return 'Cofre sellado por tecnología alienígena. Necesitas la Llave de Glifos Precursores.';
      }
    }

    if (this.type === 'night_orchid_plant') {
      if (!dayNightCycle.isNight()) {
        return 'La Orquídea de Luna permanece cerrada durante el día. Florece y brilla únicamente de noche.';
      }
      this.isDepleted = true;
      player.addItem('night_orchid', 1);
      player.gainXP(20);
      soundManager.playForage();
      return 'Recolectaste una rara Orquídea de Luna (+20 XP).';
    }

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
      // Wrecked Galleon Wood & Broken Canvas Sail (Art Director Spec)
      ctx.fillStyle = '#3a2010';
      ctx.fillRect(screenX - 24, screenY - 12, 48, 24);
      ctx.strokeStyle = '#1e1008';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX - 24, screenY - 12, 48, 24);

      // Plank lines & grain
      ctx.strokeStyle = '#523018';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(screenX - 24, screenY - 4);
      ctx.lineTo(screenX + 24, screenY - 4);
      ctx.moveTo(screenX - 24, screenY + 4);
      ctx.lineTo(screenX + 24, screenY + 4);
      ctx.stroke();

      // Rusted Iron Straps
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(screenX - 18, screenY - 12, 4, 24);
      ctx.fillRect(screenX + 14, screenY - 12, 4, 24);

      // Shattered Wooden Mast
      ctx.strokeStyle = '#7c4a21';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(screenX - 20, screenY + 14);
      ctx.lineTo(screenX + 22, screenY - 20);
      ctx.stroke();

      // Torn White Sail Canvas piece
      ctx.fillStyle = 'rgba(241, 245, 249, 0.75)';
      ctx.beginPath();
      ctx.moveTo(screenX - 6, screenY - 12);
      ctx.lineTo(screenX + 10, screenY - 18);
      ctx.lineTo(screenX + 16, screenY - 6);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'coastal_palm') {
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(screenX + 4, screenY + 18, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Trunk
      ctx.fillStyle = '#54381e';
      ctx.beginPath();
      ctx.moveTo(screenX - 5, screenY + 18);
      ctx.quadraticCurveTo(screenX + 12, screenY - 10, screenX, screenY - 48);
      ctx.lineTo(screenX + 8, screenY - 48);
      ctx.quadraticCurveTo(screenX + 20, screenY - 10, screenX + 7, screenY + 18);
      ctx.closePath();
      ctx.fill();

      // Lush Green Palm Fronds
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 4.5;
      const topX = screenX + 4;
      const topY = screenY - 48;

      const frondAngles = [-0.3, 0.5, 1.3, 2.1, 2.9, 3.7, 4.5];
      for (const a of frondAngles) {
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.quadraticCurveTo(topX + Math.cos(a) * 25, topY + Math.sin(a) * 20 - 10, topX + Math.cos(a) * 44, topY + Math.sin(a) * 44 + 10);
        ctx.stroke();
      }

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(topX, topY, 7, 0, Math.PI * 2);
      ctx.fill();
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
    } else if (this.type === 'workbench') {
      // Wooden table top
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(screenX - 24, screenY - 10, 48, 18);
      // Table legs
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(screenX - 22, screenY + 8, 6, 12);
      ctx.fillRect(screenX + 16, screenY + 8, 6, 12);
      // Tools & bow carving
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY - 2, 10, -0.6, 0.6);
      ctx.stroke();
    } else if (this.type === 'anvil') {
      // Wood stump base
      ctx.fillStyle = '#5d4037';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY + 10, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Iron Anvil
      ctx.fillStyle = '#374151';
      ctx.fillRect(screenX - 14, screenY - 12, 28, 14);
      ctx.fillRect(screenX - 18, screenY - 14, 36, 6);
      // Hammer on top
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(screenX - 4, screenY - 18, 8, 4);
    } else if (this.type === 'tanner') {
      // Wooden Frame
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 3;
      ctx.strokeRect(screenX - 20, screenY - 20, 40, 40);
      // Stretched wolf hide
      ctx.fillStyle = '#b08968';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, 14, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'alchemy_station') {
      // Cauldron
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(screenX, screenY + 2, 16, 0, Math.PI * 2);
      ctx.fill();
      // Glowing bubbling potion
      const boil = Math.sin(Date.now() * 0.008) * 2;
      ctx.fillStyle = '#70e000';
      ctx.beginPath();
      ctx.arc(screenX, screenY - 4, 10 + boil, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'bear_trap') {
      // Iron jaws
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 12, 0, Math.PI * 2);
      ctx.stroke();
      // Teeth
      ctx.fillStyle = '#94a3b8';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.fillRect(screenX + Math.cos(a) * 10 - 2, screenY + Math.sin(a) * 10 - 2, 4, 4);
      }
    } else if (this.type === 'precursor_pedestal') {
      // Obsidian Pillar
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(screenX - 14, screenY - 16, 28, 32);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX - 14, screenY - 16, 28, 32);

      // Glyphs & Floating Energy Sphere
      const glowColor = this.isActivated ? '#38bdf8' : '#1e3a8a';
      ctx.save();
      if (this.isActivated) {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(screenX, screenY - 18, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (this.type === 'precursor_chest') {
      // Precursor Metal Chest
      ctx.fillStyle = this.isDepleted ? '#334155' : '#1e293b';
      ctx.fillRect(screenX - 18, screenY - 10, 36, 20);

      // Energy Inlay Lines
      ctx.strokeStyle = this.isDepleted ? '#64748b' : '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX - 16, screenY - 8, 32, 16);

      // Center Keyhole / Core Gem
      ctx.fillStyle = this.isDepleted ? '#475569' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'night_orchid_plant') {
      const isNight = dayNightCycle.isNight();
      if (isNight && !this.isDepleted) {
        // Glowing Night Orchid Flower
        ctx.save();
        ctx.shadowColor = '#e879f9';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(screenX, screenY - 4, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(screenX, screenY - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Closed bud or depleted stem
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
