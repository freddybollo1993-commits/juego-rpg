"""
build_creature_rig.py - Generates creature_render_rig.blend

Run headless with Blender:
    blender --background --python build_creature_rig.py

Produces a fixed-camera rig that always renders a creature in the exact
angle the game engine expects (see docs/creature-template-guide.png):
    - 3/4 turn toward the viewer (~35 deg azimuth)
    - camera tilted down ~18 deg (inside the 15-20 deg spec)
    - orthographic projection (no perspective distortion)
    - transparent PNG output (real alpha, no green-screen removal needed)

Workflow for an artist:
    1. Open creature_render_rig.blend
    2. Delete/hide the grey "PLACEHOLDER_creature" capsule
    3. Model or import the creature centered at the origin, feet on the
       floor grid (Z = 0), scaled against the placeholder's silhouette
    4. Adjust "Sun_Key" / "Sun_Fill" only if the material reads badly
    5. Render (F12) -> Image > Save As... -> PNG (alpha already baked in)
    6. Downscale to the target cell size in Pixelorama / an image editor:
         common 64x80 - elite 96x110 - boss 256x300+ (see docs bestiary)

Camera framing presets (switch the active camera's Orthographic Scale,
already set up as three camera objects you can pick from in the Outliner):
    Cam_Common  -> ortho scale 2.6  (creature ~1.8 units tall)
    Cam_Elite   -> ortho scale 3.4  (creature ~2.6 units tall)
    Cam_Boss    -> ortho scale 6.0  (creature ~5+ units tall)
"""

import math
import bpy

AZIMUTH_DEG = 35.0     # turn toward the viewer
ELEVATION_DEG = 18.0   # downward camera tilt (spec: 15-20 deg)
TARGET_HEIGHT = 0.9    # look-at point, roughly torso height of a "common" creature
DISTANCE = 10.0        # arbitrary for orthographic; only direction matters

RENDER_W, RENDER_H = 512, 640  # 64:80 ratio x8 - downsample for crisp AA


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_target_empty():
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, TARGET_HEIGHT))
    empty = bpy.context.object
    empty.name = 'CreatureTarget'
    empty.empty_display_size = 0.15
    return empty


def make_camera(name, ortho_scale, target):
    az = math.radians(AZIMUTH_DEG)
    el = math.radians(ELEVATION_DEG)
    x = DISTANCE * math.cos(el) * math.sin(az)
    y = -DISTANCE * math.cos(el) * math.cos(az)
    z = DISTANCE * math.sin(el) + TARGET_HEIGHT

    bpy.ops.object.camera_add(location=(x, y, z))
    cam_obj = bpy.context.object
    cam_obj.name = name
    cam_obj.data.type = 'ORTHO'
    cam_obj.data.ortho_scale = ortho_scale
    cam_obj.data.clip_end = 1000

    con = cam_obj.constraints.new(type='TRACK_TO')
    con.target = target
    con.track_axis = 'TRACK_NEGATIVE_Z'
    con.up_axis = 'UP_Y'
    return cam_obj


def make_ground_reference():
    # Visual alignment aid only - excluded from the final render.
    bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, 0))
    plane = bpy.context.object
    plane.name = 'GroundReference_NOT_RENDERED'
    plane.hide_render = True
    mat = bpy.data.materials.new('GroundRefMat')
    mat.diffuse_color = (0.15, 0.55, 0.75, 0.25)
    plane.data.materials.append(mat)

    bpy.ops.mesh.primitive_circle_add(radius=0.5, location=(0, 0, 0.001))
    tile = bpy.context.object
    tile.name = 'TileFootprintReference_NOT_RENDERED'
    tile.hide_render = True


def make_placeholder_creature():
    bpy.ops.mesh.primitive_cylinder_add(radius=0.28, depth=1.1, location=(0, 0, 0.55))
    body = bpy.context.object
    body.name = 'PLACEHOLDER_creature'
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.22, location=(0, 0, 1.25))
    head = bpy.context.object
    head.name = 'PLACEHOLDER_creature_head'
    mat = bpy.data.materials.new('PlaceholderMat')
    mat.diffuse_color = (0.6, 0.6, 0.65, 1.0)
    body.data.materials.append(mat)
    head.data.materials.append(mat)
    return [body, head]


def make_lighting():
    bpy.ops.object.light_add(type='SUN', location=(-3, -4, 6))
    key = bpy.context.object
    key.name = 'Sun_Key'
    key.data.energy = 3.0
    key.rotation_euler = (math.radians(55), 0, math.radians(-35))

    bpy.ops.object.light_add(type='SUN', location=(3, 3, 4))
    fill = bpy.context.object
    fill.name = 'Sun_Fill'
    fill.data.energy = 0.8
    fill.rotation_euler = (math.radians(65), 0, math.radians(150))

    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new('World')
        bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    if bg:
        bg.inputs[0].default_value = (0.05, 0.05, 0.07, 1.0)
        bg.inputs[1].default_value = 0.35


def configure_render(scene, active_cam):
    scene.camera = active_cam
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = RENDER_W
    scene.render.resolution_y = RENDER_H
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = '//render_output.png'
    try:
        scene.eevee.use_gtao = True
    except Exception:
        pass


def main():
    reset_scene()
    scene = bpy.context.scene

    target = make_target_empty()
    cam_common = make_camera('Cam_Common', ortho_scale=2.6, target=target)
    make_camera('Cam_Elite', ortho_scale=3.4, target=target)
    make_camera('Cam_Boss', ortho_scale=6.0, target=target)

    make_ground_reference()
    make_placeholder_creature()
    make_lighting()
    configure_render(scene, cam_common)

    out_path = bpy.path.abspath('//creature_render_rig.blend')
    bpy.ops.wm.save_as_mainfile(filepath=out_path)
    print('Saved:', out_path)


if __name__ == '__main__':
    main()
