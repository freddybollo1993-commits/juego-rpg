// TalentModal.ts - Tribal Mastery & Character Progression UI (Fase 3.1)

import { Player } from '../entities/Player';
import { TalentNode } from '../systems/TalentSystem';
import { soundManager } from '../audio/SoundManager';

export class TalentModal {
  private container: HTMLDivElement;
  private player: Player | null = null;
  public isOpen: boolean = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'talent-modal';
    this.container.className = 'modal-backdrop hidden';
    document.body.appendChild(this.container);

    // Close when tapping outside
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });
  }

  public open(player: Player) {
    this.player = player;
    this.isOpen = true;
    this.container.classList.remove('hidden');
    soundManager.playRunicTuning();
    this.render();
  }

  public close() {
    this.isOpen = false;
    this.container.classList.add('hidden');
  }

  public render() {
    if (!this.player) return;

    const ts = this.player.talentSystem;
    const p = this.player;

    const xpPercent = Math.min(100, Math.floor((p.xp / p.xpToNextLevel) * 100));

    this.container.innerHTML = `
      <div class="modal-card talent-card">
        <div class="modal-header">
          <div class="talent-header-info">
            <h2>🧬 Maestría Tribal & Talentos</h2>
            <div class="player-level-badge">Nivel <strong>${p.level}</strong></div>
          </div>
          <button class="btn-close" id="btn-close-talents">✕</button>
        </div>

        <!-- Level & XP Bar -->
        <div class="talent-xp-section">
          <div class="xp-labels">
            <span>Experiencia: <strong>${p.xp} / ${p.xpToNextLevel} XP</strong></span>
            <span class="talent-points-counter">⭐ Puntos Disponibles: <strong>${p.talentPoints}</strong></span>
          </div>
          <div class="xp-bar-outer">
            <div class="xp-bar-inner" style="width: ${xpPercent}%"></div>
          </div>
        </div>

        <!-- 3 Paths Grid -->
        <div class="talent-paths-container">
          <!-- Senda del Cazador -->
          <div class="talent-path-col">
            <div class="path-title path-hunter">🏹 Senda del Cazador</div>
            <div class="talent-nodes-list" id="nodes-hunter"></div>
          </div>

          <!-- Senda del Guerrero -->
          <div class="talent-path-col">
            <div class="path-title path-warrior">⚔️ Senda del Guerrero</div>
            <div class="talent-nodes-list" id="nodes-warrior"></div>
          </div>

          <!-- Senda del Chamán -->
          <div class="talent-path-col">
            <div class="path-title path-shaman">🌿 Senda del Chamán</div>
            <div class="talent-nodes-list" id="nodes-shaman"></div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-close-talents')?.addEventListener('click', () => this.close());

    // Populate Talent Nodes
    const hunterContainer = document.getElementById('nodes-hunter');
    const warriorContainer = document.getElementById('nodes-warrior');
    const shamanContainer = document.getElementById('nodes-shaman');

    for (const [, node] of ts.talents.entries()) {
      let targetCol: HTMLElement | null = null;
      if (node.path === 'hunter') targetCol = hunterContainer;
      else if (node.path === 'warrior') targetCol = warriorContainer;
      else if (node.path === 'shaman') targetCol = shamanContainer;

      if (!targetCol) continue;

      const isLearned = node.currentRank >= node.maxRank;
      const canLearn = ts.canUnlock(node.id, p.talentPoints);

      const nodeEl = document.createElement('div');
      nodeEl.className = `talent-node ${isLearned ? 'learned' : canLearn ? 'available' : 'locked'}`;
      nodeEl.innerHTML = `
        <div class="talent-node-header">
          <span class="talent-icon">${node.icon}</span>
          <div class="talent-title-box">
            <div class="talent-name">${node.name}</div>
            <div class="talent-tier">Nivel ${node.tier} • [${node.currentRank}/${node.maxRank}]</div>
          </div>
        </div>
        <div class="talent-desc">${node.description}</div>
        <div class="talent-action-row">
          ${isLearned 
            ? '<span class="badge-learned">✓ Desbloqueado</span>' 
            : `<button class="btn-unlock-talent ${canLearn ? 'active' : 'disabled'}" data-id="${node.id}" ${canLearn ? '' : 'disabled'}>
                ${canLearn ? 'Aprender (1⭐)' : 'Bloqueado'}
              </button>`
          }
        </div>
      `;

      targetCol.appendChild(nodeEl);
    }

    // Attach unlock handlers
    this.container.querySelectorAll('.btn-unlock-talent.active').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (!id || !this.player) return;

        if (this.player.talentSystem.unlockTalent(id, this.player.talentPoints)) {
          this.player.talentPoints--;
          soundManager.playRunicLock();
          this.render();
        }
      });
    });
  }
}

export const talentModal = new TalentModal();
