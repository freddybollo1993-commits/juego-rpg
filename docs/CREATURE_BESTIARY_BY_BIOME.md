# 🐾 Bestiario por Bioma — Guía de Diseño de Criaturas
## *Creature Design Bible: cada criatura nace de su entorno*

**Proyecto:** RPG Medieval de Supervivencia Móvil
**Complementa a:** [`WORLD_ART_BIBLE_AND_ENVIRONMENT_DESIGN.md`](./WORLD_ART_BIBLE_AND_ENVIRONMENT_DESIGN.md) (paletas, lenguaje de formas y especificación de sprites)
**Estado:** propuesta de diseño. Las criaturas marcadas con ✔ ya existen en el código; el resto son sugerencias aún sin implementar.

---

## 1. Cómo usar este documento

1. Busca el **bioma** de la criatura. Cada sección empieza con su ficha: clima, luz, peligros, terrenos, paleta y props. Esa ficha es la fuente de verdad del entorno.
2. Lee la **ecología** del bioma. Explica qué come cada criatura, dónde vive y cómo el clima moldea su cuerpo.
3. Toma la ficha de la criatura (aspecto, hábitat y comportamiento, drops) y respeta las **reglas de coherencia** de la sección 2.
4. Antes de dar un sprite por terminado, pasa el **checklist** de la sección 5.

---

## 2. Reglas de coherencia criatura ↔ entorno

Toda criatura debe responder a estas cinco preguntas. Si alguna queda sin respuesta, el diseño no está terminado.

| # | Pregunta | Qué se espera |
|---|---|---|
| 1 | **¿De qué vive?** | Cadena trófica creíble dentro del bioma (carroñero, emboscador, herbívoro, parásito…). |
| 2 | **¿Dónde vive?** | Un terreno concreto del juego (por ejemplo `wet_sand`, `toxic_slime`, `crystal_cluster`). Aparece junto a los props de ese terreno. |
| 3 | **¿Cómo lo moldea el clima o el peligro del bioma?** | El cuerpo lo refleja: pelaje y cuernos de hielo en la meseta, blindaje de lodo en la ciénaga, translucidez en las cavernas. |
| 4 | **¿Cómo usa el terreno para combatir?** | Emboscada bajo el agua, camuflaje en cristales, calor de las fisuras… |
| 5 | **¿Qué recompensa deja?** | El drop viene del propio cuerpo de la criatura y sirve al oficio del bioma. |

### 2.1 Lenguaje de formas (de la biblia de arte)
- **Triángulos y aristas afiladas:** peligro. Dominan en meseta helada y cañón.
- **Círculos y formas orgánicas onduladas:** misterio y mutación. Dominan en la ciénaga y en la tecnología alienígena.
- **Bloques ciclópeos y prismas:** solidez ancestral. Dominan en el abismo y en las ruinas precursoras.

### 2.2 Roles y tamaños de referencia
| Rol | Sprite base | Vida orientativa | Daño orientativo | Notas |
|---|---|---|---|---|
| **Común** | ~48×48 px | 50–90 | 12–22 | Comparte comportamiento con su tipo de bioma. |
| **Élite** | ~64×64 px | 150–220 | 22–30 | Lleva un modificador visible (`armored`, `electrified`, `frost_aura`). |
| **Ambiental** | 24–48 px | 10–25 | 0 | No ataca. Anima el mapa, da drops menores o pistas. |
| **Jefe** | ≥128×128 px | — | — | Solo en el Núcleo (Heraldo de las Estrellas). |

Referencia de los enemigos actuales: Lobo 55 PV / 14 daño / vel. 105; Bestia de Escarcha 80 / 16 / 65; Alimaña 70 / 15 / 50; Escorpión 75 / 18 / 80; Acechador 65 / 16 / 85; Dron 90 / 22 / 95; Gólem (élite) 180 / 25 / 50.

### 2.3 Mecánicas que el motor ya soporta
Al diseñar el comportamiento conviene apoyarse en lo que existe:
- **Ataque telegrafiado:** avisa la casilla peligrosa antes de golpear (`isTelegraphing`).
- **Estados:** congelado, ardiendo, cegado y aturdido.
- **Modificadores de élite:** `armored`, `electrified`, `frost_aura`.
- **Niebla de guerra:** las criaturas solo se ven en casillas visibles.

