# 🎨 Guía Maestra de Arte, Entornos, Criaturas y Texturas
## *World Art Bible & Technical Asset Specification*
**Proyecto:** RPG Medieval de Supervivencia y Acción Móvil  
**Versión:** 2.0 (Producción Visual y Recreación de Mundos)

---

## 🧭 1. Filosofía Visual y Lenguaje de Formas (*Art Direction*)

### 1.1 Tono y Atmósfera General
El mundo combina el **Dark Medieval Survival** (crudeza, supervivencia ante inclemencias climáticas, materiales desgastados, cuero, hueso, piedra y madera tallada) con una **Infiltración Biomecánica Extraterrestre** (estructuras orgánicas cristalinas, aleaciones no euclidianas, líneas de plasma frío y mutaciones biológicas).

### 1.2 *Shape Language* (Geometría Emocional)
* **Triángulos & Aristas Afiladas (Peligro y Hostilidad):** Dominan en la Meseta Helada (carámbanos, riscos cortantes), el Cañón de Cenizas (crestas de roca basáltica) y en los depredadores (garras de lobos, aguijones de escorpiones, cuernos de bestias).
* **Círculos & Formas Orgánicas Onduladas (Misterio y Mutación):** Dominan en la Ciénaga Negruzca (esporas, miasmas, verrugas bioluminiscentes) y en las cápsulas de terraformación alienígena.
* **Cuadrados & Bloques Ciclópeos (Solidez Ancestral y Opresión):** Dominan en las ruinas subterráneas de los Hijos de la Piedra y en las defensas empalizadas de los Clanes de la Escarcha.

---

## 🗺️ 2. Diseño de Entornos y Ambientes Regionales (7 Biomas)

### 🌊 2.1 Orilla del Naufragio (*Costa Olvidada - Prólogo*)
* **Mood:** Desolación, humedad helada, restos de expedición fallida.
* **Paleta Cromática:**
  * Dominante (Arena y roca húmeda): `#B0A880`, `#5A554C`
  * Secundaria (Mar gélido y espuma): `#4F728C`, `#2B4353`
  * Acento (Fogatas y maderas astilladas): `#E76F51`, `#8B4513`
* **Composición por Planos:**
  * *Primer Plano (FG):* Vigas de roble quebrado clavadas en la arena, algas oscuras, conchas marinas trituradas, estelas de espuma marina.
  * *Plano Medio (MG):* El casco partido del galeón encallado, la hoguera improvisada de supervivencia, el altar de la Roca Ancestral con glifos grabados.
  * *Fondo (BG):* Acantilados oscuros coronados por coníferas sumergidas en niebla salina matutina; cielo plomizo con gaviotas lejanas.
* **Iluminación:** Luz rasante fría (6000K, 0.85 int), reflejos especulares en charcos de agua salada.

---

### ❄️ 2.2 La Meseta Helada de la Escarcha (*Tundra y Alta Montaña*)
* **Mood:** Aislamiento glacial, viento aullante, rudeza nórdica, supervivencia límite.
* **Paleta Cromática:**
  * Dominante (Nieve compacta y hielo glaciar): `#D6E6F2`, `#A4C3D2`
  * Secundaria (Roca de pizarra y pizarra congelada): `#4A5568`, `#2D3748`
  * Acento (Fuegos tribales y tótems rúnicos): `#00F5D4`, `#FF9F1C`
* **Composición por Planos:**
  * *Primer Plano (FG):* Rocas cubiertas de escarcha cristalina, cráneos de bestias tallados como balizas de advertencia, ventisca arrastrando partículas de nieve.
  * *Plano Medio (MG):* Bastión de los Clanes de la Escarcha con empalizadas de troncos cubiertos de pieles de mamut/bestia, carpas de cuero grueso, monolitos con runas criogénicas de color cian brillante.
  * *Fondo (BG):* Picos glaciares monumentales que rasgan nubes de tormenta gris oscura; auroras boreales tenues en el crepúsculo.
* **Shaders & VFX:** Partículas dinámicas de nieve horizontal, shader de acumulación de escarcha en bordes de pantalla y suelo.

---

### 🌲 2.3 La Taiga Ancestral (*Bosque Profundo y Canopia*)
* **Mood:** Bosque milenario misterioso, densa penumbra, fauna acechante, humedad vegetal.
* **Paleta Cromática:**
  * Dominante (Follaje de coníferas y musgo húmedo): `#2D4A22`, `#1E3316`
  * Secundaria (Corteza de pino ancestral y humus): `#3E2723`, `#5D4037`
  * Acento (Resina milenaria y bayas silvestres): `#FFB703`, `#9B2226`
