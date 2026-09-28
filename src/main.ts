// main.ts - Game Entry Point, Responsive Viewport Setup & Controls Binding

import './style.css';
import { Game } from './core/Game';
import { soundManager } from './audio/SoundManager';
import { VirtualJoystick } from './ui/VirtualJoystick';
import { SaveSystem } from './systems/SaveSystem';

function initApp() {
  const container = document.getElementById('app-container') as HTMLElement;
  const canvas    = document.getElementById('game-canvas')    as HTMLCanvasElement;

  function resizeCanvas() {
    canvas.width  = container.clientWidth;
    canvas.height = container.clientHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 200));
  resizeCanvas();

  // Instantiate and run game
  const game = new Game(canvas);
  game.start();

  // Register PWA Service Worker
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Audio: unmute on first gesture
  // ──────────────────────────────────────────────────────────────────────────
  const unmuteSound = () => {
    soundManager.init();
    window.removeEventListener('click', unmuteSound);
    window.removeEventListener('touchstart', unmuteSound);
  };
  window.addEventListener('click', unmuteSound);
  window.addEventListener('touchstart', unmuteSound);

  // ──────────────────────────────────────────────────────────────────────────
  // Settings FAB + Panel toggle
  // ──────────────────────────────────────────────────────────────────────────
  const settingsBtn   = document.getElementById('btn-settings')   as HTMLButtonElement;
  const settingsPanel = document.getElementById('settings-panel') as HTMLDivElement;
  const dpadContainer = document.getElementById('touch-controls-left') as HTMLDivElement;

  let panelOpen = false;
  const openPanel  = () => { panelOpen = true;  settingsBtn.classList.add('is-open');    settingsPanel.classList.add('is-open');    settingsPanel.removeAttribute('aria-hidden'); };
  const closePanel = () => { panelOpen = false; settingsBtn.classList.remove('is-open'); settingsPanel.classList.remove('is-open'); settingsPanel.setAttribute('aria-hidden', 'true'); };
  const togglePanel = () => panelOpen ? closePanel() : openPanel();

  settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
  settingsBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); togglePanel(); });

  // Close panel when clicking outside of it
  document.addEventListener('click',      (e) => { if (panelOpen && !settingsPanel.contains(e.target as Node)) closePanel(); });
  document.addEventListener('touchstart', (e) => { if (panelOpen && !settingsPanel.contains(e.target as Node) && e.target !== settingsBtn) closePanel(); });

  // ── Panel: Pantalla completa / Normal ──
  document.getElementById('btn-toggle-frame')?.addEventListener('click', () => {
    container.classList.toggle('mobile-frame');
    if (!container.classList.contains('mobile-frame') && document.fullscreenEnabled && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    resizeCanvas();
    closePanel();
  });

  // ── Panel: Mostrar / Ocultar controles en pantalla ──
  let dpadVisible = true;
  document.getElementById('btn-toggle-dpad')?.addEventListener('click', () => {
    dpadVisible = !dpadVisible;
    dpadContainer.style.display = dpadVisible ? '' : 'none';
    const btn = document.getElementById('btn-toggle-dpad')!;
    btn.textContent = dpadVisible ? '🕹️ Ocultar controles' : '🕹️ Mostrar controles';
    closePanel();
  });

  // ── Panel: Audio On/Off ──
  const muteBtn = document.getElementById('btn-mute');
  muteBtn?.addEventListener('click', () => {
    soundManager.init();
    const isMuted = soundManager.toggleMute();
    muteBtn.textContent = isMuted ? '🔇 Audio: Off' : '🔊 Audio: On';
    closePanel();
  });

  // ── Panel: Mapa del Mundo ──
  document.getElementById('btn-world-map')?.addEventListener('click', () => {
    game.openWorldMap();
    closePanel();
  });

  // ── Panel: Árbol de Talentos ──
  document.getElementById('btn-talents')?.addEventListener('click', () => {
    game.openTalents();
    closePanel();
  });

  // ── Panel: Mundo de Prueba ──
  document.getElementById('btn-test-world')?.addEventListener('click', () => {
    game.openTestWorld();
    closePanel();
  });

  // ── Panel: Reiniciar Partida ──
  document.getElementById('btn-reset-game')?.addEventListener('click', () => {
    SaveSystem.clearSave();
    window.location.reload();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Helper para bind de botones táctiles / click (evita doble-disparo)
  // ──────────────────────────────────────────────────────────────────────────
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
    btn.addEventListener('click', () => {
      if (touchHandled) { touchHandled = false; return; }
      callback();
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // D-Pad isométrico 8 direcciones
  // Eje:       NW(-1,0) NE(0,-1) SE(+1,0) SW(0,+1)
  // Diagonal:  N(-1,-1) E(+1,-1) S(+1,+1) W(-1,+1)
  // ──────────────────────────────────────────────────────────────────────────
  bindTouchOrClick('btn-iso-nw',   () => game.stepPlayer(-1,  0));
  bindTouchOrClick('btn-iso-ne',   () => game.stepPlayer( 0, -1));
  bindTouchOrClick('btn-iso-se',   () => game.stepPlayer( 1,  0));
  bindTouchOrClick('btn-iso-sw',   () => game.stepPlayer( 0,  1));
  bindTouchOrClick('btn-iso-n',    () => game.stepPlayer(-1, -1));
  bindTouchOrClick('btn-iso-s',    () => game.stepPlayer( 1,  1));
  bindTouchOrClick('btn-iso-w',    () => game.stepPlayer(-1,  1));
  bindTouchOrClick('btn-iso-e',    () => game.stepPlayer( 1, -1));
  bindTouchOrClick('btn-iso-wait', () => game.waitPlayer());

  // ──────────────────────────────────────────────────────────────────────────
  // Click / Tap en canvas → mover / interactuar con casilla
  // ──────────────────────────────────────────────────────────────────────────
  canvas.addEventListener('click', (e) => {
    const rect  = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left)  + game.cameraX;
    const worldY = (e.clientY - rect.top)   + game.cameraY;
    const gridPos = (game.grid.constructor as any).screenToGrid(worldX, worldY);
    game.grid.targetTile = { gx: gridPos.gx, gy: gridPos.gy };
    game.interactTile(gridPos.gx, gridPos.gy);
  });

  // Mouse hover → resaltar casilla bajo cursor
  canvas.addEventListener('mousemove', (e) => {
    const rect  = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left)  + game.cameraX;
    const worldY = (e.clientY - rect.top)   + game.cameraY;
    game.grid.hoveredTile = (game.grid.constructor as any).screenToGrid(worldX, worldY);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Teclado — 8 direcciones isométricas
  //   WASD / flechas = 4 ejes principales
  //   Q E Z C        = 4 diagonales
  //   Espacio / .    = esperar turno
  // ──────────────────────────────────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    // Close settings panel with Escape
    if (e.key === 'Escape') { closePanel(); return; }

    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup':    game.stepPlayer( 0, -1); break; // NE
      case 's': case 'arrowdown':  game.stepPlayer( 0,  1); break; // SW
      case 'd': case 'arrowright': game.stepPlayer( 1,  0); break; // SE
      case 'a': case 'arrowleft':  game.stepPlayer(-1,  0); break; // NW
      case 'q': game.stepPlayer(-1, -1); break; // N diagonal
      case 'e': game.stepPlayer( 1, -1); break; // E diagonal
      case 'z': game.stepPlayer(-1,  1); break; // W diagonal
      case 'c': game.stepPlayer( 1,  1); break; // S diagonal
      case ' ':
      case '.':
        e.preventDefault();
        game.waitPlayer();
        break;
      case 'b': game.triggerBowAction();       break;
      case 'f': game.attackNearest();          break;
      case 'i': game.openInventory();          break;
      case 'm': game.openWorldMap();           break;
      case 'x': game.triggerSacrificeAction(); break;
    }
  });
}

window.addEventListener('DOMContentLoaded', initApp);
