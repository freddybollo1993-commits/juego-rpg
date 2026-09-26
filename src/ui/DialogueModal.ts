// DialogueModal.ts - Tribal Interaction, Initiation Trials, Community Tributes & Resonator Gifting (GDD Sec. 2 & 9.2)

import { NPC } from '../entities/NPC';
import { Player } from '../entities/Player';
import { ITEMS_CATALOG } from '../data/items';
import { ABILITIES_DATA } from '../data/abilities';
import { soundManager } from '../audio/SoundManager';

export class DialogueModal {
  private overlay: HTMLElement | null = null;
  private isVisible: boolean = false;
  private currentNpc?: NPC;
  private currentPlayer?: Player;
  private onClosedCallback?: () => void;

  constructor() {
    this.createDom();
  }

  private createDom() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay hidden';
    this.overlay.innerHTML = `
      <div class="modal-card dialogue-card">
        <div class="dialogue-header">
          <div class="dialogue-portrait" id="diag-portrait">👑</div>
          <div class="dialogue-meta">
            <h3 id="diag-name">Nombre de Líder</h3>
            <span id="diag-title">Título Tribal</span>
            <div id="diag-rep-badge" class="rep-badge">Neutral (10/100)</div>
          </div>
          <button class="modal-close-btn" id="close-diag-btn">✖</button>
        </div>
        <div class="dialogue-speech-box">
          <p id="diag-text">El texto del diálogo tribal aparecerá aquí...</p>
        </div>
        <div class="dialogue-actions-box" id="diag-actions">
          <!-- Buttons dynamically injected -->
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.overlay.querySelector('#close-diag-btn')?.addEventListener('click', () => this.hide());
  }

  public show(npc: NPC, player: Player, onClosed?: () => void) {
    this.currentNpc = npc;
    this.currentPlayer = player;
    this.onClosedCallback = onClosed;
    this.isVisible = true;
    this.overlay?.classList.remove('hidden');
    this.render();
  }

  public hide() {
    this.isVisible = false;
    this.overlay?.classList.add('hidden');
    this.onClosedCallback?.();
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  private render() {
    if (!this.overlay || !this.currentNpc || !this.currentPlayer) return;

    const npc = this.currentNpc;
    const player = this.currentPlayer;
    const tribe = npc.tribeData;

    // Header info
    (this.overlay.querySelector('#diag-name') as HTMLElement).innerText = npc.name;
    (this.overlay.querySelector('#diag-title') as HTMLElement).innerText = `${npc.title} — ${tribe.name}`;

    const repRank = tribe.reputation >= 75 ? 'Hermandad de Sangre' : tribe.reputation >= 30 ? 'Amistoso' : 'Neutral';
    const repBadge = this.overlay.querySelector('#diag-rep-badge') as HTMLElement;
    repBadge.innerText = `${repRank} (${tribe.reputation}/100)`;
    repBadge.className = `rep-badge rank-${repRank.toLowerCase().replace(/\s+/g, '-')}`;

    // Select speech according to rank
    let speechLines = tribe.dialogueNeutral;
    if (tribe.reputation >= 75) speechLines = tribe.dialogueRevered;
    else if (tribe.reputation >= 30) speechLines = tribe.dialogueFriendly;
    (this.overlay.querySelector('#diag-text') as HTMLElement).innerText = speechLines[Math.floor(Math.random() * speechLines.length)];

    // Action buttons
    const actionsBox = this.overlay.querySelector('#diag-actions') as HTMLElement;
    actionsBox.innerHTML = '';

    // 1. Community Tribute Option
    const tributeItem = ITEMS_CATALOG[tribe.tributeRequirement.itemId];
    const playerTributeCount = player.getItemCount(tribe.tributeRequirement.itemId);
    const canPayTribute = !tribe.tributeDelivered && playerTributeCount >= tribe.tributeRequirement.amount;

    const tributeBtn = document.createElement('button');
    tributeBtn.className = `dialogue-btn ${canPayTribute ? 'primary' : 'disabled'}`;
    tributeBtn.innerHTML = `🎁 Entregar Tributo Comunitario (${tributeItem.name} ${playerTributeCount}/${tribe.tributeRequirement.amount})`;
    if (tribe.tributeDelivered) {
      tributeBtn.innerHTML = `✅ Tributo Comunitario Entregado`;
      tributeBtn.className = 'dialogue-btn completed';
    } else {
      tributeBtn.onclick = () => {
        if (canPayTribute) {
          player.removeItem(tribe.tributeRequirement.itemId, tribe.tributeRequirement.amount);
          tribe.reputation = Math.min(100, tribe.reputation + 35);
          tribe.tributeDelivered = true;
          soundManager.playRunicTuning();
          this.render();
        }
      };
    }
    actionsBox.appendChild(tributeBtn);

    // 2. Initiation Trial Option
    const trialBtn = document.createElement('button');
    if (!tribe.trial.completed) {
      const isReadyToComplete = tribe.trial.currentCount >= tribe.trial.targetCount;
      trialBtn.className = `dialogue-btn ${isReadyToComplete ? 'primary' : ''}`;
      trialBtn.innerHTML = `⚔️ Prueba de Iniciación: ${tribe.trial.title} (${tribe.trial.currentCount}/${tribe.trial.targetCount}) ${isReadyToComplete ? '¡Completar!' : ''}`;
      trialBtn.onclick = () => {
        if (isReadyToComplete) {
          tribe.trial.completed = true;
          tribe.reputation = Math.min(100, tribe.reputation + tribe.trial.rewardReputation);
          soundManager.playRunicTuning();
          this.render();
        } else {
          alert(`Misión activa: ${tribe.trial.description}\nDerrota a los objetivos requeridos en la región.`);
        }
      };
    } else {
      trialBtn.className = 'dialogue-btn completed';
      trialBtn.innerHTML = `✅ Prueba de Iniciación Superada`;
    }
    actionsBox.appendChild(trialBtn);

    // 3. Ritual of Tuning / Learn Distinctive Ability (GDD Sec. 2.1 & 3)
    const ability = ABILITIES_DATA[tribe.abilityId];
    const hasLearnedAbility = player.unlockedAbilities.has(tribe.abilityId);
    const canLearnAbility = tribe.reputation >= 30 && !hasLearnedAbility;

    const ritualBtn = document.createElement('button');
    ritualBtn.className = `dialogue-btn ${hasLearnedAbility ? 'completed' : canLearnAbility ? 'highlight' : 'disabled'}`;
    ritualBtn.innerHTML = hasLearnedAbility
      ? `✨ Habilidad Aprendida: ${ability.name} (Guardada en Códice)`
      : `🔮 Ritual de Sintonización: Aprender "${ability.name}" (Requiere Rango Amistoso 30+)`;
    ritualBtn.onclick = () => {
      if (canLearnAbility) {
        player.unlockAbility(tribe.abilityId);
        soundManager.playRunicTuning();
        this.render();
      }
    };
    actionsBox.appendChild(ritualBtn);

    // 4. Claim Alien Resonator Material (GDD Sec. 9.2)
    const canClaimResonator = tribe.reputation >= 75 && !tribe.resonatorDelivered;
    const resonatorItem = ITEMS_CATALOG[tribe.resonatorMaterialId];

    const resonatorBtn = document.createElement('button');
    resonatorBtn.className = `dialogue-btn ${tribe.resonatorDelivered ? 'completed' : canClaimResonator ? 'legendary' : 'disabled'}`;
    resonatorBtn.innerHTML = tribe.resonatorDelivered
      ? `💠 Resonador Ancestral Entregado (${tribe.resonatorName})`
      : `🌠 Recibir ${tribe.resonatorName} (Requiere Hermandad de Sangre 75+)`;
    resonatorBtn.onclick = () => {
      if (canClaimResonator) {
        tribe.resonatorDelivered = true;
        player.addItem(tribe.resonatorMaterialId, 1);
        soundManager.playBossPhaseChange();
        this.render();
      }
    };
    actionsBox.appendChild(resonatorBtn);
  }
}
