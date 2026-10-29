# Isla Desconocida

RPG de supervivencia y exploración **por turnos** en una isla desconocida. Pixel art isométrico 2.5D, ambiente sombrío.

## Pilares del diseño
- **Por turnos, el tiempo avanza con cada acción.** El reloj del mundo no corre solo: mover o esperar consumen minutos de juego (ver `TIME_COST` en [`src/core/TurnSystem.ts`](src/core/TurnSystem.ts)).
- **Exploración sombría.** Niebla de guerra, oscuridad según la hora y el bioma, y un halo de luz alrededor del jugador.
- **Cada bioma es un grupo de mapas** (exterior, poblados, cuevas, mazmorras), enlazados por entradas. Solo existe en memoria el mapa activo, así que sumar mapas no pesa. *(Hoy cada bioma es un único mapa; el sistema de portales es el siguiente paso.)*
- **Pixel art.** El arte actual es provisional y se reemplaza sin tocar código (ver "Arte").

## Estado actual
Base limpia, sin sistemas de combate, objetos ni misiones todavía. Lo que hay:

| | |
|---|---|
| Mapa | **64×64** casillas por bioma |
| Casilla | **80×40 px**, rombo 2:1 **plano** (sin grosor): el piso es un plano continuo que cubre toda la pantalla |
| Biomas | Orilla del Naufragio, Meseta Helada, Taiga, Ciénaga, Cañón, Abismo, Núcleo del Impacto |
| Mundo | Terreno generado con ruido suave (mismo bioma = mismo mapa), escenografía decorativa, clima. La niebla de guerra **oscurece** el piso (visible / recordado / sin explorar) en vez de ocultarlo, así nunca hay vista vacía y cualquier toque cae sobre una casilla |
| Personaje | ~0.9 casillas de alto (36 px), proporción tomada del juego de referencia |
| Reloj | Día/noche por turnos, 10 min de juego por acción |
| Guardado | Automático en cada turno (bioma, posición, turno, hora) |

El código de combate, enemigos, jefe, misiones, talentos, crafteo, tribus y modales anteriores se retiró. **Sigue disponible** en la etiqueta de git `pre-limpieza`:

```bash
git show pre-limpieza:src/entities/Enemy.ts      # ver un archivo viejo
git checkout pre-limpieza -- src/entities/Boss.ts # recuperarlo
```

## Cómo ejecutarlo
```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm run build      # compilar
npm test           # pruebas
```
También con [`start.bat`](start.bat) (desarrollo) o [`start-preview.bat`](start-preview.bat) (versión compilada) en Windows.

Para abrir un bioma concreto: `http://localhost:5173/?biome=frost` (`beach`, `frost`, `forest`, `swamp`, `canyon`, `caverns`, `alien_core`).

## Controles
| | |
|---|---|
| Mover | D-Pad en pantalla · `W A S D` / flechas (ejes) · `Q E Z C` (diagonales) · tocar una casilla |
| Esperar un turno | botón ⏳ · `Espacio` · `.` · tocar la propia casilla |

## Estructura
```
src/
  core/      Game (bucle), IsometricGrid, TileAtlas, PropAtlas, DecorLayer, TurnSystem
  entities/  Player
  systems/   DayNightCycle, WeatherSystem, SaveSystem  (+ __tests__)
  data/      regions (los 7 biomas)
  ui/        HUD
  audio/     SoundManager (pasos y ambiente procedural)
public/
  tiles/     Atlas de suelo por bioma (80×40 px por celda, casilla plana)
  props/     Atlas de escenografía por bioma (64×80 px por celda)
tools/       Generadores de arte provisional (node tools/generate-placeholder-*.mjs)
blender/     Rig de Blender para renderizar criaturas en el ángulo exacto del juego
docs/        Biblia de arte, bestiario por bioma y plantilla guía de criaturas
```

## Arte
- **Suelo y escenografía:** cada bioma tiene un PNG (`public/tiles/<bioma>.png`, `public/props/<bioma>.png`) con una fila por tipo y 3 variantes por fila. Para poner arte propio basta con reemplazar el PNG respetando el diseño de celdas (detalle en [`TileAtlas.ts`](src/core/TileAtlas.ts) y [`PropAtlas.ts`](src/core/PropAtlas.ts)). Si falta la imagen de un suelo se dibujan bloques de color plano; si falta la de escenografía, simplemente no aparece.
- **Criaturas:** [`blender/`](blender/README.md) contiene un rig con la cámara fija (3/4, 18° de inclinación) y render con transparencia real.
- **Referencias:** [`docs/creature-template-guide.png`](docs/creature-template-guide.png), [`docs/CREATURE_BESTIARY_BY_BIOME.md`](docs/CREATURE_BESTIARY_BY_BIOME.md) y [`docs/WORLD_ART_BIBLE_AND_ENVIRONMENT_DESIGN.md`](docs/WORLD_ART_BIBLE_AND_ENVIRONMENT_DESIGN.md). Son documentos de diseño de la visión anterior; úsalos como inspiración de ambientación y paleta.

## Siguientes pasos
1. Sistema de mapas con portales (poblados, cuevas y mazmorras como espacios propios dentro de cada bioma).
2. Recursos, inventario y supervivencia por turnos (hambre, sed, frío).
3. Criaturas y combate por turnos sobre la nueva base.
4. Arte final en pixel art para tiles, escenografía y criaturas.
