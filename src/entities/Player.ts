// Player.ts - Player entity, inventory, reliquary, combat, and runic skill management (GDD Sec. 1-10)

import { VitalStatus } from '../systems/SurvivalSystem';
import { ITEMS_CATALOG, EphemeralArtifact } from '../data/items';
import { soundManager } from '../audio/SoundManager';

export interface ActiveEphemeralSlot {
  itemId: string;
  totalDuration: number;
  timeRemaining: number;
  sacrificeWindowRemaining: number; // 10.0 seconds upon equipping
  isSacrificeLocked: boolean;
}

export interface InventorySlot {
  itemId: string;
  count: number;
}

export class Player {
  public x: number = 400;
  public y: number = 800;
  public vx: number = 0;
  public vy: number = 0;
  public width: number = 32;
  public height: number = 48;
  public speed: number = 180;
  public isRunning: boolean = false;
  public isAttacking: boolean = false;
  public attackTimer: number = 0;
  public attackCooldown: number = 0;
  public facing: 'left' | 'right' | 'up' | 'down' = 'down';
  public isResting: boolean = false;
  public isClimbing: boolean = false;

  // Vitals
  public vitals: VitalStatus = {
    health: 90,
    stamina: 100,
    hunger: 70,
    thirst: 65,
    bodyTemp: 32, // Wakes up soaked and freezing on beach (GDD Sec. 10.4)
    toxicity: 0
  };

  // Inventory & Reliquary
  public inventory: InventorySlot[] = [];
  public maxInventorySlots: number = 16;
  public reliquary: string[] = []; // Holds inert ephemeral items
  public reliquaryCapacity: number = 2; // GDD Sec. 7.6 (1-2 exclusive spaces)

  // Dedicated Active Ephemeral Artifact Slot
  public activeEphemeral: ActiveEphemeralSlot | null = null;

  // Tribal Abilities System (GDD Sec. 4)
  public unlockedAbilities: Set<string> = new Set();
  public equippedAbilities: string[] = []; // Max 3 (or 4 with legendary artifact)
  public maxEquippedSlots: number = 3;
  public unlockedFourthSkillSlot: boolean = false;
  public canopyStrideActive: boolean = false;

  // Invisibility / Camouflage state
  public invisibilityTimer: number = 0;

  // Tactical Dodge / Roll with i-frames
  public isDashing: boolean = false;
  public dashTimer: number = 0;
  public dashCooldown: number = 0;
  public isInvulnerable: boolean = false;
  public dashVx: number = 0;
  public dashVy: number = 0;
  public dashTrail: { x: number; y: number; alpha: number; facing: string }[] = [];

  constructor() {
    // Initial Prologue Inventory: The Ancestral Rock (GDD Sec. 10.4)
    this.addItem('ancestral_rock', 1);
  }

