// main.ts - Punto de entrada: lienzo responsivo, controles (D-Pad isometrico, teclado, toque) y panel de opciones.

import './style.css';
import { Game } from './core/Game';
import { soundManager } from './audio/SoundManager';
import { SaveSystem } from './systems/SaveSystem';

function initApp() {
  const container = document.getElementById('app-container') as HTMLElement;
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 200));
  resizeCanvas();

  // ?biome=frost abre directamente ese bioma (util para revisar cada mapa)
  const requestedBiome = new URLSearchParams(window.location.search).get('biome');
  const game = new Game(canvas, requestedBiome);
  game.start();

  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Audio: los navegadores exigen un gesto del usuario antes de sonar
  const unmuteSound = () => {
    soundManager.init();
    window.removeEventListener('click', unmuteSound);
    window.removeEventListener('touchstart', unmuteSound);
  };
  window.addEventListener('click', unmuteSound);
  window.addEventListener('touchstart', unmuteSound);

  // ── Boton de opciones y panel desplegable ──
  const settingsBtn = document.getElementById('btn-settings') as HTMLButtonElement;
  const settingsPanel = document.getElementById('settings-panel') as HTMLDivElement;
  const dpadContainer = document.getElementById('touch-controls-left') as HTMLDivElement;

  let panelOpen = false;
  const openPanel = () => { panelOpen = true; settingsBtn.classList.add('is-open'); settingsPanel.classList.add('is-open'); settingsPanel.removeAttribute('aria-hidden'); };
  const closePanel = () => { panelOpen = false; settingsBtn.classList.remove('is-open'); settingsPanel.classList.remove('is-open'); settingsPanel.setAttribute('aria-hidden', 'true'); };
  const togglePanel = () => (panelOpen ? closePanel() : openPanel());

  settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
  settingsBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); togglePanel(); });
  document.addEventListener('click', (e) => { if (panelOpen && !settingsPanel.contains(e.target as Node)) closePanel(); });
  document.addEventListener('touchstart', (e) => { if (panelOpen && !settingsPanel.contains(e.target as Node) && e.target !== settingsBtn) closePanel(); });

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

  let dpadVisible = true;
  document.getElementById('btn-toggle-dpad')?.addEventListener('click', () => {
    dpadVisible = !dpadVisible;
    dpadContainer.style.display = dpadVisible ? '' : 'none';
    const btn = document.getElementById('btn-toggle-dpad')!;
    btn.textContent = dpadVisible ? '🕹️ Ocultar controles' : '🕹️ Mostrar controles';
    closePanel();
  });

  const muteBtn = document.getElementById('btn-mute');
  muteBtn?.addEventListener('click', () => {
    soundManager.init();
    const isMuted = soundManager.toggleMute();
    muteBtn.textContent = isMuted ? '🔇 Audio: Off' : '🔊 Audio: On';
    closePanel();
  });

  document.getElementById('btn-reset-game')?.addEventListener('click', () => {
    SaveSystem.clearSave();
    // Quita ?biome= para volver al inicio normal
    window.location.href = window.location.pathname;
  });

  // ── Botones tactiles / clic sin doble disparo ──
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

  // D-Pad isometrico de 8 direcciones
  //   Ejes:       NO(-1,0)  NE(0,-1)  SE(+1,0)  SO(0,+1)
  //   Diagonales: N(-1,-1)  E(+1,-1)  S(+1,+1)  O(-1,+1)
  bindTouchOrClick('btn-iso-nw', () => game.stepPlayer(-1, 0));
  bindTouchOrClick('btn-iso-ne', () => game.stepPlayer(0, -1));
  bindTouchOrClick('btn-iso-se', () => game.stepPlayer(1, 0));
  bindTouchOrClick('btn-iso-sw', () => game.stepPlayer(0, 1));
  bindTouchOrClick('btn-iso-n', () => game.stepPlayer(-1, -1));
  bindTouchOrClick('btn-iso-s', () => game.stepPlayer(1, 1));
  bindTouchOrClick('btn-iso-w', () => game.stepPlayer(-1, 1));
  bindTouchOrClick('btn-iso-e', () => game.stepPlayer(1, -1));
  bindTouchOrClick('btn-iso-wait', () => game.waitPlayer());

  // Toque / clic en el mapa: da un paso hacia esa casilla (o espera si es la propia)
  canvas.addEventListener('click', (e) => game.handleCanvasClick(e.clientX, e.clientY));
  canvas.addEventListener('mousemove', (e) => game.handleCanvasHover(e.clientX, e.clientY));

  // Teclado: WASD / flechas = ejes, Q E Z C = diagonales, Espacio o . = esperar
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === 'Escape') { closePanel(); return; }

    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup': game.stepPlayer(0, -1); break;
      case 's': case 'arrowdown': game.stepPlayer(0, 1); break;
      case 'd': case 'arrowright': game.stepPlayer(1, 0); break;
      case 'a': case 'arrowleft': game.stepPlayer(-1, 0); break;
      case 'q': game.stepPlayer(-1, -1); break;
      case 'e': game.stepPlayer(1, -1); break;
      case 'z': game.stepPlayer(-1, 1); break;
      case 'c': game.stepPlayer(1, 1); break;
      case ' ':
      case '.':
        e.preventDefault();
        game.waitPlayer();
        break;
    }
  });
}

window.addEventListener('DOMContentLoaded', initApp);
