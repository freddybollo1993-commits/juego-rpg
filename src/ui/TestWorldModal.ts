// TestWorldModal.ts - Mundo de Prueba (Test Sandbox World) Controller & Art Bible Showcase

import { Game } from '../core/Game';
import { REGIONS_DATA } from '../data/regions';
import { Enemy, EnemyType } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { CONCEPT_ART_MANIFEST } from '../core/AssetManager';
import { soundManager } from '../audio/SoundManager';

export class TestWorldModal {
  private overlay: HTMLElement | null = null;
  private isVisible: boolean = false;
  private game: Game;

  public godMode: boolean = false;
  public infiniteStamina: boolean = false;

  constructor(game: Game) {
    this.game = game;
    this.createDom();
  }

  private createDom() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay hidden';
    this.overlay.innerHTML = `
      <div class="modal-card test-world-card">
        <div class="modal-header">
          <div class="modal-title">🧪 MUNDO DE PRUEBA Y GUÍA MAESTRA DE ARTE (SANDBOX)</div>
          <button class="modal-close-btn" id="close-test-world-btn">✖</button>
        </div>

        <div class="modal-tabs">
          <button class="tab-btn active" id="tab-tw-biomes">🗺️ Biomas (7)</button>
          <button class="tab-btn" id="tab-tw-bestiary">🐺 Bestiario & Criaturas</button>
          <button class="tab-btn" id="tab-tw-art">🎨 Galería Concept Art</button>
          <button class="tab-btn" id="tab-tw-tools">🛠️ Herramientas Sandbox</button>
        </div>

        <div class="modal-body" id="test-world-body">
          <!-- Dynamically loaded content -->
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.overlay.querySelector('#close-test-world-btn')?.addEventListener('click', () => this.hide());

    this.overlay.querySelector('#tab-tw-biomes')?.addEventListener('click', () => this.switchTab('biomes'));
    this.overlay.querySelector('#tab-tw-bestiary')?.addEventListener('click', () => this.switchTab('bestiary'));
    this.overlay.querySelector('#tab-tw-art')?.addEventListener('click', () => this.switchTab('art'));
    this.overlay.querySelector('#tab-tw-tools')?.addEventListener('click', () => this.switchTab('tools'));
  }

  private currentTab: 'biomes' | 'bestiary' | 'art' | 'tools' = 'biomes';

  private switchTab(tab: 'biomes' | 'bestiary' | 'art' | 'tools') {
    this.currentTab = tab;
    this.overlay?.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (tab === 'biomes') this.overlay?.querySelector('#tab-tw-biomes')?.classList.add('active');
    if (tab === 'bestiary') this.overlay?.querySelector('#tab-tw-bestiary')?.classList.add('active');
    if (tab === 'art') this.overlay?.querySelector('#tab-tw-art')?.classList.add('active');
    if (tab === 'tools') this.overlay?.querySelector('#tab-tw-tools')?.classList.add('active');
    this.renderContent();
  }

  public show() {
    this.isVisible = true;
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
      this.renderContent();
    }
  }

  public hide() {
    this.isVisible = false;
    this.overlay?.classList.add('hidden');
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  private renderContent() {
    if (!this.overlay) return;
    const body = this.overlay.querySelector('#test-world-body') as HTMLElement;
    body.innerHTML = '';

    if (this.currentTab === 'biomes') {
      body.innerHTML = `
        <div class="tw-section">
          <h3>Selección Instantánea de Entorno y Bioma (7 Regiones)</h3>
          <p class="tw-hint">Elige cualquier bioma para viajar al instante y verificar shaders, clima, iluminación y vegetación.</p>
          <div class="tw-biomes-grid">
            ${Object.values(REGIONS_DATA).map(reg => `
              <div class="tw-biome-card ${reg.id === this.game.currentRegion.id ? 'current' : ''}">
                <div class="tw-biome-header" style="border-left: 4px solid ${reg.accentColor}">
                  <strong>${reg.name}</strong>
                  <span class="tw-tag">${reg.titleTag}</span>
                </div>
                <p class="tw-desc">${reg.description}</p>
                <div class="tw-stats">
                  <span>Clima: <strong>${reg.weatherType}</strong></span>
                  <span>Luz: <strong>${(reg.ambientLight * 100).toFixed(0)}%</strong></span>
                </div>
                <button class="tw-teleport-btn" data-region="${reg.id}">
                  ${reg.id === this.game.currentRegion.id ? '📍 Bioma Actual' : '🚀 Viajar a este Bioma'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      body.querySelectorAll('.tw-teleport-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const regId = (e.currentTarget as HTMLElement).getAttribute('data-region');
          if (regId) {
            this.game.loadRegion(regId, true);
            this.game.showNotification(`🚀 [Mundo de Prueba] Teletransportado a: ${REGIONS_DATA[regId].name}`);
            this.hide();
          }
        });
      });

    } else if (this.currentTab === 'bestiary') {
      const creatureList: { type: EnemyType | 'boss'; name: string; biome: string; desc: string; shape: string; drop: string }[] = [
        {
          type: 'frost_beast',
          name: 'Bestia de Escarcha',
          biome: 'Meseta Helada',
          desc: 'Cuadrúpedo macizo con cuernos de carámbano y joroba de hielo.',
          shape: 'Triángulos y aristas afiladas (peligro y rudeza nórdica)',
          drop: 'Hielo Fósil, Carne Cruda'
        },
        {
          type: 'stalking_wolf',
          name: 'Lobo Alfa Acechante',
          biome: 'Taiga Ancestral',
          desc: 'Cánido esbelto con pelaje denso erizado y ojos carmesí reflectantes.',
          shape: 'Silueta ágil y colmillos triangulares',
          drop: 'Pelaje de Alfa, Carne Cruda'
        },
        {
          type: 'swamp_horror',
          name: 'Alimaña del Fango',
          biome: 'Ciénaga Negruzca',
          desc: 'Anfibio reptiliano acorazado con verrugas de fósforo tóxico.',
          shape: 'Formas orgánicas onduladas y verrugas bioluminiscentes',
          drop: 'Glándula Abisal, Fango Fosforescente'
        },
        {
          type: 'volcanic_scorpion',
          name: 'Escorpión Volcánico',
          biome: 'Cañón de las Cenizas',
          desc: 'Arácnido colosal con caparazón de pirita ígnea y pinzas de tenaza.',
          shape: 'Aristas basálticas afiladas y aguijón térmico',
          drop: 'Pirita Volcánica, Salitre Cristalizado'
        },
        {
          type: 'crystal_stalker',
          name: 'Acechador de Cristal',
          biome: 'El Abismo Subterráneo',
          desc: 'Entidad arácnida-mineral hecha de prismas de cuarzo afilados.',
          shape: 'Geometría facetada con refracción y dispersión cromática',
          drop: 'Cristal Resonante, Micelio Luminiscente'
        },
        {
          type: 'alien_drone',
          name: 'Dron Deflector Alienígena',
          biome: 'Núcleo del Impacto',
          desc: 'Esfera biomecánica levitante con núcleo ocular de plasma.',
          shape: 'Geometría biomecánica circular con plasma cian/rosa',
          drop: 'Esquirlas de Energía'
        },
        {
          type: 'boss',
          name: 'El Heraldo de las Estrellas (Boss Clímax)',
          biome: 'Núcleo del Impacto',
          desc: 'Coloso biomecánico suspendido con anillos de levitación rúnica en contra-rotación.',
          shape: '4 Fases climáticas (Criogénica, Miasma, Térmica y Penumbra Gravitacional)',
          drop: 'Esencia del Núcleo Alien'
        }
      ];

      body.innerHTML = `
        <div class="tw-section">
          <h3>Invocación de Criaturas y Bestiario de Prueba</h3>
          <p class="tw-hint">Haz clic en "Invocar en Posición Actual" para generar la criatura frente al jugador en el sandbox.</p>
          <div class="tw-creatures-grid">
            ${creatureList.map(c => `
              <div class="tw-creature-card">
                <div class="tw-creature-header">
                  <strong>${c.name}</strong>
                  <span class="tw-biome-tag">${c.biome}</span>
                </div>
                <p class="tw-desc">${c.desc}</p>
                <div class="tw-art-spec">
                  <span>📐 <strong>Shape Language:</strong> ${c.shape}</span>
                  <span>🎁 <strong>Drop Specs:</strong> ${c.drop}</span>
                </div>
                <button class="tw-spawn-btn" data-type="${c.type}">
                  ⚡ Invocar en Posición Actual
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      body.querySelectorAll('.tw-spawn-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const type = (e.currentTarget as HTMLElement).getAttribute('data-type');
          if (type === 'boss') {
            this.game.boss = new Boss(this.game.player.x + 100, this.game.player.y);
            this.game.showNotification('💥 ¡[Mundo de Prueba] Has invocado a EL HERALDO DE LAS ESTRELLAS!');
          } else if (type) {
            const enemy = new Enemy(type as EnemyType, this.game.player.x + 80, this.game.player.y + 40);
            this.game.enemies.push(enemy);
            this.game.showNotification(`⚡ [Mundo de Prueba] Invocado: ${enemy.name}`);
          }
          soundManager.playHit();
          this.hide();
        });
      });

    } else if (this.currentTab === 'art') {
      body.innerHTML = `
        <div class="tw-section">
          <h3>🎨 Galería de Concept Art Guardado y Especificaciones Visuales</h3>
          <p class="tw-hint">Muestra los concept arts generados y guardados en el proyecto junto con su dirección de arte.</p>
          <div class="tw-art-gallery">
            ${Object.values(CONCEPT_ART_MANIFEST).map(art => `
              <div class="tw-art-card">
                <div class="tw-art-img-wrapper">
                  <img src="${art.imagePath}" alt="${art.title}" class="tw-art-img" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'225\\' viewBox=\\'0 0 400 225\\'><rect width=\\'400\\' height=\\'225\\' fill=\\'%231e293b\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'%2394a3b8\\' font-size=\\'16\\' text-anchor=\\'middle\\'>Concept Art: ${art.title}</text></svg>'" />
                </div>
                <div class="tw-art-info">
                  <h4>${art.title}</h4>
                  <p>${art.description}</p>
                  <div class="tw-shape-spec"><strong>Shape Language:</strong> ${art.shapeLanguage}</div>
                  <div class="tw-palette">
                    <strong>Paleta Cromática:</strong>
                    <div class="palette-swatches">
                      ${art.colorPalette.map(color => `<span class="swatch" style="background-color: ${color}" title="${color}"></span>`).join('')}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

    } else if (this.currentTab === 'tools') {
      body.innerHTML = `
        <div class="tw-section">
          <h3>🛠️ Herramientas de Desarrollo y Prueba (Sandbox DevTools)</h3>
          <div class="tw-tools-grid">
            <div class="tw-tool-item">
              <label class="switch-label">
                <input type="checkbox" id="chk-god-mode" ${this.godMode ? 'checked' : ''} />
                <span>🛡️ Modo Dios (Invencibilidad)</span>
              </label>
              <p class="tw-tool-desc">Previene todo daño de vida por combate o peligros climáticos.</p>
            </div>

            <div class="tw-tool-item">
              <label class="switch-label">
                <input type="checkbox" id="chk-inf-stamina" ${this.infiniteStamina ? 'checked' : ''} />
                <span>⚡ Estamina Infinita</span>
              </label>
              <p class="tw-tool-desc">Permite correr sin consumir la barra de energía.</p>
            </div>

            <div class="tw-tool-item">
              <button class="tw-action-btn" id="btn-fill-vitals">❤️ Restaurar Vitales al 100%</button>
              <p class="tw-tool-desc">Rellena vida, estamina, comida, agua y cura toda toxicidad.</p>
            </div>

            <div class="tw-tool-item">
              <button class="tw-action-btn" id="btn-grant-items">🎒 Entregar Todos los Materiales Exóticos</button>
              <p class="tw-tool-desc">Añade 5 unidades de Hielo Fósil, Resina Ancestral, Pirita, etc.</p>
            </div>

            <div class="tw-tool-item">
              <button class="tw-action-btn" id="btn-unlock-all-abilities">📖 Desbloquear Todas las Habilidades Tribales</button>
              <p class="tw-tool-desc">Desbloquea Zancada de Canopia, Corazón de Escarcha, etc.</p>
            </div>

            <div class="tw-tool-item">
              <button class="tw-action-btn" id="btn-toggle-weather">🌪️ Alternar Clima Extremo</button>
              <p class="tw-tool-desc">Cambia secuencialmente el clima activo de la región actual.</p>
            </div>
          </div>
        </div>
      `;

      // Event listeners for tools
      const chkGod = body.querySelector('#chk-god-mode') as HTMLInputElement;
      chkGod?.addEventListener('change', () => {
        this.godMode = chkGod.checked;
        this.game.showNotification(`🛡️ Modo Dios: ${this.godMode ? 'ACTIVADO' : 'DESACTIVADO'}`);
      });

      const chkStam = body.querySelector('#chk-inf-stamina') as HTMLInputElement;
      chkStam?.addEventListener('change', () => {
        this.infiniteStamina = chkStam.checked;
        this.game.showNotification(`⚡ Estamina Infinita: ${this.infiniteStamina ? 'ACTIVADA' : 'DESACTIVADA'}`);
      });

      body.querySelector('#btn-fill-vitals')?.addEventListener('click', () => {
        this.game.player.vitals.health = 100;
        this.game.player.vitals.stamina = 100;
        this.game.player.vitals.hunger = 100;
        this.game.player.vitals.thirst = 100;
        this.game.player.vitals.bodyTemp = 50;
        this.game.player.vitals.toxicity = 0;
        this.game.showNotification('❤️ ¡Vitales restaurados al 100%!');
      });

      body.querySelector('#btn-grant-items')?.addEventListener('click', () => {
        const items = ['fossil_ice', 'ancient_resin', 'abyssal_gland', 'volcanic_pyrite', 'resonant_crystal', 'alien_translator_device', 'branches', 'flint', 'raw_meat'];
        for (const item of items) {
          this.game.player.addItem(item, 5);
        }
        this.game.showNotification('🎒 ¡Materiales exóticos y recursos añadidos al inventario!');
      });

      body.querySelector('#btn-unlock-all-abilities')?.addEventListener('click', () => {
        this.game.player.unlockAbility('canopy_stride');
        this.game.player.unlockAbility('frost_heart');
        this.game.player.unlockAbility('toxic_purge');
        this.game.player.unlockAbility('iron_grip');
        this.game.player.unlockedFourthSkillSlot = true;
        this.game.showNotification('📖 ¡Todas las Habilidades Tribales Desbloqueadas!');
      });

      body.querySelector('#btn-toggle-weather')?.addEventListener('click', () => {
        const weathers: ('clear' | 'blizzard' | 'rain' | 'toxic_fog' | 'sandstorm' | 'alien_aurora')[] = ['clear', 'blizzard', 'rain', 'toxic_fog', 'sandstorm', 'alien_aurora'];
        const currentIdx = weathers.indexOf(this.game.weatherSystem.currentWeather as any);
        const nextWeather = weathers[(currentIdx + 1) % weathers.length];
        this.game.weatherSystem.setWeather(nextWeather);
        this.game.showNotification(`🌪️ Clima cambiado a: ${nextWeather.toUpperCase()}`);
      });
    }
  }
}
