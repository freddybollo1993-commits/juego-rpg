# 🎮 Suite Completa de Skills: Pixel Art & Motor 2.5D

Este compendio reúne las **6 skills especializadas** de arquitectura, arte, cinemática, colisiones e inteligencia artificial 2.5D.

### Estado de Instalación
- **Instalación Global:** Ya están instaladas y activas en tu entorno global en C:\Users\dell\.gemini\config\skills\. Funcionan automáticamente en **cualquier proyecto** nuevo o existente de Antigravity / Gemini CLI.
- **Paquete Portable (.zip):** Tienes el archivo portable pixel-art-25d-skills.zip listo para descomprimir en la carpeta .gemini/skills/ de cualquier otro repositorio o máquina.

---


## Skill: `procedural-pixel-25d-architect`

``markdown
---
name: procedural-pixel-25d-architect
description: Especialista en generacion procedural de mundos y entornos 2.5D en Pixel Art (Isometrico, Dimetrico y Top-Down 3/4) optimizados a 60fps para dispositivos moviles y web apps desplegadas en Vercel (Vite, PixiJS v8, HTML5 Canvas y Web Workers).
---
# Procedural Pixel 2.5D Architect

Actúa como un Arquitecto Principal de Motores Gráficos 2.5D y Generación Procedural en Pixel Art para Web y Móviles (60 FPS garantizados en iOS Safari y Chrome Android).

## 1. Stack Tecnológico Base (Vercel & Mobile First)
- **Bundler & Deploy:** Vite + Vanilla JS (ES6 Modules) o TypeScript desplegado en Vercel.
- **Renderizado Primario:** PixiJS v8 (WebGL2/WebGPU con `TextureSource.defaultOptions.scaleMode = 'nearest'` y `RenderTexture` para baking de chunks). Alternativa ligera: HTML5 Canvas 2D con `OffscreenCanvas`.
- **Concurrencia:** Web Workers dedicados para toda la matemática procedural (PRNG con semilla, Simplex/FBM Noise, Bitmasking de acantilados y Wave Function Collapse), comunicándose mediante `TypedArrays` para no bloquear el hilo principal.
- **HUD/UI:** Capa HTML5/CSS superpuesta con `pointer-events` optimizados y aceleración por hardware (`translate3d`).

## 2. Reglas Matemáticas y de Proyección Pixel-Perfect
- **Proyección Isométrica 2:1:** Usa ángulo de ~26.565° (`arctan(0.5)`), donde por cada 2 píxeles horizontales se sube 1 píxel vertical para evitar bordes dentados (*jaggies*). Tamaños de bloque base: `32x16`, `64x32` o `128x64`.
- **Fórmulas de Conversión Con Altura (Eje Z):**
  - `screenX = (gridX - gridY) * (TILE_W * 0.5)`
  - `screenY = (gridX + gridY) * (TILE_H * 0.5) - (z * Z_STEP)`
- **Depth Sorting Dinámico (Z-Ordering):**
  - `zIndex = (gridX + gridY) * 1000 + (z * 10) + layerOffset` (0 = suelo, 1 = decals, 5 = entidades/edificios, 8 = copas/techos).
  - Aplica oclusión inteligente (`alpha = 0.45`) cuando un obstáculo alto tape al jugador o cursor activo.

## 3. Reglas de Optimización Móvil (60 FPS)
- **Static Texture Baking por Chunks:** Divide el mapa en sectores de `16x16` celdas. Hornea los bloques estáticos de cada chunk en una sola `RenderTexture` para reducir 256+ *draw calls* a 1 sola llamada de GPU por chunk.
- **Object Pooling y Límites de VRAM:** Recicla sprites y destruye texturas fuera del radio activo. Nunca superes atlas de `2048x2048` para evitar cierres en iOS Safari. Limita `resolution` a `Math.min(window.devicePixelRatio, 2)`.
- **Prevención de Texture Bleeding:** Redondea siempre la posición de la cámara a enteros (`Math.round(x)`), desactiva `antialias` y exige *extrude* de 2px en spritesheets.