  public dodge(dirX?: number, dirY?: number): boolean {
    if (this.dashCooldown > 0 || this.isDashing || this.vitals.stamina < 18) {
      return false;
    }

    // Drain stamina
    this.vitals.stamina = Math.max(0, this.vitals.stamina - 18);

    this.isDashing = true;
    this.isInvulnerable = true;
    this.dashTimer = 0.24; // 240ms invulnerability window
    this.dashCooldown = 0.65; // 650ms cooldown before next roll

    let dx = dirX !== undefined && dirX !== 0 ? dirX : this.vx;
    let dy = dirY !== undefined && dirY !== 0 ? dirY : this.vy;

    if (dx === 0 && dy === 0) {
      if (this.facing === 'down') dy = 1;
      else if (this.facing === 'up') dy = -1;
      else if (this.facing === 'left') dx = -1;
      else if (this.facing === 'right') dx = 1;
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    const dashSpeed = this.speed * 2.85;
    this.dashVx = dx * dashSpeed;
    this.dashVy = dy * dashSpeed;

    soundManager.playDodge();
    return true;
  }

  public update(delta: number) {
    // Dodge roll integration
    if (this.isDashing) {
      this.dashTimer -= delta;
      this.x += this.dashVx * delta;
      this.y += this.dashVy * delta;

      // Add trail after-image
      this.dashTrail.push({
        x: this.x,
        y: this.y,
        alpha: 0.6,
        facing: this.facing
      });

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.isInvulnerable = false;
      }
    } else {
      // Normal position integration
      this.x += this.vx * delta;
      this.y += this.vy * delta;
    }

    if (this.dashCooldown > 0) {
      this.dashCooldown -= delta;
    }

    // Decay dash trail after-images
    for (let i = this.dashTrail.length - 1; i >= 0; i--) {
      this.dashTrail[i].alpha -= delta * 3.2;
      if (this.dashTrail[i].alpha <= 0) {
        this.dashTrail.splice(i, 1);
      }
    }

    // Invisibility timer
    if (this.invisibilityTimer > 0) {
      this.invisibilityTimer -= delta;
    }

    // Attack cooldowns
    if (this.attackTimer > 0) {
      this.attackTimer -= delta;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
      }
    }
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    // Ephemeral Item Active Tick (GDD Sec. 7.3 & 7.7)
    if (this.activeEphemeral) {
      // 1. Degradation countdown
      this.activeEphemeral.timeRemaining -= delta;

      // 2. Critical Sacrifice Window Countdown (8-10 seconds anti-exploit)
      if (!this.activeEphemeral.isSacrificeLocked) {
        this.activeEphemeral.sacrificeWindowRemaining -= delta;
        if (this.activeEphemeral.sacrificeWindowRemaining <= 0) {
          this.activeEphemeral.isSacrificeLocked = true;
          this.activeEphemeral.sacrificeWindowRemaining = 0;
          soundManager.playRunicLock(); // Stone lock sound & haptic cue
        }
      }

      // Check if time expired -> item disintegrates
      if (this.activeEphemeral.timeRemaining <= 0) {
        this.disintegrateEphemeralItem();
      }
    }
  }

  // --- Ephemeral Items Management (GDD Sec. 7) ---

  public equipEphemeralItem(itemId: string): boolean {
    const item = ITEMS_CATALOG[itemId] as EphemeralArtifact;
    if (!item || item.category !== 'ephemeral_artifact') return false;

    // If an item is already active and replaced, unequipping destroys the old one (GDD Sec. 7.7)
    if (this.activeEphemeral) {
      this.disintegrateEphemeralItem();
    }

    // Remove from reliquary
    const index = this.reliquary.indexOf(itemId);
    if (index !== -1) {
      this.reliquary.splice(index, 1);
    }

    // Equip into active dedicated slot
    this.activeEphemeral = {
      itemId,
      totalDuration: item.totalDurationSeconds,
      timeRemaining: item.totalDurationSeconds,
      sacrificeWindowRemaining: 10.0, // 10s critical sacrifice window
      isSacrificeLocked: false
    };

    soundManager.playRunicTuning();
    return true;
  }

  public triggerSacrifice(): { success: boolean; effectName: string; description: string } {
    if (!this.activeEphemeral) {
      return { success: false, effectName: '', description: 'No hay objeto especial equipado en la ranura activa.' };
    }
    if (this.activeEphemeral.isSacrificeLocked) {
      return { success: false, effectName: '', description: 'La ventana crítica de sacrificio expiró. El objeto está fijado en modo pasivo.' };
    }

    const item = ITEMS_CATALOG[this.activeEphemeral.itemId] as EphemeralArtifact;
    const effectName = item.sacrificeName;
    const desc = item.sacrificeDesc;

    soundManager.playSacrificeExplosion();

    // Apply immediate sacrifice burst effects (GDD Sec. 7.7)
    if (this.activeEphemeral.itemId === 'spectral_lantern') {
      // Fulguración Espectral: Blind & purge darkness
      this.vitals.toxicity = 0;
    } else if (this.activeEphemeral.itemId === 'frost_thermal_balm') {
      // Onda de Nova Criogénica: Freeze enemies & +50% body heat
      this.vitals.bodyTemp = Math.min(60, this.vitals.bodyTemp + 35);
    } else if (this.activeEphemeral.itemId === 'sulfur_imbued_blade') {
      // Ignición Devastadora: massive damage shockwave
    } else if (this.activeEphemeral.itemId === 'swamp_evasion_talisman') {
      // Cortina de Esporas: 100% invisible for 12 seconds
      this.invisibilityTimer = 12;
    }

    // Consume & destroy item completely
    this.activeEphemeral = null;

    return { success: true, effectName, description: desc };
  }

  public unequipEphemeralItem() {
    // GDD Sec. 7.7: Desequipar un objeto especial una vez colocado en la ranura activa provoca su desintegración inmediata
    if (this.activeEphemeral) {
      this.disintegrateEphemeralItem();
    }
  }

  private disintegrateEphemeralItem() {
    if (!this.activeEphemeral) return;
    this.activeEphemeral = null;
    soundManager.playHit();
  }

  public isEphemeralActive(itemId: string): boolean {
    return this.activeEphemeral !== null && this.activeEphemeral.itemId === itemId && this.activeEphemeral.timeRemaining > 0;
  }

  public addToReliquary(itemId: string): boolean {
    if (this.reliquary.length >= this.reliquaryCapacity) return false;
    this.reliquary.push(itemId);
    return true;
  }

  // --- Tribal Abilities Tuning (GDD Sec. 4) ---

  public unlockAbility(abilityId: string) {
    this.unlockedAbilities.add(abilityId);
    // Auto-equip if free slot
    const maxSlots = this.unlockedFourthSkillSlot ? 4 : this.maxEquippedSlots;
    if (this.equippedAbilities.length < maxSlots && !this.equippedAbilities.includes(abilityId)) {
      this.equippedAbilities.push(abilityId);
    }
    soundManager.playRunicTuning();
  }

  public tuneAbility(abilityId: string, isNearRestPoint: boolean): boolean {
    if (!isNearRestPoint) {
      return false; // GDD Sec. 4: Prohibición de cambio en caliente; solo en fogata o tótem
    }
    if (!this.unlockedAbilities.has(abilityId)) {
      return false;
    }

    const maxSlots = this.unlockedFourthSkillSlot ? 4 : this.maxEquippedSlots;
    const index = this.equippedAbilities.indexOf(abilityId);
    if (index !== -1) {
      // Unequip
      this.equippedAbilities.splice(index, 1);
      if (abilityId === 'canopy_stride') this.canopyStrideActive = false;
      soundManager.playRunicLock();
      return true;
    } else {
      // Equip if space
      if (this.equippedAbilities.length < maxSlots) {
        this.equippedAbilities.push(abilityId);
        soundManager.playRunicTuning();
        return true;
      }
    }
    return false;
  }

  public hasEquippedAbility(abilityId: string): boolean {
    return this.equippedAbilities.includes(abilityId);
  }

  public toggleCanopyStride(): boolean {
    if (!this.hasEquippedAbility('canopy_stride')) return false;
    this.canopyStrideActive = !this.canopyStrideActive;
    soundManager.playForage();
    return this.canopyStrideActive;
  }

  // --- Combat & Movement ---

  public attack(): boolean {
    if (this.attackCooldown > 0 || this.vitals.stamina < 10) return false;

    this.isAttacking = true;
    this.attackTimer = 0.25;
    this.attackCooldown = 0.45;
    this.vitals.stamina = Math.max(0, this.vitals.stamina - 12);

    soundManager.playAttack();
    return true;
  }

  public getMeleeDamage(): number {
    let dmg = 25;
    if (this.isEphemeralActive('sulfur_imbued_blade')) {
      dmg += 35; // Sulfur burn damage
    }
    return dmg;
  }

  // --- Inventory Methods ---

  public addItem(itemId: string, count: number = 1): boolean {
    const item = ITEMS_CATALOG[itemId];
    if (!item) return false;

    if (item.category === 'ephemeral_artifact') {
      return this.addToReliquary(itemId);
    }

    if (item.stackable) {
      const existing = this.inventory.find(slot => slot.itemId === itemId);
      if (existing) {
        existing.count += count;
        return true;
      }
    }

    if (this.inventory.length < this.maxInventorySlots) {
      this.inventory.push({ itemId, count });
      return true;
    }

    return false;
  }

  public removeItem(itemId: string, count: number = 1): boolean {
    const existing = this.inventory.find(slot => slot.itemId === itemId);
    if (!existing || existing.count < count) return false;

    existing.count -= count;
    if (existing.count <= 0) {
      const idx = this.inventory.indexOf(existing);
      this.inventory.splice(idx, 1);
    }
    return true;
  }

  public getItemCount(itemId: string): number {
    const existing = this.inventory.find(slot => slot.itemId === itemId);
    return existing ? existing.count : 0;
  }

  public useItem(itemId: string): boolean {
    const item = ITEMS_CATALOG[itemId];
    if (!item) return false;

    if (itemId === 'berries') {
      this.vitals.hunger = Math.min(100, this.vitals.hunger + 15);
      this.vitals.thirst = Math.min(100, this.vitals.thirst + 8);
      this.removeItem(itemId, 1);
      soundManager.playForage();
      return true;
    } else if (itemId === 'cooked_meat') {
      this.vitals.hunger = Math.min(100, this.vitals.hunger + 40);
      this.vitals.health = Math.min(100, this.vitals.health + 25);
      this.removeItem(itemId, 1);
      soundManager.playForage();
      return true;
    } else if (itemId === 'raw_meat') {
      if (this.hasEquippedAbility('toxin_adaptation')) {
        // Safe to eat raw meat without disease
        this.vitals.hunger = Math.min(100, this.vitals.hunger + 30);
      } else {
        this.vitals.hunger = Math.min(100, this.vitals.hunger + 20);
        this.vitals.toxicity = Math.min(100, this.vitals.toxicity + 30); // Food poisoning
      }
      this.removeItem(itemId, 1);
      soundManager.playForage();
      return true;
    } else if (itemId === 'clean_water') {
      this.vitals.thirst = Math.min(100, this.vitals.thirst + 50);
      this.removeItem(itemId, 1);
      soundManager.playForage();
      return true;
    } else if (itemId === 'herbal_salve') {
      this.vitals.health = Math.min(100, this.vitals.health + 35);
      this.vitals.toxicity = Math.max(0, this.vitals.toxicity - 15);
      this.removeItem(itemId, 1);
      soundManager.playForage();
      return true;
    }

    return false;
  }

  // --- Rendering ---

  public draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();

    // Render Dodge After-Images (Motion Trail)
    for (const trail of this.dashTrail) {
      const trailX = trail.x - cameraX;
      const trailY = trail.y - cameraY;
      ctx.save();
      ctx.globalAlpha = trail.alpha * 0.45;
      ctx.fillStyle = '#d4af37'; // Golden warrior trail
      ctx.beginPath();
      ctx.ellipse(trailX, trailY - 4, 14, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Camouflage / Invisibility alpha or Dodge Invulnerability shimmer
    if (this.invisibilityTimer > 0) {
      ctx.globalAlpha = 0.35;
    } else if (this.isDashing) {
      ctx.globalAlpha = 0.85;
    }

    // Roll rotation / dynamic squash when dashing
    if (this.isDashing) {
      ctx.translate(screenX, screenY - 6);
      const rollAngle = (1 - this.dashTimer / 0.24) * Math.PI * 2;
      ctx.rotate(this.dashVx >= 0 ? rollAngle : -rollAngle);
      ctx.translate(-screenX, -(screenY - 6));
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + this.height / 2 - 2, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (Medieval Explorer Outfit)
    ctx.fillStyle = '#5c4033'; // Leather tunic
    ctx.fillRect(screenX - 12, screenY - 18, 24, 28);

    // Belt & Pouch
    ctx.fillStyle = '#2b1d0c';
    ctx.fillRect(screenX - 13, screenY - 2, 26, 4);

    // Legs
    ctx.fillStyle = '#3a2e2b';
    ctx.fillRect(screenX - 9, screenY + 10, 7, 14);
    ctx.fillRect(screenX + 2, screenY + 10, 7, 14);

    // Head
    ctx.fillStyle = '#e0ac69'; // Skin tone
    ctx.beginPath();
    ctx.arc(screenX, screenY - 26, 10, 0, Math.PI * 2);
    ctx.fill();

    // Hair / Explorer Hood
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(screenX, screenY - 29, 10, Math.PI, Math.PI * 2);
    ctx.fill();

    // Eyes according to direction
    ctx.fillStyle = '#111';
    if (this.facing === 'down') {
      ctx.fillRect(screenX - 4, screenY - 26, 2, 3);
      ctx.fillRect(screenX + 2, screenY - 26, 2, 3);
    } else if (this.facing === 'left') {
      ctx.fillRect(screenX - 8, screenY - 26, 2, 3);
    } else if (this.facing === 'right') {
      ctx.fillRect(screenX + 6, screenY - 26, 2, 3);
    }

    // Weapon / Attack swing animation
    if (this.isAttacking) {
      const isBurning = this.isEphemeralActive('sulfur_imbued_blade');
      ctx.strokeStyle = isBurning ? '#ff5400' : '#d4af37';
      ctx.lineWidth = isBurning ? 5 : 3;
      ctx.beginPath();
      let angle = 0;
      if (this.facing === 'right') angle = 0;
      else if (this.facing === 'left') angle = Math.PI;
      else if (this.facing === 'up') angle = -Math.PI / 2;
      else if (this.facing === 'down') angle = Math.PI / 2;

      ctx.arc(screenX, screenY - 6, 34, angle - 0.7, angle + 0.7);
      ctx.stroke();

      if (isBurning) {
        ctx.fillStyle = '#ffbe0b';
        ctx.beginPath();
        ctx.arc(screenX + Math.cos(angle) * 32, screenY - 6 + Math.sin(angle) * 32, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Glowing Runic Aura around character if ephemeral item active
    if (this.activeEphemeral) {
      ctx.strokeStyle = this.activeEphemeral.isSacrificeLocked ? 'rgba(218, 165, 32, 0.4)' : 'rgba(255, 30, 80, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY - 6, 26 + Math.sin(Date.now() * 0.008) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
