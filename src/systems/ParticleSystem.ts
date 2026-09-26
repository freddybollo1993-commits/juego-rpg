// ParticleSystem.ts - High-Performance 2D Particle Engine for Combat, Dash, & Elemental Bursts (Fase 2.2)

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity?: number;
  friction?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 300;

  public spawnSparks(x: number, y: number, color: string = '#ffd700', count: number = 8) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.2,
        maxLife: 0.45,
        size: 2.5 + Math.random() * 2,
        color,
        gravity: 40,
        friction: 0.94
      });
    }
  }

  public spawnDashDust(x: number, y: number, count: number = 6) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 15 + Math.random() * 40;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + 10 + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        life: 0.2 + Math.random() * 0.25,
        maxLife: 0.45,
        size: 3 + Math.random() * 3,
        color: 'rgba(214, 211, 209, 0.65)',
        friction: 0.9
      });
    }
  }

  public spawnHitBlood(x: number, y: number, color: string = '#b91c1c', count: number = 6) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 2 + Math.random() * 2,
        color,
        gravity: 60,
        friction: 0.92
      });
    }
  }

  public spawnElementalBurst(x: number, y: number, color: string, count: number = 14) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.3,
        maxLife: 0.65,
        size: 3 + Math.random() * 3,
        color,
        friction: 0.93
      });
    }
  }

  public update(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.friction) {
        p.vx *= p.friction;
        p.vy *= p.friction;
      }
      if (p.gravity) {
        p.vy += p.gravity * delta;
      }

      p.x += p.vx * delta;
      p.y += p.vy * delta;
    }
  }

  public draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    for (const p of this.particles) {
      const sx = p.x - cameraX;
      const sy = p.y - cameraY;
      const alpha = Math.max(0, p.life / p.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public clear() {
    this.particles = [];
  }

  public getParticles(): ReadonlyArray<Particle> {
    return this.particles;
  }

  public getCount(): number {
    return this.particles.length;
  }
}

export const particleSystem = new ParticleSystem();