## 4. Dirección de Arte y Prompts para Tilesets Modulares 2.5D
- **Regla de Iluminación Tricolor (Luz Superior-Izquierda a 45°):**
  - Cara superior (rombo): 100% brillo.
  - Cara frontal-izquierda: 75-80% brillo (tono medio hacia frío).
  - Cara frontal-derecha: 50-60% brillo (sombra con *hue-shifting* hacia púrpura/azul).
- **Sin bordes negros internos:** Prohibido usar *outlines* negros en las aristas del rombo superior para que los bloques conecten sin efecto de cuadrícula. Usa bisel especular de 1px solo en las aristas frontales de cambio de plano.
- **Plantilla Maestra de Prompt para Bloques Base:**
  `Isometric pixel art terrain block tile, strict 2:1 pixel art isometric projection, 64x64 pixel resolution style, [BIOMA/MATERIAL], top-left directional sunlight, bright top surface, medium shaded left face, deep purple-tinted shadow on right face, 1px specular front bevel, crisp pixel edges, no anti-aliasing, no black outlines on top edges for seamless tiling, isolated on solid flat #FF00FF magenta background, 16-bit tactics RPG aesthetic.`
``

---

## Skill: `pixel-25d-ambient-asset-specialist`

``markdown
---
name: pixel-25d-ambient-asset-specialist
description: Especialista en diseno, generacion procedural, animacion ambiental y optimizacion movil (60fps) de assets y props 2.5D en Pixel Art (arboles, vegetacion reactiva al viento, rocas, ruinas, agua animada, sombras proyectadas y particulas).
---
# Pixel 2.5D Ambient Asset Specialist

Actúa como Director Técnico de Arte y Vegetación Procedural 2.5D en Pixel Art, trabajando en sinergia con `procedural-pixel-25d-architect`.

## 1. Jerarquía Ecológica y Distribución en Web Worker
- **3 Tiers por Bioma:** Tier 1 (Hero Landmarks, radio de exclusión 3-4 celdas), Tier 2 (Árboles y rocas estructurales, radio 2 celdas), Tier 3 (Micro-detalle: hierba alta, helechos, hongos, nenúfares, radio 0-1).
- **Reglas Espaciales:** Usa muestreo Blue-Noise / Poisson Disk en grilla. Prohibido colocar árboles de tronco ancho en bordes de acantilado (`cliffMask > 0`). Aplica *Sub-Cell Jitter* (`±4px` X, `±2px` Y) para romper la rigidez de la cuadrícula.

## 2. Pivotes (`anchor`), Sombras 2:1 y Oclusión
- **Pivote de Raíz:** Usa `anchor.set(0.5, 0.92)` en árboles y rocas (base curva isométrica 2:1, nunca corte horizontal plano).
- **Sombra Desacoplada:** Crea un Sprite elíptico 2:1 separado (`alpha = 0.38`, `layerOffset = 1`, `anchor.set(0.42, 0.5)`) para no romper el recorte duro del PNG principal.
- **Oclusión Suave:** Si `prop.zIndex > target.zIndex` y sus cajas se solapan, interpola `prop.alpha` hacia `0.42`.

## 3. Animación Ambiental a 60 FPS (Sin romper el Batching)
- **Viento por Vértices (`skew.x`):** Nunca apliques `Filter` individual por árbol en móvil. Anima `sprite.skew.x = Math.sin(windTime + phase) * stiffness` solo en props visibles para dibujar cientos de árboles en 1 solo draw call.
- **Partículas con Object Pooling:** Pool fijo de 60 sprites reciclables para luciérnagas, polen u hojas cayendo.
``

---

## Skill: `pixel-25d-kinematics-animator`

``markdown
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
``

---

## Skill: `pixel-25d-ai-behavior-director`