### 2.4 Sprites (resumen de la biblia de arte)
- Animaciones: `idle` (6), `walk` (8), `attack` (6), `hit` (3), `death` (8) a 12 FPS. Para las criaturas comunes basta con un mínimo de 2/3/3 al inicio.
- Direcciones: 4 (isométrica). Paleta de un máximo de 32 colores por bioma.
- **Un solo color de acento brillante por criatura**, tomado de la paleta del bioma.

---

## 3. Bestiario por bioma

> Convención de las tablas: ✔ = ya implementada · **(nuevo)** = ítem o criatura propuesta.

---

### 🌊 3.1 Orilla del Naufragio (Costa Olvidada — Prólogo)

**Ficha del bioma**
| Dato | Valor |
|---|---|
| Mood | Desolación, humedad helada, restos de una expedición fallida |
| Clima / luz | Despejado · luz 0.85 (rasante y fría) |
| Peligros | Frío inicial (0.8). Sin toxicidad ni calor |
| Terrenos | `dry_sand`, `wet_sand`, `coastal_pebbles`, `deep_water`, `rock_cliff` |
| Props | palmeras, rocas, driftwood, mechones de hierba |
| Paleta | Arena `#B0A880` · mar `#4F728C`, `#2B4353` · acento fogata `#E76F51` |
| Tribu | Ninguna (zona de tutorial) |

**Ecología:** un ecosistema costero y pobre. Todo lo que vive aquí come de la marea: carroña, crustáceos y restos del naufragio. Los depredadores terrestres rondan el perímetro de la fogata. Los animales tienen tonos de arena, sal y roca húmeda, con siluetas curvas del mar frente a aristas de arrecife.

| Criatura | Rol / tamaño | Aspecto | Hábitat y comportamiento | Drop |
|---|---|---|---|---|
| **Lobo Alfa Acechante** ✔ (`stalking_wolf`) | Común · 48 px · 55 PV | Cánido flaco de costillas marcadas, pelaje apelmazado por la sal y ojos carmesí. *Variante costera sugerida:* pelo mojado y más oscuro. | Ronda el perímetro de la fogata, sobre `dry_sand`. Flanquea al jugador que se aleja de la luz. | `alpha_fur`, `raw_meat` |
| **Cangrejo de arrecife** (nuevo) | Común · 48 px | Caparazón de basalto con pinzas astilladas, un patrón de barnacles blancos y ojos en tallos. | Vive en `coastal_pebbles` y entre las rocas. Lento pero con mucha defensa; solo se le puede dañar si ataca. | `basalt_shell` (nuevo), `raw_meat` |
| **Gaviota carroñera** (nuevo) | Ambiental → común · 32 px | Ave grande, gris y blanca, pico curvo. Cae en picado sobre comida a la vista. | Sobrevuela el naufragio. Si el jugador lleva comida cruda, se lanza y roba un ítem. | `feather_bundle` (nuevo) |
| **Anguila de marea** (nuevo) | Élite · 64 px | Cuerpo largo y azul verdoso con vientre pálido y aleta dorsal de espinas. | Emerge de `deep_water` para atacar en `wet_sand`. Ataque telegrafiado: la casilla húmeda se agita antes de morder. | `eel_hide` (nuevo) |
| **Tortuga varada** (nuevo) | Ambiental · 40 px | Caparazón cubierto de algas y percebes, cabeza pequeña. | Avanza lentamente por la arena. No ataca. Da pistas (señala el mar). | — |

---

### ❄️ 3.2 La Meseta Helada de la Escarcha

**Ficha del bioma**
| Dato | Valor |
|---|---|
| Mood | Aislamiento glacial, viento aullante, rudeza nórdica |
| Clima / luz | Ventisca · luz 0.9 |
| Peligros | **Frío severo (3.5)**, estamina ×1.2 |
| Terrenos | `packed_snow`, `glacial_ice`, `frost_rock`, `boundary_cliff` |
| Props | picos de hielo, rocas nevadas, pinos secos, montículos de nieve |
| Paleta | Nieve `#D6E6F2`, `#A4C3D2` · pizarra `#4A5568` · acento `#00F5D4`, `#FF9F1C` |
| Tribu | **Clanes de la Escarcha** (habilidad *Corazón de Escarcha*; prueba: cazar 2 Bestias de Escarcha) |

