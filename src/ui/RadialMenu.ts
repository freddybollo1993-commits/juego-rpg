// RadialMenu.ts - Mobile Thumb-Friendly Radial Action Wheel (GDD Sec. 6)

export interface RadialOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  action: () => void;
}

export class RadialMenu {
  private overlay: HTMLElement | null = null;
  private isVisible: boolean = false;
  private options: RadialOption[] = [];

  constructor() {
    this.createDom();
  }

  private createDom() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'radial-menu-overlay hidden';
    this.overlay.innerHTML = `
      <div class="radial-center" id="radial-center">
        <button class="radial-close-btn" id="radial-close-btn">✖</button>
        <div class="radial-items-container" id="radial-items"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.overlay.querySelector('#radial-close-btn')?.addEventListener('click', () => this.hide());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
  }

  public open(options: RadialOption[]) {
    this.options = options;
    this.isVisible = true;
    if (!this.overlay) return;

    this.overlay.classList.remove('hidden');
    const container = this.overlay.querySelector('#radial-items') as HTMLElement;
    container.innerHTML = '';

    const count = options.length;
    const radius = 95; // px from center

    options.forEach((opt, idx) => {
      const angle = (idx / count) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const btn = document.createElement('button');
      btn.className = 'radial-item-btn';
      btn.style.transform = `translate(${x}px, ${y}px)`;
      btn.style.borderColor = opt.color;
      btn.innerHTML = `
        <span class="radial-icon">${opt.icon}</span>
        <span class="radial-label">${opt.label}</span>
      `;
      btn.onclick = (e) => {
        e.stopPropagation();
        this.hide();
        opt.action();
      };
      container.appendChild(btn);
    });
  }

  public hide() {
    this.isVisible = false;
    this.overlay?.classList.add('hidden');
  }

  public isOpen(): boolean {
    return this.isVisible;
  }
}
