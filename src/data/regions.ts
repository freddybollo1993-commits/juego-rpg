// regions.ts - Los 7 biomas de la isla. Cada bioma es (por ahora) un unico mapa;
// mas adelante cada uno sera un grupo de mapas enlazados (exterior, poblado, cuevas...).

export type BiomeType = 'beach' | 'frost' | 'forest' | 'swamp' | 'canyon' | 'caverns' | 'alien_core';
export type WeatherType = 'clear' | 'blizzard' | 'rain' | 'toxic_fog' | 'sandstorm' | 'alien_aurora';

export interface RegionData {
  id: string;
  name: string;
  biomeType: BiomeType;
  description: string;
  groundColor: string;
  accentColor: string;
  ambientLight: number; // 0 (oscuridad total) a 1.0 (luz plena)
  weatherType: WeatherType;
}

export const DEFAULT_REGION_ID = 'beach';

export const REGIONS_DATA: Record<string, RegionData> = {
  beach: {
    id: 'beach',
    name: 'Orilla del Naufragio',
    biomeType: 'beach',
    description: 'Playas cubiertas de arrecifes afilados y maderas astilladas de tu galeón destrozado. El viento marino arrastra un frío penetrante.',
    groundColor: '#b0a880',
    accentColor: '#4f728c',
    ambientLight: 0.85,
    weatherType: 'clear'
  },
  frost: {
    id: 'frost',
    name: 'La Meseta Helada de la Escarcha',
    biomeType: 'frost',
    description: 'Valles cubiertos de nieve perpetua, lagos congelados y riscos verticales azotados por ventiscas dinámicas continuas.',
    groundColor: '#d6e6f2',
    accentColor: '#7895b2',
    ambientLight: 0.9,
    weatherType: 'blizzard'
  },
  forest: {
    id: 'forest',
    name: 'La Taiga Ancestral',
    biomeType: 'forest',
    description: 'Bosques densos de pinos centenarios, claros con ruinas de piedra cubiertas de musgo y manadas de lobos territoriales.',
    groundColor: '#2d4a22',
    accentColor: '#1e3316',
    ambientLight: 0.65,
    weatherType: 'rain'
  },
  swamp: {
    id: 'swamp',
    name: 'La Ciénaga Negruzca',
    biomeType: 'swamp',
    description: 'Humedales cenagosos con islotes de barro fétido, nieblas cargadas de miasma tóxico y alimañas abisales anfibias.',
    groundColor: '#2b3a27',
    accentColor: '#1d261a',
    ambientLight: 0.55,
    weatherType: 'toxic_fog'
  },
  canyon: {
    id: 'canyon',
    name: 'El Cañón de las Cenizas',
    biomeType: 'canyon',
    description: 'Cañones rojizos abrasados por un calor sofocante, tormentas de arena ardiente y grietas volcánicas con emanaciones de pirita.',
    groundColor: '#964b28',
    accentColor: '#5c2612',
    ambientLight: 1.0,
    weatherType: 'sandstorm'
  },
  caverns: {
    id: 'caverns',
    name: 'El Abismo Subterráneo',
    biomeType: 'caverns',
    description: 'Grutas titánicas en penumbra absoluta, ríos de lava subterránea, pilares de cristales resonantes y ecos de derrumbes.',
    groundColor: '#1a162b',
    accentColor: '#0e0b17',
    ambientLight: 0.15,
    weatherType: 'clear'
  },
  alien_core: {
    id: 'alien_core',
    name: 'El Núcleo del Impacto',
    biomeType: 'alien_core',
    description: 'La cámara de terraformación alienígena estrellada. Redes biocelulares gigantescas y anillos antigravitatorios.',
    groundColor: '#0a141a',
    accentColor: '#123e4f',
    ambientLight: 0.7,
    weatherType: 'alien_aurora'
  }
};
