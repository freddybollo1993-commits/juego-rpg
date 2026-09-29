"""
build_wolf_demo.py - Models "Lobo Alfa Acechante" (stalking_wolf) into the
existing creature_render_rig.blend camera rig, then renders it through
Cam_Common at both a high-res reference size and the actual in-game cell size.

Run:
    blender --background creature_render_rig.blend --python build_wolf_demo.py
"""

import math
import bpy

FUR_DARK = (0.145, 0.125, 0.105, 1.0)   # #251f1a-ish, dark ashen brown
FUR_LIGHT = (0.32, 0.28, 0.23, 1.0)     # lighter belly/chest
EYE_RED = (0.9, 0.05, 0.03, 1.0)
NOSE_BLACK = (0.02, 0.02, 0.02, 1.0)


def mat_diffuse(name, rgba):
    m = bpy.data.materials.new(name)
    m.diffuse_color = rgba
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = rgba
        bsdf.inputs['Roughness'].default_value = 0.75
    return m


def mat_emissive(name, rgba, strength=4.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    emit = nt.nodes.new('ShaderNodeEmission')
    emit.inputs['Color'].default_value = rgba
    emit.inputs['Strength'].default_value = strength
    nt.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return m


def smooth(obj, subsurf=0):
    # NOTE: Subsurf visibly SHRINKS small/thin control cages inward - keep it
    # at 0 (off) for anything that needs to visually touch a neighboring part,
    # and only use level 1 on big, isolated volumes (e.g. the main torso).
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    if subsurf:
        mod = obj.modifiers.new('Subsurf', 'SUBSURF')
        mod.levels = subsurf
        mod.render_levels = subsurf
    bpy.ops.object.shade_smooth()


def box(name, half_extent, loc, rot=(0, 0, 0), mat=None):
    # size=2 -> base cube spans -1..1 (half-extent 1), so o.scale then equals
    # the desired half-extent directly (avoids the classic "scale is a
    # multiplier on an already-0.5-half-extent cube" halving mistake).
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = half_extent
    if mat:
        o.data.materials.append(mat)
    return o


def cyl_between(name, radius, p_inner, p_outer, mat=None):
    """Place a cylinder spanning exactly from p_inner to p_outer - avoids
    guessing rotation angles by hand (the source of every "floating
    disconnected limb" bug in earlier iterations of this script)."""
    import mathutils
    a, b = mathutils.Vector(p_inner), mathutils.Vector(p_outer)
    center = (a + b) / 2
    diff = b - a
    depth = diff.length
    rot_quat = mathutils.Vector((0, 0, 1)).rotation_difference(diff)
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=center)
    o = bpy.context.object
    o.name = name
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = rot_quat
    if mat:
        o.data.materials.append(mat)
    return o


def cone_between(name, radius1, p_inner, p_outer, mat=None):
    import mathutils
    a, b = mathutils.Vector(p_inner), mathutils.Vector(p_outer)
    center = (a + b) / 2
    diff = b - a
    depth = diff.length
    rot_quat = mathutils.Vector((0, 0, 1)).rotation_difference(diff)
    bpy.ops.mesh.primitive_cone_add(radius1=radius1, radius2=0.0, depth=depth, location=center)
    o = bpy.context.object
    o.name = name
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = rot_quat
    if mat:
        o.data.materials.append(mat)
    return o


def cyl(name, radius, depth, loc, rot=(0, 0, 0), mat=None, cap=True):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=loc, rotation=rot,
                                         end_fill_type='NGON' if cap else 'NOTHING')
    o = bpy.context.object
    o.name = name
    if mat:
        o.data.materials.append(mat)
    return o


