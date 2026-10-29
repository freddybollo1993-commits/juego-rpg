import { describe, it, expect } from 'vitest';
import { WeatherSystem } from '../WeatherSystem';

/** Contexto de dibujo falso: cualquier metodo es una funcion vacia y cualquier propiedad se puede asignar */
function fakeCtx(): CanvasRenderingContext2D {
  const store: Record<string, unknown> = {};
  return new Proxy(store, {
    get: (t, k: string) => (k in t ? t[k] : (k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {})),
    set: (t, k: string, v) => { t[k] = v; return true; }
  }) as unknown as CanvasRenderingContext2D;
}

type Inspectable = { particles: { x: number; y: number }[] };

describe('WeatherSystem', () => {
  it('con un lienzo de tamano 0 no crea gotas amontonadas en una columna', () => {
    const w = new WeatherSystem();
    w.setWeather('rain');
    w.updateAndDraw(fakeCtx(), 0, 0, 0, 0, 0.016);
    expect((w as unknown as Inspectable).particles.length).toBe(0);

    w.updateAndDraw(fakeCtx(), 1280, 720, 0, 0, 0.016);
    const xs = new Set((w as unknown as Inspectable).particles.map(p => Math.round(p.x / 10)));
    expect(xs.size).toBeGreaterThan(50); // repartidas por toda la pantalla, no en una columna
  });

  it('si el lienzo cambia de tamano reparte las gotas de nuevo', () => {
    const w = new WeatherSystem();
    w.setWeather('rain');
    w.updateAndDraw(fakeCtx(), 400, 300, 0, 0, 0.016);
    w.updateAndDraw(fakeCtx(), 1280, 720, 0, 0, 0.016);
    const maxX = Math.max(...(w as unknown as Inspectable).particles.map(p => p.x));
    expect(maxX).toBeGreaterThan(400); // ya usan el ancho nuevo
  });

  it('con cielo despejado no dibuja ni crea nada', () => {
    const w = new WeatherSystem();
    w.updateAndDraw(fakeCtx(), 1280, 720, 0, 0, 0.016);
    expect((w as unknown as Inspectable).particles.length).toBe(0);
  });
});
