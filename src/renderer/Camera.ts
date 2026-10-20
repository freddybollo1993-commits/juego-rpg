export class Camera {
  public x: number = 0;
  public y: number = 0;
  public targetX: number = 0;
  public targetY: number = 0;
  public smoothing: number = 0.12;

  constructor(initialX: number = 0, initialY: number = 0) {
    this.x = initialX;
    this.y = initialY;
    this.targetX = initialX;
    this.targetY = initialY;
  }

  public follow(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  public update(): void {
    // Interpolación suave con factor de amortiguación
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;
  }

  // Coordenadas enteras para evitar subpíxel jitter y texture bleeding
  public get roundX(): number {
    return Math.round(this.x);
  }

  public get roundY(): number {
    return Math.round(this.y);
  }
}
