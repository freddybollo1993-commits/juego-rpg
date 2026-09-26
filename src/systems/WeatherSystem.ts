// WeatherSystem.ts - Dynamic Atmospheric Weather & Particle Renderer (GDD Sec. 8.2 & 9.3)

export interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export class WeatherSystem {
  private particles: WeatherParticle[] = [];
  private maxParticles: number = 180;
  private weatherType: string = 'clear';

  constructor() {}

  public setWeather(type: 'clear' | 'blizzard' | 'rain' | 'toxic_fog' | 'sandstorm' | 'alien_aurora') {
    if (this.weatherType !== type) {
      this.weatherType = type;
      this.particles = [];
    }
  }

  public updateAndDraw(ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number, cameraY: number, delta: number) {
    if (this.weatherType === 'clear') return;

    // Spawn new particles if needed
    while (this.particles.length < this.maxParticles) {
      this.particles.push(this.createParticle(width, height));
    }

    ctx.save();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * delta * 60;
      p.y += p.vy * delta * 60;
      p.life += delta;

      // Wrap around screen viewport
      if (p.x < 0) p.x += width;
      if (p.x > width) p.x -= width;
      if (p.y < 0) p.y += height;
      if (p.y > height) p.y -= height;

      if (p.life > p.maxLife) {
        this.particles[i] = this.createParticle(width, height);
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * (1 - Math.abs(p.life / p.maxLife - 0.5) * 1.5);

      if (this.weatherType === 'rain') {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 3, p.y + p.vy * 3);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Weather Atmospheric Overlay
    if (this.weatherType === 'blizzard') {
      // Vignette icy cold edges
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.7);
      grad.addColorStop(0, 'rgba(214, 230, 242, 0)');
      grad.addColorStop(1, 'rgba(180, 210, 240, 0.25)');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 1.0;
      ctx.fillRect(0, 0, width, height);
    } else if (this.weatherType === 'toxic_fog') {
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.65);
      grad.addColorStop(0, 'rgba(40, 80, 40, 0)');
      grad.addColorStop(1, 'rgba(30, 90, 30, 0.3)');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 1.0;
      ctx.fillRect(0, 0, width, height);
    } else if (this.weatherType === 'sandstorm') {
      ctx.fillStyle = 'rgba(180, 110, 40, 0.15)';
      ctx.globalAlpha = 1.0;
      ctx.fillRect(0, 0, width, height);
    } else if (this.weatherType === 'alien_aurora') {
      // Eerie shifting purple / cyan alien energy waves
      const time = Date.now() * 0.001;
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, `rgba(138, 43, 226, ${0.1 + Math.sin(time) * 0.05})`);
      grad.addColorStop(0.5, `rgba(0, 255, 200, ${0.08 + Math.cos(time * 1.3) * 0.04})`);
      grad.addColorStop(1, `rgba(75, 0, 130, ${0.12 + Math.sin(time * 0.8) * 0.05})`);
      ctx.fillStyle = grad;
      ctx.globalAlpha = 1.0;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  private createParticle(width: number, height: number): WeatherParticle {
    const x = Math.random() * width;
    const y = Math.random() * height;
    let vx = 0;
    let vy = 0;
    let size = 2;
    let color = '#ffffff';
    let alpha = 0.5;
    const maxLife = 3 + Math.random() * 5;

    switch (this.weatherType) {
      case 'blizzard':
        vx = -5 - Math.random() * 7;
        vy = 3 + Math.random() * 5;
        size = 1.5 + Math.random() * 3.5;
        color = '#ffffff';
        alpha = 0.4 + Math.random() * 0.5;
        break;
      case 'rain':
        vx = -1.5;
        vy = 12 + Math.random() * 8;
        size = 1.2;
        color = '#a0c4ff';
        alpha = 0.35 + Math.random() * 0.3;
        break;
      case 'toxic_fog':
        vx = (Math.random() - 0.5) * 1.5;
        vy = (Math.random() - 0.5) * 1.5;
        size = 3 + Math.random() * 6;
        color = Math.random() > 0.4 ? '#39ff14' : '#70e000';
        alpha = 0.2 + Math.random() * 0.25;
        break;
      case 'sandstorm':
        vx = 8 + Math.random() * 8;
        vy = (Math.random() - 0.5) * 3;
        size = 2 + Math.random() * 3;
        color = '#e9c46a';
        alpha = 0.35 + Math.random() * 0.4;
        break;
      case 'alien_aurora':
        vx = Math.sin(Math.random() * 10) * 2;
        vy = -1 - Math.random() * 3;
        size = 2 + Math.random() * 4;
        color = Math.random() > 0.5 ? '#00f5d4' : '#f72585';
        alpha = 0.3 + Math.random() * 0.4;
        break;
    }

    return { x, y, vx, vy, size, color, alpha, life: 0, maxLife };
  }
}