def cone(name, radius1, depth, loc, rot=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_cone_add(radius1=radius1, radius2=0.0, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    if mat:
        o.data.materials.append(mat)
    return o


def ball(name, radius, loc, mat=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=loc)
    o = bpy.context.object
    o.name = name
    if mat:
        o.data.materials.append(mat)
    return o


def remove_placeholder():
    for n in ('PLACEHOLDER_creature', 'PLACEHOLDER_creature_head'):
        obj = bpy.data.objects.get(n)
        if obj:
            bpy.data.objects.remove(obj, do_unlink=True)


def build_wolf():
    fur = mat_diffuse('WolfFurDark', FUR_DARK)
    belly = mat_diffuse('WolfFurLight', FUR_LIGHT)
    eye = mat_emissive('WolfEyeRed', EYE_RED, strength=5.0)
    nose = mat_diffuse('WolfNoseBlack', NOSE_BLACK)

    parts = []

    # Torso: the only part big enough that a light subsurf doesn't create gaps.
    # Spans x:[-0.50,0.50] z:[0.28,0.62]
    torso = box('Wolf_Torso', (0.50, 0.20, 0.17), (0.0, 0.0, 0.45), mat=fur)
    smooth(torso, 1)
    parts.append(torso)

    belly_strip = box('Wolf_Belly', (0.38, 0.15, 0.05), (0.0, 0.0, 0.30), mat=belly)
    smooth(belly_strip, 0)
    parts.append(belly_strip)

    # Neck: endpoints chosen well INSIDE the torso and INSIDE the head, so the
    # overlap is guaranteed regardless of the rotation math (see cyl_between).
    neck = cyl_between('Wolf_Neck', 0.15, (0.30, 0.0, 0.50), (0.75, 0.0, 0.58), mat=fur)
    smooth(neck, 0)
    parts.append(neck)

    head = box('Wolf_Head', (0.17, 0.135, 0.13), (0.82, 0.0, 0.56), mat=fur)
    smooth(head, 0)
    parts.append(head)

    snout = box('Wolf_Snout', (0.15, 0.08, 0.065), (1.03, 0.0, 0.50), mat=fur)
    smooth(snout, 0)
    parts.append(snout)

    nose_tip = ball('Wolf_Nose', 0.032, (1.17, 0.0, 0.49), mat=nose)
    parts.append(nose_tip)

    for side, name in ((1, 'L'), (-1, 'R')):
        # Ear base center sits ABOVE the head's top surface (z=0.69) so the
        # whole cone is visible instead of half-buried in the head volume.
        e = cone(f'Wolf_Ear_{name}', 0.06, 0.22, (0.76, side * 0.09, 0.74),
                  rot=(0, math.radians(-12), side * math.radians(16)), mat=fur)
        parts.append(e)
        # Eye center sits right AT the head's front face (x=0.99) so it
        # visibly pokes out instead of being buried inside the solid head.
        eb = ball(f'Wolf_Eye_{name}', 0.032, (0.985, side * 0.075, 0.60), mat=eye)
        parts.append(eb)

    # Tail: endpoints again - inner point sits well inside the torso rear
    # (torso spans to x=-0.50) so it can never float disconnected.
    tail_inner, tail_mid, tail_outer = (-0.30, 0.0, 0.45), (-0.75, 0.0, 0.62), (-1.05, 0.0, 0.82)
    tail_base = cyl_between('Wolf_Tail_Base', 0.10, tail_inner, tail_mid, mat=fur)
    smooth(tail_base, 0)
    parts.append(tail_base)
    tail_tip = cone_between('Wolf_Tail_Tip', 0.085, tail_mid, tail_outer, mat=fur)
    smooth(tail_tip, 0)
    parts.append(tail_tip)

    # Legs: cylinders run along Z already, so their tops sink straight into the
    # torso belly with no rotation needed. Front pair taller/straighter, back
    # pair shorter (stalking crouch).
    leg_positions = [
        ('FL', 0.33, 0.13, 0.52),   # front-left  (top ~0.52 sinks into torso)
        ('FR', 0.33, -0.13, 0.52),  # front-right
        ('BL', -0.34, 0.13, 0.46),  # back-left  (shorter -> crouch)
        ('BR', -0.34, -0.13, 0.46), # back-right
    ]
    for name, x, y, h in leg_positions:
        upper = cyl(f'Wolf_Leg_{name}_Upper', 0.062, h, (x, y, h / 2), mat=fur)
        smooth(upper, 0)
        parts.append(upper)
        paw = ball(f'Wolf_Paw_{name}', 0.072, (x + 0.02, y, 0.02), mat=fur)
        parts.append(paw)

    return parts


def frame_and_render():
    scene = bpy.context.scene
    scene.camera = bpy.data.objects['Cam_Common']
    scene.render.film_transparent = True

    # Keep the camera's position/angle EXACTLY as verified in the shared rig
    # (18deg tilt / 35deg turn) - only widen the frame (sensor fit + scale) so
    # a low, elongated quadruped like a wolf fits, instead of the upright
    # ~1.8-unit humanoid reference the default framing assumes. This only
    # touches this example file, never the checked-in creature_render_rig.blend.
    scene.camera.data.sensor_fit = 'VERTICAL'
    scene.camera.data.ortho_scale = 2.4

    # High-res reference render
    scene.render.resolution_x, scene.render.resolution_y = 512, 640
    scene.render.filepath = bpy.path.abspath('//lobo_reference_512x640.png')
    bpy.ops.render.render(write_still=True)
    print('Saved reference render')

    # In-game cell size render (common creature: 64x80)
    scene.render.resolution_x, scene.render.resolution_y = 64, 80
    scene.render.filepath = bpy.path.abspath('//lobo_ingame_64x80.png')
    bpy.ops.render.render(write_still=True)
    print('Saved in-game size render')


def main():
    remove_placeholder()
    build_wolf()
    frame_and_render()
    bpy.ops.wm.save_as_mainfile(filepath=bpy.path.abspath('//examples_lobo_alfa_acechante.blend'))
    print('Saved example .blend')


if __name__ == '__main__':
    main()
