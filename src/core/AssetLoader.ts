// Cargador Central de Texturas y Spritesheets Pixel Art 2.5D
export class AssetLoader {
  private static images: Map<string, HTMLImageElement> = new Map();
  private static isLoaded: boolean = false;

  public static readonly ASSETS = {
    // Personaje
    HERO_IDLE_WALK: '/assets/characters/hero_idle_walk.png',
    HERO_RUN_DASH: '/assets/characters/hero_run_dash.png',
    HERO_ATTACK: '/assets/characters/hero_attack.png',
    // Criaturas
    SHADOW_WOLF: '/assets/creatures/shadow_wolf.png',
    GOLEM: '/assets/creatures/golem_creature.png',
    // Props y Landmarks
    TREE: '/assets/props/ancient_tree.png',
    ROCK: '/assets/props/mossy_rock.png',
    MONOLITH: '/assets/props/runic_monolith.png',
    // Bloques de Terreno
    TILE_GRASS: '/assets/tiles/tile_grass.png',
    TILE_COBBLE: '/assets/tiles/tile_cobblestone.png',
    TILE_DIRT: '/assets/tiles/tile_dirt_edge.png'
  };

  public static async loadAll(): Promise<void> {
    if (this.isLoaded) return;

    const promises = Object.entries(this.ASSETS).map(([key, url]) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.images.set(key, img);
          resolve();
        };
        img.onerror = () => {
          console.warn(`No se pudo cargar asset: ${url}`);
          // Fallback silencioso para no romper ejecución
          resolve();
        };
        img.src = url;
      });
    });

    await Promise.all(promises);
    this.isLoaded = true;
  }

  public static getImage(key: string): HTMLImageElement | undefined {
    return this.images.get(key);
  }
}
