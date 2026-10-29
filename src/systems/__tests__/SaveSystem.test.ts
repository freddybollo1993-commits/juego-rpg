import { describe, it, expect, beforeEach } from 'vitest';
import { SaveSystem } from '../SaveSystem';

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

const sample = {
  regionId: 'forest',
  player: { gx: 31, gy: 40, facing: 'left' },
  turn: 57,
  timeOfDay: 19.25,
  day: 3
};

describe('SaveSystem', () => {
  beforeEach(() => localStorage.clear());

  it('guarda y carga la partida completa', () => {
    expect(SaveSystem.save(sample)).toBe(true);
    const loaded = SaveSystem.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.regionId).toBe('forest');
    expect(loaded!.player).toEqual(sample.player);
    expect(loaded!.turn).toBe(57);
    expect(loaded!.timeOfDay).toBeCloseTo(19.25);
    expect(loaded!.day).toBe(3);
  });

  it('devuelve null si no hay partida o esta danada', () => {
    expect(SaveSystem.load()).toBeNull();
    localStorage.setItem('juego_rpg_save_v2', 'esto no es una partida valida');
    expect(SaveSystem.load()).toBeNull();
  });

  it('descarta la partida del formato viejo y la borra al guardar', () => {
    localStorage.setItem('juego_rpg_medieval_save_v1', '{"version":1}');
    expect(SaveSystem.load()).toBeNull();
    SaveSystem.save(sample);
    expect(localStorage.getItem('juego_rpg_medieval_save_v1')).toBeNull();
  });

  it('clearSave borra la partida', () => {
    SaveSystem.save(sample);
    SaveSystem.clearSave();
    expect(SaveSystem.load()).toBeNull();
  });
});
