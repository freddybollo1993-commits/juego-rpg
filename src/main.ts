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

  // Bind 2.5D Isometric D-Pad — 8 directions (The Wild Darkness style)
  // Axis moves: NW(-1,0), NE(0,-1), SE(+1,0), SW(0,+1)
  // Diagonal moves: N(-1,-1), E(+1,-1), S(+1,+1), W(-1,+1)
  bindTouchOrClick('btn-iso-nw',   () => game.stepPlayer(-1,  0));
  bindTouchOrClick('btn-iso-ne',   () => game.stepPlayer( 0, -1));
  bindTouchOrClick('btn-iso-se',   () => game.stepPlayer( 1,  0));
  bindTouchOrClick('btn-iso-sw',   () => game.stepPlayer( 0,  1));
  bindTouchOrClick('btn-iso-n',    () => game.stepPlayer(-1, -1));
  bindTouchOrClick('btn-iso-s',    () => game.stepPlayer( 1,  1));
  bindTouchOrClick('btn-iso-w',    () => game.stepPlayer(-1,  1));
  bindTouchOrClick('btn-iso-e',    () => game.stepPlayer( 1, -1));
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
  const handleCanvasInteraction = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;
    const worldX = clickX + game.cameraX;
    const worldY = clickY + game.cameraY;
    const gridPos = (game.grid.constructor as any).screenToGrid(worldX, worldY);
    game.grid.targetTile = { gx: gridPos.gx, gy: gridPos.gy };
    game.interactTile(gridPos.gx, gridPos.gy);
  };

  canvas.addEventListener('click', (e) => {
    handleCanvasInteraction(e.clientX, e.clientY);
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

  // Desktop Keyboard Controls for Isometric Turn Navigation — 8 directions
  // Axis:      W/↑=NE,  S/↓=SW,  D/→=SE,  A/←=NW
  // Diagonals: Q=N(-1,-1),  E=S... wait – keep Q=NW-diagonal? Let's map:
  //   Q=N(-1,-1),  E=E(+1,-1),  Z=W(-1,+1),  C=S(+1,+1)
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    switch (e.key.toLowerCase()) {
      // Axis moves
      case 'w': case 'arrowup':    game.stepPlayer( 0, -1); break; // NE
      case 's': case 'arrowdown':  game.stepPlayer( 0,  1); break; // SW
      case 'd': case 'arrowright': game.stepPlayer( 1,  0); break; // SE
      case 'a': case 'arrowleft':  game.stepPlayer(-1,  0); break; // NW
      // Diagonal moves (numpad-style: Q=NW-diag, E=NE-diag, Z=SW-diag, C=SE-diag)
      case 'q': game.stepPlayer(-1, -1); break; // N (iso NW-diagonal)
      case 'e': game.stepPlayer( 1, -1); break; // E (iso NE-diagonal)
      case 'z': game.stepPlayer(-1,  1); break; // W (iso SW-diagonal)
      case 'c': game.stepPlayer( 1,  1); break; // S (iso SE-diagonal)
      // Wait / Rest
      case ' ':
      case '.':
        e.preventDefault();
        game.waitPlayer();
        break;
      // Other actions
      case 'b': game.triggerBowAction(); break;
      case 'f': game.attackNearest(); break;
      case 'i': game.openInventory(); break;
      case 'm': game.openWorldMap(); break;
      case 'x': game.triggerSacrificeAction(); break;
    }
  });
}

window.addEventListener('DOMContentLoaded', initApp);
