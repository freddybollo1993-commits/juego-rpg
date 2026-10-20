export interface InputState {
  dx: number;
  dy: number;
  isMoving: boolean;
  isRun: boolean;
  isDash: boolean;
  isAttack: boolean;
  angle: number;
}

export class InputManager {
  private keys: Set<string> = new Set();
  public state: InputState = {
    dx: 0,
    dy: 0,
    isMoving: false,
    isRun: false,
    isDash: false,
    isAttack: false,
    angle: 0
  };

  // Triggers garantizados para controles móviles y ratón
  private triggerDash: boolean = false;
  private triggerAttack: boolean = false;

  // Touch joystick flotante multi-touch con Touch ID
  private joystickTouchId: number | null = null;
  private touchOrigin: { x: number; y: number } | null = null;
  private touchCurrent: { x: number; y: number } | null = null;
  public joystickActive: boolean = false;
  public joystickPos: { originX: number; originY: number; currX: number; currY: number } = {
    originX: 0,
    originY: 0,
    currX: 0,
    currY: 0
  };

  constructor(canvas: HTMLCanvasElement) {
    this.setupKeyboard();
    this.setupTouch(canvas);
  }

  public requestDash(): void {
    this.triggerDash = true;
  }

  public requestAttack(): void {
    this.triggerAttack = true;
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') {
        this.triggerDash = true;
      }
      if (e.code === 'KeyJ' || e.code === 'KeyZ') {
        this.triggerAttack = true;
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  private setupTouch(canvas: HTMLCanvasElement): void {
    canvas.addEventListener(
      'touchstart',
      (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          // Mitad izquierda de pantalla: Asignar Joystick táctil
          if (touch.clientX < window.innerWidth * 0.55 && this.joystickTouchId === null) {
            this.joystickTouchId = touch.identifier;
            this.touchOrigin = { x: touch.clientX, y: touch.clientY };
            this.touchCurrent = { x: touch.clientX, y: touch.clientY };
            this.joystickActive = true;
            this.joystickPos.originX = touch.clientX;
            this.joystickPos.originY = touch.clientY;
            this.joystickPos.currX = touch.clientX;
            this.joystickPos.currY = touch.clientY;
          } else if (touch.clientX >= window.innerWidth * 0.55) {
            // Mitad derecha: Ataque táctil directo
            this.triggerAttack = true;
          }
        }
      },
      { passive: false }
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (this.joystickTouchId === null) return;
        for (let i = 0; i < e.touches.length; i++) {
          const touch = e.touches[i];
          if (touch.identifier === this.joystickTouchId) {
            this.touchCurrent = { x: touch.clientX, y: touch.clientY };
            this.joystickPos.currX = touch.clientX;
            this.joystickPos.currY = touch.clientY;
            break;
          }
        }
      },
      { passive: false }
    );

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          this.touchOrigin = null;
          this.touchCurrent = null;
          this.joystickActive = false;
          break;
        }
      }
    };

    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    // Ratón en PC: Clic izquierdo = Ataque, Clic derecho = Dash
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.triggerAttack = true;
      } else if (e.button === 2) {
        this.triggerDash = true;
      }
    });
  }

  public update(): void {
    let rawDx = 0;
    let rawDy = 0;

    // Teclado
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) rawDy -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) rawDy += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) rawDx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) rawDx += 1;

    // Joystick táctil multi-touch
    if (this.touchOrigin && this.touchCurrent) {
      const deltaX = this.touchCurrent.x - this.touchOrigin.x;
      const deltaY = this.touchCurrent.y - this.touchOrigin.y;
      const dist = Math.hypot(deltaX, deltaY);
      const maxRadius = 45;

      if (dist > 6) {
        rawDx = deltaX / Math.max(dist, maxRadius);
        rawDy = deltaY / Math.max(dist, maxRadius);
      }
    }

    // Normalización Vectorial Isométrica 2:1
    const length = Math.hypot(rawDx, rawDy);
    if (length > 0) {
      this.state.dx = rawDx / length;
      this.state.dy = rawDy / length;
      this.state.isMoving = true;
      this.state.angle = Math.atan2(this.state.dy, this.state.dx);
    } else {
      this.state.dx = 0;
      this.state.dy = 0;
      this.state.isMoving = false;
    }

    this.state.isRun = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    // Consumir triggers de Dash y Ataque garantizados
    this.state.isDash = this.keys.has('Space') || this.triggerDash;
    this.state.isAttack = this.triggerAttack || this.keys.has('KeyJ') || this.keys.has('KeyZ');

    this.triggerDash = false;
    this.triggerAttack = false;
  }
}