// Player.ts - El naufrago. Se mueve casilla a casilla; x/y es la posicion visual (suavizada, en
// los pies) y gx/gy la posicion logica en la cuadricula.

import { TileGrid } from '../core/TileGrid';

export type Facing = 'left' | 'right' | 'up' | 'down';

/** El sprite se disena a 32x48 y se dibuja a esta escala: 28x42 px sobre una casilla de 64 */
const PLAYER_SCALE = 0.875;

export class Player {
  public x: number = 0;
  public y: number = 0;
  public gx: number = 0;
  public gy: number = 0;
  public readonly width: number = 32 * PLAYER_SCALE;
  public readonly height: number = 48 * PLAYER_SCALE;
  public facing: Facing = 'down';

  private targetX: number = 0;
  private targetY: number = 0;

  /** Coloca al jugador en una casilla de inmediato (sin animacion) */
  public placeAt(gx: number, gy: number) {
    this.gx = gx;
    this.gy = gy;
    const p = TileGrid.tileFoot(gx, gy);
    this.x = this.targetX = p.x;
    this.y = this.targetY = p.y;
  }

  /** Mueve la posicion logica; la posicion visual se acerca suavemente en update() */
  public stepTo(gx: number, gy: number) {
    this.gx = gx;
    this.gy = gy;
    const p = TileGrid.tileFoot(gx, gy);
    this.targetX = p.x;
    this.targetY = p.y;
  }

  /** Suavizado independiente de los fps */
  public update(delta: number) {
    const a = 1 - Math.exp(-delta * 18);
    this.x += (this.targetX - this.x) * a;
    this.y += (this.targetY - this.y) * a;
  }

  /** dx, dy = paso en la cuadricula; hacia donde mira se decide por el movimiento en PANTALLA */
  public setFacingFromStep(dx: number, dy: number) {
    const screenX = dx - dy;
    const screenY = dx + dy;
    // En diagonal gana el eje horizontal (es el que cambia el dibujo)
    if (screenX < 0) this.facing = 'left';
    else if (screenX > 0) this.facing = 'right';
    else if (screenY < 0) this.facing = 'up';
    else if (screenY > 0) this.facing = 'down';
  }

  public draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    ctx.save();
    // Se dibuja desde los pies (0, 0) y se escala; las coordenadas de abajo estan a tamano de diseno
    ctx.translate(Math.round(this.x - cameraX), Math.round(this.y - cameraY));
    ctx.scale(PLAYER_SCALE, PLAYER_SCALE);
    const sx = 0;
    const sy = 0;

    // Sombra en el suelo, anclada al centro de la casilla
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 2, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo (tunica de cuero) - los pies tocan el centro de la casilla
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(sx - 12, sy - 38, 24, 28);

    // Cinturon
    ctx.fillStyle = '#2b1d0c';
    ctx.fillRect(sx - 13, sy - 22, 26, 4);

    // Piernas
    ctx.fillStyle = '#3a2e2b';
    ctx.fillRect(sx - 9, sy - 10, 7, 12);
    ctx.fillRect(sx + 2, sy - 10, 7, 12);

    // Cabeza
    ctx.fillStyle = '#e0ac69';
    ctx.beginPath();
    ctx.arc(sx, sy - 46, 10, 0, Math.PI * 2);
    ctx.fill();

    // Capucha
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(sx, sy - 49, 10, Math.PI, Math.PI * 2);
    ctx.fill();

    // Ojos segun la direccion
    ctx.fillStyle = '#111';
    if (this.facing === 'down') {
      ctx.fillRect(sx - 4, sy - 46, 2, 3);
      ctx.fillRect(sx + 2, sy - 46, 2, 3);
    } else if (this.facing === 'left') {
      ctx.fillRect(sx - 8, sy - 46, 2, 3);
    } else if (this.facing === 'right') {
      ctx.fillRect(sx + 6, sy - 46, 2, 3);
    }

    ctx.restore();
  }
}
