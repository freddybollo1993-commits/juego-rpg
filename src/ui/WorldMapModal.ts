// WorldMapModal.ts - Interactive 2.5D World Map & Regional Cartography (The Wild Darkness style)

import { REGIONS_DATA, RegionData } from '../data/regions';
import { soundManager } from '../audio/SoundManager';

export interface RegionPin {
  id: string;
  xPct: number; // percentage from left
  yPct: number; // percentage from top
  name: string;
  badge: string;
}

const REGION_PINS: RegionPin[] = [
  { id: 'beach', xPct: 15, yPct: 75, name: 'Orilla del Naufragio', badge: '🌊' },
  { id: 'swamp', xPct: 35, yPct: 62, name: 'La Ciénaga Negruzca', badge: '☣️' },
  { id: 'forest', xPct: 30, yPct: 22, name: 'La Taiga Ancestral', badge: '🌲' },
  { id: 'frost', xPct: 56, yPct: 20, name: 'La Meseta Helada', badge: '❄️' },
  { id: 'canyon', xPct: 58, yPct: 68, name: 'El Cañón de las Cenizas', badge: '🏜️' },
  { id: 'caverns', xPct: 80, yPct: 76, name: 'El Abismo Subterráneo', badge: '🔮' },
  { id: 'alien_core', xPct: 83, yPct: 25, name: 'El Núcleo del Impacto', badge: '🛸' },
];

export class WorldMapModal {
  private overlay: HTMLElement | null = null;
  private isVisible: boolean = false;
  private onTravelCallback?: (regionId: string) => void;
  private currentRegionId: string = 'beach';
  private selectedRegionId: string = 'beach';
  private viewMode: 'map' | 'diorama' = 'map';

  constructor() {
    this.createDom();
  }

