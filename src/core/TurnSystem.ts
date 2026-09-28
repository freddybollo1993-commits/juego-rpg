// TurnSystem.ts - 100% Turn-Based Tactical Combat & Strict 1-Tile Occupancy Engine (The Wild Darkness style)

import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { WorldObject } from '../entities/WorldObject';
import { Boss } from '../entities/Boss';
import { RegionData } from '../data/regions';
import { IsometricGrid } from './IsometricGrid';
import { soundManager } from '../audio/SoundManager';

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
      vy: -26
    });
  }

  /** Update floating texts animation */
  public updateFloatingTexts(delta: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const f = this.floatingTexts[i];
      f.life -= delta * 1.6;
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

  /**
   * Advance 1 step/turn: Player action completes, survival vitals tick, and enemies take their turn
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

    // 1. Strict 1-Tile Campfire Check
    let isNearCampfire = false;
    for (const obj of worldObjects) {
      if (obj.type === 'campfire' && obj.isLit) {
        const dx = Math.abs(player.gx - obj.gx);
        const dy = Math.abs(player.gy - obj.gy);
        if (dx <= 1 && dy <= 1) {
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
        const pPos = IsometricGrid.gridToScreen(player.gx, player.gy);
        this.addFloatingText('💔 Artefacto Agotado', pPos.x, pPos.y - 20, '#ef4444');
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

    // 5. Turn-Based Enemies Phase
    this.processEnemiesTurn(player, enemies, boss, worldObjects, grid);

    // 6. Reset Player's temporary turn flags (like guarding)
    if (!isResting) {
      player.isGuarding = false;
    }

    // 7. Callback notification
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

    // Hunger and Thirst (discrete consumption per turn)
    v.hunger = Math.max(0, v.hunger - (isResting ? 0.08 : 0.15));
    v.thirst = Math.max(0, v.thirst - (isResting ? 0.12 : 0.22));

    const pPos = IsometricGrid.gridToScreen(player.gx, player.gy);

    // Stamina & Guard Mode
    if (isResting) {
      player.isGuarding = true; // Guarding grants 50% damage reduction for incoming enemy turns
      v.stamina = Math.min(100, v.stamina + 25);
      this.addFloatingText('🛡️ Guardia (+25 Estamina)', pPos.x, pPos.y - 26, '#38bdf8');
    } else {
      player.isGuarding = false;
      v.stamina = Math.min(100, v.stamina + 4);
    }

    // Body Temperature (Cold vs Warmth)
    const coldRate = region.hazards.coldRate;
    const isColdProtected = isNearCampfire || player.isHoldingTorch || player.hasEquippedAbility('frost_heart');

    if (isNearCampfire) {
      v.bodyTemp = Math.min(70, v.bodyTemp + 4.0);
    } else if (coldRate > 0 && !isColdProtected) {
      v.bodyTemp = Math.max(0, v.bodyTemp - coldRate * 1.5);
    }

    // Toxicity in swamp or hazard areas
    if (region.hazards.toxicRate > 0 && !player.hasEquippedAbility('toxin_adaptation')) {
      v.toxicity = Math.min(100, v.toxicity + region.hazards.toxicRate * 1.2);
    } else {
      v.toxicity = Math.max(0, v.toxicity - 0.2);
    }

    // Critical penalty damage if stats reach zero
    if (v.hunger <= 0 || v.thirst <= 0 || v.bodyTemp <= 10 || v.toxicity >= 80) {
      v.health = Math.max(0, v.health - 2);
      this.addFloatingText('⚠️ -2 HP por Supervivencia', pPos.x, pPos.y - 12, '#ef4444');
    }
  }

  /**
   * Turn-Based Enemy Actions:
   * 1. Check freeze/stun/burn turns.
   * 2. If adjacent (dx<=1 && dy<=1): attack player!
   * 3. If in range: step 1 tile towards player ensuring NO tile overlaps.
   */
  private processEnemiesTurn(
    player: Player,
    enemies: Enemy[],
    boss: Boss | null,
    worldObjects: WorldObject[],
    grid: IsometricGrid
  ) {
    const playerGx = player.gx;
    const playerGy = player.gy;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (!enemy.isAlive) continue;

      const enemyScreen = IsometricGrid.gridToScreen(enemy.gx, enemy.gy);

      // Check freeze turns
      if (enemy.freezeTurns > 0) {
        enemy.freezeTurns--;
        this.addFloatingText('❄️ Congelado', enemyScreen.x, enemyScreen.y - 20, '#38bdf8');
        continue; // Skips action
      }

      // Check burn turns
      if (enemy.burnTurns > 0) {
        enemy.burnTurns--;
        enemy.health -= 12;
        this.addFloatingText('🔥 -12 Quemadura', enemyScreen.x, enemyScreen.y - 22, '#f97316');
        if (enemy.health <= 0) {
          enemy.isAlive = false;
          this.addFloatingText('💀 Caído', enemyScreen.x, enemyScreen.y - 10, '#cbd5e1');
          player.gainXP(enemy.xpReward);
          continue;
        }
      }

      // Check distance to player in grid tiles
      const dx = playerGx - enemy.gx;
      const dy = playerGy - enemy.gy;
      const dist = Math.abs(dx) + Math.abs(dy);

      if (dist <= 1) {
        // Adjacent: Enemy attacks player!
        const baseDmg = enemy.damage;
        const finalDmg = player.isGuarding ? Math.max(1, Math.round(baseDmg * 0.5)) : baseDmg;
        player.vitals.health = Math.max(0, player.vitals.health - finalDmg);
        soundManager.playHit();

        const pScreen = IsometricGrid.gridToScreen(playerGx, playerGy);
        const guardLabel = player.isGuarding ? ' (🛡️ Bloqueo)' : '';
        this.addFloatingText(`-${finalDmg} HP${guardLabel}`, pScreen.x, pScreen.y - 16, player.isGuarding ? '#fbbf24' : '#ef4444');

        if (this.onPlayerDamaged) {
          this.onPlayerDamaged(finalDmg);
        }
      } else if (dist <= 6) {
        // Step 1 tile closer towards player ensuring strictly 1 entity per tile
        let stepX = 0;
        let stepY = 0;

        if (Math.abs(dx) >= Math.abs(dy)) {
          stepX = dx > 0 ? 1 : -1;
        } else {
          stepY = dy > 0 ? 1 : -1;
        }

        let targetGx = enemy.gx + stepX;
        let targetGy = enemy.gy + stepY;

        // Check if primary step is blocked, try alternate step
        if (!this.isTileFreeForEnemy(targetGx, targetGy, enemy, enemies, worldObjects, grid, player)) {
          if (stepX !== 0 && dy !== 0) {
            targetGx = enemy.gx;
            targetGy = enemy.gy + (dy > 0 ? 1 : -1);
          } else if (stepY !== 0 && dx !== 0) {
            targetGx = enemy.gx + (dx > 0 ? 1 : -1);
            targetGy = enemy.gy;
          }
        }

        // If target tile is passable and unoccupied, move there!
        if (this.isTileFreeForEnemy(targetGx, targetGy, enemy, enemies, worldObjects, grid, player)) {
          enemy.gx = targetGx;
          enemy.gy = targetGy;
          const iso = IsometricGrid.gridToScreen(enemy.gx, enemy.gy);
          enemy.x = iso.x;
          enemy.y = iso.y;
        }
      }
    }

    // Boss Turn & Telegraphed Attack Logic
    if (boss && boss.isAlive) {
      this.processBossTurn(boss, player, grid);
    }
  }

  /** Ensure strictly 1 object/entity per tile */
  private isTileFreeForEnemy(
    gx: number,
    gy: number,
    currentEnemy: Enemy,
    enemies: Enemy[],
    worldObjects: WorldObject[],
    grid: IsometricGrid,
    player: Player
  ): boolean {
    if (!grid.isPassable(gx, gy)) return false;
    if (player.gx === gx && player.gy === gy) return false;

    // Check other enemies
    for (const other of enemies) {
      if (other !== currentEnemy && other.isAlive && other.gx === gx && other.gy === gy) {
        return false;
      }
    }

    // Check impassable world objects
    for (const obj of worldObjects) {
      if (!obj.isDepleted && obj.gx === gx && obj.gy === gy) {
        if (obj.type === 'campfire' || obj.type === 'workbench' || obj.type === 'anvil' || obj.type === 'coastal_palm') {
          return false;
        }
      }
    }

    return true;
  }

  /** Boss Turn: executes telegraphed attacks and marks danger tiles for the next turn */
  private processBossTurn(boss: Boss, player: Player, grid: IsometricGrid) {
    const bossGx = 12; // Centered arena position
    const bossGy = 7;

    // 1. Resolve active danger tiles from previous turn
    if (grid.dangerTiles.length > 0) {
      for (const danger of grid.dangerTiles) {
        if (player.gx === danger.gx && player.gy === danger.gy) {
          const dmg = 35;
          const finalDmg = player.isGuarding ? Math.round(dmg * 0.5) : dmg;
          player.vitals.health = Math.max(0, player.vitals.health - finalDmg);
          soundManager.playHit();
          const pScreen = IsometricGrid.gridToScreen(player.gx, player.gy);
          this.addFloatingText(`💥 IMPACTO COLOSO: -${finalDmg} HP`, pScreen.x, pScreen.y - 22, '#f43f5e');
        }
      }
      grid.dangerTiles = []; // Cleared after resolution
    }

    // 2. Direct attack if player is within 2 tiles
    const dx = Math.abs(player.gx - bossGx);
    const dy = Math.abs(player.gy - bossGy);
    if (dx <= 2 && dy <= 2) {
      const bossDmg = player.isGuarding ? 12 : 24;
      player.vitals.health = Math.max(0, player.vitals.health - bossDmg);
      soundManager.playHit();
      const pScreen = IsometricGrid.gridToScreen(player.gx, player.gy);
      this.addFloatingText(`💥 COLOSO: -${bossDmg} HP`, pScreen.x, pScreen.y - 20, '#f43f5e');
    } else {
      // Telegraph warning on player's current tile for next turn!
      grid.dangerTiles.push({
        gx: player.gx,
        gy: player.gy,
        label: 'Mortero Estelar'
      });
    }
  }
}
