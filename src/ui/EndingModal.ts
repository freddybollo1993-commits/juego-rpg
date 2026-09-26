// EndingModal.ts - Climax Victory & Branching Epilogue Choice (GDD Sec. 9.5)

import confetti from 'canvas-confetti';
import { soundManager } from '../audio/SoundManager';

export class EndingModal {
  private overlay: HTMLElement | null = null;
  private isVisible: boolean = false;
  private onChosenCallback?: (choice: 'dismantle' | 'integrate') => void;

  constructor() {
    this.createDom();
  }

  private createDom() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay hidden';
    this.overlay.innerHTML = `
      <div class="modal-card ending-card">
        <div class="ending-header">
          <div class="ending-cosmic-symbol">🌌</div>
          <h2>¡VICTORIA CONTINENTAL!</h2>
          <h3>El Heraldo de las Estrellas ha sido Derribado</h3>
        </div>
        <div class="ending-body">
          <p>
            El pulso electromagnético del pecio alienígena se apaga lentamente. Las violentas anomalías climáticas de las cinco regiones comienzan a estabilizarse: la ventisca de la meseta amaina, la niebla venenosa de la ciénaga se disipa y los cielos del continente vuelven a mostrar estrellas pacíficas.
          </p>
          <p>
            Los ancianos y chamanes de las cinco tribus se reúnen junto a ti frente al pecio extraterrestre. Como conquistador, superviviente y portador de la Roca Ancestral, el destino del nuevo mundo queda en tus manos:
          </p>
          <div class="ending-choices">
            <button class="ending-choice-btn btn-dismantle" id="choice-dismantle-btn">
              <span class="choice-title">🌿 OPCIÓN A: Desmantelar la Tecnología Alienígena</span>
              <span class="choice-desc">Destruir los núcleos de terraformación para siempre. Preservar la pureza natural del planeta y el modo de vida tradicional de los clanes nativos.</span>
            </button>
            <button class="ending-choice-btn btn-integrate" id="choice-integrate-btn">
              <span class="choice-title">🧬 OPCIÓN B: Integrar la Biotecnología con las Tribus</span>
              <span class="choice-desc">Fusionar el conocimiento extraterrestre con los saberes chamánicos. Impulsar a la humanidad hacia una nueva era dorada de evolución cósmica.</span>
            </button>
          </div>
          <div class="epilogue-outcome hidden" id="epilogue-outcome">
            <!-- Populated after decision -->
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.overlay.querySelector('#choice-dismantle-btn')?.addEventListener('click', () => {
      this.resolveChoice('dismantle');
    });
    this.overlay.querySelector('#choice-integrate-btn')?.addEventListener('click', () => {
      this.resolveChoice('integrate');
    });
  }

  public show(onChosen?: (choice: 'dismantle' | 'integrate') => void) {
    this.onChosenCallback = onChosen;
    this.isVisible = true;
    this.overlay?.classList.remove('hidden');
    soundManager.playRunicTuning();

    // Trigger victory confetti!
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignore if confetti not supported
    }
  }

  private resolveChoice(choice: 'dismantle' | 'integrate') {
    soundManager.playBossPhaseChange();
    const outcomeBox = this.overlay?.querySelector('#epilogue-outcome') as HTMLElement;
    const choicesBox = this.overlay?.querySelector('.ending-choices') as HTMLElement;
    if (choicesBox) choicesBox.classList.add('hidden');

    if (outcomeBox) {
      outcomeBox.classList.remove('hidden');
      if (choice === 'dismantle') {
        outcomeBox.innerHTML = `
          <div class="outcome-card">
            <h4>🌿 El Gran Desmantelamiento y la Paz Ancestral</h4>
            <p>Junto a los Hijos de la Piedra y los Clanes de la Escarcha, extraes y sepultas en las profundidades de la tierra los reactores alienígenas. El continente florece en armonía natural. Tu nombre es grabado en los tótems sagrados como el Gran Pacificador.</p>
            <button class="continue-roam-btn" id="continue-roam-btn">Exploración Libre (Mundo Pacífico)</button>
          </div>
        `;
      } else {
        outcomeBox.innerHTML = `
          <div class="outcome-card">
            <h4>🧬 El Renacimiento Biotecnológico y la Nueva Era</h4>
            <p>En comunión con los Moradores del Fango y los Nómadas del Bosque, canalizan la energía estelar en la savia de los árboles y la medicina tribal. Nace una nueva civilización capaz de doblegar las estrellas. Eres coronado como el Primer Soberano del Nexo Cósmico.</p>
            <button class="continue-roam-btn" id="continue-roam-btn">Exploración Libre (Poder Absoluto)</button>
          </div>
        `;
      }

      outcomeBox.querySelector('#continue-roam-btn')?.addEventListener('click', () => {
        this.hide();
        this.onChosenCallback?.(choice);
      });
    }
  }

  public hide() {
    this.isVisible = false;
    this.overlay?.classList.add('hidden');
  }

  public isOpen(): boolean {
    return this.isVisible;
  }
}
