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

  // Talent Tree Modal Button (Fase 3.1)
  const talentBtn = document.getElementById('btn-talents');
  talentBtn?.addEventListener('click', () => {
    game.openTalents();
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

  // Bind 2.5D World Map Buttons
  const openWorldMap = () => game.openWorldMap();
  bindTouchOrClick('btn-world-map', openWorldMap);
  bindTouchOrClick('btn-touch-map', openWorldMap);

  // Bind 2.5D Isometric D-Pad (The Wild Darkness style)
  bindTouchOrClick('btn-iso-nw', () => game.stepPlayer(-1, 0));
  bindTouchOrClick('btn-iso-ne', () => game.stepPlayer(0, -1));
  bindTouchOrClick('btn-iso-se', () => game.stepPlayer(1, 0));
  bindTouchOrClick('btn-iso-sw', () => game.stepPlayer(0, 1));
  bindTouchOrClick('btn-iso-wait', () => game.waitPlayer());

  // Bind Touch Bar Action Buttons
  bindTouchOrClick('btn-touch-wait', () => game.waitPlayer());
  bindTouchOrClick('btn-touch-attack', () => game.attackNearest());
  bindTouchOrClick('btn-touch-radial', () => game.openRadialMenu());
  bindTouchOrClick('btn-touch-codex', () => game.openCodex());
  bindTouchOrClick('btn-touch-inv', () => game.openInventory());
  bindTouchOrClick('btn-touch-sacrifice', () => game.triggerSacrificeAction());
  bindTouchOrClick('btn-touch-bow', () => game.triggerBowAction());

  // Direct Click / Tap on Canvas to Interact or Move to Isometric Tile
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const worldX = clickX + game.cameraX;
    const worldY = clickY + game.cameraY;
    const gridPos = (game.grid.constructor as any).screenToGrid(worldX, worldY);
    game.interactTile(gridPos.gx, gridPos.gy);
  });

  // Mouse hover tile highlight
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const hoverY = e.clientY - rect.top;
    const worldX = hoverX + game.cameraX;
    const worldY = hoverY + game.cameraY;
    game.grid.hoveredTile = (game.grid.constructor as any).screenToGrid(worldX, worldY);
  });

  // Desktop Keyboard Controls for Isometric Turn Navigation
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.key === 'e' || e.key === 'E') {
      game.stepPlayer(0, -1); // NE
    } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown' || e.key === 'z' || e.key === 'Z') {
      game.stepPlayer(0, 1); // SW
    } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight' || e.key === 'c' || e.key === 'C') {
      game.stepPlayer(1, 0); // SE
    } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft' || e.key === 'q' || e.key === 'Q') {
      game.stepPlayer(-1, 0); // NW
    } else if (e.key === ' ' || e.key === '.') {
      e.preventDefault();
      game.waitPlayer(); // Rest
    } else if (e.key === 'm' || e.key === 'M') {
      game.openWorldMap();
    } else if (e.key === 'x' || e.key === 'X') {
      game.triggerSacrificeAction();
    }
  });
}

window.addEventListener('DOMContentLoaded', initApp);
