// TalentSystem.ts - Character Progression, XP, Leveling & Tribal Mastery Tree (Fase 3.1)

export type TalentPath = 'hunter' | 'warrior' | 'shaman';

export interface TalentNode {
  id: string;
  name: string;
  path: TalentPath;
  tier: 1 | 2 | 3;
  icon: string;
  description: string;
  maxRank: number;
  currentRank: number;
  prerequisiteId?: string;
}

export class TalentSystem {
  public talents: Map<string, TalentNode> = new Map();

  constructor() {
    this.initTalents();
  }

  private initTalents() {
    const list: TalentNode[] = [
      // --- Senda del Cazador de la Tundra (Arco & Distancia) ---
      {
        id: 'hunter_archery',
        name: 'Ojo de Halcón',
        path: 'hunter',
        tier: 1,
        icon: '🎯',
        description: 'Aumenta el daño de todas las flechas en un +25% y la velocidad de vuelo un +15%.',
        maxRank: 1,
        currentRank: 0
      },
      {
        id: 'hunter_retrieval',
        name: 'Reciclaje Furtivo',
        path: 'hunter',
        tier: 2,
        icon: '🏹',
        description: '35% de probabilidad de recuperar la flecha disparada intacta en el inventario al impactar.',
        maxRank: 1,
        currentRank: 0,
        prerequisiteId: 'hunter_archery'
      },
      {
        id: 'hunter_crit',
        name: 'Flecha Certera Letal',
        path: 'hunter',
        tier: 3,
        icon: '💥',
        description: '25% de probabilidad de asestar un Golpe Crítico (daño x2) con cualquier flecha.',
        maxRank: 1,
        currentRank: 0,
        prerequisiteId: 'hunter_retrieval'
      },

      // --- Senda del Guerrero de las Cenizas (Cuerpo a Cuerpo & Esquiva) ---
      {
        id: 'warrior_strike',
        name: 'Golpe Primordial',
        path: 'warrior',
        tier: 1,
        icon: '⚔️',
        description: 'Aumenta el daño cuerpo a cuerpo en +15 pts y la vida máxima del personaje en +20.',
        maxRank: 1,
        currentRank: 0
      },
      {
        id: 'warrior_resilience',
        name: 'Pulmón de Fuego',
        path: 'warrior',
        tier: 2,
        icon: '🫁',
        description: 'Reduce el consumo de estamina al rodar y atacar en un 25%.',
        maxRank: 1,
        currentRank: 0,
        prerequisiteId: 'warrior_strike'
      },
      {
        id: 'warrior_perfect_dodge',
        name: 'Esquiva Perfecta (Bullet-Time)',
        path: 'warrior',
        tier: 3,
        icon: '⚡',
        description: 'Si esquivas en el último instante antes de un ataque enemigo, el tiempo se ralentiza 1.2s y regeneras +30 de estamina al instante.',
        maxRank: 1,
        currentRank: 0,
        prerequisiteId: 'warrior_resilience'
      },

      // --- Senda del Chamán del Pantano (Alquimia, Clima & Reliquias) ---
      {
        id: 'shaman_acclimation',
        name: 'Armonía con los Elementos',
        path: 'shaman',
        tier: 1,
        icon: '🌿',
        description: 'Reduce a la mitad la pérdida de temperatura corporal en la noche/glaciar y el desgaste de hambre y sed.',
        maxRank: 1,
        currentRank: 0
      },
      {
        id: 'shaman_alchemy',
        name: 'Maestría Alquímica',
        path: 'shaman',
        tier: 2,
        icon: '🧪',
        description: 'Los alimentos y ungüentos curan un +50% más de vida y el antídoto neutraliza toxinas al doble de velocidad.',
        maxRank: 1,
        currentRank: 0,
        prerequisiteId: 'shaman_acclimation'
      },
      {
        id: 'shaman_artifact_attunement',
        name: 'Comunión de Reliquias',
        path: 'shaman',
        tier: 3,
        icon: '✨',
        description: 'Aumenta la duración de todos los artefactos efímeros un +50% y amplía la ventana de sacrificio carmesí a 15 segundos.',
        maxRank: 1,
        currentRank: 0,
        prerequisiteId: 'shaman_alchemy'
      }
    ];

    for (const item of list) {
      this.talents.set(item.id, item);
    }
  }

  public getTalent(id: string): TalentNode | undefined {
    return this.talents.get(id);
  }

  public getTalentRank(id: string): number {
    return this.talents.get(id)?.currentRank || 0;
  }

  public hasTalent(id: string): boolean {
    return this.getTalentRank(id) > 0;
  }

  public canUnlock(id: string, availablePoints: number): boolean {
    if (availablePoints <= 0) return false;
    const node = this.talents.get(id);
    if (!node || node.currentRank >= node.maxRank) return false;

    if (node.prerequisiteId) {
      const prereq = this.talents.get(node.prerequisiteId);
      if (!prereq || prereq.currentRank < prereq.maxRank) return false;
    }
    return true;
  }

  public unlockTalent(id: string, availablePoints: number): boolean {
    if (!this.canUnlock(id, availablePoints)) return false;
    const node = this.talents.get(id)!;
    node.currentRank++;
    return true;
  }

  public getArcheryDamageMultiplier(): number {
    return this.hasTalent('hunter_archery') ? 1.25 : 1.0;
  }

  public getArrowSpeedMultiplier(): number {
    return this.hasTalent('hunter_archery') ? 1.15 : 1.0;
  }

  public getArrowRetrievalChance(): number {
    return this.hasTalent('hunter_retrieval') ? 0.35 : 0.0;
  }

  public getBowCritChance(): number {
    return this.hasTalent('hunter_crit') ? 0.25 : 0.0;
  }

  public getMeleeDamageBonus(): number {
    return this.hasTalent('warrior_strike') ? 15 : 0;
  }

  public getMaxHealthBonus(): number {
    return this.hasTalent('warrior_strike') ? 20 : 0;
  }

  public getStaminaCostReduction(): number {
    return this.hasTalent('warrior_resilience') ? 0.25 : 0.0;
  }

  public hasPerfectDodge(): boolean {
    return this.hasTalent('warrior_perfect_dodge');
  }

  public getWeatherResistanceMultiplier(): number {
    return this.hasTalent('shaman_acclimation') ? 0.5 : 1.0;
  }

  public getConsumableEffectivenessMultiplier(): number {
    return this.hasTalent('shaman_alchemy') ? 1.5 : 1.0;
  }

  public getEphemeralDurationMultiplier(): number {
    return this.hasTalent('shaman_artifact_attunement') ? 1.5 : 1.0;
  }

  public toJSON(): Record<string, number> {
    const data: Record<string, number> = {};
    for (const [id, node] of this.talents.entries()) {
      if (node.currentRank > 0) {
        data[id] = node.currentRank;
      }
    }
    return data;
  }

  public loadFromJSON(data: Record<string, number>) {
    if (!data) return;
    for (const [id, rank] of Object.entries(data)) {
      const node = this.talents.get(id);
      if (node) {
        node.currentRank = Math.min(node.maxRank, rank);
      }
    }
  }
}
