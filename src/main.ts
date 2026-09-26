// main.ts - Game Entry Point, Responsive Viewport Setup & Mobile Controls Binding

import './style.css';
import { Game } from './core/Game';
import { soundManager } from './audio/SoundManager';

function initApp() {
  const container = document.getElementById('app-container') as HTMLElement;
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Instantiate and run game
  const game = new Game(canvas);
  game.start();

  // Register PWA Service Worker for mobile play
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

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

  // Mobile Frame Toggle
  const frameBtn = document.getElementById('btn-toggle-frame');
  frameBtn?.addEventListener('click', () => {
    container.classList.toggle('mobile-frame');
    resizeCanvas();
  });

  // Bind On-Screen Touch Action Buttons
  const btnAttack = document.getElementById('btn-touch-attack');
  btnAttack?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (game.player.attack()) {
      // @ts-expect-error accessing private method for action dispatch
      game.resolveMeleeAttack();
    }
  });
  btnAttack?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (game.player.attack()) {
      // @ts-expect-error accessing private method for action dispatch
      game.resolveMeleeAttack();
    }
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

  const btnRadial = document.getElementById('btn-touch-radial');
  btnRadial?.addEventListener('click', () => {
    game.openRadialMenu();
  });

  const btnCodex = document.getElementById('btn-touch-codex');
  btnCodex?.addEventListener('click', () => {
    game.openCodex();
  });

  const btnInventory = document.getElementById('btn-touch-inv');
  btnInventory?.addEventListener('click', () => {
    game.openInventory();
  });

  const btnSacrifice = document.getElementById('btn-touch-sacrifice');
  btnSacrifice?.addEventListener('click', () => {
    game.triggerSacrificeAction();
  });
}

window.addEventListener('DOMContentLoaded', initApp);
