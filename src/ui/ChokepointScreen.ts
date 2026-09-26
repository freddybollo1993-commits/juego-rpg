// ChokepointScreen.ts - Atmospheric Regional Transition Screen (GDD Sec. 8.3)
// 2.5s clean transition to prevent memory leaks and present localized folklore & survival tips.

import { ChokepointConnection, RegionData } from '../data/regions';

export class ChokepointScreen {
  private overlay: HTMLElement | null = null;
  private isTransitioning: boolean = false;

  constructor() {
    this.createDom();
  }

  private createDom() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'chokepoint-screen hidden';
    this.overlay.innerHTML = `
      <div class="chokepoint-content">
        <div class="chokepoint-spinner"></div>
        <h2 id="cp-target-name">Nombre de Región</h2>
        <div class="cp-chokepoint-name" id="cp-chokepoint-name">Paso de Transición</div>
        <p class="cp-description" id="cp-description">Descripción del viaje...</p>
        <div class="cp-folklore-card">
          <div class="cp-folklore-icon">📜</div>
          <div class="cp-folklore-text" id="cp-folklore">Folclore local...</div>
        </div>
        <div class="cp-tip" id="cp-tip">Consejo de supervivencia...</div>
      </div>
    `;
    document.body.appendChild(this.overlay);
  }

  public startTransition(
    chokepoint: ChokepointConnection,
    targetRegion: RegionData,
    onComplete: () => void
  ) {
    if (this.isTransitioning || !this.overlay) return;
    this.isTransitioning = true;

    (this.overlay.querySelector('#cp-target-name') as HTMLElement).innerText = targetRegion.name;
    (this.overlay.querySelector('#cp-chokepoint-name') as HTMLElement).innerText = `Cruzando: ${chokepoint.name}`;
    (this.overlay.querySelector('#cp-description') as HTMLElement).innerText = chokepoint.travelDescription;
    (this.overlay.querySelector('#cp-folklore') as HTMLElement).innerText = chokepoint.loreArtworkHint;
    (this.overlay.querySelector('#cp-tip') as HTMLElement).innerText = chokepoint.survivalTip;

    this.overlay.classList.remove('hidden');
    this.overlay.classList.add('fade-in');

    // 2.5s transition period
    setTimeout(() => {
      onComplete();
      this.overlay?.classList.remove('fade-in');
      this.overlay?.classList.add('fade-out');

      setTimeout(() => {
        this.overlay?.classList.add('hidden');
        this.overlay?.classList.remove('fade-out');
        this.isTransitioning = false;
      }, 400);
    }, 2200);
  }

  public isActive(): boolean {
    return this.isTransitioning;
  }
}