* **Composición por Planos:**
  * *Primer Plano (FG):* Raíces monumentales cubiertas de líquenes, helechos gigantes, piñas caídas y niebla baja a ras de suelo.
  * *Plano Medio (MG):* Plataformas suspendidas en las copas de los árboles conectadas por puentes de lianas (Aldea Nómada), tótems de madera tallada con ojos de ágata.
  * *Fondo (BG):* Muralla infinita de pinos centenarios entrecruzados donde los rayos de sol apenas se filtran en haces volumétricos (*god rays*).
* **Iluminación:** Luz filtrada verde oliva oscuro (ambientLight: 0.65) con haces de luz dorada puntual.

---

### ☣️ 2.4 La Ciénaga Negruzca (*Pantano Venenoso y Aguas Negras*)
* **Mood:** Putrefacción biológica, miasma asfixiante, misterio alienígena latente.
* **Paleta Cromática:**
  * Dominante (Agua estancada y lodo podrido): `#2B3A27`, `#1D261A`
  * Secundaria (Miasma gaseoso y vegetación muerta): `#4D6A34`, `#283618`
  * Acento (Bioluminiscencia de fango fosforescente y hongos tóxicos): `#70E000`, `#38B000`
* **Composición por Planos:**
  * *Primer Plano (FG):* Charcas burbujeantes de lodo viscoso verde esmeralda, raíces de manglar retorcidas como dedos esqueléticos, carrizos marchitos.
  * *Plano Medio (MG):* Choza comunal sobre pilotes de madera verde empapada (Aldea de Morgath), calderos con ungüentos hirviendo, esporas flotantes.
  * *Fondo (BG):* Niebla espesa y verdosa que anula el horizonte; siluetas de árboles carcomidos por hongos parásitos alienígenas.
* **Shaders & VFX:** Niebla volumétrica verde con ondulación sinusoidal, burbujas de gas tóxico que estallan dejando nubes de partículas dañinas.

---

### 🏜️ 2.5 El Cañón de las Cenizas (*Estepa Árida y Yermos Rocosos*)
* **Mood:** Calor sofocante, tierra calcinada, viento abrasador, tormentas de arena.
* **Paleta Cromática:**
  * Dominante (Arcilla roja y roca de arenisca calcinada): `#964B28`, `#6F1D1B`
  * Secundaria (Arena dorada y ceniza volcánica): `#DDA15E`, `#BC6C25`
  * Acento (Vetas de pirita volcánica y destellos de salitre): `#FFBA08`, `#F4A261`
* **Composición por Planos:**
  * *Primer Plano (FG):* Fisuras humeantes en el suelo desértico, costras de salitre blanco, esqueletos de animales desecados.
  * *Plano Medio (MG):* Campamento de tiendas de lino grueso refractario tensadas entre peñascos (Caminantes del Sol), fogatas de brasas perpetuas.
  * *Fondo (BG):* Paredes colosales de cañón esculpidas por el viento, conos volcánicos extintos en el horizonte bajo un sol blanco cegador.
* **Shaders & VFX:** Distorsión por refracción de calor (*Heat Shimmer shader*), ráfagas de polvo y arena ocre arrastradas por el viento.

---

### 🔮 2.6 El Abismo Subterráneo (*Cavernas de Hipercristal y Penumbra*)
* **Mood:** Oscuridad solemne, ecos profundos, maravilla mística, peligro de derrumbe.
* **Paleta Cromática:**
  * Dominante (Basalto negro y pizarra profunda): `#1A162B`, `#0E0B17`
  * Secundaria (Ríos subterráneos y vapores minerales): `#241E38`, `#3F37C9`
  * Acento (Hipercristales resonantes y micelio luminoso): `#7209B7`, `#4CC9F0`, `#F72585`
* **Composición por Planos:**
  * *Primer Plano (FG):* Estalactitas afiladas goteando agua mineralizada, racimos de cristales resonantes que pulsan al recibir impacto acústico.
  * *Plano Medio (MG):* Santuario excavado de los Hijos de la Piedra con columnas ciclópeas de granito, puentes colgantes sobre fosas sin fondo.
  * *Fondo (BG):* Bóvedas titánicas donde colonias de micelio luminiscente simulan un cielo estrellado artificial bajo la tierra.
* **Iluminación:** Penumbra crítica (ambientLight: 0.15), requiere la *Linterna Espectral* o la habilidad *Visión Espectral*.

---

