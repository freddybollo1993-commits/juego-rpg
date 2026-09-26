// Enemy.ts - Regional Wildlife, Apex Predators and Extraterrestrial Entities (GDD Sec. 2.2, 7.2, 9.3)

import { Player } from './Player';
import { soundManager } from '../audio/SoundManager';

export type EnemyType = 'frost_beast' | 'stalking_wolf' | 'swamp_horror' | 'volcanic_scorpion' | 'crystal_stalker' | 'alien_drone';

export interface EnemyDrop {
  itemId: string;
  chance: number;
}

export class Enemy {
  public id: string;
  public type: EnemyType;
  public name: string;
  public x: number;
  public y: number;
  public width: number = 32;
  public height: number = 32;
  public health: number = 60;
  public maxHealth: number = 60;
  public speed: number = 70;
  public damage: number = 12;
  public isAlive: boolean = true;
  public drops: EnemyDrop[] = [];
  public attackCooldown: number = 0;
  public isFrozen: boolean = false;
  public freezeTimer: number = 0;
  public isBlinded: boolean = false;
  public blindTimer: number = 0;

  // Telegraphed Attack Mechanics
  public isTelegraphing: boolean = false;
  public telegraphTimer: number = 0;
  public telegraphDuration: number = 0.55;
  public telegraphTarget: { x: number; y: number; radius: number } | null = null;
  public justDodgedFeedbackTimer: number = 0;

  constructor(type: EnemyType, x: number, y: number) {
    this.id = `enemy_${Date.now()}_${Math.random()}`;
    this.type = type;
    this.x = x;
    this.y = y;

    switch (type) {
      case 'frost_beast':
        this.name = 'Bestia de Escarcha';
        this.maxHealth = 80;
        this.health = 80;
        this.speed = 65;
        this.damage = 16;
        this.drops = [{ itemId: 'fossil_ice', chance: 0.8 }, { itemId: 'raw_meat', chance: 1.0 }];
        break;
      case 'stalking_wolf':
        this.name = 'Lobo Alfa Acechante';
        this.maxHealth = 55;
        this.health = 55;
        this.speed = 105;
        this.damage = 14;
        this.drops = [{ itemId: 'alpha_fur', chance: 0.8 }, { itemId: 'raw_meat', chance: 1.0 }];
        break;
      case 'swamp_horror':
        this.name = 'Alimaña del Fango';
        this.maxHealth = 70;
        this.health = 70;
        this.speed = 50;
        this.damage = 15;
        this.drops = [{ itemId: 'abyssal_gland', chance: 0.8 }, { itemId: 'phosphor_mud', chance: 0.6 }];
        break;
      case 'volcanic_scorpion':
        this.name = 'Escorpión Volcánico';
        this.maxHealth = 75;
        this.health = 75;
        this.speed = 80;
        this.damage = 18;
        this.drops = [{ itemId: 'volcanic_pyrite', chance: 0.8 }, { itemId: 'crystallized_saltpeter', chance: 0.6 }];
        break;
      case 'crystal_stalker':
        this.name = 'Acechador de Cristal';
        this.maxHealth = 65;
        this.health = 65;
        this.speed = 85;
        this.damage = 16;
        this.drops = [{ itemId: 'resonant_crystal', chance: 0.8 }, { itemId: 'luminescent_mycelium', chance: 0.7 }];
        break;
      case 'alien_drone':
        this.name = 'Dron Deflector Alienígena';
        this.maxHealth = 90;
        this.health = 90;
        this.speed = 95;
        this.damage = 22;
        this.drops = [];
        break;
    }
  }

