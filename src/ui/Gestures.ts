// Gestures.ts - Entrada tactil y de raton sobre el mapa:
//   tocar / clic       -> el personaje camina hasta esa casilla
//   arrastrar          -> mueve la vista
//   pellizcar / rueda  -> zoom

import { Game } from '../core/Game';

const TAP_SLOP = 10; // pixeles que un dedo puede moverse y seguir contando como toque

export function bindCanvasGestures(canvas: HTMLCanvasElement, game: Game) {
  const pointers = new Map<number, { x: number; y: number }>();
  let startX = 0;
  let startY = 0;
  let dragged = false;     // el gesto actual ya es un arrastre o un pellizco: no es un toque
  let pinchDistance = 0;

  const distanceBetween = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const midpoint = () => {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      startX = e.clientX;
      startY = e.clientY;
      dragged = false;
    } else if (pointers.size === 2) {
      dragged = true;
      pinchDistance = distanceBetween();
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) {
      if (e.pointerType === 'mouse') game.handleCanvasHover(e.clientX, e.clientY);
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      // Pellizco: el zoom sigue a los dedos y el punto medio arrastra la vista
      const dist = distanceBetween();
      if (pinchDistance > 0 && dist > 0) {
        const mid = game.clientToCanvas(midpoint().x, midpoint().y);
        game.zoomBy(dist / pinchDistance, mid.x, mid.y);
      }
      pinchDistance = dist;
      game.panBy(dx / 2, dy / 2);
      return;
    }

    if (!dragged && Math.hypot(e.clientX - startX, e.clientY - startY) > TAP_SLOP) dragged = true;
    if (dragged) {
      const scale = canvas.width / canvas.getBoundingClientRect().width;
      game.panBy(dx * scale, dy * scale);
    }
  });

  const release = (e: PointerEvent, cancelled: boolean) => {
    if (!pointers.has(e.pointerId)) return;
    const wasSingle = pointers.size === 1;
    pointers.delete(e.pointerId);
    if (pointers.size === 1) {
      // Al soltar un dedo del pellizco, el que queda no debe saltar: se toma su posicion actual
      const [only] = [...pointers.values()];
      startX = only.x;
      startY = only.y;
    }
    if (wasSingle && !dragged && !cancelled) game.handleCanvasClick(e.clientX, e.clientY);
  };
  canvas.addEventListener('pointerup', (e) => release(e, false));
  canvas.addEventListener('pointercancel', (e) => release(e, true));

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = game.clientToCanvas(e.clientX, e.clientY);
    game.zoomBy(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
  }, { passive: false });
}
