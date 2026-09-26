// main.ts - Game Entry Point, Responsive Viewport Setup & Mobile Controls Binding

import './style.css';
import { Game } from './core/Game';
import { soundManager } from './audio/SoundManager';
import { VirtualJoystick } from './ui/VirtualJoystick';
import { SaveSystem } from './systems/SaveSystem';

function initApp() {
  const container = document.getElementById('app-container') as HTMLElement;
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 200);
  });
  resizeCanvas();

  // Instantiate and run game
  const game = new Game(canvas);
  game.start();

  // Register PWA Service Worker for mobile play
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Mobile Virtual Joystick (NippleJS) bound to touch-controls-left zone
  const touchZone = document.getElementById('touch-controls-left') || container;
  const joystick = new VirtualJoystick();
  joystick.init(
    touchZone,
    (vx, vy) => {
      game.input.moveX = vx;
      game.input.moveY = vy;
    },
    () => {
      game.input.moveX = 0;
      game.input.moveY = 0;
    }
  );

  // Audio unmute on first gesture
  const unmuteSound = () => {
    soundManager.init();
    window.removeEventListener('click', unmuteSound);
    window.removeEventListener('touchstart', unmuteSound);
  };
  window.addEventListener('click', unmuteSound);
  window.addEventListener('touchstart', unmuteSound);

  // Mute button
  const muteBtn = document.getElementById('btn-mute');
  muteBtn?.addEventListener('click', () => {
    soundManager.init();
    const isMuted = soundManager.toggleMute();
    muteBtn.innerText = isMuted ? '🔇 Mute' : '🔊 Audio';
  });

  // Mobile Frame / Fullscreen Toggle
  const frameBtn = document.getElementById('btn-toggle-frame');
  frameBtn?.addEventListener('click', () => {
    container.classList.toggle('mobile-frame');
    if (!container.classList.contains('mobile-frame') && document.fullscreenEnabled && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    resizeCanvas();
  });

  // Test World Sandbox Button
  const testWorldBtn = document.getElementById('btn-test-world');
  testWorldBtn?.addEventListener('click', () => {
    game.openTestWorld();
  });

  // Reset Game & Clear LocalStorage Button
  const resetBtn = document.getElementById('btn-reset-game');
  resetBtn?.addEventListener('click', () => {
    SaveSystem.clearSave();
    window.location.reload();
  });

  // Helper for touch/mouse events binding
  const bindTouchOrClick = (elementId: string, callback: () => void) => {
    const btn = document.getElementById(elementId);
    if (!btn) return;
    let touchHandled = false;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      touchHandled = true;
      callback();
    });

    btn.addEventListener('click', (e) => {
      if (touchHandled) {
        touchHandled = false;
        return;
      }
      callback();
    });
  };

  // Bind On-Screen Touch Action Buttons
  const btnAttack = document.getElementById('btn-touch-attack');
  const triggerAttack = () => {
    if (game.player.attack()) {
      // @ts-expect-error accessing private method for action dispatch
      game.resolveMeleeAttack();
    }
  };
  btnAttack?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    triggerAttack();
  });
  btnAttack?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    triggerAttack();
  });

  const btnSprint = document.getElementById('btn-touch-sprint');
  const startSprint = (e: Event) => {
    e.preventDefault();
    game.input.isRunning = true;
  };
  const endSprint = (e: Event) => {
    e.preventDefault();
    game.input.isRunning = false;
  };
  btnSprint?.addEventListener('touchstart', startSprint);
  btnSprint?.addEventListener('touchend', endSprint);
  btnSprint?.addEventListener('mousedown', startSprint);
  btnSprint?.addEventListener('mouseup', endSprint);

  bindTouchOrClick('btn-touch-radial', () => game.openRadialMenu());
  bindTouchOrClick('btn-touch-codex', () => game.openCodex());
  bindTouchOrClick('btn-touch-inv', () => game.openInventory());
  bindTouchOrClick('btn-touch-sacrifice', () => game.triggerSacrificeAction());
  bindTouchOrClick('btn-touch-dodge', () => game.triggerDodgeAction());
}

window.addEventListener('DOMContentLoaded', initApp);
