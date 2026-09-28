// TurnSystem.ts - Step-Based Turn Mechanics & Simultaneous Roguelike Loop (The Wild Darkness style)

import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { WorldObject } from '../entities/WorldObject';
import { Boss } from '../entities/Boss';
import { RegionData } from '../data/regions';
import { IsometricGrid } from './IsometricGrid';
import { soundManager } from '../audio/SoundManager';
import { questSystem } from '../systems/QuestSystem';

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number; // 0 to 1
  vy: number;
}

export class TurnSystem {
  public turnCount: number = 1;
  public floatingTexts: FloatingText[] = [];
  public isProcessingTurn: boolean = false;

  public onTurnCompleted?: (turn: number) => void;
  public onPlayerDamaged?: (dmg: number) => void;

  /** Spawn floating feedback number / text above an isometric position */
  public addFloatingText(text: string, screenX: number, screenY: number, color: string = '#ffd700') {
    this.floatingTexts.push({
      id: `float_${Date.now()}_${Math.random()}`,
      text,
      x: screenX,
      y: screenY,
      color,
      life: 1.0,
      vy: -28
    });
  }

  /** Update floating texts animation */
  public updateFloatingTexts(delta: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const f = this.floatingTexts[i];
      f.life -= delta * 1.5;
      f.y += f.vy * delta;
      if (f.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  /** Draw all active floating texts */
  public drawFloatingTexts(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (this.floatingTexts.length === 0) return;
    ctx.save();
    ctx.font = 'bold 15px sans-serif';
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

  /**
   * Advance 1 step/turn: Player action completed, survival vitals tick, and enemies take their action
   */
  public advanceTurn(
    player: Player,
    enemies: Enemy[],
    boss: Boss | null,
    worldObjects: WorldObject[],
    region: RegionData,
    grid: IsometricGrid,
    isResting: boolean = false
  ) {
    this.turnCount++;

    // 1. Check near lit campfire
    let isNearCampfire = false;
    for (const obj of worldObjects) {
      if (obj.type === 'campfire' && obj.isLit) {
        const dx = Math.abs(Math.round(player.x / IsometricGrid.TILE_WIDTH) - Math.round(obj.x / IsometricGrid.TILE_WIDTH));
        const dy = Math.abs(Math.round(player.y / IsometricGrid.TILE_HEIGHT) - Math.round(obj.y / IsometricGrid.TILE_HEIGHT));
        if (dx <= 2 && dy <= 2) {
          isNearCampfire = true;
          break;
        }
      }
    }

    // 2. Survival vitals tick
    this.tickSurvival(player, region, isNearCampfire, isResting);

    // 3. Ephemeral items step countdown
    if (player.activeEphemeral) {
      player.activeEphemeral.timeRemaining -= 1.0; // 1 step = 1 unit of life
      if (player.activeEphemeral.timeRemaining <= 0) {
        player.activeEphemeral = null;
        this.addFloatingText('💔 Artefacto Agotado', player.x, player.y - 20, '#ef4444');
        soundManager.playRunicLock();
      }
    }

    // 4. Campfire timer tick
    for (const obj of worldObjects) {
      if (obj.type === 'campfire' && obj.isLit) {
        obj.fireTimer -= 1;
        if (obj.fireTimer <= 0) {
          obj.isLit = false;
        }
      }
    }

    // 5. Enemies turn (Synchronous Roguelike AI)
    this.processEnemiesTurn(player, enemies, boss, grid);

    // 6. Callback notification
    if (this.onTurnCompleted) {
      this.onTurnCompleted(this.turnCount);
    }
  }

  private tickSurvival(
    player: Player,
    region: RegionData,
    isNearCampfire: boolean,
    isResting: boolean
  ) {
    const v = player.vitals;

    // Hunger and Thirst
    v.hunger = Math.max(0, v.hunger - (isResting ? 0.08 : 0.15));
    v.thirst = Math.max(0, v.thirst - (isResting ? 0.12 : 0.22));

    // Stamina
    if (isResting) {
      v.stamina = Math.min(100, v.stamina + 20);
      this.addFloatingText('+20 Estamina', player.x, player.y - 24, '#38bdf8');
    } else {
      v.stamina = Math.min(100, v.stamina + 4);
    }

    // Body Temperature (Cold vs Warmth)
    const coldRate = region.hazards.coldRate;
    const isColdProtected = isNearCampfire || player.isHoldingTorch || player.hasEquippedAbility('frost_heart');

    if (isNearCampfire) {
      v.bodyTemp = Math.min(65, v.bodyTemp + 3.0);
    } else if (coldRate > 0 && !isColdProtected) {
      v.bodyTemp = Math.max(0, v.bodyTemp - coldRate * 1.5);
    }

    // Toxicity in swamp or hazard areas
    if (region.hazards.toxicRate > 0 && !player.hasEquippedAbility('toxin_adaptation')) {
      v.toxicity = Math.min(100, v.toxicity + region.hazards.toxicRate * 1.2);
    } else {
      v.toxicity = Math.max(0, v.toxicity - 0.2);
    }

    // Critical penalty damage
    if (v.hunger <= 0 || v.thirst <= 0 || v.bodyTemp <= 10 || v.toxicity >= 80) {
      v.health = Math.max(0, v.health - 2);
      this.addFloatingText('⚠️ -2 Daño por Supervivencia', player.x, player.y - 10, '#ef4444');
    }
  }

  private processEnemiesTurn(
    player: Player,
    enemies: Enemy[],
    boss: Boss | null,
    grid: IsometricGrid
  ) {
    const playerGx = Math.round(player.x / IsometricGrid.TILE_WIDTH);
    const playerGy = Math.round(player.y / IsometricGrid.TILE_HEIGHT);

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (!enemy.isAlive) continue;

      if (enemy.isFrozen && enemy.freezeTimer > 0) {
        enemy.freezeTimer -= 1;
        if (enemy.freezeTimer <= 0) enemy.isFrozen = false;
        continue;
      }

      const enemyGx = Math.round(enemy.x / IsometricGrid.TILE_WIDTH);
      const enemyGy = Math.round(enemy.y / IsometricGrid.TILE_HEIGHT);

      const dx = playerGx - enemyGx;
      const dy = playerGy - enemyGy;
      const dist = Math.abs(dx) + Math.abs(dy);

      if (dist <= 1) {
        // Adjacent: Enemy attacks player!
        const dmg = Math.max(1, enemy.damage);
        player.vitals.health = Math.max(0, player.vitals.health - dmg);
        soundManager.playHit();

        const screenPos = IsometricGrid.gridToScreen(playerGx, playerGy);
        this.addFloatingText(`-${dmg} HP`, screenPos.x, screenPos.y - 16, '#ff4d4d');

        if (this.onPlayerDamaged) {
          this.onPlayerDamaged(dmg);
        }
      } else if (dist <= 6) {
        // Within alert range: step 1 tile closer
        let stepX = 0;
        let stepY = 0;

        if (Math.abs(dx) >= Math.abs(dy)) {
          stepX = dx > 0 ? 1 : -1;
        } else {
          stepY = dy > 0 ? 1 : -1;
        }

        const targetGx = enemyGx + stepX;
        const targetGy = enemyGy + stepY;

        if (grid.isPassable(targetGx, targetGy)) {
          enemy.x = targetGx * IsometricGrid.TILE_WIDTH;
          enemy.y = targetGy * IsometricGrid.TILE_HEIGHT;
        }
      }
    }

    // Boss turn logic
    if (boss && boss.isAlive) {
      const bossGx = Math.round(boss.x / IsometricGrid.TILE_WIDTH);
      const bossGy = Math.round(boss.y / IsometricGrid.TILE_HEIGHT);
      const dx = playerGx - bossGx;
      const dy = playerGy - bossGy;
      const dist = Math.abs(dx) + Math.abs(dy);

      if (dist <= 2) {
        // Boss area strike!
        const bossDmg = 25;
        player.vitals.health = Math.max(0, player.vitals.health - bossDmg);
        soundManager.playHit();
        const screenPos = IsometricGrid.gridToScreen(playerGx, playerGy);
        this.addFloatingText(`💥 COLOSO: -${bossDmg} HP`, screenPos.x, screenPos.y - 20, '#f43f5e');
      }
    }
  }
}
