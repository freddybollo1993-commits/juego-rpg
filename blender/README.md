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
