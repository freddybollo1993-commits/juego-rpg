// regions.ts - Autonomous Regional Worlds, Biomes & Chokepoint Transitions (GDD Sec. 8, 9, 10)

export interface ChokepointConnection {
  targetRegionId: string;
  name: string;
  travelDescription: string;
  loreArtworkHint: string;
  survivalTip: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RegionData {
  id: string;
  name: string;
  biomeType: 'beach' | 'frost' | 'forest' | 'swamp' | 'canyon' | 'caverns' | 'alien_core';
  titleTag: string;
  description: string;
  settlementName: string;
  tribeId?: string;
  width: number;
  height: number;
  groundColor: string;
  accentColor: string;
  ambientLight: number; // 0 (pitch black) to 1.0 (bright daylight)
  weatherType: 'clear' | 'blizzard' | 'rain' | 'toxic_fog' | 'sandstorm' | 'alien_aurora';
  hazards: {
    coldRate: number; // negative drops temp
    heatRate: number; // positive raises temp
    toxicRate: number; // increases toxicity
    waterDrainMult: number;
    staminaDrainMult: number;
  };
  chokepoints: ChokepointConnection[];
  exoticMaterialSpawns: {
    itemId: string;
    x: number;
    y: number;
  }[];
}

export const REGIONS_DATA: Record<string, RegionData> = {
  beach: {
    id: 'beach',
    name: 'Orilla del Naufragio (Costa Olvidada)',
    biomeType: 'beach',
    titleTag: 'Prólogo y Tutorial',
    description: 'Playas cubiertas de arrecifes afilados y maderas astilladas de tu galeón destrozado. El viento marino arrastra un frío penetrante.',
    settlementName: 'Refugio de Naúfragos',
    width: 2000,
    height: 1600,
    groundColor: '#b0a880',
    accentColor: '#4f728c',
    ambientLight: 0.85,
    weatherType: 'clear',
    hazards: {
      coldRate: 0.8, // initial cold risk
      heatRate: 0,
      toxicRate: 0,
      waterDrainMult: 1.0,
      staminaDrainMult: 1.0
    },
    chokepoints: [
      {
        targetRegionId: 'forest',
        name: 'Desfiladero Boscoso',
        travelDescription: 'Asciendes por una grieta escarpada entre los acantilados marinos hacia las primeras copas de la Taiga Ancestral.',
        loreArtworkHint: 'Grabado antiguo de navegantes perdiéndose entre coníferas oscuras.',
        survivalTip: 'Consejo: Enciende una fogata con ramas secas para detener la hipotermia antes de cruzar.',
        x: 1850,
        y: 800,
        width: 80,
        height: 140
      },
      {
        targetRegionId: 'frost',
        name: 'Paso del Glaciar Marítimo',
        travelDescription: 'Un estrecho túnel de hielo azul conecta la orilla con las altas cumbres de la Meseta Helada.',
        loreArtworkHint: 'Ilustración del Patriarca de la Escarcha resistiendo una tormenta con el pecho descubierto.',
        survivalTip: 'Consejo: El frío en la meseta drena tu vida rápidamente sin ropa gruesa o el Corazón de Escarcha.',
        x: 1000,
        y: 100,
        width: 140,
        height: 80
      }
    ],
    exoticMaterialSpawns: []
  },

  frost: {
    id: 'frost',
    name: 'La Meseta Helada de la Escarcha',
    biomeType: 'frost',
    titleTag: 'Tundra y Alta Montaña',
    description: 'Valles cubiertos de nieve perpetua, lagos congelados y riscos verticales azotados por ventiscas dinámicas continuas.',
    settlementName: 'Bastión de los Clanes de la Escarcha',
    tribeId: 'frost',
    width: 2400,
    height: 2000,
    groundColor: '#d6e6f2',
    accentColor: '#7895b2',
    ambientLight: 0.9,
    weatherType: 'blizzard',
    hazards: {
      coldRate: 3.5, // severe cold
      heatRate: 0,
      toxicRate: 0,
      waterDrainMult: 0.9,
      staminaDrainMult: 1.2
    },
    chokepoints: [
      {
        targetRegionId: 'beach',
        name: 'Descenso a la Costa',
        travelDescription: 'Desciendes el desfiladero helado de vuelta a los restos del naufragio costero.',
        loreArtworkHint: 'El oleaje azotando los restos flotantes del navío.',
        survivalTip: 'Consejo: En la costa la temperatura es más suave.',
        x: 1000,
        y: 1900,
        width: 140,
        height: 80
      },
      {
        targetRegionId: 'forest',
        name: 'Paso de Coníferas Nevadas',
        travelDescription: 'Un sendero rocoso cruza la línea de nieves hacia la espesura de la Taiga Ancestral.',
        loreArtworkHint: 'Siluetas de lobos observando desde la arboleda.',
        survivalTip: 'Consejo: Los lobos cazan en manada durante la noche.',
        x: 2300,
        y: 1000,
        width: 80,
        height: 140
      },
      {
        targetRegionId: 'caverns',
        name: 'Grieta del Abismo Helado',
        travelDescription: 'Una fosa colosal desciende verticalmente hacia las cavernas subterráneas.',
        loreArtworkHint: 'Cristales gigantes que resuenan en las profundidades del mundo.',
        survivalTip: 'Consejo: Necesitarás visión en la penumbra o una linterna mágica en las simas.',
        x: 1200,
        y: 100,
        width: 140,
        height: 80
      }
    ],
    exoticMaterialSpawns: [
      { itemId: 'eternal_frost_flower', x: 500, y: 400 },
      { itemId: 'eternal_frost_flower', x: 1900, y: 350 },
      { itemId: 'fossil_ice', x: 1600, y: 1500 },
      { itemId: 'fossil_ice', x: 400, y: 1600 }
    ]
  },

  forest: {
    id: 'forest',
    name: 'La Taiga Ancestral',
    biomeType: 'forest',
    titleTag: 'Bosque Profundo y Taiga',
    description: 'Bosques densos de pinos centenarios, claros con ruinas de piedra cubiertas de musgo y manadas de lobos territoriales.',
    settlementName: 'Campamento Nómada de las Copas',
    tribeId: 'forest',
    width: 2400,
    height: 2000,
    groundColor: '#2d4a22',
    accentColor: '#1e3316',
    ambientLight: 0.65,
    weatherType: 'rain',
    hazards: {
      coldRate: 1.0,
      heatRate: 0,
      toxicRate: 0,
      waterDrainMult: 1.0,
      staminaDrainMult: 1.1
    },
    chokepoints: [
      {
        targetRegionId: 'beach',
        name: 'Sendero a la Costa',
        travelDescription: 'Cruzas de vuelta hacia la orilla marina donde encalló tu expedición.',
        loreArtworkHint: 'El sol poniente reflejado en las rocas húmedas de la orilla.',
        survivalTip: 'Consejo: Recolecta algas y conchas para sustento rápido.',
        x: 100,
        y: 1000,
        width: 80,
        height: 140
      },
      {
        targetRegionId: 'swamp',
        name: 'Vado de Aguas Negras',
        travelDescription: 'El suelo firme de coníferas se convierte en lodo fétido y aguas estancadas de la Ciénaga Negruzca.',
        loreArtworkHint: 'Vapores verdosos alzándose sobre árboles putrefactos.',
        survivalTip: 'Consejo: El agua estancada transmite sanguijuelas infecciosas.',
        x: 2300,
        y: 1000,
        width: 80,
        height: 140
      },
      {
        targetRegionId: 'canyon',
        name: 'Desfiladero Árido del Sur',
        travelDescription: 'Los árboles se marchitan bruscamente dando paso a las rocas calientes del Cañón de las Cenizas.',
        loreArtworkHint: 'Dunas rojizas y vientos calcinantes bajo un sol cegador.',
        survivalTip: 'Consejo: Llena tu pellejo de agua fresca antes de adentrarte en el cañón.',
        x: 1200,
        y: 1900,
        width: 140,
        height: 80
      }
    ],
    exoticMaterialSpawns: [
      { itemId: 'ancient_resin', x: 600, y: 500 },
      { itemId: 'ancient_resin', x: 1800, y: 600 },
      { itemId: 'alpha_fur', x: 1200, y: 1400 },
      { itemId: 'alpha_fur', x: 400, y: 1500 }
    ]
  },

  swamp: {
    id: 'swamp',
    name: 'La Ciénaga Negruzca',
    biomeType: 'swamp',
    titleTag: 'Pantanos y Aguas Estancadas',
    description: 'Humedales cenagosos con islotes de barro fétido, nieblas cargadas de miasma tóxico y alimañas abisales anfibias.',
    settlementName: 'Aldea sobre Pilotes de los Moradores',
    tribeId: 'swamp',
    width: 2400,
    height: 2000,
    groundColor: '#2b3a27',
    accentColor: '#1d261a',
    ambientLight: 0.55,
    weatherType: 'toxic_fog',
    hazards: {
      coldRate: 0.5,
      heatRate: 0,
      toxicRate: 2.2, // severe poison
      waterDrainMult: 1.1,
      staminaDrainMult: 1.4 // mud slow
    },
    chokepoints: [
      {
        targetRegionId: 'forest',
        name: 'Ribera de la Taiga',
        travelDescription: 'Retornas hacia el aire puro y las coníferas de la Taiga Ancestral.',
        loreArtworkHint: 'El aroma a pino disipando el vapor venenoso.',
        survivalTip: 'Consejo: Descansa en una fogata para purgar toxinas leves.',
        x: 100,
        y: 1000,
        width: 80,
        height: 140
      },
      {
        targetRegionId: 'caverns',
        name: 'Sumidero Fétido Subterráneo',
        travelDescription: 'Las aguas pantanosas se precipitan en una gruta natural que desciende al Abismo Subterráneo.',
        loreArtworkHint: 'Ríos subterráneos cruzando bóvedas de roca milenaria.',
        survivalTip: 'Consejo: El Agarre Férreo te permitirá trepar riscos húmedos sin caer.',
        x: 1200,
        y: 100,
        width: 140,
        height: 80
      },
      {
        targetRegionId: 'alien_core',
        name: 'Portal del Impacto Central',
        travelDescription: 'Una grieta de suelo fundido con zarcillos metálicos conduce al epicentro de la nave alienígena.',
        loreArtworkHint: 'Estructuras ciclópeas biomecánicas emitiendo luces pulsantes.',
        survivalTip: '¡Atención! Requiere el Dispositivo de Traducción y Enlace para abrir la barrera.',
        x: 1200,
        y: 1900,
        width: 140,
        height: 80
      }
    ],
    exoticMaterialSpawns: [
      { itemId: 'abyssal_gland', x: 500, y: 700 },
      { itemId: 'abyssal_gland', x: 1900, y: 800 },
      { itemId: 'phosphor_mud', x: 1300, y: 400 },
      { itemId: 'phosphor_mud', x: 700, y: 1600 }
    ]
  },

  canyon: {
    id: 'canyon',
    name: 'El Cañón de las Cenizas',
    biomeType: 'canyon',
    titleTag: 'Estepa Árida y Yermos Rocosos',
    description: 'Cañones rojizos abrasados por un calor sofocante, tormentas de arena ardiente y grietas volcánicas con emanaciones de pirita.',
    settlementName: 'Campamento de Tiendas del Sol',
    tribeId: 'canyon',
    width: 2400,
    height: 2000,
    groundColor: '#964b28',
    accentColor: '#5c2612',
    ambientLight: 1.0,
    weatherType: 'sandstorm',
    hazards: {
      coldRate: 0,
      heatRate: 3.2, // severe hyperthermia
      toxicRate: 0.4,
      waterDrainMult: 2.5, // double dehydration
      staminaDrainMult: 1.2
    },
    chokepoints: [
      {
        targetRegionId: 'forest',
        name: 'Garganta Verde del Norte',
        travelDescription: 'Asciendes dejando atrás las dunas calientes hacia la sombra protectora de la Taiga.',
        loreArtworkHint: 'Manantiales brotando entre raíces ancestrales.',
        survivalTip: 'Consejo: La sombra reduce el estrés térmico en un 80%.',
        x: 1200,
        y: 100,
        width: 140,
        height: 80
      },
      {
        targetRegionId: 'caverns',
        name: 'Boca de la Grieta Profunda',
        travelDescription: 'Una sima volcánica abierta por terremotos desciende al fresco pero oscuro Abismo Subterráneo.',
        loreArtworkHint: 'Contraste entre el calor rojo exterior y el brillo azul de los cristales cavernosos.',
        survivalTip: 'Consejo: Las cavernas te protegerán del sol abrasador.',
        x: 100,
        y: 1000,
        width: 80,
        height: 140
      },
      {
        targetRegionId: 'alien_core',
        name: 'Rampa de Escoria Fundida',
        travelDescription: 'Un sendero de roca vítrea negra conduce a la cámara del impacto extraterrestre.',
        loreArtworkHint: 'Haces de plasma cortando el horizonte desértico.',
        survivalTip: '¡Atención! Requiere los 5 Resonadores Alienígenas combinados.',
        x: 2300,
        y: 1000,
        width: 80,
        height: 140
      }
    ],
    exoticMaterialSpawns: [
      { itemId: 'volcanic_pyrite', x: 600, y: 600 },
      { itemId: 'volcanic_pyrite', x: 1700, y: 500 },
      { itemId: 'crystallized_saltpeter', x: 1400, y: 1500 },
      { itemId: 'crystallized_saltpeter', x: 400, y: 1300 }
    ]
  },

  caverns: {
    id: 'caverns',
    name: 'El Abismo Subterráneo',
    biomeType: 'caverns',
    titleTag: 'Sistema de Cavernas Interconectadas',
    description: 'Grutas titánicas en penumbra absoluta, ríos de lava subterránea, pilares de cristales resonantes y ecos de derrumbes.',
    settlementName: 'Santuario Excavado de los Hijos de la Piedra',
    tribeId: 'caverns',
    width: 2400,
    height: 2000,
    groundColor: '#1a162b',
    accentColor: '#0e0b17',
    ambientLight: 0.15, // near darkness without spectral vision / lantern
    weatherType: 'clear',
    hazards: {
      coldRate: 0.6,
      heatRate: 0.6,
      toxicRate: 0.6,
      waterDrainMult: 1.0,
      staminaDrainMult: 1.3
    },
    chokepoints: [
      {
        targetRegionId: 'frost',
        name: 'Túnel de Hielo Ascendente',
        travelDescription: 'Escalas un tiro vertical de roca helada que emerge en la Meseta Helada de la Escarcha.',
        loreArtworkHint: 'Luz polar cegadora al asomarse a la superficie nevada.',
        survivalTip: 'Consejo: Prepárate para el frío cortante al salir.',
        x: 1200,
        y: 100,
        width: 140,
        height: 80
      },
      {
        targetRegionId: 'canyon',
        name: 'Ascenso a la Grieta de Ceniza',
        travelDescription: 'Un conducto de ventilación geotérmica sube hacia el Cañón de las Cenizas.',
        loreArtworkHint: 'Aire caliente saliendo por una fisura en el desierto.',
        survivalTip: 'Consejo: El calor volverá a disparar tu sed.',
        x: 2300,
        y: 1000,
        width: 80,
        height: 140
      },
      {
        targetRegionId: 'alien_core',
        name: 'Bóveda de Entrada Extraterrestre',
        travelDescription: 'Un enorme umbral circular de aleación desconocida bloquea la entrada al reactor de la nave.',
        loreArtworkHint: 'La nave nodriza incrustada en la roca viva del núcleo.',
        survivalTip: '¡Atención! Solo el Dispositivo de Traducción desactivará la esclusa de energía.',
        x: 1200,
        y: 1900,
        width: 140,
        height: 80
      }
    ],
    exoticMaterialSpawns: [
      { itemId: 'resonant_crystal', x: 500, y: 500 },
      { itemId: 'resonant_crystal', x: 1900, y: 700 },
      { itemId: 'luminescent_mycelium', x: 1100, y: 1300 },
      { itemId: 'luminescent_mycelium', x: 600, y: 1600 }
    ]
  },

  alien_core: {
    id: 'alien_core',
    name: 'El Núcleo del Impacto (Pecio Extraterrestre)',
    biomeType: 'alien_core',
    titleTag: 'Arena del Clímax y Jefe Final',
    description: 'La cámara de terraformación alienígena estrellada. Redes biocelulares gigantescas, anillos antigravitatorios y el Heraldo de las Estrellas levitando en su centro.',
    settlementName: 'Cámara del Heraldo Cósmico',
    width: 2200,
    height: 1800,
    groundColor: '#0a141a',
    accentColor: '#123e4f',
    ambientLight: 0.7,
    weatherType: 'alien_aurora',
    hazards: {
      coldRate: 0,
      heatRate: 0,
      toxicRate: 0,
      waterDrainMult: 1.0,
      staminaDrainMult: 1.0
    },
    chokepoints: [
      {
        targetRegionId: 'swamp',
        name: 'Brecha de Retirada a la Ciénaga',
        travelDescription: 'Sales por la brecha de escape hacia los humedales para reagruparte y forjar más artefactos.',
        loreArtworkHint: 'El pantano brilla con reflejos púrpuras alienígenas.',
        survivalTip: 'Consejo: Fabrica suficientes objetos efímeros antes de combatir.',
        x: 1100,
        y: 1700,
        width: 140,
        height: 80
      }
    ],
    exoticMaterialSpawns: []
  }
};
