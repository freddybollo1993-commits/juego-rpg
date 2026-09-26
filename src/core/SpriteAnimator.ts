// SpriteAnimator.ts - Frame Animation Controller & Organic Procedural Motion (Fase 2.2)

export interface AnimationConfig {
  name: string;
  frameCount: number;
  frameDuration: number; // seconds per frame
  loop: boolean;
}

export class SpriteAnimator {
  private currentAnimation: string = 'idle';
  private frameIndex: number = 0;
  private frameTimer: number = 0;
  private configs: Map<string, AnimationConfig> = new Map();
  private time: number = 0;

  constructor() {
    // Default Animation Presets
    this.addAnimation({ name: 'idle', frameCount: 4, frameDuration: 0.25, loop: true });
    this.addAnimation({ name: 'walk', frameCount: 6, frameDuration: 0.12, loop: true });
    this.addAnimation({ name: 'run', frameCount: 6, frameDuration: 0.08, loop: true });
    this.addAnimation({ name: 'attack', frameCount: 3, frameDuration: 0.08, loop: false });
    this.addAnimation({ name: 'roll', frameCount: 4, frameDuration: 0.06, loop: false });
  }

  public addAnimation(config: AnimationConfig) {
    this.configs.set(config.name, config);
  }

  public setState(name: string, frameCount?: number, frameDuration?: number) {
    if (frameCount !== undefined && frameDuration !== undefined) {
      this.addAnimation({ name, frameCount, frameDuration, loop: true });
    }
    this.play(name);
  }

  public play(name: string, forceRestart: boolean = false) {
    if (this.currentAnimation === name && !forceRestart) return;
    if (this.configs.has(name)) {
      this.currentAnimation = name;
      this.frameIndex = 0;
      this.frameTimer = 0;
    }
  }

  public update(delta: number) {
    this.time += delta;
    const config = this.configs.get(this.currentAnimation);
    if (!config) return;

    this.frameTimer += delta;
    if (this.frameTimer >= config.frameDuration) {
      this.frameTimer -= config.frameDuration;
      if (this.frameIndex + 1 < config.frameCount) {
        this.frameIndex++;
      } else if (config.loop) {
        this.frameIndex = 0;
      }
    }
  }

  public getCurrentAnimation(): string {
    return this.currentAnimation;
  }

  public getFrameIndex(): number {
    return this.frameIndex;
  }

  public getCurrentFrame(): number {
    return this.frameIndex;
  }

  public getProceduralOffset(isMoving: boolean = false, vx: number = 0): { bobY: number; tiltAngle: number } {
    return {
      bobY: this.getBobbingOffset(isMoving),
      tiltAngle: this.getTiltAngle(isMoving, vx)
    };
  }

  /**
   * Procedural organic bobbing vertical offset (running bounce or breathing)
   */
  public getBobbingOffset(isMoving: boolean, speedMultiplier: number = 1.0): number {
    if (isMoving) {
      return Math.abs(Math.sin(this.time * 12 * speedMultiplier)) * -4;
    }
    // Idle gentle chest breathing
    return Math.sin(this.time * 2.5) * 1.5;
  }

  /**
   * Procedural running tilt angle
   */
  public getTiltAngle(isMoving: boolean, vx: number): number {
    if (!isMoving || vx === 0) return 0;
    const maxTilt = 0.08; // ~4.5 degrees forward lean
    return vx > 0 ? maxTilt : -maxTilt;
  }
}
