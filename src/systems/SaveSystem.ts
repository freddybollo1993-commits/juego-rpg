// SaveSystem.ts - Pick-and-Play LocalStorage Persistence (GDD Sec. 8.5)

import { Player } from '../entities/Player';
import { TRIBES_DATA } from '../data/tribes';

export interface GameSaveData {
  version: number;
  timestamp: number;
  currentRegionId: string;
  player: {
    x: number;
    y: number;
    facing: string;
    vitals: {
      health: number;
      stamina: number;
      hunger: number;
      thirst: number;
      bodyTemp: number;
      toxicity: number;
    };
    inventory: { itemId: string; count: number }[];
    reliquary: string[];
    activeEphemeral: {
      itemId: string;
      totalDuration: number;
      timeRemaining: number;
      sacrificeWindowRemaining: number;
      isSacrificeLocked: boolean;
    } | null;
    unlockedAbilities: string[];
    equippedAbilities: string[];
    unlockedFourthSkillSlot: boolean;
  };
  tribes: Record<string, {
    reputation: number;
    trialCurrent: number;
    trialCompleted: boolean;
    tributeDelivered: boolean;
    resonatorDelivered: boolean;
  }>;
  bossDefeated: boolean;
}

const SAVE_KEY = 'juego_rpg_medieval_save_v1';

export class SaveSystem {
  public static save(player: Player, currentRegionId: string, bossDefeated: boolean = false): boolean {
    try {
      const tribesState: GameSaveData['tribes'] = {};
      for (const [id, tribe] of Object.entries(TRIBES_DATA)) {
        tribesState[id] = {
          reputation: tribe.reputation,
          trialCurrent: tribe.trial.currentCount,
          trialCompleted: tribe.trial.completed,
          tributeDelivered: tribe.tributeDelivered,
          resonatorDelivered: tribe.resonatorDelivered
        };
      }

      const saveData: GameSaveData = {
        version: 1,
        timestamp: Date.now(),
        currentRegionId,
        player: {
          x: player.x,
          y: player.y,
          facing: player.facing,
          vitals: { ...player.vitals },
          inventory: player.inventory.map(s => ({ ...s })),
          reliquary: [...player.reliquary],
          activeEphemeral: player.activeEphemeral ? { ...player.activeEphemeral } : null,
          unlockedAbilities: Array.from(player.unlockedAbilities),
          equippedAbilities: [...player.equippedAbilities],
          unlockedFourthSkillSlot: player.unlockedFourthSkillSlot
        },
        tribes: tribesState,
        bossDefeated
      };

      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      return true;
    } catch {
      return false;
    }
  }

  public static load(): GameSaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as GameSaveData;
    } catch {
      return null;
    }
  }

  public static clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }
}