**Ecología:** la comida escasea y el frío mata. Los animales son grandes, de pelaje denso y con adaptaciones para retener calor: masa, grasa y pelaje. Los cuernos de hielo, los carámbanos y las aristas dominan sus siluetas. Cada criatura tiene algo de cristal helado. Los clanes las cazan para sobrevivir, y sus pieles son el equipo del bioma.

| Criatura | Rol / tamaño | Aspecto | Hábitat y comportamiento | Drop |
|---|---|---|---|---|
| **Bestia de Escarcha** ✔ (`frost_beast`) | Común · 48 px · 80 PV | Cuadrúpedo macizo con cuernos de carámbano y joroba de hielo. | Camina lenta por `packed_snow`. Embestida frontal y aliento gélido que aplica *congelado*. | `fossil_ice`, `raw_meat` |
| **Liebre de nieve** (nuevo) | Ambiental · 24 px | Pequeña y blanca, orejas negras, patas largas. | Huye en cuanto te ve. Rápida y difícil de alcanzar; sirve de caza fácil. | `snow_pelt` (nuevo), `raw_meat` |
| **Yeti de riscos** (nuevo) | Común · 56 px | Brazos largos y asimétricos, pelaje blanco sucio, rostro casi humano. | Habita cerca de `frost_rock`. Lanza bloques de hielo (ataque a distancia telegrafiado). | `yeti_fur` (nuevo) |
| **Lobo espectro helado** (nuevo) | Común · 48 px | Silueta translúcida azul, casi invisible en la ventisca. | Caza en manada. Solo se le ve bien a corta distancia con niebla de guerra. | `spectral_frost` (nuevo) |
| **Cabra colosal de glaciar** (nuevo) | Élite · 64 px | Cuernos como carámbanos gigantes y pezuñas de hielo. Modificador `frost_aura`. | Embiste en línea recta: marca la casilla y las de detrás. Aturde si acierta. | `glacier_horn` (nuevo) |
| **Búho de nieve** (nuevo) | Ambiental · 28 px | Plumaje blanco con runas cian brillantes en las alas. | Posado sobre monolitos tribales. Vuela y cambia de percha cuando te acercas. | — |

---

### 🌲 3.3 La Taiga Ancestral

**Ficha del bioma**
| Dato | Valor |
|---|---|
| Mood | Bosque milenario, penumbra, fauna acechante, humedad vegetal |
| Clima / luz | Lluvia · luz 0.65 (filtrada, olivo oscuro) |
| Peligros | Frío 1.0, estamina ×1.1 |
| Terrenos | `pine_humus`, `ancient_moss`, `root_cluster`, `boundary_cliff` |
| Props | pinos, arbustos con bayas, rocas musgosas, tocones |
| Paleta | Follaje `#2D4A22`, `#1E3316` · corteza `#3E2723`, `#5D4037` · acento `#FFB703`, `#9B2226` |
| Tribu | **Nómadas del Bosque** (habilidad *Zancada de Canopia*; prueba: derrotar 3 Lobos Alfa) |

**Ecología:** un bosque cerrado, estratificado en suelo y copas. Abajo cazan los depredadores territoriales; arriba viven especies ágiles. La lluvia y la penumbra premian el sigilo. Los animales usan camuflaje, musgo, corteza y líquenes, y sus colores son verdes profundos y pardos con un acento de resina o baya.

