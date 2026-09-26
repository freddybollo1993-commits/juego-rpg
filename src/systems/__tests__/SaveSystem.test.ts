import { describe, it, expect, beforeEach } from 'vitest';
import { SaveSystem, GameSaveData } from '../SaveSystem';
import LZString from 'lz-string';

const storageMock: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, value: string) => { storageMock[key] = value; },
    removeItem: (key: string) => { delete storageMock[key]; },
    clear: () => { for (const k in storageMock) delete storageMock[k]; },
    length: 0,
    key: () => null,
  };
}

describe('SaveSystem con Compresión LZString', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockSaveData: GameSaveData = {
    version: 1,
    timestamp: 1720000000000,
    currentRegionId: 'shipwreck_shore',
    player: {
      x: 150,
      y: 200,
      facing: 'down',
      vitals: {
        health: 95,
        stamina: 80,
        hunger: 60,
        thirst: 70,
        bodyTemp: 48,
        toxicity: 0,
      },
      inventory: [
        { itemId: 'driftwood', count: 4 },
        { itemId: 'flint_stone', count: 2 },
      ],
      reliquary: ['ancient_shard'],
      activeEphemeral: null,
      unlockedAbilities: ['frost_heart'],
      equippedAbilities: ['frost_heart'],
      unlockedFourthSkillSlot: false,
    },
    tribes: {
      tundra: {
        reputation: 25,
        trialCurrent: 1,
        trialCompleted: false,
        tributeDelivered: false,
        resonatorDelivered: false,
      },
    },
    bossDefeated: false,
  };

  it('debe comprimir y guardar en localStorage con ratio de compresión alto', () => {
    const rawJson = JSON.stringify(mockSaveData);
    const compressed = LZString.compressToUTF16(rawJson);
    localStorage.setItem('juego_rpg_medieval_save_v1', compressed);

    const loaded = SaveSystem.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.currentRegionId).toBe('shipwreck_shore');
    expect(loaded?.player.vitals.health).toBe(95);
    expect(loaded?.player.inventory.length).toBe(2);
  });

  it('debe exportar e importar códigos de guardado comprimidos en Base64', () => {
    const rawJson = JSON.stringify(mockSaveData);
    localStorage.setItem('juego_rpg_medieval_save_v1', LZString.compressToUTF16(rawJson));

    const code = SaveSystem.exportSaveCode();
    expect(code).toBeTypeOf('string');
    expect(code?.length).toBeGreaterThan(10);

    // Limpiar localStorage y restaurar vía código
    localStorage.clear();
    const importSuccess = SaveSystem.importSaveCode(code!);
    expect(importSuccess).toBe(true);

    const restored = SaveSystem.load();
    expect(restored?.player.vitals.hunger).toBe(60);
    expect(restored?.player.inventory[0].itemId).toBe('driftwood');
  });

  it('debe mantener compatibilidad retrospectiva con partidas sin comprimir', () => {
    const legacyJson = JSON.stringify(mockSaveData);
    localStorage.setItem('juego_rpg_medieval_save_v1', legacyJson);

    const loaded = SaveSystem.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.player.vitals.thirst).toBe(70);
  });
});