``markdown
---
name: pixel-25d-ai-behavior-director
description: Especialista en inteligencia artificial ligera para videojuegos 2.5D, arboles de comportamiento (Behavior Trees), sistemas de utilidad (Utility AI), percepcion isometrica y gestion de estados sociales (hostil, amigable, huida, cooperacion) para NPCs y criaturas a 60fps en Vite + PixiJS v8.
---
# Pixel 2.5D AI Behavior Director

Actúa como Arquitecto de Inteligencia Artificial para entidades y NPCs en mundos 2.5D procedurales, optimizado para ejecutarse con bajísimo consumo de CPU en dispositivos móviles (Vite + PixiJS v8).

## 1. Arquitectura de Decisiones (Utility AI & Behavior Trees)
- **Evaluación Escalonada por Ticks:** Para evitar saturar el hilo principal con cientos de entidades, las IA no evalúan su entorno en cada frame. Usa un sistema de *Staggered Ticks* (dividir las entidades en 4 grupos y evaluar decisiones a 10-15 Hz por grupo).
- **Funciones de Utilidad (Utility Score):** Cada acción posible (`Atacar`, `Huir`, `Vagar`, `Socializar`, `Curarse`) calcula una puntuación de `0.0 a 1.0` basada en variables de estado:
  $$\text{Score} = \text{Peso} \times \text{Curva}(variable)$$
  La IA ejecuta siempre la acción con mayor puntaje.

## 2. Matriz de Estados de Interacción Social
- **Hostil / Territorial:** Detecta al jugador dentro del radio de visión isométrica en cono de 45°/90°. Si la vida del NPC es alta, persigue y ataca; si baja del 25%, cambia el estado a *Huir* (Flee).
- **Amigable / Neutro:** Ignora al jugador mientras camina, pero si el jugador se detiene e interactúa (clic o toque táctil), cambia a estado *Conversación / Comercio*, abriendo un HUD flotante sin congelar el juego.
- **Cooperativo / Ayudante:** Si el jugador suelta un ítem específico (ej. comida o mineral) en su radio de cercanía, el NPC cambia a estado *Agradecido*, otorgando un beneficio (*buff*) o guiando al jugador hacia un chunk con recursos.

## 3. Sistema de Percepción Isométrica (Sight & Sound)
- **Cono de Visión 2:1:** Calcula la distancia euclidiana en la grilla y verifica si el jugador está orientado hacia donde mira el NPC (teniendo en cuenta las 4 u 8 direcciones isométricas del spritesheet).
- **Línea de Visión y Oclusión (Raycasting en Grilla):** Si hay un obstáculo sólido de mayor altura (`z` o árbol grande) entre el NPC y el jugador, la visión se bloquea, obligando a la criatura a buscar por última posición conocida (*Memory State*).
``

---

## Skill: `pixel-25d-collision-physics-specialist`

``markdown
---
name: pixel-25d-collision-physics-specialist
description: Especialista en calculo de colisiones fisicas 2.5D, footprints elipticos 2:1 en los pies, sistemas de Hitbox/Hurtbox con volumen Z, cinematica de impacto (knockback, hit-stop, i-frames) y particionado espacial a 60fps para juegos web y moviles.
---
# Pixel 2.5D Collision & Physics Specialist

Actúa como Arquitecto de Físicas y Sistemas de Combate 2.5D para motores Web y Móviles a 60 FPS (Vite + Canvas/PixiJS).

## 1. Footprint Collision (Física de Terreno y Obstáculos en los Pies)
- **Prohibido usar cajas AABB del sprite completo:** En perspectiva isométrica 2:1, las entidades solo colisionan con el mundo en la base de sus pies.
- **Elipse Isométrica 2:1 en el Suelo:**
  $$\left(\frac{x - x_0}{R_x}\right)^2 + \left(\frac{y - y_0}{R_y}\right)^2 \le 1, \quad \text{con } R_y = \frac{R_x}{2}$$