| Criatura | Rol / tamaño | Aspecto | Hábitat y comportamiento | Drop |
|---|---|---|---|---|
| **Lobo Alfa Acechante** ✔ (`stalking_wolf`) | Común · 48 px · 55 PV | Cánido esbelto de pelaje denso erizado y ojos carmesí. *Variante de taiga:* pelaje gris verdoso con manchas de musgo. | Caza en jauría, flanquea y aúlla para alertar a la manada. | `alpha_fur`, `raw_meat` |
| **Oso pardo de musgo** (nuevo) | Común · 56 px | Enorme, con musgo y líquenes en el lomo y garras largas. | Duerme cerca de `root_cluster`. Muy lento y muy fuerte; el golpe es telegrafiado. | `bear_pelt` (nuevo), `raw_meat` |
| **Ciervo astado espiritual** (nuevo) | Ambiental · 44 px | Astas que brillan en ámbar y una marca tenue en el flanco. | No ataca. Su rastro guía hacia santuarios y ruinas. | `amber_antler` (nuevo) |
| **Araña tejedora de copas** (nuevo) | Común · 40 px | Cuerpo oscuro y patas finas con rayas de resina. | Baja de las ramas por un hilo y deja telarañas que ralentizan al jugador en su casilla. | `silk_thread` (nuevo) |
| **Guardián de las ruinas** (nuevo) | Élite · 64 px | Golem de piedra y raíces con musgo y ojos de ágata. Modificador `armored`. | Despierta al acercarse a las ruinas musgosas. Se cura al pisar `ancient_moss`. | `rune_stone` (nuevo) |
| **Ardilla de piñas** (nuevo) | Ambiental · 20 px | Roja y ágil, con una piña entre las patas. | Corre entre los troncos y entierra piñas. Sirve de ambiente. | — |

---

### ☣️ 3.4 La Ciénaga Negruzca

**Ficha del bioma**
| Dato | Valor |
|---|---|
| Mood | Putrefacción biológica, miasma asfixiante, misterio alienígena latente |
| Clima / luz | Niebla tóxica · luz 0.55 |
| Peligros | **Toxicidad severa (2.2)**, sed ×1.1, **estamina ×1.4** (el barro frena) |
| Terrenos | `mud_moss`, `toxic_slime`, `deep_mire`, `boundary_cliff` |
| Props | árboles muertos, juncos, hongos, rocas cubiertas de lodo |
| Paleta | Lodo `#2B3A27`, `#1D261A` · miasma `#4D6A34` · acento fosforescente `#70E000`, `#38B000` |
| Tribu | **Moradores del Fango** (habilidad *Adaptación a Toxinas*; prueba: exterminar 3 Alimañas) |

**Ecología:** un humedal donde la podredumbre alimenta todo. Los animales son anfibios y parásitos adaptados al veneno. Sus siluetas son redondeadas y viscosas, con verrugas bioluminiscentes que avisan de su toxicidad. Los depredadores esperan ocultos en el agua estancada y atacan por sorpresa. Cuanto más profundo el fango, más grande la criatura.

| Criatura | Rol / tamaño | Aspecto | Hábitat y comportamiento | Drop |
|---|---|---|---|---|
| **Alimaña del Fango** ✔ (`swamp_horror`) | Común · 48 px · 70 PV | Anfibio reptiliano acorazado con verrugas de fósforo tóxico. | Oculto bajo el agua de `deep_mire`. Emboscada por sorpresa con mordisco venenoso. | `abyssal_gland`, `phosphor_mud` |
| **Rana de bilis** (nuevo) | Común · 44 px | Sapo del tamaño de un barril, piel verde oliva con lunares fosforescentes. | Vive en `mud_moss`. Escupe un charco tóxico: la casilla queda peligrosa unos turnos. | `bile_sac` (nuevo) |
| **Sanguijuela gigante** (nuevo) | Común · 36 px | Cuerpo segmentado morado oscuro, boca circular con dientes. | Oculta en el agua; solo se ve al acercarse. Drena vida y estamina al contacto. | `leech_gland` (nuevo) |
| **Luciérnaga del miasma** (nuevo) | Ambiental → trampa · 20 px | Nube de luces verdes suspendidas sobre el agua. | Atrae al jugador hacia zonas de toxina. Al tocarlas, aplica veneno leve. | `glow_spores` (nuevo) |
| **Cocodrilo de turba** (nuevo) | Élite · 64 px | Blindado con lodo seco y ojos amarillos que sobresalen del agua. Modificador `armored`. | Emboscada desde `deep_mire`. Solo se le ve bien por los ojos. Ataque telegrafiado con mordida giratoria. | `peat_scale` (nuevo) |
| **Garza pálida** (nuevo) | Ambiental · 36 px | Ave alta, gris pálido, cuello largo. | Pasa inmóvil entre los juncos. Levanta el vuelo si te acercas. | — |

