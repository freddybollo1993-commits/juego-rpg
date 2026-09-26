// Input.ts - Mobile Touch Controls (Virtual Joystick + Thumb Buttons) and Keyboard / Mouse bindings

export class Input {
  public moveX: number = 0;
  public moveY: number = 0;
  public isRunning: boolean = false;
  public attackPressed: boolean = false;
  public dodgePressed: boolean = false;
  public interactPressed: boolean = false;
  public codexPressed: boolean = false;
  public inventoryPressed: boolean = false;
  public sacrificePressed: boolean = false;
  public radialPressed: boolean = false;

  // Touch Virtual Joystick
  private joystickActive: boolean = false;
  private joystickTouchId: number | null = null;
  private joystickStartX: number = 0;
  private joystickStartY: number = 0;
  private joystickCurX: number = 0;
  private joystickCurY: number = 0;
  private joystickRadius: number = 45;

  private keysDown: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement) {
    this.setupKeyboard();
    this.setupTouch(canvas);
  }

  private setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keysDown.add(e.code);
      this.updateKeyboardMovement();

      if (e.code === 'KeyE') this.interactPressed = true;
      if (e.code === 'KeyJ' || e.code === 'KeyF') this.attackPressed = true;
      if (e.code === 'Space' || e.code === 'KeyK') this.dodgePressed = true;
      if (e.code === 'KeyC') this.codexPressed = true;
      if (e.code === 'KeyI') this.inventoryPressed = true;
      if (e.code === 'KeyR') this.sacrificePressed = true;
      if (e.code === 'KeyQ') this.radialPressed = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.isRunning = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
      this.updateKeyboardMovement();

      if (e.code === 'KeyE') this.interactPressed = false;
      if (e.code === 'KeyJ' || e.code === 'KeyF') this.attackPressed = false;
      if (e.code === 'Space' || e.code === 'KeyK') this.dodgePressed = false;
      if (e.code === 'KeyC') this.codexPressed = false;
      if (e.code === 'KeyI') this.inventoryPressed = false;
      if (e.code === 'KeyR') this.sacrificePressed = false;
      if (e.code === 'KeyQ') this.radialPressed = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.isRunning = false;
    });
  }

  public update() {
    this.updateKeyboardMovement();
  }

  public updateKeyboardMovement() {
    let x = 0;
    let y = 0;

    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) y -= 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) y += 1;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) x -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) x += 1;

    if (x !== 0 && y !== 0) {
      const len = Math.sqrt(x * x + y * y);
      x /= len;
      y /= len;
    }

    if (!this.joystickActive) {
      this.moveX = x;
      this.moveY = y;
    }
  }

  private setupTouch(canvas: HTMLCanvasElement) {
    canvas.addEventListener('touchstart', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        // If touch on left half of screen, bind to virtual joystick
        if (touchX < rect.width * 0.45 && !this.joystickActive) {
          this.joystickActive = true;
          this.joystickTouchId = touch.identifier;
          this.joystickStartX = touchX;
          this.joystickStartY = touchY;
          this.joystickCurX = touchX;
          this.joystickCurY = touchY;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.joystickActive) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickTouchId) {
          const rect = canvas.getBoundingClientRect();
          this.joystickCurX = touch.clientX - rect.left;
          this.joystickCurY = touch.clientY - rect.top;

          const dx = this.joystickCurX - this.joystickStartX;
          const dy = this.joystickCurY - this.joystickStartY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 5) {
            const clampedDist = Math.min(dist, this.joystickRadius);
            this.moveX = (dx / dist) * (clampedDist / this.joystickRadius);
            this.moveY = (dy / dist) * (clampedDist / this.joystickRadius);
          } else {
            this.moveX = 0;
            this.moveY = 0;
          }
        }
      }
    }, { passive: false });

    const endTouch = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickTouchId) {
          this.joystickActive = false;
          this.joystickTouchId = null;
          this.moveX = 0;
          this.moveY = 0;
          this.updateKeyboardMovement();
        }
      }
    };

    canvas.addEventListener('touchend', endTouch);
    canvas.addEventListener('touchcancel', endTouch);
  }

  public drawTouchOverlay(ctx: CanvasRenderingContext2D) {
    if (this.joystickActive) {
      ctx.save();
      // Outer joystick base ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.joystickStartX, this.joystickStartY, this.joystickRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner joystick thumb stick
      const dx = this.joystickCurX - this.joystickStartX;
      const dy = this.joystickCurY - this.joystickStartY;
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), this.joystickRadius);
      const angle = Math.atan2(dy, dx);
      const thumbX = this.joystickStartX + Math.cos(angle) * dist;
      const thumbY = this.joystickStartY + Math.sin(angle) * dist;

      ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
      ctx.beginPath();
      ctx.arc(thumbX, thumbY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
