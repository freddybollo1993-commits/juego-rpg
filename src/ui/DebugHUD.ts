import { Hero } from '../entities/Hero';
import { InputManager } from '../input/InputManager';

export class DebugHUD {
  private container: HTMLDivElement;
  private fpsCounter: HTMLSpanElement;
  private stateBadge: HTMLSpanElement;
  private dirBadge: HTMLSpanElement;
  private juiceBadge: HTMLSpanElement;

  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private currentFps: number = 60;

  constructor(hero: Hero, input: InputManager) {
    this.container = document.createElement('div');
    this.container.id = 'debug-hud';
    this.container.innerHTML = `
      <div class="hud-panel">
        <div class="hud-header">
          <span class="hud-title">⚔️ 2.5D KINEMATICS ENGINE</span>
          <span class="hud-fps" id="hud-fps">60 FPS</span>
        </div>
        <div class="hud-stats">
          <div class="stat-item">
            <span class="stat-label">ESTADO (FSM):</span>
            <span class="stat-val badge-fsm" id="hud-fsm">IDLE</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">DIRECCIÓN 2.5D:</span>
            <span class="stat-val badge-dir" id="hud-dir">SE</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">JUICE (Squash):</span>
            <span class="stat-val" id="hud-juice">1.00x</span>
          </div>
        </div>
        <div class="hud-controls-hint">
          <span>⌨️ <b>WASD / Flechas:</b> Moverse (360°)</span>
          <span>⚡ <b>Shift:</b> Correr | 💨 <b>Espacio / Clic Der:</b> Dash Rápido</span>
          <span>⚔️ <b>J / Clic Izq / Toque:</b> Combo 3 Golpes</span>
        </div>
      </div>

      <!-- Botones de Acción Móviles -->
      <div class="mobile-action-buttons">
        <button id="btn-dash" class="action-btn btn-dash" aria-label="Dash">💨 DASH</button>
        <button id="btn-attack" class="action-btn btn-attack" aria-label="Ataque">⚔️ ATK</button>
      </div>
    `;

    document.body.appendChild(this.container);

    this.fpsCounter = this.container.querySelector('#hud-fps') as HTMLSpanElement;
    this.stateBadge = this.container.querySelector('#hud-fsm') as HTMLSpanElement;
    this.dirBadge = this.container.querySelector('#hud-dir') as HTMLSpanElement;
    this.juiceBadge = this.container.querySelector('#hud-juice') as HTMLSpanElement;

    // Conectar botones móviles a triggers persistentes
    const btnDash = this.container.querySelector('#btn-dash') as HTMLButtonElement;
    const btnAttack = this.container.querySelector('#btn-attack') as HTMLButtonElement;

    btnDash?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.requestDash();
    });
    btnDash?.addEventListener('click', (e) => {
      e.stopPropagation();
      input.requestDash();
    });

    btnAttack?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.requestAttack();
    });
    btnAttack?.addEventListener('click', (e) => {
      e.stopPropagation();
      input.requestAttack();
    });
  }

  public update(hero: Hero): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;
      this.fpsCounter.textContent = `${this.currentFps} FPS`;
      this.fpsCounter.style.color = this.currentFps >= 55 ? '#4ade80' : '#facc15';
    }

    let displayState = hero.fsmState as string;
    if (hero.fsmState === 'ATTACK') {
      displayState = `ATK COMBO ${hero.comboStep}/3`;
    } else if (hero.fsmState === 'DASH') {
      displayState = `DASH (Fase ${hero.dashFrame + 1}/4)`;
    }
    this.stateBadge.textContent = displayState;
    this.dirBadge.textContent = `${hero.direction} (${hero.facingX > 0 ? '▶' : '◀'})`;
    this.juiceBadge.textContent = `${hero.scaleX.toFixed(2)}x / ${hero.scaleY.toFixed(2)}x`;
  }
}
