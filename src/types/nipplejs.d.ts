declare module 'nipplejs' {
  export interface JoystickOutputData {
    angle: {
      radian: number;
      degree: number;
    };
    direction?: {
      x: 'left' | 'right';
      y: 'up' | 'down';
      angle: string;
    };
    distance: number;
    force: number;
    position: {
      x: number;
      y: number;
    };
    pressure: number;
    vector: {
      x: number;
      y: number;
    };
    instance: any;
    identifier: number;
  }

  export interface JoystickManagerOptions {
    zone?: HTMLElement;
    color?: string;
    size?: number;
    threshold?: number;
    fadeTime?: number;
    multitouch?: boolean;
    maxNumberOfNipples?: number;
    dataOnly?: boolean;
    position?: { top?: string; left?: string; right?: string; bottom?: string };
    mode?: 'dynamic' | 'semi' | 'static';
    restJoystick?: boolean;
    restOpacity?: number;
    lockX?: boolean;
    lockY?: boolean;
    catchDistance?: number;
    dynamicPage?: boolean;
    follow?: boolean;
  }

  export interface JoystickManager {
    on(event: string, cb: (evt: any, data: JoystickOutputData) => void): void;
    off(event: string, cb?: Function): void;
    destroy(): void;
  }

  export function create(options?: JoystickManagerOptions): JoystickManager;
}