---

### 🏜️ 3.5 El Cañón de las Cenizas

**Ficha del bioma**
| Dato | Valor |
|---|---|
| Mood | Calor sofocante, tierra calcinada, tormentas de arena |
| Clima / luz | Tormenta de arena · luz 1.0 (sol blanco cegador) |
| Peligros | **Calor severo (3.2)**, **sed ×2.5**, toxicidad leve (0.4), estamina ×1.2 |
| Terrenos | `red_sandstone`, `magma_fissure`, `basalt_gravel`, `boundary_cliff` |
| Props | rocas grandes, cactus, huesos, agujas de roca |
| Paleta | Arcilla `#964B28`, `#6F1D1B` · arena `#DDA15E`, `#BC6C25` · acento pirita `#FFBA08`, `#F4A261` |
| Tribu | **Caminantes del Sol** (habilidad *Resistencia de Camélido*; prueba: cazar 3 Escorpiones) |

**Ecología:** la escasez de agua define todo. Los animales aguantan el calor y cazan al amanecer o en las tormentas. Sus siluetas son secas, angulosas y de colores ocres con vetas de pirita. Las fisuras volcánicas dan calor y refugio a los reptiles. Los huesos y esqueletos secos del suelo recuerdan quién manda.

| Criatura | Rol / tamaño | Aspecto | Hábitat y comportamiento | Drop |
|---|---|---|---|---|
| **Escorpión Volcánico** ✔ (`volcanic_scorpion`) | Común · 48 px · 75 PV | Arácnido con caparazón de pirita ígnea y pinzas de tenaza. | Vive junto a `magma_fissure`. Aguijón perforante y chispas; puede aplicar *ardiendo*. | `volcanic_pyrite`, `crystallized_saltpeter` |
| **Lagarto de ceniza** (nuevo) | Común · 44 px | Camaleón rojizo con escamas de arcilla y cresta de espinas. | Se mimetiza sobre `red_sandstone` y ataca por sorpresa cuando pasas. Lengua larga. | `ash_scale` (nuevo) |
| **Buitre de pirita** (nuevo) | Común · 48 px | Plumas metálicas doradas y cabeza pelada. | Vuela en círculos sobre las grietas y se lanza cuando estás debilitado. Ataque en picado telegrafiado. | `pyrite_feather` (nuevo) |
| **Serpiente de magma** (nuevo) | Común · 44 px | Cuerpo negro con vetas naranjas incandescentes. | Sale de las `magma_fissure` y deja un rastro caliente en las casillas por las que pasa. | `magma_fang` (nuevo) |
| **Coloso de escoria** (nuevo) | Élite · 64 px | Golem de roca fundida con grietas brillantes. Modificador `armored`. | Se enfría con cada golpe y se vuelve vulnerable; se recalienta cerca de la lava. | `slag_core` (nuevo) |
| **Ciempiés de arena** (nuevo) | Ambiental · 32 px | Segmentado, color arena, aparece y desaparece. | Solo se ve durante las tormentas de arena. Da ambiente. | — |

---

### 🔮 3.6 El Abismo Subterráneo

**Ficha del bioma**
| Dato | Valor |
|---|---|
| Mood | Oscuridad solemne, ecos profundos, maravilla mística |
| Clima / luz | Despejado · **luz 0.15** (penumbra crítica) |
| Peligros | Frío/calor/toxicidad 0.6 cada uno, estamina ×1.3, peligro de derrumbe |
| Terrenos | `dark_slate`, `crystal_cluster`, `abyssal_chasm`, `boundary_cliff` |
| Props | cristales, estalagmitas, hongos luminosos, escombros |
| Paleta | Basalto `#1A162B`, `#0E0B17` · agua `#241E38`, `#3F37C9` · acento `#7209B7`, `#4CC9F0`, `#F72585` |
| Tribu | **Hijos de la Piedra** (habilidad *Agarre Férreo*; prueba: eliminar 3 Acechadores de Cristal) |
| Mazmorra | Precursora (cofre, pedestal y gólem guardián) |

