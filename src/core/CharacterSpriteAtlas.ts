// CharacterSpriteAtlas.ts - Manages animated pixel art sprite sheets for Player & Entities

export type AnimState = 'idle' | 'run' | 'slice' | 'hit' | 'death';
export type FacingDir = 'down' | 'up' | 'left' | 'right';

interface SpriteAnimation {
  image: HTMLImageElement;
  frames: number;
  frameWidth: number;
  frameHeight: number;
  frameDuration: number; // in seconds
  loaded: boolean;
}

export class CharacterSpriteAtlas {
  private animations: Map<string, SpriteAnimation> = new Map();
  private static instance: CharacterSpriteAtlas | null = null;

  public static getInstance(): CharacterSpriteAtlas {
    if (!CharacterSpriteAtlas.instance) {
      CharacterSpriteAtlas.instance = new CharacterSpriteAtlas();
    }
    return CharacterSpriteAtlas.instance;
  }

  constructor() {
    this.preloadPlayerAnimations();
  }

  private register(key: string, path: string, frames: number, duration: number = 0.12) {
    if (typeof Image === 'undefined') {
      return; // Node.js / test environment without DOM
    }
    const img = new Image();
    const anim: SpriteAnimation = {
      image: img,
      frames,
      frameWidth: 64,
      frameHeight: 64,
      frameDuration: duration,
      loaded: false
    };
    img.onload = () => {
      anim.loaded = true;
    };
    img.src = path;
    this.animations.set(key, anim);
  }

  private preloadPlayerAnimations() {
    const base = '/pixel_crawler/characters/body_a';

    // Idle animations (4 frames each: 256x64 => 64x64 per frame)
    this.register('player_idle_down', `${base}/Idle_Base/Idle_Down-Sheet.png`, 4, 0.18);
    this.register('player_idle_up', `${base}/Idle_Base/Idle_Up-Sheet.png`, 4, 0.18);
    this.register('player_idle_side', `${base}/Idle_Base/Idle_Side-Sheet.png`, 4, 0.18);

    // Run animations (6 frames each: 384x64 => 64x64 per frame)
    this.register('player_run_down', `${base}/Run_Base/Run_Down-Sheet.png`, 6, 0.11);
    this.register('player_run_up', `${base}/Run_Base/Run_Up-Sheet.png`, 6, 0.11);
    this.register('player_run_side', `${base}/Run_Base/Run_Side-Sheet.png`, 6, 0.11);

    // Attack / Slice (8 frames: 512x64 => 64x64 per frame)
    this.register('player_slice_down', `${base}/Slice_Base/Slice_Down-Sheet.png`, 8, 0.07);
    this.register('player_slice_up', `${base}/Slice_Base/Slice_Up-Sheet.png`, 8, 0.07);
    this.register('player_slice_side', `${base}/Slice_Base/Slice_Side-Sheet.png`, 8, 0.07);

    // Death (6 frames)
    this.register('player_death_down', `${base}/Death_Base/Death_Down-Sheet.png`, 6, 0.14);
  }

  /**
   * Draws animated sprite frame centered at (px, py) with optional flipping.
   */
  public draw(
    ctx: CanvasRenderingContext2D,
    entity: 'player',
    state: AnimState,
    facing: FacingDir,
    animTimer: number,
    px: number,
    py: number,
    scale: number = 1.0
  ): boolean {
    const isSide = facing === 'left' || facing === 'right';
    const dirKey = isSide ? 'side' : facing;
    const key = `${entity}_${state}_${dirKey}`;
    const fallbackKey = `${entity}_idle_${dirKey}`;

    const anim = this.animations.get(key) || this.animations.get(fallbackKey);
    if (!anim || !anim.loaded) return false;

    const totalAnimTime = anim.frames * anim.frameDuration;
    const currentLoopTime = animTimer % totalAnimTime;
    const currentFrame = Math.floor(currentLoopTime / anim.frameDuration) % anim.frames;

    const srcX = currentFrame * anim.frameWidth;
    const srcY = 0;
    const srcW = anim.frameWidth;
    const srcH = anim.frameHeight;

    const destW = srcW * scale;
    const destH = srcH * scale;

    ctx.save();
    ctx.imageSmoothingEnabled = false; // preserve clean pixel art

    if (facing === 'left') {
      // Flip horizontally around center point px
      ctx.translate(Math.round(px), Math.round(py));
      ctx.scale(-1, 1);
      ctx.drawImage(
        anim.image,
        srcX, srcY, srcW, srcH,
        -Math.round(destW / 2),
        -Math.round(destH - 12), // align feet with anchor
        destW, destH
      );
    } else {
      ctx.drawImage(
        anim.image,
        srcX, srcY, srcW, srcH,
        Math.round(px - destW / 2),
        Math.round(py - (destH - 12)),
        destW, destH
      );
    }

    ctx.restore();
    return true;
  }
}

export const characterSpriteAtlas = CharacterSpriteAtlas.getInstance();
