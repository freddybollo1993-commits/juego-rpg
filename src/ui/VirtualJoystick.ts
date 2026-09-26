// VirtualJoystick.ts - High-performance mobile touch joystick powered by nipplejs

import nipplejs, { JoystickManager } from 'nipplejs';

export class VirtualJoystick {
  private manager: JoystickManager | null = null;

  public init(
    zone: HTMLElement,
    onMove: (x: number, y: number) => void,
    onEnd: () => void
  ) {
    if (this.manager) {
      this.manager.destroy();
    }

    this.manager = nipplejs.create({
      zone,
      mode: 'semi',
      catchDistance: 120,
      color: 'rgba(212, 175, 55, 0.75)',
      size: 85,
      threshold: 0.1
    });

    this.manager.on('move', (_evt, data) => {
      if (data && data.vector) {
        // NippleJS vector.y is positive upwards; canvas y is positive downwards
        const vx = data.vector.x;
        const vy = -data.vector.y;
        onMove(vx, vy);
      }
    });

    this.manager.on('end', () => {
      onEnd();
    });
  }

  public destroy() {
    if (this.manager) {
      this.manager.destroy();
      this.manager = null;
    }
  }
}