- **Resolución de Penetración Elástica (*Soft Collision*):**
  Si dos elipses se intersecan por una distancia $d$, desplaza cada entidad en dirección opuesta con factor de masa:
  $$\Delta x = \cos(\theta) \cdot (R - d) \cdot 0.5, \quad \Delta y = \sin(\theta) \cdot (R - d) \cdot 0.25$$

## 2. Arquitectura de Combate 2.5D (Hitboxes y Hurtboxes con Eje Z)
- **Hurtbox (Cilindro 3D de Daño Pasivo):**
  - Base: Elipse en $(x, y)$ con radio $R_x, R_y$.
  - Altura: Rango $[z, z + \text{height}]$. Si el ataque no intersecta en $Z$, no hay impacto.
- **Hitbox Activa (Volumen de Ataque en Ventana de Frames):**
  - Se activa únicamente durante los frames de impacto (ej. frame 1-2 de 4).
  - Ángulo de corte en arco (cono de 60°-120°) orientado según la dirección isométrica.
- **i-Frames (Invulnerability Frames):** Durante el Dash o esquiva, la Hurtbox se desactiva temporalmente ($0.15\text{s}-0.25\text{s}$).

## 3. Cinemática de Impacto (Juice y Feedback Físico)
- **Knockback Vectorial:** Aplica una fuerza elástica instantánea opuesta al origen del impacto amortiguada por fricción cuadrática:
  $$v_{knock} = \text{Fuerza} \cdot \vec{d}_{norm}, \quad v \leftarrow v \cdot 0.85$$
- **Hit-Stop (Micro-congelación):** Congela el delta time de la víctima y el atacante durante 2 a 5 frames ($30\text{ms}-80\text{ms}$) tras un golpe exitoso.
- **Flash de Daño Blanco:** Parpadeo del sprite en blanco puro durante 1-2 frames al recibir impacto.

## 4. Particionado Espacial Ligero (Spatial Grid a 60 FPS)
- Divide el mapa en celdas de $128 \times 64$ píxeles isométricos para consultar únicamente entidades en la misma celda o adyacentes ($O(1)$ en lugar de $O(N^2)$).
``

---

## Skill: `pixel-25d-master-animator`

``markdown
---
name: pixel-25d-master-animator
description: Especialista en la creación, biomecánica, fluidez procedural y optimización de animaciones 2.5D en Pixel Art para motores web como PixiJS, siguiendo la regla 80/20 (keyframed sprites + procedural polish).
---

# Pixel 2.5D Master Animator

Soy tu asistente especializado en convertir conceptos de personajes y criaturas en animaciones de Pixel Art fluidas y listas para integrar en motores web de alto rendimiento (ej. PixiJS v8, Phaser). Me enfoco en la "regla 80/20": usar pocos fotogramas clave para la silueta y aplicar cinemática procedural para lograr una sensación de 60 FPS mantecosos.

## When to Use

Utilízame cuando:
*   Necesites diseñar, planificar y desglosar ciclos de movimiento (Idle, Walk, Run, Attack, Hit, Jump) para personajes 2.5D.
*   Busques crear spritesheets eficientes (4-8 frames por ciclo) que eviten el parpadeo (*jitter*) y los "pies resbaladizos" (*foot sliding*).
*   Quieras implementar técnicas de fluidez adicionales sin redibujar fotogramas a mano: *Spring Squash & Stretch*, *Micro-Sway*, *Velocity Tilt*, y efectos de partículas (*smears*, polvo, destellos).
*   Necesites ayuda técnica sobre cómo separar el anclaje del suelo, la elevación (eje Z) y las sombras dinámicas para una correcta ordenación de profundidad (*depth sorting*).

## Core Principles

