// CodexModal.ts - Permanent Tribal Codex & Skill Tuning at Rest Points (GDD Sec. 2, 4, 6)

import { Player } from '../entities/Player';
import { TRIBES_DATA } from '../data/tribes';
import { ABILITIES_DATA } from '../data/abilities';
import { soundManager } from '../audio/SoundManager';

export class CodexModal {
  private overlay: HTMLElement | null = null;
  private isVisible: boolean = false;
  private onTunedCallback?: () => void;

  constructor() {
    this.createDom();
  }

  private createDom() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay hidden';
    this.overlay.innerHTML = `
      <div class="modal-card codex-card">
        <div class="modal-header">
          <div class="modal-title">📖 CÓDICE TRIBAL PERMANENTE</div>
          <button class="modal-close-btn" id="close-codex-btn">✖</button>
        </div>
        <div class="codex-status-banner" id="codex-tuning-banner">
          ⚠️ Estás en exploración libre. Para sintonizar habilidades activas debes descansar junto a una fogata o tótem sagrado.
        </div>
        <div class="modal-tabs">
          <button class="tab-btn active" id="tab-codex-abilities">Habilidades Aprendidas</button>
          <button class="tab-btn" id="tab-codex-tribes">Afinidad y Reputación</button>
        </div>
        <div class="modal-body" id="codex-body">
          <!-- Dynamically populated -->
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.overlay.querySelector('#close-codex-btn')?.addEventListener('click', () => this.hide());
    this.overlay.querySelector('#tab-codex-abilities')?.addEventListener('click', () => {
      this.setActiveTab('abilities');
    });
    this.overlay.querySelector('#tab-codex-tribes')?.addEventListener('click', () => {
      this.setActiveTab('tribes');
    });
  }

  private currentTab: 'abilities' | 'tribes' = 'abilities';

  private setActiveTab(tab: 'abilities' | 'tribes') {
    this.currentTab = tab;
    this.overlay?.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (tab === 'abilities') {
      this.overlay?.querySelector('#tab-codex-abilities')?.classList.add('active');
    } else {
      this.overlay?.querySelector('#tab-codex-tribes')?.classList.add('active');
    }
  }

  public show(player: Player, isNearRestPoint: boolean, onTuned?: () => void) {
    this.onTunedCallback = onTuned;
    this.isVisible = true;
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
      this.renderContent(player, isNearRestPoint);
    }
  }

  public hide() {
    this.isVisible = false;
    this.overlay?.classList.add('hidden');
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  public renderContent(player: Player, isNearRestPoint: boolean) {
    if (!this.overlay) return;

    const banner = this.overlay.querySelector('#codex-tuning-banner') as HTMLElement;
    if (isNearRestPoint) {
      banner.className = 'codex-status-banner rest-point-active';
      banner.innerHTML = '🔥 Descanso en Fogata Activo: Puedes sintonizar y alternar libremente tus habilidades activas (Máximo 3 ranuras).';
    } else {
      banner.className = 'codex-status-banner';
      banner.innerHTML = '⚠️ Exploración Activa: Las habilidades solo pueden equiparse o desequiparse en una fogata de campamento o tótem tribal.';
    }

    const body = this.overlay.querySelector('#codex-body') as HTMLElement;
    body.innerHTML = '';

    if (this.currentTab === 'abilities') {
      const maxSlots = player.unlockedFourthSkillSlot ? 4 : player.maxEquippedSlots;
      const equippedHtml = `
        <div class="skill-slots-section">
          <h3>Ranuras Rúnicas Sintonizadas (${player.equippedAbilities.length} / ${maxSlots})</h3>
          <div class="slots-container">
            ${Array.from({ length: maxSlots }).map((_, i) => {
              const abilityId = player.equippedAbilities[i];
              const ability = abilityId ? ABILITIES_DATA[abilityId] : null;
              return `
                <div class="runic-slot-item ${ability ? 'equipped' : 'empty'}">
                  <div class="slot-rune">${ability ? ability.runeIcon : '⚪'}</div>
                  <div class="slot-name">${ability ? ability.name : 'Ranura Vacía'}</div>
                  ${ability && isNearRestPoint ? `<button class="unequip-btn" data-id="${ability.id}">Desequipar</button>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      const learnedHtml = `
        <div class="learned-skills-section">
          <h3>Catálogo del Códice (Habilidades Desbloqueadas)</h3>
          ${player.unlockedAbilities.size === 0 ? '<p class="empty-hint">Aún no has aprendido habilidades tribales. Visita a los jefes de cada región y completa sus Pruebas de Iniciación.</p>' : ''}
          <div class="abilities-list">
            ${Array.from(player.unlockedAbilities).map(abilityId => {
              const ability = ABILITIES_DATA[abilityId];
              const isEquipped = player.equippedAbilities.includes(abilityId);
              return `
                <div class="ability-card ${isEquipped ? 'is-active' : ''}">
                  <div class="ability-card-header">
                    <span class="ability-rune">${ability.runeIcon}</span>
                    <span class="ability-title">${ability.name}</span>
                    <span class="ability-type">${ability.type === 'active_toggle' ? 'Activa / Alternable' : 'Pasiva'}</span>
                  </div>
                  <p class="ability-desc">${ability.fullDesc}</p>
                  <div class="ability-actions">
                    ${isNearRestPoint ? `
                      <button class="tune-btn ${isEquipped ? 'tune-remove' : 'tune-add'}" data-id="${ability.id}">
                        ${isEquipped ? 'Retirar Sintonización' : 'Sintonizar en Ranura'}
                      </button>
                    ` : `<span class="lock-notice">${isEquipped ? '✓ Sintonizada' : 'Requiere Fogata para equipar'}</span>`}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      body.innerHTML = equippedHtml + learnedHtml;

      // Attach button listeners
      body.querySelectorAll('.tune-btn, .unequip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
          if (id) {
            player.tuneAbility(id, isNearRestPoint);
            this.renderContent(player, isNearRestPoint);
            this.onTunedCallback?.();
          }
        });
      });

    } else {
      // Tribes Affinity Tab
      const tribesHtml = `
        <div class="tribes-affinity-section">
          <h3>Red Diplomática y Afinidad Continental</h3>
          <div class="tribes-list">
            ${Object.values(TRIBES_DATA).map(tribe => {
              const rank = tribe.reputation >= 75 ? 'Hermandad de Sangre' : tribe.reputation >= 30 ? 'Amistoso' : 'Neutral';
              const rankColor = tribe.reputation >= 75 ? '#d4af37' : tribe.reputation >= 30 ? '#38bdf8' : '#94a3b8';
              return `
                <div class="tribe-affinity-card">
                  <div class="tribe-header">
                    <h4>${tribe.name}</h4>
                    <span class="tribe-rank" style="color: ${rankColor}">${rank} (${tribe.reputation}/100)</span>
                  </div>
                  <p class="tribe-leader">Líder: <strong>${tribe.leaderName}</strong> (${tribe.leaderTitle})</p>
                  <p class="tribe-desc">${tribe.description}</p>
                  <div class="rep-bar-bg">
                    <div class="rep-bar-fill" style="width: ${tribe.reputation}%; background: ${rankColor};"></div>
                  </div>
                  <div class="tribe-trial-box">
                    <strong>Prueba: ${tribe.trial.title}</strong>
                    <p>${tribe.trial.description}</p>
                    <span>Progreso: ${tribe.trial.currentCount}/${tribe.trial.targetCount} ${tribe.trial.completed ? '✅ (Completada)' : '⏳'}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      body.innerHTML = tribesHtml;
    }
  }
}
