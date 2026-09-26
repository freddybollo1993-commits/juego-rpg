// QuestSystem.ts - Quest Log, Dynamic Objectives, Progression Tracking and HUD Notifications (GDD Sec. 1-10)

export interface QuestObjective {
  id: string;
  description: string;
  current: number;
  target: number;
  isCompleted: boolean;
}

export interface Quest {
  id: string;
  title: string;
  category: 'main' | 'tribal' | 'survival';
  description: string;
  regionId: string;
  objectives: QuestObjective[];
  isCompleted: boolean;
  rewardDescription: string;
}

export const INITIAL_QUESTS: Quest[] = [
  {
    id: 'prologue_survival',
    title: 'Prólogo: Supervivencia en la Costa',
    category: 'main',
    description: 'Has despertado en la Costa Olvidada tras el naufragio de La Tempestad de Oro. La hipotermia amenaza tu vida. Reúne leña, enciende una fogata y descifra la Roca Ancestral.',
    regionId: 'beach',
    rewardDescription: 'Paso libre hacia la Meseta Helada de la Escarcha y supervivencia asegurada.',
    isCompleted: false,
    objectives: [
      {
        id: 'gather_branches',
        description: 'Recolectar ramas secas en la playa',
        current: 0,
        target: 3,
        isCompleted: false
      },
      {
        id: 'light_campfire',
        description: 'Construir o encender una fogata para entrar en calor',
        current: 0,
        target: 1,
        isCompleted: false
      },
      {
        id: 'examine_monolith',
        description: 'Inspeccionar el altar de la Roca Ancestral',
        current: 0,
        target: 1,
        isCompleted: false
      }
    ]
  },
  {
    id: 'tribal_initiation',
    title: 'Alianzas y Afinidades Tribales',
    category: 'tribal',
    description: 'Viaja a través de los chokepoints hacia los bastiones tribales. Demuestra tu valía completando sus pruebas y sintoniza runas en tu códice.',
    regionId: 'frost',
    rewardDescription: 'Habilidades activas tribales y capacidad de manipular artefactos efímeros.',
    isCompleted: false,
    objectives: [
      {
        id: 'complete_trial',
        description: 'Completar una prueba de iniciación tribal (abastecimiento o caza)',
        current: 0,
        target: 1,
        isCompleted: false
      },
      {
        id: 'attune_rune',
        description: 'Sintonizar una runa de afinidad en una fogata',
        current: 0,
        target: 1,
        isCompleted: false
      },
      {
        id: 'obtain_ephemeral',
        description: 'Almacenar un artefacto efímero inerte en tu relicario',
        current: 0,
        target: 1,
        isCompleted: false
      }
    ]
  },
  {
    id: 'celestial_reckoning',
    title: 'El Heraldo y el Núcleo del Impacto',
    category: 'main',
    description: 'La invasión alienígena está terraformando el planeta. Encuentra el traductor en el Abismo Subterráneo, traspasa la barrera del Núcleo y derrota al coloso.',
    regionId: 'alien_core',
    rewardDescription: 'Elección del destino final: Desmantelar la nave o Integrar la biotecnología.',
    isCompleted: false,
    objectives: [
      {
        id: 'get_translator',
        description: 'Conseguir el Dispositivo de Traducción en el Abismo',
        current: 0,
        target: 1,
        isCompleted: false
      },
      {
        id: 'enter_core',
        description: 'Traspasar la barrera al Núcleo del Impacto',
        current: 0,
        target: 1,
        isCompleted: false
      },
      {
        id: 'defeat_herald',
        description: 'Derrotar al Heraldo de las Estrellas mediante Sacrificio Efímero',
        current: 0,
        target: 1,
        isCompleted: false
      }
    ]
  }
];

export class QuestSystem {
  public quests: Quest[] = [];
  public activeQuestId: string = 'prologue_survival';
  public onQuestUpdated?: (quest: Quest, completedObjective?: QuestObjective) => void;

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults() {
    this.quests = JSON.parse(JSON.stringify(INITIAL_QUESTS));
    this.activeQuestId = 'prologue_survival';
  }

  public getActiveQuest(): Quest | null {
    const active = this.quests.find(q => q.id === this.activeQuestId && !q.isCompleted);
    if (active) return active;
    return this.quests.find(q => !q.isCompleted) || null;
  }

  public updateObjective(questId: string, objectiveId: string, amount: number = 1, isAbsolute: boolean = false): boolean {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest || quest.isCompleted) return false;

    const obj = quest.objectives.find(o => o.id === objectiveId);
    if (!obj || obj.isCompleted) return false;

    if (isAbsolute) {
      obj.current = Math.min(obj.target, amount);
    } else {
      obj.current = Math.min(obj.target, obj.current + amount);
    }

    if (obj.current >= obj.target) {
      obj.isCompleted = true;
    }

    // Check if whole quest is completed
    const allDone = quest.objectives.every(o => o.isCompleted);
    if (allDone && !quest.isCompleted) {
      quest.isCompleted = true;
      // Advance active quest to next uncompleted
      const nextUncompleted = this.quests.find(q => !q.isCompleted);
      if (nextUncompleted) {
        this.activeQuestId = nextUncompleted.id;
      }
    }

    if (this.onQuestUpdated) {
      this.onQuestUpdated(quest, obj);
    }

    return true;
  }

  public serialize(): { quests: Quest[]; activeQuestId: string } {
    return {
      quests: this.quests,
      activeQuestId: this.activeQuestId
    };
  }

  public deserialize(data: { quests?: Quest[]; activeQuestId?: string }) {
    if (data && data.quests && Array.isArray(data.quests)) {
      this.quests = data.quests;
      if (data.activeQuestId) {
        this.activeQuestId = data.activeQuestId;
      }
    }
  }
}

export const questSystem = new QuestSystem();