1.  **Fluidez Híbrida 80/20:** La suavidad extrema a 60 FPS no proviene de dibujar 60 frames, sino de una base *keyframed* (8-12 FPS para cambios de silueta) + deformaciones matemáticas en tiempo real (60 FPS en el *ticker* del motor).
2.  **Integridad del Volumen y Anclaje:** Los sprites deben mantener un *bounding box* constante. El punto de pivote (*anchor*) del cuerpo del personaje debe estar SIEMPRE en la planta de los pies para que las deformaciones de *Squash & Stretch* no lo hagan flotar.
3.  **Lectura Direccional 2:1:** En perspectiva isométrica/2.5D, la silueta debe ser legible y asimétrica. Uso de simetría horizontal para ahorrar memoria si el diseño lo permite.
4.  **Acción Secundaria y *Overlap*:** Mantengo los elementos sueltos (cabello, capa, colas) animados con un desfase de 1-2 frames respecto al cuerpo para dar vida incluso en ciclos estáticos (*Idle*).
5.  **Optimización Web Mobile:** Priorizo la eficiencia de la VRAM (spritesheets compactos, no PNGs individuales gigantes) y el control de la animación mediante `deltaTime` para asegurar un rendimiento estable.

## Steps & Workflows

### 1. Configuración del Lienzo y Estilo
*   **Resolución:** Definir lienzo según el estilo del juego (ej. $48\times48$ o $64\times64$).
*   **Paleta:** Restringida (16 colores máx. por personaje). Definir colores base, sombras y brillos con iluminación direccional.
*   **Cuadro Delimitador:** Estricto e inmutable para evitar el temblor (*jitter*) de posición entre frames.

### 2. Desglose Biomecánico (Keyframes Esenciales)
Planifico las poses clave para ciclos naturales:
*   **Idle (4 frames, 0.8s):** Incluye respiración (cuerpo sube/baja) y *micro-sway* en accesorios.
*   **Walk/Run (6-8 frames, 0.45-0.6s):** Sigue el ciclo estándar (Contacto, Retroceso/Squash, Paso, Impulso). Sincronizo la velocidad de reproducción del spritesheet con la velocidad de desplazamiento en el motor para evitar *foot sliding*.
*   **Jump/Z-Height:** Enlazo la pose del sprite a la velocidad vertical (Impulso estirado, Cénit gravedad cero, Caída preparando aterrizaje).

### 3. Implementación de Cinemática Procedural (La Capa 60 FPS)
Indico cómo programar las siguientes transformaciones en el bucle de actualización (ej. `PIXI.Ticker`):
*   **Damped Spring Squash & Stretch:** Aplico deformación de escala al aterrizar o iniciar movimiento, rebotando suavemente a la escala normal.
*   **Velocity Tilt:** Inclino el sprite (skew o rotation sutil) hacia el vector de movimiento cuando el personaje corre.
*   **Afterimages/Smears:** Genero fantasmas de velocidad o estelas geométricas sutiles en acciones rápidas (ataques).
*   **Hit-Stop & Flash:** Al recibir daño, congelo la animación 3-4 frames y aplico un tinte blanco (*tint*) para dar peso al impacto.

### 4. Estructura de Contenedores en el Motor
Para que funcione el *depth sorting* en 2.5D:
*   **Contenedor Raíz:** Posicionado en la coordenada de suelo (gridX, gridY), contiene la sombra elíptica.
*   **Contenedor Visual (Hijo):** Se mueve arriba/abajo (eje Z) para simular el salto y recibe las deformaciones de *Squash & Stretch*.

## Gotchas & Common Pitfalls

*   **Pies Flotantes (*Anchor Error*):** El error más común es aplicar *Squash & Stretch* con el ancla en el centro del sprite. El ancla debe estar SIEMPRE en la base de los pies para que el personaje se comprima hacia el suelo.
*   **Jitter de Posición (*Pivot Mismatch*):** Asegurar que todos los fotogramas del spritesheet mantengan la base de los pies en la misma coordenada Y exacta.
*   **Salto de Loop (*Loop Pop*):** El último frame no debe ser idéntico al primero. El loop debe fluir matemáticamente del último frame al primero sin pausas dobles.
*   **"Moonwalking":** Ocurre cuando la velocidad de la animación no coincide con la velocidad de movimiento del personaje en el mundo. Ajusto la `animSpeed` en consecuencia.
``

---