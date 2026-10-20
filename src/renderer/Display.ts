export class Display {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public width: number = 0;
  public height: number = 0;
  public scale: number = 2; // Pixel art zoom scale

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('No se pudo inicializar el contexto 2D del Canvas');
    this.ctx = ctx;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    // Calculamos dimensiones según ventana respetando nitidez Pixel Art
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : window.innerWidth;
    const h = rect.height > 0 ? rect.height : window.innerHeight;

    this.width = Math.floor(w);
    this.height = Math.floor(h);

    // Ajuste dinámico de escala de zoom pixel-perfect
    if (this.width < 600) {
      this.scale = 2; // Móviles
    } else if (this.width < 1200) {
      this.scale = 2.5; // Tablets / Pantallas medianas
    } else {
      this.scale = 3; // Escritorio HD
    }

    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);

    // Escalado de contexto y desactivación estricta de antialiasing
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  public clear(color: string = '#14141d'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