### 🛸 2.7 El Núcleo del Impacto (*Pecio Extraterrestre y Reactor*)
* **Mood:** Trascendencia cósmica, terraformación violenta, tecnología alienígena incomprensible.
* **Paleta Cromática:**
  * Dominante (Aleación biomecánica alienígena): `#0A141A`, `#123E4F`
  * Secundaria (Condensadores cuánticos y plasma): `#03045E`, `#023E8A`
  * Acento (Anillos de energía, auroras y núcleo del Heraldo): `#00F5D4`, `#F72585`, `#7209B7`
* **Composición por Planos:**
  * *Primer Plano (FG):* Cables orgánicos y zarcillos biomecánicos pulsantes incrustados en la roca fundida, fragmentos de placas antigravitatorias.
  * *Plano Medio (MG):* La plataforma del Reactor de Terraformación con tres anillos flotantes que giran en contra-rotación; el Heraldo de las Estrellas levitando en el vórtice central.
  * *Fondo (BG):* La bóveda abierta al cielo espacial con una aurora cósmica hiper-dimensional que distorsiona las estrellas.
* **Shaders & VFX:** Campo de fuerza esférico refractario, distorsión de lente por gravedad cuasi-singular (*Black Hole lens flare*).

---

## 🐺 3. Bestiario de Criaturas y Entidades

| Criatura / Entidad | Bioma Principal | Silueta y Shape Language | Comportamiento & VFX | Drop Principal |
| :--- | :--- | :--- | :--- | :--- |
| **Bestia de Escarcha** | Meseta Helada | Cuadrúpedo macizo con cuernos de carámbano y joroba de hielo | Embestida frontal, aliento gélido con partículas de congelación | `fossil_ice`, `raw_meat` |
| **Lobo Alfa Acechante** | Taiga Ancestral | Cánido esbelto, pelaje denso erizado, ojos carmesí reflectantes | Caza en jauría, flanqueo rápido, aullido que alerta a la manada | `alpha_fur`, `raw_meat` |
| **Alimaña del Fango** | Ciénaga Negruzca | Anfibio reptiliano acorazado con verrugas de fósforo tóxico | Oculto bajo el agua, emboscada por sorpresa con mordisco venenoso | `abyssal_gland`, `phosphor_mud` |
| **Escorpión Volcánico** | Cañón Cenizas | Arácnido colosal con caparazón de pirita ígnea y pinzas de tenaza | Aguijón perforante de calor extremo, ráfagas de chispas ardientes | `volcanic_pyrite`, `saltpeter` |
| **Acechador de Cristal** | Abismo Cavernas | Entidad arácnida-mineral hecha de prismas de cuarzo afilados | Trepa por techos y paredes, camuflaje transparente con refracción | `resonant_crystal`, `mycelium` |
| **Dron Deflector** | Núcleo Alien | Esfera biomecánica levitante con núcleo ocular de plasma | Proyectiles teledirigidos y barrera deflectora de energía | `energy_shards` |
| **El Heraldo de las Estrellas** *(Boss)* | Núcleo Impacto | Coloso biomecánico suspendido con anillos de levitación rúnica | 4 Fases climáticas, escudos adaptativos y canalización de *Wipe* | `alien_core_essence` |

---

## 🪨 4. Catálogo de Texturas y Materiales PBR

```
[Textures Master Pipeline]
├── Albedo / Diffuse Map (Color base, tono desgastado, sin iluminación pre-cocinada)
├── Normal Map (DirectX / OpenGL, micro-relieve de rocas, escamas y madera)
├── Roughness / Smoothness Map (Zonas húmedas en pantano vs ásperas en desierto)
├── Metallic / Specular Map (Vetas de pirita, aleaciones alienígenas y armaduras)
├── Height / Displacement Map (Grietas profundas de lava y estalactitas)
├── Ambient Occlusion (AO) (Grietas de corteza, cavidades de rocas y ensambles)
└── Emission Map (Bioluminiscencia de hongos, runas de hielo y reactores alien)
```

### 4.1 Especificación de Materiales Clave:
1. **Roca Volcánica y Pirita:** Albedo `#4A1508` con vetas de oro metálico (`Metallic: 0.95`, `Roughness: 0.25`), Emisión de brasas (`#FF5400`).
2. **Hielo Glaciar Fósil:** Subsurface Scattering (SSS) azul cielo (`#70D6FF`), `Roughness: 0.08`, `Transmission: 0.85`, refracción con índice IOR `1.31`.
3. **Fango Fosforescente:** Albedo verdoso viscoso (`#1B2E15`), `Roughness: 0.12` (muy brillante/mojado), Emisión verde radiactiva (`#70E000` a 3.5 nits).
4. **Hipercristal Resonante:** Geometría facetada con dispersión cromática, IOR `1.65`, pulsación emissive magenta-cian en ciclo sinusoidal de 1.2 Hz.
5. **Aleación Alienígena Pecio:** Superficie de titanio iridiscente bio-orgánico, anisotropía radial en los anillos concéntricos.