**Ecología:** un mundo sin luz donde el sonido y la vibración sustituyen a la vista. Las criaturas son translúcidas o de cuarzo, ciegas o con ojos enormes, y se comunican con ecos. Se alimentan de micelio, minerales y de lo que cae de arriba. Su luz propia es un solo acento brillante (cian o magenta), y todo lo demás es negro violáceo.

| Criatura | Rol / tamaño | Aspecto | Hábitat y comportamiento | Drop |
|---|---|---|---|---|
| **Acechador de Cristal** ✔ (`crystal_stalker`) | Común · 48 px · 65 PV | Entidad arácnida-mineral de prismas de cuarzo afilados. | Vive sobre `crystal_cluster` y se camufla con refracción. | `resonant_crystal`, `luminescent_mycelium` |
| **Murciélago de resonancia** (nuevo) | Común · 36 px | Alas membranosas con venas cian, sin ojos, orejas enormes. | Sobrevuela las fosas. Su chillido aturde (*aturdido*) al jugador si no lo mata rápido. | `echo_membrane` (nuevo) |
| **Gusano de micelio** (nuevo) | Común · 44 px | Cuerpo blando y pálido con manchas luminosas magenta. | Emerge de `dark_slate`. Suelta esporas de luz que revelan casillas del mapa (útil y peligroso). | `luminescent_mycelium` |
| **Ciempiés de basalto** (nuevo) | Común · 48 px | Largo y segmentado, con placas negras y patas rojizas. | Ataca por delante y por detrás. Es lento al girar. | `basalt_plate` (nuevo) |
| **Gólem Guardián Precursor** ✔ (`precursor_golem`) | Élite · 46 px · 180 PV | Bloques ciclópeos con runas y núcleo brillante. `armored`. | Custodia el cofre de la mazmorra. Lento y muy resistente. | `precursor_core`, `charged_crystal`, `ancient_battery` |
| **Devorador de cristales** (nuevo) | Élite · 64 px | Araña ciclópea con abdomen de prismas que refractan la luz. Modificador `electrified`. | Cuelga del techo. Sus prismas proyectan una casilla falsa: hay que distinguir la real. | `prism_shard` (nuevo) |
| **Pez ciego de cueva** (nuevo) | Ambiental · 20 px | Blanco translúcido con puntos luminosos. | Flota en pozas luminosas. Marca donde hay agua potable. | — |

---

### 🛸 3.7 El Núcleo del Impacto

**Ficha del bioma**
| Dato | Valor |
|---|---|
| Mood | Trascendencia cósmica, terraformación violenta, tecnología incomprensible |
| Clima / luz | Aurora alienígena · luz 0.7 |
| Peligros | Sin peligros ambientales; el peligro son los enemigos y el jefe |
| Terrenos | `precursor_alloy`, `plasma_circuit`, `levitation_ring` |
| Props | antenas, escombros metálicos, pilones, respiraderos de plasma |
| Paleta | Aleación `#0A141A`, `#123E4F` · plasma `#03045E`, `#023E8A` · acento `#00F5D4`, `#F72585`, `#7209B7` |
| Tribu | Ninguna |
| Jefe | **El Heraldo de las Estrellas** (4 fases climáticas) |

**Ecología:** aquí no hay fauna natural. Todo es tecnología o biotecnología que el Heraldo creó para la terraformación. Las formas son biomecánicas y no euclidianas, con carne y metal fundidos y líneas de plasma. Cada criatura parece una herramienta del reactor y comparte su acento cian o magenta.

