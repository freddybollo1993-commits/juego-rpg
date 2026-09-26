// AssetManager.ts - Preloader & Registry for Concept Art, Textures and Illustrations

export interface ConceptArtEntry {
  id: string;
  title: string;
  biomeId: string;
  imagePath: string;
  description: string;
  shapeLanguage: string;
  colorPalette: string[];
}

export const CONCEPT_ART_MANIFEST: Record<string, ConceptArtEntry> = {
  beach: {
    id: 'beach',
    title: 'Orilla del Naufragio (Costa Olvidada)',
    biomeId: 'beach',
    imagePath: '/concept_art/environment_beach_shipwreck_1790397700000.svg',
    description: 'Playas salobres con arrecifes basálticos, maderas astilladas de "La Tempestad de Oro", dunas de arena y niebla marina al atardecer.',
    shapeLanguage: 'Curvas onduladas de arena y espuma vs. aristas afiladas de mástiles rotos y arrecifes de basalto',
    colorPalette: ['#B0A880', '#4F728C', '#3A2010', '#2D6A4F', '#F4A261']
  },
  frost: {
    id: 'frost',
    title: 'La Meseta Helada de la Escarcha',
    biomeId: 'frost',
    imagePath: '/concept_art/environment_frost_plateau_1790397720098.jpg',
    description: 'Valles de nieve perpetua, riscos verticales cortantes y monolitos tribales con runas cian brillantes bajo ventiscas dinámicas.',
    shapeLanguage: 'Triángulos y aristas afiladas (carámbanos, riscos cortantes, cuernos de bestias)',
    colorPalette: ['#D6E6F2', '#A4C3D2', '#4A5568', '#00F5D4', '#FF9F1C']
  },
  swamp: {
    id: 'swamp',
    title: 'La Ciénaga Negruzca & Alimaña del Fango',
    biomeId: 'swamp',
    imagePath: '/concept_art/toxic_swamp_horror_1790397766371.jpg',
    description: 'Aguas estancadas purpúreas, lodo fosforescente esmeralda y la temible Alimaña del Fango emergiendo de los miasmas.',
    shapeLanguage: 'Formas orgánicas onduladas y verrugas bioluminiscentes',
    colorPalette: ['#2B3A27', '#1D261A', '#4D6A34', '#70E000', '#38B000']
  },
  caverns: {
    id: 'caverns',
    title: 'El Abismo Subterráneo y Cristales Resonantes',
    biomeId: 'caverns',
    imagePath: '/concept_art/abyss_caverns_crystals_1790397797174.jpg',
    description: 'Cavernas titánicas con hipercristales púrpuras y azules resonantes, micelio fluorescente y santuarios de basalto.',
    shapeLanguage: 'Bloques ciclópeos y prismas rectilíneos de cuarzo',
    colorPalette: ['#1A162B', '#0E0B17', '#3F37C9', '#7209B7', '#4CC9F0']
  },
  alien_core: {
    id: 'alien_core',
    title: 'El Núcleo del Impacto y El Heraldo de las Estrellas',
    biomeId: 'alien_core',
    imagePath: '/concept_art/herald_alien_core_1790397740548.jpg',
    description: 'Pecio extraterrestre de terraformación con anillos de levitación antigravitatoria y el colosal Heraldo de las Estrellas.',
    shapeLanguage: 'Geometría biomecánica no euclidiana y concentradores plasmáticos',
    colorPalette: ['#0A141A', '#123E4F', '#023E8A', '#00F5D4', '#F72585']
  }
};

export class AssetManager {
  private static instance: AssetManager;
  private images: Map<string, HTMLImageElement> = new Map();
  private isLoaded: boolean = false;

  private constructor() {}

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  public preloadAll(): Promise<void> {
    if (this.isLoaded) return Promise.resolve();

    const loadPromises = Object.entries(CONCEPT_ART_MANIFEST).map(([key, entry]) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = entry.imagePath;
        img.onload = () => {
          this.images.set(key, img);
          resolve();
        };
        img.onerror = () => {
          console.warn(`[AssetManager] Could not load concept art: ${entry.imagePath}`);
          resolve(); // Resolve anyway so game starts cleanly
        };
      });
    });

    return Promise.all(loadPromises).then(() => {
      this.isLoaded = true;
    });
  }

  public getImage(key: string): HTMLImageElement | undefined {
    return this.images.get(key);
  }

  public isReady(): boolean {
    return this.isLoaded;
  }
}

export const assetManager = AssetManager.getInstance();