---

## ⚙️ 5. Fichas Técnicas de Recreación por Motores

### 5.1 Pipeline 3D (Unreal Engine 5 / Unity HDRP/URP / Blender)
* **Presupuesto Poligonal (LOD0):**
  * Heraldo de las Estrellas (Boss): **45,000 - 60,000 Tris**
  * Criaturas Grandes (Bestia de Escarcha, Escorpión): **18,000 - 25,000 Tris**
  * Depredadores Medianos (Lobo Alfa, Alimaña): **8,000 - 14,000 Tris**
  * Drones y Artefactos Efímeros: **3,000 - 6,000 Tris**
  * Sets de Modular Environment (Rocas, Tótems, Empalizadas): **1,500 - 5,000 Tris por módulo**
* **Sistema de Iluminación:** Lumen / Ray Tracing con niebla volumétrica y niebla de altura exponencial por región.
* **Shaders Recomendados:** Master Shader PBR tri-planar con mezcla de capas de escarcha/nieve (`WorldAlignedTexture`) y lodo mojado.

### 5.2 Pipeline 2D / Pixel Art / Top-Down (Canvas / WebGL / Godot / Phaser)
* **Cuadrícula de Tileset:** Base en **32x32 px** o **64x64 px** con auto-tiling bitmask de 47 tiles para transiciones orgánicas entre biomas.
* **Sprite Sheets de Criaturas:** 8 direcciones (o 4 direcciones isométrica/top-down), animaciones a 12 FPS:
  * `idle` (6 frames)
  * `walk/run` (8 frames)
  * `attack_primary` (6 frames con anticipación y follow-through)
  * `hit_react` (3 frames)
  * `death` (8 frames con disolución o caída)
* **Paleta Indexada:** Máximo de 32 colores por bioma para asegurar armonía cromática y compresión optimizada en navegadores móviles.

---

## 🎨 6. Compendio de Prompts Generativos de Alta Fidelidad (AI Asset Generation)

### 🏔️ Prompt: Meseta Helada de la Escarcha (Environment)
> *`Cinematic environment concept art of a vast frozen glacial plateau and arctic tundra in a dark fantasy survival RPG, howling dynamic snowstorm blizzard, sharp blue glacier spires, ancient tribal timber outpost with fur banners and carved totem runes glowing neon cyan, dramatic volumetric lighting, ultra-detailed textures, 8k resolution, Unreal Engine 5 render style --ar 16:9 --style raw --v 6.0`*

### ☣️ Prompt: Ciénaga Negruzca y Alimaña del Fango (Environment & Creature)
> *`Atmospheric concept art of a toxic miasma swamp biome, murky dark waters glowing with green phosphor mud, stilt wooden tribal huts, giant twisted mangrove trees, a monstrous amphibian predator with glowing bioluminescent warts emerging from the muck, eerie volumetric fog, cinematic lighting, dark fantasy RPG aesthetic, 8k --ar 16:9 --v 6.0`*

### 🔮 Prompt: El Abismo Subterráneo y Santuario de Piedra (Environment)
> *`Cinematic concept art of a massive subterranean abyss cavern in a dark medieval RPG, giant jagged stalactites, monumental resonant purple and blue crystal clusters, bioluminescent mushroom mycelium networks on wet black basalt walls, ancient stone carved temple ruins on suspended rock bridge, light rays through vertical shafts, photorealistic stylized 8k --ar 16:9 --v 6.0`*

### 🛸 Prompt: El Heraldo de las Estrellas (Final Boss & Arena)
> *`Epic cinematic boss fight concept art of 'The Herald of the Stars', a colossal floating biomechanical alien entity with rotating concentric holographic runic energy rings, multi-elemental plasma core, hovering inside a shattered alien terraforming crash chamber, cosmic aurora sky breach, dark sci-fi medieval fusion, volumetric rim lighting, masterpiece, 8k --ar 16:9 --v 6.0`*

---
*Documento de Diseño Visual y Técnico certificado para el equipo de desarrollo, modeladores 3D, artistas 2D y diseñadores de niveles.*
