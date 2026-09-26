import { Player } from '../entities/Player';
import { TRIBES_DATA } from '../data/tribes';
import { questSystem, Quest } from './QuestSystem';
import LZString from 'lz-string';

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
  quests?: {
    quests: Quest[];
    activeQuestId: string;
  };
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
        bossDefeated,
        quests: questSystem.serialize()
      };

      const jsonStr = JSON.stringify(saveData);
      const compressed = LZString.compressToUTF16(jsonStr);
      localStorage.setItem(SAVE_KEY, compressed);
      return true;
    } catch {
      return false;
    }
  }

  public static load(): GameSaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const trimmed = raw.trim();
      let data: GameSaveData | null = null;
      if (trimmed.startsWith('{')) {
        data = JSON.parse(trimmed) as GameSaveData;
      } else {
        const decompressed = LZString.decompressFromUTF16(raw);
        if (!decompressed) return null;
        data = JSON.parse(decompressed) as GameSaveData;
      }
      if (data && data.quests) {
        questSystem.deserialize(data.quests);
      }
      return data;
    } catch {
      return null;
    }
  }

  public static exportSaveCode(): string | null {
    try {
      const data = this.load();
      if (!data) return null;
      return LZString.compressToBase64(JSON.stringify(data));
    } catch {
      return null;
    }
  }

  public static importSaveCode(code: string): boolean {
    try {
      const decompressed = LZString.decompressFromBase64(code.trim());
      if (!decompressed) return false;
      const parsed = JSON.parse(decompressed) as GameSaveData;
      if (!parsed || !parsed.player || !parsed.player.vitals) return false;
      const compressed = LZString.compressToUTF16(decompressed);
      localStorage.setItem(SAVE_KEY, compressed);
      return true;
    } catch {
      return false;
    }
  }

  public static clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }
}
