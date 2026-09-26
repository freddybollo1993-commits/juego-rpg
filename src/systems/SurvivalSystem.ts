// SurvivalSystem.ts - Survival Loop, Vital Parameters & Environmental Hazard Processing (GDD Sec. 1, 5, 8.5)

import { Player } from '../entities/Player';
import { RegionData } from '../data/regions';
import { soundManager } from '../audio/SoundManager';

export interface VitalStatus {
  health: number;      // 0 - 100
  stamina: number;     // 0 - 100
  hunger: number;      // 0 - 100
  thirst: number;      // 0 - 100
  bodyTemp: number;    // 0 - 100 (50 is optimal, <30 freezing, >70 overheating)
  toxicity: number;    // 0 - 100
}

export class SurvivalSystem {
  private lastTick: number = 0;
  private frostHeartEmergencyActive: boolean = false;
  private frostHeartEmergencyTimer: number = 0;

  constructor() {
    this.lastTick = Date.now();
  }

  public update(player: Player, currentRegion: RegionData, isNearCampfire: boolean, isResting: boolean, deltaSeconds: number) {
    const vitals = player.vitals;

    // --- 1. Natural Decay / Regeneration ---
    // Hunger drain
    const hungerDrainBase = isResting ? 0.2 : 0.5;
    vitals.hunger = Math.max(0, vitals.hunger - hungerDrainBase * deltaSeconds);

    // Thirst drain (accelerated in canyon or extreme heat)
    let thirstDrain = isResting ? 0.3 : 0.8;
    thirstDrain *= currentRegion.hazards.waterDrainMult;
    if (vitals.bodyTemp > 70) thirstDrain *= 1.8;

    // Camelid Resistance tribal passive (-50% hydration loss)
    if (player.hasEquippedAbility('camelid_resistance')) {
      thirstDrain *= 0.5;
    }
    vitals.thirst = Math.max(0, vitals.thirst - thirstDrain * deltaSeconds);

    // --- 2. Stamina System ---
    let staminaRegen = isResting ? 25 : 12;
    if (player.hasEquippedAbility('camelid_resistance') && vitals.bodyTemp > 60) {
      // Regenerate stamina continuously even in scorching heat
      staminaRegen += 6;
    }
    if (vitals.thirst <= 10 || vitals.hunger <= 10) {
      staminaRegen *= 0.4; // Starvation/dehydration fatigue
    }
    vitals.stamina = Math.min(100, vitals.stamina + staminaRegen * deltaSeconds);

    // --- 3. Body Temperature Dynamics ---
    if (isNearCampfire) {
      // Near campfire: rapid restoration toward 50°C
      if (vitals.bodyTemp < 50) {
        vitals.bodyTemp = Math.min(50, vitals.bodyTemp + 10 * deltaSeconds);
      } else if (vitals.bodyTemp > 65) {
        vitals.bodyTemp = Math.max(50, vitals.bodyTemp - 4 * deltaSeconds);
      }
    } else {
      // Cold hazard
      let coldRate = currentRegion.hazards.coldRate;
      if (player.isEphemeralActive('frost_thermal_balm')) {
        // Absolute immunity to cold
        coldRate = 0;
      } else if (player.hasEquippedAbility('frost_heart')) {
        // Frost Heart passive: -40% cold buildup
        coldRate *= 0.6;
      }
      if (coldRate > 0) {
        vitals.bodyTemp = Math.max(0, vitals.bodyTemp - coldRate * deltaSeconds);
      }

      // Heat hazard
      let heatRate = currentRegion.hazards.heatRate;
      if (heatRate > 0) {
        vitals.bodyTemp = Math.min(100, vitals.bodyTemp + heatRate * deltaSeconds);
      } else if (currentRegion.hazards.coldRate === 0 && vitals.bodyTemp > 50) {
        // Slowly normalize heat in temperate areas
        vitals.bodyTemp = Math.max(50, vitals.bodyTemp - 1.5 * deltaSeconds);
      }
    }

    // --- 4. Frost Heart Emergency Survival Passive (GDD Sec. 3) ---
    // If HP drops below 25% during a blizzard, prevents hypothermia for 90s
    if (player.hasEquippedAbility('frost_heart') && currentRegion.weatherType === 'blizzard') {
      if (vitals.health <= 25 && !this.frostHeartEmergencyActive && this.frostHeartEmergencyTimer <= 0) {
        this.frostHeartEmergencyActive = true;
        this.frostHeartEmergencyTimer = 90; // 90 seconds
        soundManager.playRunicTuning();
      }
    }

    if (this.frostHeartEmergencyActive) {
      this.frostHeartEmergencyTimer -= deltaSeconds;
      // Safeguard temperature from dropping below safe threshold
      vitals.bodyTemp = Math.max(35, vitals.bodyTemp);
      if (this.frostHeartEmergencyTimer <= 0) {
        this.frostHeartEmergencyActive = false;
        this.frostHeartEmergencyTimer = -180; // 3 min internal cooldown
      }
    } else if (this.frostHeartEmergencyTimer < 0) {
      this.frostHeartEmergencyTimer += deltaSeconds;
    }

    // Shivering Calorie Drain when freezing
    if (vitals.bodyTemp < 30 && !player.isEphemeralActive('frost_thermal_balm')) {
      vitals.hunger = Math.max(0, vitals.hunger - 1.2 * deltaSeconds); // Extra calorie drain from shivering
    }

    // --- 5. Toxicity & Poison ---
    let toxicRate = currentRegion.hazards.toxicRate;
    if (player.hasEquippedAbility('toxin_adaptation')) {
      // 100% immunity to environmental poison & leeches
      toxicRate = 0;
      // In fact, slowly purges toxicity
      vitals.toxicity = Math.max(0, vitals.toxicity - 3 * deltaSeconds);
    } else if (isNearCampfire) {
      vitals.toxicity = Math.max(0, vitals.toxicity - 1.5 * deltaSeconds);
    }

    if (toxicRate > 0) {
      vitals.toxicity = Math.min(100, vitals.toxicity + toxicRate * deltaSeconds);
    }

    // --- 6. Health Consequences ---
    let healthDelta = 0;

    // Healing from full nourishment & warmth
    if (vitals.hunger > 70 && vitals.thirst > 70 && vitals.bodyTemp >= 40 && vitals.bodyTemp <= 60 && vitals.toxicity < 15) {
      healthDelta += 2.0 * deltaSeconds;
    }
    if (isNearCampfire && isResting) {
      healthDelta += 5.0 * deltaSeconds;
    }

    // Damage from Hypothermia (<25 bodyTemp)
    if (vitals.bodyTemp < 25 && !this.frostHeartEmergencyActive) {
      healthDelta -= 3.5 * deltaSeconds;
    }

    // Damage from Hyperthermia (>80 bodyTemp)
    if (vitals.bodyTemp > 80) {
      healthDelta -= 3.0 * deltaSeconds;
    }

    // Damage from Starvation (hunger == 0)
    if (vitals.hunger <= 0) {
      healthDelta -= 2.0 * deltaSeconds;
    }

    // Damage from Severe Dehydration (thirst == 0)
    if (vitals.thirst <= 0) {
      healthDelta -= 3.0 * deltaSeconds;
    }

    // Damage from Toxic Poisoning (>50 toxicity)
    if (vitals.toxicity > 50) {
      healthDelta -= (vitals.toxicity / 20) * deltaSeconds;
    }

    vitals.health = Math.min(100, Math.max(0, vitals.health + healthDelta));
  }

  public getFrostHeartActiveRemaining(): number {
    return this.frostHeartEmergencyActive ? Math.ceil(this.frostHeartEmergencyTimer) : 0;
  }
}