| Criatura | Rol / tamaño | Aspecto | Hábitat y comportamiento | Drop |
|---|---|---|---|---|
| **Dron Deflector Alienígena** ✔ (`alien_drone`) | Común · 48 px · 90 PV | Esfera biomecánica levitante con núcleo ocular de plasma. | Proyectiles teledirigidos y barrera deflectora. | `ancient_battery` |
| **Centinela de anillos** (nuevo) | Común · 52 px | Torso flotante sobre un anillo giratorio. | Flota sobre `levitation_ring`. Dispara pulsos en línea recta con marca telegrafiada. | `ring_fragment` (nuevo) |
| **Larva biomecánica** (nuevo) | Común · 32 px | Parásito de metal y carne, cuerpo segmentado con luz magenta. | Se pega a otro enemigo y lo repara. Prioridad de objetivo: matarla primero. | `bio_circuit` (nuevo) |
| **Segador de plasma** (nuevo) | Común · 56 px | Cuerpo alargado con guadañas de energía. | Carga un ataque que marca varias casillas peligrosas en cruz. | `plasma_blade` (nuevo) |
| **Fragmento de eco** (nuevo) | Élite · 64 px | Silueta oscura del jugador con contornos magenta. Modificador `electrified`. | Copia los movimientos del jugador con un turno de retraso. | `echo_shard` (nuevo) |
| **Heraldo de las Estrellas** ✔ (`Boss`) | Jefe · ≥128 px | Coloso biomecánico con anillos de levitación rúnica. | 4 fases climáticas, escudos adaptativos y vulnerabilidad al sacrificio de artefactos. | `alien_core_essence` |
| **Medusa de vacío** (nuevo) | Ambiental · 40 px | Cúpula translúcida con tentáculos de luz. | Flota entre los pilares y late al ritmo del jefe. | — |

---

## 4. Resumen de producción

### 4.1 Cuenta por bioma
| Bioma | Ya en el juego ✔ | Propuestas nuevas | Élites nuevas |
|---|---|---|---|
| Orilla del Naufragio | 1 | 4 | 1 |
| Meseta Helada | 1 | 5 | 1 |
| Taiga Ancestral | 1 | 5 | 1 |
| Ciénaga Negruzca | 1 | 5 | 1 |
| Cañón de las Cenizas | 1 | 5 | 1 |
| Abismo Subterráneo | 2 | 5 | 1 |
| Núcleo del Impacto | 2 (con jefe) | 5 | 1 |

### 4.2 Orden de producción sugerido
1. **Fase A — variantes visuales de lo existente.** Lobo costero y lobo de taiga, para que dejen de compartir aspecto entre biomas.
2. **Fase B — un común nuevo por bioma.** Da variedad de combate sin nuevos sistemas: cangrejo de arrecife, yeti de riscos, oso de musgo, rana de bilis, lagarto de ceniza, murciélago de resonancia y centinela de anillos.
3. **Fase C — ambientales.** Son baratos de producir y dan vida al mapa sin tocar el equilibrio.
4. **Fase D — élites por bioma.** Requieren un modificador y una mecánica propia.
5. **Fase E — criaturas con mecánica nueva** (trampas, robo de ítems, reflejos, copia de movimientos), que necesitan código nuevo.

### 4.3 Reglas de nomenclatura
- Identificadores de tipo en `snake_case` en inglés (`tide_eel`, `bile_toad`), igual que los actuales.
- Nombres de pantalla en español, con la palabra de rol al final si es élite: `Cocodrilo de turba (Élite)`.
- Ítems nuevos en `snake_case` y registrados en `src/data/items.ts` antes de usarlos como drop.

---

## 5. Checklist de una criatura terminada

- [ ] Responde las 5 preguntas de la sección 2 (¿de qué vive?, ¿dónde?, ¿cómo la moldea el bioma?, ¿cómo usa el terreno?, ¿qué deja?).
- [ ] La silueta se distingue del resto a 48 px de alto.
- [ ] Usa la paleta de su bioma y un solo color de acento brillante.
- [ ] Sus formas siguen el lenguaje de su bioma (aristas, ondulaciones o bloques).
- [ ] Se ve bien sobre los terrenos donde vive (no se pierde ni destaca de forma absurda).
- [ ] Tiene `idle`, `walk`, `attack`, `hit` y `death`, en 4 direcciones.
- [ ] Si tiene ataque telegrafiado, la animación anticipa el golpe.
- [ ] Sus drops están registrados y son coherentes con su cuerpo.
- [ ] Sus estadísticas caen en el rango de su rol (sección 2.2).

---
*Documento vivo: al implementar una criatura, se quita la etiqueta «nuevo» y se marca ✔.*
