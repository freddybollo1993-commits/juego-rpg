// Arrow.ts - Ballistic Ranged Projectile with Elemental Payloads (Fase 2.1)

import { soundManager } from '../audio/SoundManager';
import { Enemy } from './Enemy';
import { Boss } from './Boss';

export type ArrowType = 'flint' | 'fire' | 'frost';

export class Arrow {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public angle: number;
  public type: ArrowType;
  public damage: number;
  public speed: number = 480;
  public distanceTraveled: number = 0;
  public maxRange: number = 560;
  public isAlive: boolean = true;
  public length: number = 24;

  constructor(x: number, y: number, angle: number, type: ArrowType = 'flint') {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.type = type;

    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    if (type === 'flint') {
      this.damage = 26;
    } else if (type === 'fire') {
      this.damage = 22;
    } else {
      this.damage = 18;
    }
  }

  public update(delta: number, enemies: Enemy[] = [], boss: Boss | null = null, onHitSpark?: (x: number, y: number, color: string) => void) {
    if (!this.isAlive) return;

    const dx = this.vx * delta;
    const dy = this.vy * delta;
    this.x += dx;
    this.y += dy;
    this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);

    if (this.distanceTraveled >= this.maxRange) {
      this.isAlive = false;
      return;
    }

    // Check collision with regular enemies
    if (enemies && enemies.length > 0) {
      for (const enemy of enemies) {
        if (this.checkCollisionWithEnemy(enemy, onHitSpark)) {
          return;
        }
      }
    }

    // Check collision with Boss
    if (boss && boss.isAlive) {
      const dist = Math.hypot(this.x - boss.x, this.y - boss.y);
      if (dist <= 48) {
        this.isAlive = false;
        soundManager.playArrowImpact();

        if (boss.shieldActive) {
          // Elemental fire arrows erode shields
          if (this.type === 'fire') {
            boss.shieldHealth -= 20;
            if (boss.shieldHealth <= 0) {
              boss.shieldActive = false;
            }
          } else {
            soundManager.playRunicLock();
          }
        } else {
          boss.health = Math.max(0, boss.health - this.damage);
          if (this.type === 'frost') {
            boss.health -= 5;
          } else if (this.type === 'fire') {
            boss.health -= 12;
          }
          if (boss.health <= 0) {
            boss.isAlive = false;
          }
        }

        if (onHitSpark) {
          const sparkColor = this.type === 'fire' ? '#ff5400' : this.type === 'frost' ? '#38bdf8' : '#e2e8f0';
          onHitSpark(this.x, this.y, sparkColor);
        }
        return;
      }
    }
  }

  public checkCollisionWithEnemy(enemy: Enemy, onHitSpark?: (x: number, y: number, color: string) => void): boolean {
    if (!this.isAlive || !enemy.isAlive) return false;

    const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
    if (dist <= 24) {
      this.isAlive = false;
      soundManager.playArrowImpact();
      enemy.health -= this.damage;

      if (this.type === 'frost') {
        enemy.freeze(3.5);
      } else if (this.type === 'fire') {
        enemy.ignite(3.5);
        enemy.health -= 12;
      }

      if (enemy.health <= 0) {
        enemy.isAlive = false;
      }

      if (onHitSpark) {
        const sparkColor = this.type === 'fire' ? '#ff5400' : this.type === 'frost' ? '#38bdf8' : '#e2e8f0';
        onHitSpark(this.x, this.y, sparkColor);
      }
      return true;
    }
    return false;
  }

  public draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.isAlive) return;

    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.angle);

    // Arrow Shaft (wooden)
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-this.length / 2, 0);
    ctx.lineTo(this.length / 2, 0);
    ctx.stroke();

    // Arrowhead
    if (this.type === 'flint') {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(this.length / 2 + 5, 0);
      ctx.lineTo(this.length / 2 - 3, -4);
      ctx.lineTo(this.length / 2 - 3, 4);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'fire') {
      ctx.fillStyle = '#ff5400';
      ctx.beginPath();
      ctx.moveTo(this.length / 2 + 7, 0);
      ctx.lineTo(this.length / 2 - 4, -5);
      ctx.lineTo(this.length / 2 - 4, 5);
      ctx.closePath();
      ctx.fill();

      // Flame glow aura
      ctx.fillStyle = 'rgba(255, 186, 8, 0.4)';
      ctx.beginPath();
      ctx.arc(this.length / 2, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'frost') {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(this.length / 2 + 6, 0);
      ctx.lineTo(this.length / 2 - 3, -4);
      ctx.lineTo(this.length / 2 - 3, 4);
      ctx.closePath();
      ctx.fill();

      // Frost crystalline aura
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.arc(this.length / 2, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fletching (feathers at back)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-this.length / 2, 0);
    ctx.lineTo(-this.length / 2 - 4, -3);
    ctx.lineTo(-this.length / 2 + 2, 0);
    ctx.lineTo(-this.length / 2 - 4, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
