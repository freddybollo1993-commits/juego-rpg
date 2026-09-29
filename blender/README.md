# Rig de renderizado de criaturas (Blender)

`creature_render_rig.blend` es una plantilla con la cámara ya calibrada al ángulo exacto
que necesita el juego (ver [`docs/creature-template-guide.png`](../docs/creature-template-guide.png)
y [`docs/CREATURE_BESTIARY_BY_BIOME.md`](../docs/CREATURE_BESTIARY_BY_BIOME.md)):

- **Vista 3/4:** cámara girada 35° hacia el espectador.
- **Inclinación:** 18° hacia abajo (dentro del rango 15–20° de la guía).
- **Proyección ortográfica:** sin distorsión de perspectiva, para que criaturas de
  distinto tamaño se vean consistentes entre sí.
- **Fondo transparente real:** el render sale en PNG con canal alfa (RGBA), sin
  necesidad de quitar fondo después.

No hay que calcular el ángulo a mano cada vez: la cámara ya está fija y verificada
(elevación 18.00°, azimut 35.00°, confirmado por script).

## Cómo usarlo

1. Abre `creature_render_rig.blend` en Blender 3.6.
2. En el Outliner, oculta o borra `PLACEHOLDER_creature` y `PLACEHOLDER_creature_head`
   (son solo una referencia de tamaño).
3. Modela o importa la criatura **centrada en el origen**, con las patas/base tocando
   el suelo (Z = 0). Usa el placeholder como referencia de escala antes de borrarlo.
4. Elige la cámara según el tamaño del rol (clic derecho > "Set Active Camera",
   o Vista > Cámaras > selecciona en el Outliner):
   - `Cam_Common` — criaturas comunes (~1.8 unidades de alto)
   - `Cam_Elite` — élites (~2.6 unidades de alto)
   - `Cam_Boss` — jefes (~5+ unidades de alto)
5. Ajusta `Sun_Key` / `Sun_Fill` solo si el material se ve mal iluminado.
6. Renderiza con **F12**. La imagen sale a 512×640 (proporción 64:80 ×8), con
   transparencia ya incluida.
7. Guarda como PNG (Image > Save As) y reduce el tamaño en Pixelorama o un editor
   de imágenes a la celda final del atlas:
   - Común: 64×80 · Élite: 96×110 · Jefe: ≥256×300
8. Repite para `idle`, `walk`, `attack`, `hit`, `death` según la animación que
   necesites, moviendo o posando el modelo entre renders (la cámara nunca se mueve).

## Ejemplo: Lobo Alfa Acechante

[`examples/lobo_alfa_acechante.blend`](examples/lobo_alfa_acechante.blend) es un modelo de
prueba (formas simples, sin detalle final) que muestra el flujo completo funcionando:
modelar dentro del rig, renderizar con `Cam_Common` y exportar con transparencia real.

- [`examples/lobo_alfa_acechante_reference.png`](examples/lobo_alfa_acechante_reference.png) — render de referencia (recortado al contenido).
- [`examples/lobo_alfa_acechante_64x80.png`](examples/lobo_alfa_acechante_64x80.png) — tamaño real de celda del juego (común).
- [`examples/build_wolf_demo.py`](examples/build_wolf_demo.py) — script que genera el modelo y ambos renders (`blender --background creature_render_rig.blend --python examples/build_wolf_demo.py`).

Lecciones (ya corregidas en el script, documentadas para el próximo modelo):
- `bpy.ops.mesh.primitive_cube_add(size=1)` deja el cubo con medio-extensión 0.5;
  si luego escalas el objeto por tus medidas pensadas como medio-extensión, el
  resultado sale a la mitad. Usa `size=2` para que `object.scale` sea directamente
  la medio-extensión deseada.
- Nunca coloques dos piezas conectadas (pata-torso, cola-torso, cuello-cabeza)
  calculando el ángulo a mano — es la fuente más común de "miembros flotando
  desconectados". Define los dos puntos exactos donde debe empezar y terminar
  cada pieza y deriva el cilindro entre ellos (ver `cyl_between` /
  `cone_between` en el script).
- Una esfera (ojo, nariz) posicionada muy adentro de un volumen sólido (cabeza)
  queda completamente enterrada e invisible. Debe quedar centrada justo en la
  superficie exterior, no en el centro del volumen.

## Utilidad: recortar transparencia

[`crop_transparent.mjs`](crop_transparent.mjs) recorta un PNG con canal alfa a su
contenido real (más un margen), sin dependencias externas:
```
node crop_transparent.mjs entrada.png salida.png [margen_px]
```

## Notas técnicas

- `GroundReference_NOT_RENDERED` y `TileFootprintReference_NOT_RENDERED` son solo
  ayudas visuales en el viewport — están marcadas para no aparecer en el render
  (`hide_render = True`), así que no hace falta borrarlas.
- Si necesitas regenerar el rig desde cero (por ejemplo, para ajustar el ángulo),
  edita `build_creature_rig.py` y vuelve a correr:
  ```
  blender --background --python build_creature_rig.py
  ```
- El ángulo (35° azimut / 18° inclinación) es el punto medio de la especificación
  del proyecto. Si se decide cambiarlo, ajusta `AZIMUTH_DEG` / `ELEVATION_DEG` en
  ese script y regenera el archivo — así todas las criaturas futuras heredan el
  mismo cambio automáticamente.
