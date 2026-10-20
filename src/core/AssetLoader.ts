// Cargador Central de Texturas y Spritesheets Pixel Art 2.5D
export class AssetLoader {
  private static images: Map<string, HTMLImageElement> = new Map();
  public static isLoaded: boolean = false;

  public static readonly ASSETS: Record<string, string> = {
    // Personaje Maestro
    HERO_LOCOMOTION: 'game_assets/characters/hero_locomotion.png',
    HERO_DASH: 'game_assets/characters/hero_dash.png',
    HERO_COMBAT: 'game_assets/characters/hero_combat_combo.png',
    // Fallbacks previos
    HERO_IDLE_WALK: 'game_assets/characters/hero_idle_walk.png',
    HERO_RUN_DASH: 'game_assets/characters/hero_run_dash.png',
    HERO_ATTACK: 'game_assets/characters/hero_attack.png',
    // Criaturas
    SHADOW_WOLF: 'game_assets/creatures/shadow_wolf.png',
    GOLEM: 'game_assets/creatures/golem_creature.png',
    // Props y Landmarks
    TREE: 'game_assets/props/ancient_tree.png',
    ROCK: 'game_assets/props/mossy_rock.png',
    MONOLITH: 'game_assets/props/runic_monolith.png',
    // Bloques de Terreno
    TILE_GRASS: 'game_assets/tiles/tile_grass.png',
    TILE_GRASS_SEAMLESS: 'game_assets/tiles/tile_grass_seamless.png',
    TILE_COBBLE: 'game_assets/tiles/tile_cobblestone.png',
    TILE_DIRT: 'game_assets/tiles/tile_dirt_edge.png'
  };

  public static async loadAll(): Promise<void> {
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;

    const promises = Object.entries(this.ASSETS).map(([key, relativeUrl]) => {
      return new Promise<void>((resolve) => {
        const fullUrl = `${cleanBase}${relativeUrl}`;
        const img = new Image();
        img.onload = () => {
          this.images.set(key, img);
          resolve();
        };
        img.onerror = () => {
          console.warn(`[AssetLoader] Falló carga de: ${fullUrl}. Usando fallback.`);
          resolve();
        };
        img.src = fullUrl;
      });
    });

    // Timeout de seguridad de 3 segundos para arrancar el juego de inmediato
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
    await Promise.race([Promise.all(promises), timeout]);

    this.isLoaded = true;
  }

  public static getImage(key: string): HTMLImageElement | undefined {
    const img = this.images.get(key);
    if (img && img.complete && img.naturalWidth > 0) {
      return img;
    }
    return undefined;
  }

  public static isReady(key: string): boolean {
    const img = this.images.get(key);
    return !!(img && img.complete && img.naturalWidth > 0);
  }
}
