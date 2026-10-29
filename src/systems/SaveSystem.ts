// SaveSystem.ts - Guardado local comprimido. Solo guarda el estado minimo del mundo base:
// bioma, posicion del jugador, turno y reloj. (Mas adelante: mapas visitados, inventario...)

import LZString from 'lz-string';

export interface GameSaveData {
  version: number;
  timestamp: number;
  regionId: string;
  player: { gx: number; gy: number; facing: string };
  turn: number;
  timeOfDay: number;
  day: number;
}

const SAVE_VERSION = 2;
const SAVE_KEY = 'juego_rpg_save_v2';
const LEGACY_SAVE_KEY = 'juego_rpg_medieval_save_v1';

export class SaveSystem {
  public static save(data: Omit<GameSaveData, 'version' | 'timestamp'>): boolean {
    try {
      const payload: GameSaveData = { version: SAVE_VERSION, timestamp: Date.now(), ...data };
      localStorage.setItem(SAVE_KEY, LZString.compressToUTF16(JSON.stringify(payload)));
      localStorage.removeItem(LEGACY_SAVE_KEY); // la partida del formato viejo ya no sirve
      return true;
    } catch {
      return false;
    }
  }

  public static load(): GameSaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const json = LZString.decompressFromUTF16(raw);
      if (!json) return null;
      const data = JSON.parse(json) as GameSaveData;
      if (data.version !== SAVE_VERSION || !data.player) return null;
      return data;
    } catch {
      return null;
    }
  }

  public static clearSave() {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(LEGACY_SAVE_KEY);
  }
}
