// items.ts - Item catalog, exotic materials, survival supplies, and Ephemeral Artifacts (GDD Sec. 7 & 10)

export type ItemCategory = 'resource' | 'survival' | 'exotic_material' | 'ephemeral_artifact' | 'key_relic';

export interface BaseItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  icon: string;
  stackable: boolean;
  maxStack?: number;
}

export interface EphemeralArtifact extends BaseItem {
  category: 'ephemeral_artifact';
  totalDurationSeconds: number; // e.g. 25 * 60 = 1500s
  recipe: {
    material1Id: string;
    material1Name: string;
    material2Id: string;
    material2Name: string;
  };
  passiveEffectDesc: string;
  sacrificeName: string;
  sacrificeDesc: string;
}

export const ITEMS_CATALOG: Record<string, BaseItem | EphemeralArtifact> = {
  // --- Relics & Prologue ---
  ancestral_rock: {
    id: 'ancestral_rock',
    name: 'Roca Ancestral con Relieves',
    description: 'Reliquia familiar custodiada por generaciones. Sus inscripciones resuenan con vibraciones electromagnéticas desconocidas.',
    category: 'key_relic',
    icon: '🗿',
    stackable: false
  },
  alien_translator_device: {
    id: 'alien_translator_device',
    name: 'Dispositivo de Traducción y Enlace',
    description: 'Artefacto bio-tecnológico forjado con los 5 resonadores tribales. Descifra señales alienígenas y disipa el escudo del coloso.',
    category: 'key_relic',
    icon: '🔮',
    stackable: false
  },

  // --- Basic Survival Resources ---
  branches: {
    id: 'branches',
    name: 'Ramas y Leña Seca',
    description: 'Madera recolectada para encender fogatas de supervivencia y calentarse.',
    category: 'resource',
    icon: '🪵',
    stackable: true,
    maxStack: 20
  },
  flint: {
    id: 'flint',
    name: 'Pedernal y Yesca',
    description: 'Piedras para generar chispas e iniciar fuegos rápidamente.',
    category: 'resource',
    icon: '🪨',
    stackable: true,
    maxStack: 10
  },
  berries: {
    id: 'berries',
    name: 'Bayas Silvestres',
    description: 'Frutos comestibles recogidos de arbustos. Recupera un poco de hambre e hidratación.',
    category: 'survival',
    icon: '🫐',
    stackable: true,
    maxStack: 20
  },
  raw_meat: {
    id: 'raw_meat',
    name: 'Carne Cruda',
    description: 'Carne fresca de presa cazada. Peligro de infección estomacal salvo con Adaptación a Toxinas.',
    category: 'survival',
    icon: '🥩',
    stackable: true,
    maxStack: 10
  },
  cooked_meat: {
    id: 'cooked_meat',
    name: 'Carne Asada en Fogata',
    description: 'Nutritiva y caliente. Restaura 40 de Hambre y recupera 25 de Salud.',
    category: 'survival',
    icon: '🍖',
    stackable: true,
    maxStack: 10
  },
  clean_water: {
    id: 'clean_water',
    name: 'Pellejo de Agua Fresca',
    description: 'Agua pura sin parásitos. Restaura 50 de Hidratación.',
    category: 'survival',
    icon: '💧',
    stackable: true,
    maxStack: 5
  },
  herbal_salve: {
    id: 'herbal_salve',
    name: 'Ungüento Herbal Curativo',
    description: 'Cataplasma de plantas medicinales. Restaura 35 de Salud y calma heridas.',
    category: 'survival',
    icon: '🌿',
    stackable: true,
    maxStack: 5
  },
  campfire_kit: {
    id: 'campfire_kit',
    name: 'Fogata de Supervivencia',
    description: 'Punto de descanso imprescindible para calentarse, cocinar alimentos y sintonizar habilidades tribales.',
    category: 'survival',
    icon: '🔥',
    stackable: true,
    maxStack: 5
  },

  // --- Exotic Materials (Sec. 7.2) ---
  eternal_frost_flower: {
    id: 'eternal_frost_flower',
    name: 'Flor de Escarcha Eterna',
    description: 'Flor cristalizada en cumbres heladas. No se derrite ni ante el fuego común.',
    category: 'exotic_material',
    icon: '🪻',
    stackable: true,
    maxStack: 10
  },
  fossil_ice: {
    id: 'fossil_ice',
    name: 'Hielo Fósil de la Alta Cumbre',
    description: 'Bloque de hielo milenario extraído de glaciares profundos.',
    category: 'exotic_material',
    icon: '🧊',
    stackable: true,
    maxStack: 10
  },
  ancient_resin: {
    id: 'ancient_resin',
    name: 'Resina de Árbol Milenario',
    description: 'Savia ámbar destilada por coníferas ancestrales custodiadas por depredadores.',
    category: 'exotic_material',
    icon: '🍯',
    stackable: true,
    maxStack: 10
  },
  alpha_fur: {
    id: 'alpha_fur',
    name: 'Pelaje de Depredador Alfa',
    description: 'Piel densa obtenida de los lobos alfa que acechan en la taiga.',
    category: 'exotic_material',
    icon: '🐺',
    stackable: true,
    maxStack: 10
  },
  abyssal_gland: {
    id: 'abyssal_gland',
    name: 'Glándula de Anfibio Abisal',
    description: 'Órgano que segrega fluidos neutralizadores en el fango ponzoñoso.',
    category: 'exotic_material',
    icon: '🫀',
    stackable: true,
    maxStack: 10
  },
  phosphor_mud: {
    id: 'phosphor_mud',
    name: 'Fango Fosforescente',
    description: 'Lodo bio-luminiscente que emite una pálida luz verdosa.',
    category: 'exotic_material',
    icon: '🟢',
    stackable: true,
    maxStack: 10
  },
  volcanic_pyrite: {
    id: 'volcanic_pyrite',
    name: 'Pirita Volcánica',
    description: 'Mineral de sulfuro metálico que conserva chispas ígneas en cañones secos.',
    category: 'exotic_material',
    icon: '🔶',
    stackable: true,
    maxStack: 10
  },
  crystallized_saltpeter: {
    id: 'crystallized_saltpeter',
    name: 'Salitre Cristalizado',
    description: 'Sales puras recogidas en grietas de calor sofocante.',
    category: 'exotic_material',
    icon: '🧂',
    stackable: true,
    maxStack: 10
  },
  resonant_crystal: {
    id: 'resonant_crystal',
    name: 'Cristal Resonante',
    description: 'Gema subterránea que vibra ante frecuencias energéticas ocultas.',
    category: 'exotic_material',
    icon: '💎',
    stackable: true,
    maxStack: 10
  },
  luminescent_mycelium: {
    id: 'luminescent_mycelium',
    name: 'Esencia de Micelio Luminoso',
    description: 'Esporas brillantes de hongos que proliferan en simas sin luz solar.',
    category: 'exotic_material',
    icon: '🍄',
    stackable: true,
    maxStack: 10
  },

  // --- Alien Resonator Cores from Tribes (Sec. 9.2) ---
  frost_core: {
    id: 'frost_core',
    name: 'Núcleo Criogénico Ancestral',
    description: 'Fragmento alienígena con tecnología de condensación térmica estelar.',
    category: 'key_relic',
    icon: '💠',
    stackable: false
  },
  forest_core: {
    id: 'forest_core',
    name: 'Resonador de Clorofila Fósil',
    description: 'Matriz biológica capaz de sincronizarse con la biosfera del planeta.',
    category: 'key_relic',
    icon: '🧬',
    stackable: false
  },
  swamp_core: {
    id: 'swamp_core',
    name: 'Glándula Bio-Sintética Quimérica',
    description: 'Componente orgánico de terraformación tóxica con microcircuitos vivientes.',
    category: 'key_relic',
    icon: '☣️',
    stackable: false
  },
  canyon_core: {
    id: 'canyon_core',
    name: 'Catalizador Térmico de Pirita Alien',
    description: 'Emisor de radiación geotérmica de alta frecuencia.',
    category: 'key_relic',
    icon: '🔆',
    stackable: false
  },
  cavern_core: {
    id: 'cavern_core',
    name: 'Matriz Resonante de Hiper-Cristal',
    description: 'Computadora de cristal cuántico extraterrestre que almacena coordenadas galácticas.',
    category: 'key_relic',
    icon: '💠',
    stackable: false
  },

  // --- Ephemeral Special Objects (Sec. 7.4) ---
  spectral_lantern: {
    id: 'spectral_lantern',
    name: 'Linterna de Fuego Espectral',
    description: 'Artefacto arcano forjado con Cristal Resonante y Fango Fosforescente. Ilumina en 360° y repele bestias de sombra.',
    category: 'ephemeral_artifact',
    icon: '🏮',
    stackable: false,
    totalDurationSeconds: 25 * 60, // 25 min
    recipe: {
      material1Id: 'resonant_crystal',
      material1Name: 'Cristal Resonante',
      material2Id: 'phosphor_mud',
      material2Name: 'Fango Fosforescente'
    },
    passiveEffectDesc: 'Ilumina 360° ahuyentando bestias nocturnas y revelando vetas de minerales raros.',
    sacrificeName: 'Fulguración Espectral',
    sacrificeDesc: 'Ciega a todos los enemigos en 15m durante 8s y purga oscuridad o maldiciones instantáneamente.'
  },
  frost_thermal_balm: {
    id: 'frost_thermal_balm',
    name: 'Bálsamo Térmico de Escarcha',
    description: 'Ungüento alquímico creado con Flor de Escarcha Eterna y Resina Milenaria. Concede inmunidad al frío extremo.',
    category: 'ephemeral_artifact',
    icon: '🏺',
    stackable: false,
    totalDurationSeconds: 45 * 60, // 45 min
    recipe: {
      material1Id: 'eternal_frost_flower',
      material1Name: 'Flor de Escarcha Eterna',
      material2Id: 'ancient_resin',
      material2Name: 'Resina Milenaria'
    },
    passiveEffectDesc: 'Inmunidad absoluta al frío extremo y congelación; elimina el consumo extra de calorías en ventiscas.',
    sacrificeName: 'Onda de Nova Criogénica',
    sacrificeDesc: 'Detona un pulso de hielo que congela enemigos por 6s y restaura de golpe el 50% del calor corporal.'
  },
  sulfur_imbued_blade: {
    id: 'sulfur_imbued_blade',
    name: 'Filo Imbuido en Azufre',
    description: 'Espada ígnea templada con Pirita Volcánica y Salitre Cristalizado. Inflige daño de quemadura continuo.',
    category: 'ephemeral_artifact',
    icon: '🗡️',
    stackable: false,
    totalDurationSeconds: 20 * 60, // 20 min
    recipe: {
      material1Id: 'volcanic_pyrite',
      material1Name: 'Pirita Volcánica',
      material2Id: 'crystallized_saltpeter',
      material2Name: 'Salitre Cristalizado'
    },
    passiveEffectDesc: 'Añade daño de quemadura continua a ataques cuerpo a cuerpo y cocina al instante carne de presas cazadas.',
    sacrificeName: 'Ignición Devastadora',
    sacrificeDesc: 'Explosión de fuego griego en 6m que quema armaduras, disipa escudos alienígenas y derriba colosos.'
  },
  swamp_evasion_talisman: {
    id: 'swamp_evasion_talisman',
    name: 'Talismán de Evasión de la Ciénaga',
    description: 'Amuleto fétido confeccionado con Glándula de Anfibio y Esencia de Micelio. Otorga camuflaje y ligereza en el fango.',
    category: 'ephemeral_artifact',
    icon: '🧿',
    stackable: false,
    totalDurationSeconds: 15 * 60, // 15 min
    recipe: {
      material1Id: 'abyssal_gland',
      material1Name: 'Glándula de Anfibio Abisal',
      material2Id: 'luminescent_mycelium',
      material2Name: 'Esencia de Micelio Luminoso'
    },
    passiveEffectDesc: 'Camuflaje: enemigos reducen rango de detección a 3m y el jugador es inmune a trampas de lodo.',
    sacrificeName: 'Cortina de Esporas Sombrías',
    sacrificeDesc: 'Emite niebla tóxica que vuelve al jugador 100% invisible durante 12s, rompiendo el combate de inmediato.'
  },

  // --- Ranged Weapons & Ammunition (Fase 2.1) ---
  tribal_bow: {
    id: 'tribal_bow',
    name: 'Arco Compuesto Tribal',
    description: 'Arco tallado en madera noble y reforzado con tendones. Permite disparar flechas a larga distancia.',
    category: 'resource',
    icon: '🏹',
    stackable: false
  },
  flint_arrow: {
    id: 'flint_arrow',
    name: 'Flechas de Sílex',
    description: 'Proyectiles afilados con punta de pedernal tallado. Causan 25 de daño balístico.',
    category: 'resource',
    icon: '🎯',
    stackable: true,
    maxStack: 40
  },
  fire_arrow: {
    id: 'fire_arrow',
    name: 'Flechas Ígneas de Azufre',
    description: 'Flechas con punta embebida en pirita volcánica. Causan daño de fuego continuo y disipan escudos.',
    category: 'resource',
    icon: '🔥',
    stackable: true,
    maxStack: 30
  },
  frost_arrow: {
    id: 'frost_arrow',
    name: 'Flechas Criogénicas de Escarcha',
    description: 'Flechas impregnadas con hielo fósil de alta montaña. Ralentizan y congelan bestias por 3.5s.',
    category: 'resource',
    icon: '❄️',
    stackable: true,
    maxStack: 30
  },

  // --- Specialized Crafting & Survival Tools (Fase 2.3) ---
  bear_trap: {
    id: 'bear_trap',
    name: 'Trampa de Mandíbulas para Bestias',
    description: 'Cepo mecánico de acero y hueso. Se coloca en el suelo e inmoviliza a cualquier bestia que lo pise.',
    category: 'survival',
    icon: '🪤',
    stackable: true,
    maxStack: 5
  },
  expanded_backpack: {
    id: 'expanded_backpack',
    name: 'Mochila Tribal Reforzada',
    description: 'Mochila de cuero grueso curtido. Aumenta la capacidad de carga permanente a 24 ranuras.',
    category: 'survival',
    icon: '🎒',
    stackable: false
  },
  antidote_potion: {
    id: 'antidote_potion',
    name: 'Antídoto de Morgath',
    description: 'Brebaje destilado en caldero alquímico. Purifica al 100% la toxicidad en sangre y veneno.',
    category: 'survival',
    icon: '🧪',
    stackable: true,
    maxStack: 10
  },
  thermal_tincture: {
    id: 'thermal_tincture',
    name: 'Tintura Térmica Volcánica',
    description: 'Tónico caliente que eleva la temperatura corporal +35° y previene la hipotermia durante 3 minutos.',
    category: 'survival',
    icon: '🍷',
    stackable: true,
    maxStack: 10
  },

  // --- Fase 3: Supervivencia Nocturna y Ruinas Precursoras ---
  torch: {
    id: 'torch',
    name: 'Antorcha de Brea Tribal',
    description: 'Antorcha resistente al viento. Emite un halo de luz cálido en la noche y protege contra el frío nocturno.',
    category: 'survival',
    icon: '🔥',
    stackable: true,
    maxStack: 5
  },
  night_orchid: {
    id: 'night_orchid',
    name: 'Orquídea de Luna',
    description: 'Rara flor bioluminiscente que florece únicamente durante la noche. Restaura 40 de vida y 30 de estamina.',
    category: 'survival',
    icon: '🪷',
    stackable: true,
    maxStack: 10
  },
  precursor_key: {
    id: 'precursor_key',
    name: 'Llave de Glifos Precursores',
    description: 'Artefacto alienígena tallado en obsidiana resonante. Desbloquea las compuertas selladas de las Cámaras del Impacto.',
    category: 'key_relic',
    icon: '🗝️',
    stackable: false
  },
  precursor_core: {
    id: 'precursor_core',
    name: 'Núcleo de Energía Precursor',
    description: 'Generador de antimateria miniatura recuperado de los guardianes alienígenas del Abismo.',
    category: 'exotic_material',
    icon: '⚛️',
    stackable: true,
    maxStack: 5
  },
  ancient_battery: {
    id: 'ancient_battery',
    name: 'Batería Estelar Alienígena',
    description: 'Célula de energía fotónica sobrecargada hallada en cofres ancestrales.',
    category: 'exotic_material',
    icon: '🔋',
    stackable: true,
    maxStack: 5
  },
  charged_crystal: {
    id: 'charged_crystal',
    name: 'Cristal de Frecuencia Pura',
    description: 'Gema subterránea cargada con frecuencias alienígenas para activar los pedestales de glifos.',
    category: 'exotic_material',
    icon: '💠',
    stackable: true,
    maxStack: 5
  }
};