  private createDom() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay hidden';
    this.overlay.innerHTML = `
      <div class="modal-card world-map-card">
        <div class="modal-header">
          <div class="modal-title">🗺️ CARTOGRAFÍA DEL MUNDO 2.5D (LOS 7 BIOMAS)</div>
          <button class="modal-close-btn" id="close-world-map-btn">✖</button>
        </div>

        <div class="world-map-tabs">
          <button class="tab-btn active" id="tab-map-view">🗺️ Mapa General de Biomas</button>
          <button class="tab-btn" id="tab-diorama-view">🏕️ Diorama Isométrico (The Wild Darkness)</button>
        </div>

        <div class="world-map-container" id="world-map-container">
          <!-- Image canvas wrapper -->
          <div class="world-map-image-wrap" id="world-map-image-wrap">
            <img id="world-map-img" src="/concept_art/world_map_isometric.jpg" alt="Mapa Isométrico 2.5D" class="world-map-img" />
            <div class="region-pins-layer" id="region-pins-layer"></div>
          </div>

          <!-- Regional Detail Drawer -->
          <div class="region-detail-drawer" id="region-detail-drawer">
            <div class="region-detail-header" id="region-detail-title">Cargando...</div>
            <div class="region-detail-tag" id="region-detail-tag"></div>
            <div class="region-detail-desc" id="region-detail-desc"></div>
            <div class="region-detail-hazards" id="region-detail-hazards"></div>
            <div class="region-detail-actions">
              <button class="travel-btn" id="btn-fast-travel">🚀 Viajar a esta Región</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.overlay.querySelector('#close-world-map-btn')?.addEventListener('click', () => this.hide());
    
    this.overlay.querySelector('#tab-map-view')?.addEventListener('click', () => {
      this.switchView('map');
    });

    this.overlay.querySelector('#tab-diorama-view')?.addEventListener('click', () => {
      this.switchView('diorama');
    });

    this.overlay.querySelector('#btn-fast-travel')?.addEventListener('click', () => {
      if (this.onTravelCallback && this.selectedRegionId) {
        soundManager.playRunicTuning();
        this.onTravelCallback(this.selectedRegionId);
        this.hide();
      }
    });

    this.renderPins();
  }

  private switchView(mode: 'map' | 'diorama') {
    this.viewMode = mode;
    const img = this.overlay?.querySelector('#world-map-img') as HTMLImageElement;
    const pinsLayer = this.overlay?.querySelector('#region-pins-layer') as HTMLElement;
    const tabMap = this.overlay?.querySelector('#tab-map-view');
    const tabDiorama = this.overlay?.querySelector('#tab-diorama-view');
    const drawer = this.overlay?.querySelector('#region-detail-drawer') as HTMLElement;

    if (mode === 'map') {
      img.src = '/concept_art/world_map_isometric.jpg';
      pinsLayer.style.display = 'block';
      drawer.style.display = 'flex';
      tabMap?.classList.add('active');
      tabDiorama?.classList.remove('active');
    } else {
      img.src = '/concept_art/isometric_gameplay_beach.jpg';
      pinsLayer.style.display = 'none';
      drawer.style.display = 'none';
      tabMap?.classList.remove('active');
      tabDiorama?.classList.add('active');
    }
  }

  private renderPins() {
    const pinsLayer = this.overlay?.querySelector('#region-pins-layer');
    if (!pinsLayer) return;
    pinsLayer.innerHTML = '';

    REGION_PINS.forEach((pin) => {
      const pinEl = document.createElement('div');
      pinEl.className = `region-pin ${pin.id === this.currentRegionId ? 'current-player-location' : ''} ${pin.id === this.selectedRegionId ? 'selected' : ''}`;
      pinEl.style.left = `${pin.xPct}%`;
      pinEl.style.top = `${pin.yPct}%`;
      pinEl.innerHTML = `
        <div class="pin-icon">${pin.badge}</div>
        <div class="pin-label">${pin.name}</div>
        ${pin.id === this.currentRegionId ? '<div class="pin-pulse"></div>' : ''}
      `;

      pinEl.addEventListener('click', () => {
        soundManager.playForage();
        this.selectRegion(pin.id);
      });

      pinsLayer.appendChild(pinEl);
    });
  }

  private selectRegion(regionId: string) {
    this.selectedRegionId = regionId;
    this.renderPins();

    const region = REGIONS_DATA[regionId];
    if (!region) return;

    const titleEl = this.overlay?.querySelector('#region-detail-title');
    const tagEl = this.overlay?.querySelector('#region-detail-tag');
    const descEl = this.overlay?.querySelector('#region-detail-desc');
    const hazardsEl = this.overlay?.querySelector('#region-detail-hazards');
    const travelBtn = this.overlay?.querySelector('#btn-fast-travel') as HTMLButtonElement;

    if (titleEl) titleEl.textContent = `${region.name}`;
    if (tagEl) tagEl.textContent = `${region.titleTag} • Asentamiento: ${region.settlementName}`;
    if (descEl) descEl.textContent = region.description;

    if (hazardsEl) {
      const h = region.hazards;
      const hazardTags: string[] = [];
      if (h.coldRate > 0) hazardTags.push(`❄️ Frío: -${h.coldRate}/turno`);
      if (h.heatRate > 0) hazardTags.push(`🔥 Calor: +${h.heatRate}/turno`);
      if (h.toxicRate > 0) hazardTags.push(`☣️ Toxicidad: +${h.toxicRate}/turno`);
      if (h.staminaDrainMult > 1.0) hazardTags.push(`⚡ Gasto Estamina x${h.staminaDrainMult}`);
      if (hazardTags.length === 0) hazardTags.push('🌱 Clima Templado y Favorable');

      hazardsEl.innerHTML = hazardTags.map(t => `<span class="hazard-badge">${t}</span>`).join(' ');
    }

    if (travelBtn) {
      if (regionId === this.currentRegionId) {
        travelBtn.textContent = '📍 Estás Aquí';
        travelBtn.disabled = true;
      } else {
        travelBtn.textContent = `🚀 Entrar a ${region.name}`;
        travelBtn.disabled = false;
      }
    }
  }

  public show(currentRegionId: string, onTravel: (regionId: string) => void) {
    this.currentRegionId = currentRegionId;
    this.selectedRegionId = currentRegionId;
    this.onTravelCallback = onTravel;
    this.isVisible = true;
    this.overlay?.classList.remove('hidden');
    this.switchView('map');
    this.selectRegion(currentRegionId);
    soundManager.playRunicTuning();
  }

  public hide() {
    this.isVisible = false;
    this.overlay?.classList.add('hidden');
  }
}