  public update(player: Player, delta: number) {
    if (!this.isAlive) return;

    // Status effect countdowns
    if (this.isFrozen) {
      this.freezeTimer -= delta;
      if (this.freezeTimer <= 0) this.isFrozen = false;
      return; // Cannot move while frozen
    }

    if (this.isBlinded) {
      this.blindTimer -= delta;
      if (this.blindTimer <= 0) this.isBlinded = false;
      return; // Wanders blinded
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    if (this.justDodgedFeedbackTimer > 0) {
      this.justDodgedFeedbackTimer -= delta;
    }

    // Process Active Telegraph Windup
    if (this.isTelegraphing && this.telegraphTarget) {
      this.telegraphTimer -= delta;
      if (this.telegraphTimer <= 0) {
        // Strike triggers at telegraphed zone
        const hitDist = Math.hypot(player.x - this.telegraphTarget.x, player.y - this.telegraphTarget.y);
        if (hitDist <= this.telegraphTarget.radius + 12) {
          if (player.isInvulnerable) {
            // Player dodged through attack with i-frames!
            this.justDodgedFeedbackTimer = 0.9;
            soundManager.playDodge();
          } else {
            // Player hit!
            player.vitals.health = Math.max(0, player.vitals.health - this.damage);
            soundManager.playHit();
          }
        }
        this.isTelegraphing = false;
        this.telegraphTarget = null;
        this.attackCooldown = 1.35;
      }
      return; // Root enemy briefly while winding up telegraphed attack
    }

    // Detection Radius
    let detectionRadius = 220;
    // Stealth modifiers (GDD Sec. 3 & 7.4)
    if (player.invisibilityTimer > 0) {
      detectionRadius = 0; // 100% invisible
    } else if (player.isEphemeralActive('swamp_evasion_talisman')) {
      detectionRadius = 60; // 3 meters
    } else if (player.canopyStrideActive) {
      detectionRadius = 120; // Silenced footsteps
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= detectionRadius && dist > 15) {
      // Chase player
      this.x += (dx / dist) * this.speed * delta;
      this.y += (dy / dist) * this.speed * delta;
    }

    // Initiate Telegraphed Attack when in range
    if (dist <= 46 && this.attackCooldown <= 0 && player.invisibilityTimer <= 0 && !this.isTelegraphing) {
      this.isTelegraphing = true;
      this.telegraphTimer = this.telegraphDuration;
      this.telegraphTarget = { x: player.x, y: player.y, radius: 46 };
      soundManager.playTelegraph();
    }
  }

  public takeDamage(amount: number, player: Player): boolean {
    if (!this.isAlive) return false;
    this.health -= amount;
    soundManager.playHit();

    if (this.health <= 0) {
      this.isAlive = false;
      // Drop loot into player inventory or nearby
      for (const drop of this.drops) {
        if (Math.random() <= drop.chance) {
          player.addItem(drop.itemId, 1);
        }
      }
      return true; // Enemy died
    }
    return false;
  }

  public freeze(duration: number) {
    this.isFrozen = true;
    this.freezeTimer = duration;
  }

  public blind(duration: number) {
    this.isBlinded = true;
    this.blindTimer = duration;
  }

  public draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.isAlive) return;

    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    // 1. Draw Telegraphed Attack Indicator on Ground
    if (this.isTelegraphing && this.telegraphTarget) {
      const tgtScreenX = this.telegraphTarget.x - cameraX;
      const tgtScreenY = this.telegraphTarget.y - cameraY;
      const progress = Math.min(1, Math.max(0, 1 - this.telegraphTimer / this.telegraphDuration));

      ctx.save();
      // Outer warning ring
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(tgtScreenX, tgtScreenY, this.telegraphTarget.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner expanding danger fill
      ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
      ctx.beginPath();
      ctx.arc(tgtScreenX, tgtScreenY, this.telegraphTarget.radius * progress, 0, Math.PI * 2);
      ctx.fill();

      // Warning marker
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f87171';
      ctx.fillText('⚠️', tgtScreenX, tgtScreenY - this.telegraphTarget.radius - 4);
      ctx.restore();
    }

    // 2. Draw Floating Dodge Success Cue
    if (this.justDodgedFeedbackTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      const floatY = screenY - 28 - (0.9 - this.justDodgedFeedbackTimer) * 20;
      ctx.fillText('¡ESQUIVADO! 💨', screenX, floatY);
      ctx.restore();
    }

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 12, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw enemy by type
    if (this.type === 'frost_beast') {
      ctx.fillStyle = this.isFrozen ? '#bde0fe' : '#e0fbfc';
      ctx.fillRect(screenX - 14, screenY - 14, 28, 26);
      ctx.fillStyle = '#0077b6'; // Horns
      ctx.fillRect(screenX - 12, screenY - 20, 6, 8);
      ctx.fillRect(screenX + 6, screenY - 20, 6, 8);
    } else if (this.type === 'stalking_wolf') {
      ctx.fillStyle = '#4a4e69';
      ctx.fillRect(screenX - 16, screenY - 10, 32, 20);
      ctx.fillStyle = '#22223b'; // Snout
      ctx.fillRect(screenX + 12, screenY - 6, 8, 8);
      // Red eyes
      ctx.fillStyle = '#e63946';
      ctx.fillRect(screenX + 6, screenY - 8, 3, 3);
    } else if (this.type === 'swamp_horror') {
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 14, 0, Math.PI * 2);
      ctx.fill();
      // Glowing green venom warts
      ctx.fillStyle = '#70e000';
      ctx.beginPath();
      ctx.arc(screenX - 5, screenY - 5, 3, 0, Math.PI * 2);
      ctx.arc(screenX + 6, screenY + 2, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'volcanic_scorpion') {
      ctx.fillStyle = '#851800';
      ctx.fillRect(screenX - 14, screenY - 8, 28, 18);
      // Stinger
      ctx.strokeStyle = '#ffba08';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(screenX - 12, screenY);
      ctx.quadraticCurveTo(screenX - 22, screenY - 18, screenX - 10, screenY - 22);
      ctx.stroke();
    } else if (this.type === 'crystal_stalker') {
      ctx.fillStyle = '#7209b7';
      ctx.beginPath();
      ctx.moveTo(screenX, screenY - 18);
      ctx.lineTo(screenX + 14, screenY + 12);
      ctx.lineTo(screenX - 14, screenY + 12);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'alien_drone') {
      ctx.fillStyle = '#03045e';
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Plasma eye
      ctx.fillStyle = '#f72585';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Health Bar
    if (this.health < this.maxHealth) {
      const barW = 28;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(screenX - barW / 2, screenY - 26, barW, 4);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(screenX - barW / 2, screenY - 26, (this.health / this.maxHealth) * barW, 4);
    }

    ctx.restore();
  }
}
