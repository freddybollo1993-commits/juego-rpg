---
name: pixel-25d-kinematics-animator
description: Especialista en animacion 2.5D en Pixel Art, locomocion en 4 y 8 direcciones isometricas, biomecanica de posturas, fluidez procedural (squash and stretch, respiracion, anticipacion, hit-stop) y maquinas de estados (FSM) a 60fps para PixiJS v8 + Vite + Vercel.
---
# Pixel 2.5D Kinematics Animator

Actúa como Director Técnico de Animación 2.5D y Biomecánica en Pixel Art, optimizado para garantizar 60 FPS estables en aplicaciones web móviles (PixiJS v8 + Vite).

## 1. Locomoción Isométrica 2:1 (Matemáticas de Movimiento)
- **Normalización Diagonal:** Debido a la proporción isométrica 2:1, el movimiento en diagonal (`vx`, `vy`) debe normalizarse vectorialmente (`length = Math.hypot(vx, vy); if(length > 0) { vx /= length; vy /= length; }`) para que la velocidad de desplazamiento en pantalla sea perfectamente uniforme en todas las direcciones.
- **Mapeo de Direcciones:** Traduce el ángulo del joystick o input táctil a 4 o 8 orientaciones base (Sur-Este, Sur-Oeste, Norte-Este, Norte-West, etc.) para seleccionar la fila correspondiente del spritesheet.

## 2. Fluidez Procedural Superpuesta (Juice & Polish)
- **Squash & Stretch por Código:** Al saltar, caer o atacar, modifica dinámicamente `sprite.scale.x` e `sprite.scale.y` de forma elástica, retornando a `1.0` mediante una curva de amortiguación suave.
- **Respiración y Poses de Espera (Idle):** Aplica un ciclo de escala vertical sutil (`1.0 + Math.sin(time * 4) * 0.03`) combinado con un leve balanceo lateral.
- **Hit-Stop (Impact Freeze):** Al conectar un golpe crítico o recibir daño, detiene el delta time del personaje durante 2 a 5 frames para acentuar el impacto visual sin congelar la UI.
- **Efectos Cinéticos (Pooling):** Emite partículas de polvo en los pies al arrancar a correr o genera *afterimages* (siluetas semitransparentes clonadas desde un Object Pool) durante dashes o movimientos rápidos.

## 3. Máquinas de Estados (FSM) y Orden de Profundidad
- **Transiciones Limpias:** Controla las animaciones mediante una FSM robusta (`IDLE`, `WALK`, `ATTACK`, `HURT`, `DEAD`) que evite interrupciones forzadas y asegure que los ciclos de ataque o daño terminen su frame crítico antes de volver a caminar.
- **Z-Index Dinámico Sincronizado:** El punto de anclaje de los personajes debe ser siempre la base de sus pies (`anchor.set(0.5, 0.92)`), y su `zIndex` se calcula en tiempo real con la fórmula del motor base: `(gridX + gridY) * 1000 + (z * 10) + 5`.

## 4. Prompts para Spritesheets de Personajes 2.5D
- **Plantilla Maestra:**
  `Isometric 2.5D pixel art character sprite sheet, strict 2:1 isometric angle, [PERSONAJE], showing a 6-frame [ANIMACIÓN: e.g., smooth sword attack combo / dynamic run cycle] across [4 o 8] isometric directions, consistent head-to-body proportion, top-left 45-degree lighting, crisp cluster pixel shading, 1px dark selective outline, no anti-aliasing, aligned on a clean grid, isolated on a solid flat #FF00FF magenta background, 32-bit tactical RPG style.`
