import argparse
import math
import colorsys
from pathlib import Path

import bpy
from mathutils import Euler, Vector


RENDER_SIZE = 96
GROUND_Z = 0.0
CHARACTER_SCALE = 0.93
CHARACTER_BASE_Y = 0.16
CHARACTER_BASE_Z = 0.08
COLOR_VIBRANCE = 1.95
COLOR_BRIGHTNESS = 0.38
SKIN_PALETTE_OVERRIDES = {
    "assassin_default": {
        "base_color": (0.10, 0.15, 0.28, 1.0),
        "accent_color": (0.18, 0.24, 0.44, 1.0),
        "cloth_color": (0.16, 0.22, 0.38, 1.0),
        "metal_color": (0.70, 0.78, 0.90, 1.0),
        "rim_color": (0.50, 0.60, 0.98, 1.0),
        "glow_color": (0.35, 0.18, 0.34, 1.0),
        "color_shift": -0.05,
        "sat_boost": 1.22,
        "val_boost": 0.34,
    },
    "witch_default": {
        "base_color": (0.34, 0.24, 0.58, 1.0),
        "accent_color": (0.63, 0.34, 0.98, 1.0),
        "cloth_color": (0.47, 0.22, 0.68, 1.0),
        "metal_color": (0.72, 0.64, 0.86, 1.0),
        "rim_color": (0.96, 0.85, 0.99, 1.0),
        "glow_color": (0.55, 0.72, 1.00, 1.0),
        "color_shift": 0.09,
        "sat_boost": 1.30,
        "val_boost": 0.27,
    },
    "priest_default": {
        "base_color": (0.95, 0.98, 1.00, 1.0),
        "accent_color": (0.99, 0.93, 0.78, 1.0),
        "cloth_color": (0.98, 0.90, 0.70, 1.0),
        "metal_color": (0.95, 0.92, 0.80, 1.0),
        "rim_color": (0.40, 0.68, 0.98, 1.0),
        "glow_color": (0.86, 0.93, 1.0, 1.0),
        "color_shift": 0.01,
        "sat_boost": 0.88,
        "val_boost": 0.70,
    },
    "warrior_default": {
        "base_color": (0.28, 0.04, 0.04, 1.0),
        "accent_color": (0.55, 0.05, 0.07, 1.0),
        "cloth_color": (0.82, 0.14, 0.12, 1.0),
        "metal_color": (0.78, 0.82, 0.87, 1.0),
        "rim_color": (0.75, 0.70, 0.84, 1.0),
        "glow_color": (0.80, 0.45, 0.34, 1.0),
        "color_shift": -0.01,
        "sat_boost": 1.28,
        "val_boost": 0.38,
    },
}
SCRIPT_DIR = Path(__file__).resolve().parent
MASTER_TEMPLATE_BLEND = SCRIPT_DIR / "resources" / "art001_player_master.blend"


PLAYER_SKINS = {
    "assassin_default": {
        "base_color": (0.12, 0.15, 0.25, 1.0),
        "accent_color": (0.22, 0.24, 0.36, 1.0),
        "cloth_color": (0.32, 0.24, 0.30, 1.0),
        "metal_color": (0.72, 0.78, 0.90, 1.0),
        "glow_color": (0.45, 0.20, 0.30, 1.0),
        "rim_color": (0.70, 0.78, 1.00, 1.0),
        "weapon": "dagger",
        "hat_style": "hood",
        "has_scarf": True,
        "accent_name": "cloak",
    },
    "witch_default": {
        "base_color": (0.34, 0.26, 0.52, 1.0),
        "accent_color": (0.58, 0.35, 0.90, 1.0),
        "cloth_color": (0.42, 0.25, 0.58, 1.0),
        "metal_color": (0.70, 0.66, 0.85, 1.0),
        "glow_color": (0.55, 0.72, 1.0, 1.0),
        "rim_color": (0.95, 0.85, 0.98, 1.0),
        "weapon": "staff",
        "hat_style": "wide_hat",
        "has_scarf": False,
        "accent_name": "robe",
    },
    "priest_default": {
        "base_color": (0.95, 0.96, 1.00, 1.0),
        "accent_color": (0.80, 0.86, 0.98, 1.0),
        "cloth_color": (0.94, 0.88, 0.74, 1.0),
        "metal_color": (0.95, 0.92, 0.80, 1.0),
        "glow_color": (0.86, 0.93, 1.0, 1.0),
        "rim_color": (0.35, 0.66, 0.98, 1.0),
        "weapon": "staff",
        "hat_style": "hood",
        "has_scarf": True,
        "accent_name": "mantle",
    },
    "warrior_default": {
        "base_color": (0.18, 0.20, 0.24, 1.0),
        "accent_color": (0.46, 0.46, 0.54, 1.0),
        "cloth_color": (0.55, 0.10, 0.08, 1.0),
        "metal_color": (0.72, 0.75, 0.80, 1.0),
        "glow_color": (0.78, 0.52, 0.40, 1.0),
        "rim_color": (0.70, 0.68, 0.76, 1.0),
        "weapon": "sword",
        "hat_style": "cowl",
        "has_scarf": True,
        "accent_name": "cloak",
        "scale": 0.9,
        "sheet_fit": 0.86,
    },
}


DIRECTIONS = {
    "up": 180.0,
    "up_right": 135.0,
    "right": 90.0,
    "down_right": 45.0,
    "down": 0.0,
    "down_left": -45.0,
    "left": -90.0,
    "up_left": -135.0,
}


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_x = RENDER_SIZE
    scene.render.resolution_y = RENDER_SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.cycles.device = "GPU"

    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 32
        if hasattr(scene.eevee, "use_gtao"):
            scene.eevee.use_gtao = True
            scene.eevee.gtao_distance = 0.2
            scene.eevee.gtao_factor = 2.0
        if hasattr(scene.eevee, "use_soft_shadows"):
            scene.eevee.use_soft_shadows = True
        elif hasattr(scene.eevee, "use_shadows"):
            scene.eevee.use_shadows = True
        if hasattr(scene.eevee, "use_ssr_reflection"):
            scene.eevee.use_ssr_reflection = False

    if hasattr(scene, "view_settings"):
        scene.view_settings.exposure = 0.04
        scene.view_settings.gamma = 1.00

    world = scene.world or bpy.data.worlds.new("Art001World")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.0, 0.0, 0.0, 1.0)
        bg.inputs["Strength"].default_value = 0.0
    scene.world = world


def create_orthographic_camera() -> None:
    cam_data = bpy.data.cameras.new("Art001Camera")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 1.92
    cam_data.clip_start = 0.05
    cam_data.clip_end = 100.0

    camera = bpy.data.objects.new("Art001Camera", cam_data)
    camera.location = Vector((0.0, -4.85, 2.82))
    bpy.context.collection.objects.link(camera)

    target = bpy.data.objects.new("Art001CameraTarget", None)
    target.location = Vector((0.0, 0.0, 1.00))
    bpy.context.collection.objects.link(target)

    track = camera.constraints.new(type="TRACK_TO")
    track.target = target
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"

    key_light = bpy.data.lights.new(name="Art001Key", type="SUN")
    key = bpy.data.objects.new("Art001Key", key_light)
    key_light.energy = 5.1
    key_light.angle = 0.35
    key.location = Vector((1.18, -2.0, 3.2))
    key.rotation_euler = Euler((math.radians(72), 0.0, math.radians(25.0)))
    bpy.context.collection.objects.link(key)

    fill_light_data = bpy.data.lights.new(name="Art001Fill", type="SUN")
    fill_obj = bpy.data.objects.new("Art001Fill", fill_light_data)
    fill_light_data.energy = 1.75
    fill_obj.location = Vector((-1.7, 0.2, 2.3))
    fill_obj.rotation_euler = Euler((math.radians(65), 0.0, math.radians(165.0)))
    bpy.context.collection.objects.link(fill_obj)

    rim_light_data = bpy.data.lights.new(name="Art001Rim", type="SUN")
    rim_obj = bpy.data.objects.new("Art001Rim", rim_light_data)
    rim_light_data.energy = 2.0
    rim_obj.location = Vector((0.0, 2.6, 3.2))
    rim_obj.rotation_euler = Euler((math.radians(-45), 0.0, 0.0))
    bpy.context.collection.objects.link(rim_obj)

    bpy.context.scene.camera = camera


def create_toon_material(
    name: str,
    base_color,
    metallic: float = 0.15,
    roughness: float = 0.32,
    emission: tuple[float, float, float, float] = (0.0, 0.0, 0.0, 1.0),
    emission_strength: float = 0.0,
    rim_color=None,
    outline_enabled=True,
    outline_color=None,
    outline_strength=0.55,
):
    if rim_color is None:
        rim_color = (0.8, 0.9, 1.0, 1.0)
    if outline_color is None:
        outline_color = (0.0, 0.0, 0.0, 1.0)

    def _vivid(c):
        r, g, b, a = c
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        s = max(0.0, min(1.0, s * COLOR_VIBRANCE))
        v = max(0.0, min(1.0, v * COLOR_BRIGHTNESS))
        rr, gg, bb = colorsys.hsv_to_rgb(h, s, v)
        return (rr, gg, bb, a)

    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links

    for node in list(nodes):
        nodes.remove(node)

    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (320, 0)

    toon = nodes.new("ShaderNodeBsdfPrincipled")
    toon.location = (0, 0)
    toon.inputs["Base Color"].default_value = _vivid(base_color)
    toon.inputs["Metallic"].default_value = metallic
    toon.inputs["Roughness"].default_value = roughness

    rim = nodes.new("ShaderNodeBsdfGlossy")
    rim.location = (0, 220)
    rim.inputs["Color"].default_value = _vivid(rim_color)
    rim.inputs["Roughness"].default_value = 0.16

    layer = nodes.new("ShaderNodeLayerWeight")
    layer.location = (-240, 220)
    layer.inputs["Blend"].default_value = 0.85

    mix = nodes.new("ShaderNodeMixShader")
    mix.location = (160, 110)
    links.new(toon.outputs["BSDF"], mix.inputs[2])
    links.new(rim.outputs["BSDF"], mix.inputs[1])
    links.new(layer.outputs["Facing"], mix.inputs["Fac"])

    if not outline_enabled:
        links.new(mix.outputs["Shader"], out.inputs["Surface"])
        return material

    edge = nodes.new("ShaderNodeBsdfDiffuse")
    edge.location = (0, 420)
    edge.inputs["Color"].default_value = outline_color
    edge.inputs["Roughness"].default_value = 0.2

    edge_detect_a = nodes.new("ShaderNodeMath")
    edge_detect_a.location = (80, 430)
    edge_detect_a.operation = "SUBTRACT"
    edge_detect_a.inputs[0].default_value = 1.0
    links.new(layer.outputs["Facing"], edge_detect_a.inputs[1])

    edge_detect_b = nodes.new("ShaderNodeMath")
    edge_detect_b.location = (160, 430)
    edge_detect_b.operation = "POWER"
    edge_detect_b.inputs[1].default_value = 1.8
    links.new(edge_detect_a.outputs["Value"], edge_detect_b.inputs[0])

    edge_detect_c = nodes.new("ShaderNodeMath")
    edge_detect_c.location = (240, 430)
    edge_detect_c.operation = "MULTIPLY"
    edge_detect_c.inputs[1].default_value = outline_strength
    links.new(edge_detect_b.outputs["Value"], edge_detect_c.inputs[0])

    outline_mix = nodes.new("ShaderNodeMixShader")
    outline_mix.location = (380, 210)
    outline_mix.label = "OutlineMix"
    links.new(edge.outputs["BSDF"], outline_mix.inputs[1])
    links.new(mix.outputs["Shader"], outline_mix.inputs[2])
    links.new(edge_detect_c.outputs["Value"], outline_mix.inputs["Fac"])

    links.new(outline_mix.outputs["Shader"], out.inputs["Surface"])
    return material


def make_materials(skin_id: str, palette: dict) -> dict[str, object]:
    color_override = SKIN_PALETTE_OVERRIDES.get(skin_id, {})
    style_base = tuple(color_override.get("base_color", palette["base_color"]))
    style_cloth = tuple(color_override.get("cloth_color", palette["cloth_color"]))
    style_accent = tuple(color_override.get("accent_color", palette["accent_color"]))
    style_metal = tuple(color_override.get("metal_color", palette["metal_color"]))
    style_rim = tuple(color_override.get("rim_color", palette["rim_color"]))
    style_glow = tuple(color_override.get("glow_color", palette["glow_color"]))
    sat_boost = float(color_override.get("sat_boost", 1.0))
    val_boost = float(color_override.get("val_boost", 1.0))

    def tint(
        color,
        hue_shift: float = 0.0,
        sat_mult: float = 1.0,
        val_mult: float = 1.0,
    ):
        h, s, v = colorsys.rgb_to_hsv(color[0], color[1], color[2])
        h = (h + float(color_override.get("color_shift", 0.0)) + hue_shift) % 1.0
        s = max(0.0, min(1.0, s * sat_boost * sat_mult * COLOR_VIBRANCE))
        v = max(0.0, min(1.0, v * val_boost * val_mult * COLOR_BRIGHTNESS))
        rr, gg, bb = colorsys.hsv_to_rgb(h, s, v)
        return (rr, gg, bb, color[3])

    outline_color = tuple(
        min(1.0, style_rim[i] * 0.88 + 0.12)
        for i in range(3)
    ) + (1.0,)
    return {
        "skin": create_toon_material(
            f"{skin_id}_skin",
            tint(style_base, sat_mult=1.0, val_mult=1.0),
            0.03,
            0.55,
            (
                style_glow[0] * 0.14,
                style_glow[1] * 0.14,
                style_glow[2] * 0.14,
                1.0,
            ),
            0.03,
            rim_color=tint(style_rim, sat_mult=1.15, val_mult=1.1),
            outline_color=outline_color,
            outline_strength=0.55,
        ),
        "cloth": create_toon_material(
            f"{skin_id}_cloth",
            tint(style_cloth, sat_mult=1.08, val_mult=1.05),
            0.0,
            0.42,
            (
                style_glow[0] * 0.10,
                style_glow[1] * 0.10,
                style_glow[2] * 0.10,
                1.0,
            ),
            0.2,
            rim_color=tint(style_rim, sat_mult=1.2, val_mult=1.1),
            outline_color=outline_color,
            outline_strength=0.62,
        ),
        "accent": create_toon_material(
            f"{skin_id}_accent",
            tint(style_accent, sat_mult=1.18, val_mult=1.03),
            0.15,
            0.30,
            (
                style_glow[0] * 0.10,
                style_glow[1] * 0.10,
                style_glow[2] * 0.10,
                1.0,
            ),
            0.02,
            rim_color=tint(style_rim, sat_mult=1.2, val_mult=1.05),
            outline_color=outline_color,
            outline_strength=0.72,
        ),
        "metal": create_toon_material(
            f"{skin_id}_metal",
            tint(style_metal, sat_mult=0.65, val_mult=1.01),
            0.95,
            0.28,
            (0.0, 0.0, 0.0, 1.0),
            0.01,
            rim_color=tint(style_rim, sat_mult=0.65, val_mult=0.98),
            outline_color=(0.06, 0.09, 0.12, 1.0),
            outline_strength=0.34,
        ),
        "rim": create_toon_material(
            f"{skin_id}_rim",
            tint(style_rim, sat_mult=1.0, val_mult=1.08),
            0.0,
            0.20,
            (0.0, 0.0, 0.0, 1.0),
            0.06,
            rim_color=tint(style_rim, sat_mult=0.8, val_mult=1.0),
            outline_color=(0.0, 0.0, 0.0, 1.0),
            outline_strength=0.62,
        ),
    }


def attach_material(obj, material):
    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)


def smooth_mesh(obj) -> None:
    if obj.type != "MESH":
        return

    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def create_part(
    mesh_name: str,
    build_fn,
    location,
    scale=(1.0, 1.0, 1.0),
    rotation=(0.0, 0.0, 0.0),
    material=None,
    parent=None,
):
    build_fn(size=1.0, location=location)
    part = bpy.context.active_object
    part.name = mesh_name
    part.location = Vector(location)
    part.scale = Vector(scale)
    part.rotation_euler = Euler(rotation)
    if part.type == "MESH":
        smooth_mesh(part)
    if material is not None:
        attach_material(part, material)
    if parent is not None:
        part.parent = parent
    return part


def build_weapon(skin_id: str, materials: dict, palette: dict, yaw: float):
    if palette["weapon"] == "dagger":
        weapon_root = bpy.data.objects.new(f"{skin_id}_weapon_root", None)
        weapon_root.location = Vector((0.42, 0.04, 0.87))
        weapon_root.rotation_euler = Euler((0.0, 0.0, math.radians(18.0)))
        bpy.context.collection.objects.link(weapon_root)

        build_fn = lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
        guard = create_part(
            f"{skin_id}_dagger_guard",
            build_fn,
            location=(0.04, 0.0, 0.05),
            scale=(0.30, 0.12, 0.08),
            rotation=(0.0, 0.0, 0.0),
            material=materials["metal"],
            parent=weapon_root,
        )
        handle = create_part(
            f"{skin_id}_dagger_handle",
            lambda size, location: bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=0.95, location=location),
            location=(0.15, 0.0, -0.18),
            scale=(1.0, 1.0, 1.0),
            rotation=(0.0, 0.0, 0.0),
            material=materials["cloth"],
            parent=weapon_root,
        )
        return weapon_root, [guard, handle]

    if palette["weapon"] == "sword":
        weapon_root = bpy.data.objects.new(f"{skin_id}_weapon_root", None)
        weapon_root.location = Vector((0.46, 0.0, 1.0))
        bpy.context.collection.objects.link(weapon_root)

        blade = create_part(
            f"{skin_id}_sword_blade",
            lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location),
            location=(0.0, 0.0, 0.22),
            scale=(0.07, 0.20, 0.62),
            material=materials["metal"],
            parent=weapon_root,
        )
        hilt = create_part(
            f"{skin_id}_sword_hilt",
            lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location),
            location=(0.0, 0.0, -0.32),
            scale=(0.10, 0.10, 0.12),
            material=materials["accent"],
            parent=weapon_root,
        )
        return weapon_root, [blade, hilt]

    staff_root = bpy.data.objects.new(f"{skin_id}_weapon_root", None)
    staff_root.location = Vector((0.28, -0.02, 0.92))
    bpy.context.collection.objects.link(staff_root)
    if palette["weapon"] == "staff":
        shaft = create_part(
            f"{skin_id}_staff_shaft",
            lambda size, location: bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.95, location=location),
            location=(0.0, 0.0, 0.01),
            rotation=(math.radians(80.0), 0.0, 0.0),
            material=materials["metal"],
            parent=staff_root,
        )
        orb = create_part(
            f"{skin_id}_staff_orb",
            lambda size, location: bpy.ops.mesh.primitive_uv_sphere_add(radius=0.14, location=location),
            location=(0.01, 0.45, 0.05),
            scale=(1.0, 1.0, 1.0),
            material=materials["rim"],
            parent=staff_root,
        )
        cross = create_part(
            f"{skin_id}_staff_cross",
            lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location),
            location=(0.0, 0.20, 0.18),
            scale=(0.15, 0.45, 0.045),
            material=materials["accent"],
            parent=staff_root,
        )
        return staff_root, [shaft, orb, cross]


def build_head_group(skin_id: str, materials: dict, palette: dict, parent=None):
    create_part(
        f"{skin_id}_skull",
        lambda size, location: bpy.ops.mesh.primitive_uv_sphere_add(radius=0.13, location=location),
        location=(0.0, 0.0, 1.15),
        scale=(1.0, 1.0, 1.0),
        material=materials["skin"],
        parent=parent,
    )

    create_part(
        f"{skin_id}_cheek_shadow",
        lambda size, location: bpy.ops.mesh.primitive_uv_sphere_add(radius=0.03, location=location),
        location=(0.0, -0.09, 1.10),
        scale=(1.0, 0.55, 1.0),
        material=materials["cloth"],
        parent=parent,
    )

    if palette["hat_style"] == "wide_hat":
        create_part(
            f"{skin_id}_witch_hat_base",
            lambda size, location: bpy.ops.mesh.primitive_cylinder_add(radius=0.28, depth=0.18, location=location),
            location=(0.0, 0.0, 1.28),
            scale=(1.0, 1.0, 0.7),
            material=materials["cloth"],
            parent=parent,
        )
        create_part(
            f"{skin_id}_witch_hat_top",
            lambda size, location: bpy.ops.mesh.primitive_cone_add(radius1=0.20, radius2=0.02, depth=0.55, location=location),
            location=(0.0, 0.0, 1.53),
            scale=(1.0, 1.0, 1.0),
            material=materials["cloth"],
            parent=parent,
        )
    elif palette["hat_style"] == "cowl":
        create_part(
            f"{skin_id}_cloak_hood",
            lambda size, location: bpy.ops.mesh.primitive_uv_sphere_add(radius=0.20, location=location),
            location=(0.0, 0.0, 1.16),
            scale=(1.1, 1.0, 0.95),
            material=materials["cloth"],
            parent=parent,
        )
    else:
        create_part(
            f"{skin_id}_hood_front",
            lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location),
            location=(0.0, 0.07, 1.11),
            scale=(0.22, 0.17, 0.13),
            rotation=(math.radians(12.0), 0.0, 0.0),
            material=materials["cloth"],
            parent=parent,
        )


def build_character(skin_id: str, yaw_deg: float, walk_offset: float, state: str, frame: int):
    palette = PLAYER_SKINS[skin_id]
    materials = make_materials(skin_id, palette)
    root = bpy.data.objects.new(f"{skin_id}_root", None)
    root.location = Vector((0.0, CHARACTER_BASE_Y, GROUND_Z))
    root.rotation_euler.z = math.radians(yaw_deg)
    bpy.context.collection.objects.link(root)

    torso = create_part(
        f"{skin_id}_torso",
        lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location),
        location=(0.0, 0.0, 0.82),
        scale=(0.30, 0.20, 0.34),
        material=materials["accent"],
        parent=root,
    )
    torso.rotation_euler = Euler((math.radians(2.0), 0.0, 0.0))

    create_part(
        f"{skin_id}_chest_panel",
        lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location),
        location=(0.0, -0.12, 0.86),
        scale=(0.24, 0.06, 0.14),
        material=materials["metal"],
        parent=torso,
    )

    create_part(
        f"{skin_id}_abdomen",
        lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location),
        location=(0.0, -0.01, 0.62),
        scale=(0.22, 0.19, 0.16),
        material=materials["cloth"],
        parent=root,
    )
    create_part(
        f"{skin_id}_pelvis_belt",
        lambda size, location: bpy.ops.mesh.primitive_torus_add(
            major_radius=0.15,
            minor_radius=0.025,
            location=location,
        ),
        location=(0.0, -0.02, 0.54),
        scale=(1.0, 1.0, 1.0),
        material=materials["metal"],
        parent=root,
    )

    build_head_group(skin_id, materials, palette, root)

    create_part(
        f"{skin_id}_shoulder_left",
        lambda size, location: bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=location),
        location=(-0.22, 0.13, 1.03),
        scale=(0.95, 0.80, 0.95),
        material=materials["metal"],
        parent=root,
    )
    create_part(
        f"{skin_id}_shoulder_right",
        lambda size, location: bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=location),
        location=(0.22, 0.13, 1.03),
        scale=(0.95, 0.80, 0.95),
        material=materials["metal"],
        parent=root,
    )

    create_part(
        f"{skin_id}_arm_left",
        lambda size, location: bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.58, location=location),
        location=(-0.22, 0.08, 0.94),
        scale=(1.0, 1.0, 1.0),
        rotation=(math.radians(85.0), 0.0, 0.0),
        material=materials["skin"],
        parent=root,
    )
    arm_left = bpy.context.active_object
    create_part(
        f"{skin_id}_arm_left_fore",
        lambda size, location: bpy.ops.mesh.primitive_cylinder_add(radius=0.038, depth=0.34, location=location),
        location=(-0.22, 0.22, 0.71),
        material=materials["skin"],
        rotation=(math.radians(70.0), 0.0, 0.0),
        scale=(1.0, 1.0, 1.0),
        parent=arm_left,
    )

    create_part(
        f"{skin_id}_arm_right",
        lambda size, location: bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.58, location=location),
        location=(0.22, 0.08, 0.94),
        scale=(1.0, 1.0, 1.0),
        rotation=(math.radians(85.0), 0.0, 0.0),
        material=materials["skin"],
        parent=root,
    )
    arm_right = bpy.context.active_object
    create_part(
        f"{skin_id}_arm_right_fore",
        lambda size, location: bpy.ops.mesh.primitive_cylinder_add(radius=0.038, depth=0.34, location=location),
        location=(0.22, 0.22, 0.71),
        material=materials["skin"],
        rotation=(math.radians(70.0), 0.0, 0.0),
        scale=(1.0, 1.0, 1.0),
        parent=arm_right,
    )

    create_part(
        f"{skin_id}_leg_left",
        lambda size, location: bpy.ops.mesh.primitive_cylinder_add(radius=0.056, depth=0.52, location=location),
        location=(-0.12, 0.02, 0.35),
        material=materials["cloth"],
        scale=(1.0, 1.0, 1.0),
        parent=root,
    )
    leg_left = bpy.context.active_object
    create_part(
        f"{skin_id}_foot_left",
        lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location),
        location=(-0.17, 0.00, 0.10),
        scale=(0.13, 0.20, 0.07),
        material=materials["metal"],
        parent=leg_left,
    )

    create_part(
        f"{skin_id}_leg_right",
        lambda size, location: bpy.ops.mesh.primitive_cylinder_add(radius=0.056, depth=0.52, location=location),
        location=(0.12, 0.02, 0.35),
        material=materials["cloth"],
        scale=(1.0, 1.0, 1.0),
        parent=root,
    )
    leg_right = bpy.context.active_object
    create_part(
        f"{skin_id}_foot_right",
        lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location),
        location=(0.17, 0.00, 0.10),
        scale=(0.13, 0.20, 0.07),
        material=materials["metal"],
        parent=leg_right,
    )

    cape_root = create_part(
        f"{skin_id}_cape",
        lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location),
        location=(0.0, -0.20, 1.02),
        scale=(0.34, 0.02, 0.36),
        rotation=(math.radians(-9.0), 0.0, 0.0),
        material=materials["accent"],
        parent=root,
    )
    cape_tail = create_part(
        f"{skin_id}_cape_tail",
        lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location),
        location=(0.0, -0.31, 0.83),
        scale=(0.28, 0.04, 0.16),
        rotation=(math.radians(-36.0), 0.0, 0.0),
        material=materials["cloth"],
        parent=root,
    )

    if palette["has_scarf"]:
        create_part(
            f"{skin_id}_scarf",
            lambda size, location: bpy.ops.mesh.primitive_torus_add(
                major_radius=0.18,
                minor_radius=0.04,
                location=location,
            ),
            location=(0.0, 0.11, 1.01),
            scale=(1.0, 1.0, 1.0),
            material=materials["rim"],
            parent=root,
        )

    if palette["accent_name"] == "robe":
        create_part(
            f"{skin_id}_robe_panel_left",
            lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location),
            location=(-0.15, -0.12, 0.82),
            scale=(0.14, 0.08, 0.28),
            material=materials["cloth"],
            parent=root,
        )
        create_part(
            f"{skin_id}_robe_panel_right",
            lambda size, location: bpy.ops.mesh.primitive_cube_add(size=1.0, location=location),
            location=(0.15, -0.12, 0.82),
            scale=(0.14, 0.08, 0.28),
            material=materials["cloth"],
            parent=root,
        )

    weapon_root, _ = build_weapon(skin_id, materials, palette, yaw_deg)
    weapon_root.parent = root

    apply_pose(
        palette=palette,
        state=state,
        frame=frame,
        walk_offset=walk_offset,
        root=root,
        arm_left=arm_left,
        arm_right=arm_right,
        leg_left=leg_left,
        leg_right=leg_right,
        cape= (cape_root, cape_tail),
    )
    scale = palette.get("scale", 1.0)
    root.scale = Vector((CHARACTER_SCALE * scale, CHARACTER_SCALE * scale, CHARACTER_SCALE * scale))

    return {
        "root": root,
        "arm_left": arm_left,
        "arm_right": arm_right,
        "leg_left": leg_left,
        "leg_right": leg_right,
        "cape_root": cape_root,
        "cape_tail": cape_tail,
        "weapon_root": weapon_root,
    }


def apply_pose(
    palette: dict,
    state: str,
    frame: int,
    walk_offset: float,
    root,
    arm_left,
    arm_right,
    leg_left,
    leg_right,
    cape=None,
):
    phase = math.sin(walk_offset * math.tau)
    breath = math.sin(walk_offset * math.tau + 0.8)
    is_idle = state == "idle"

    arm_swing = 22.0 if not is_idle else 6.0
    leg_swing = 24.0 if not is_idle else 4.0
    arm_offset = 15.0 if not is_idle else 4.0

    arm_left.rotation_euler.x = math.radians(arm_swing * phase)
    arm_right.rotation_euler.x = -math.radians(arm_swing * phase)
    leg_left.rotation_euler.x = -math.radians(leg_swing * phase)
    leg_right.rotation_euler.x = math.radians(leg_swing * phase)

    if cape is not None:
        cape_root, cape_tail = cape
        cape_root.rotation_euler.x = math.radians(-8.0) * math.cos(phase + frame / 2.0)
        cape_root.rotation_euler.y = math.radians(4.0 + 2.0 * breath)
        cape_tail.rotation_euler.y = math.radians(6.0 + 3.5 * breath)
        cape_tail.rotation_euler.z = math.radians(1.2 + 0.8 * breath)

    if state == "walk":
        root.rotation_euler.y = math.radians(1.5 * breath)
        root.location.y = CHARACTER_BASE_Y - 0.012 * phase
    else:
        root.rotation_euler.y = math.radians(0.7 * breath)
        root.location.y = CHARACTER_BASE_Y + 0.004 * math.sin(frame * 0.8 + walk_offset)

    root.location.z = CHARACTER_BASE_Z + 0.002 * (1.0 - abs(phase))

    if palette["weapon"] == "dagger":
        arm_left.rotation_euler.z = math.radians(-12.0 + arm_offset * phase)
        arm_right.rotation_euler.z = math.radians(12.0 - arm_offset * phase)
    elif palette["weapon"] == "sword":
        arm_right.rotation_euler.z = math.radians(17.0 - 6.0 * phase)
        arm_left.rotation_euler.z = math.radians(-18.0 + 3.0 * breath)


def clear_skin_objects(skin_id: str) -> None:
    for obj in list(bpy.data.objects):
        if obj.name.startswith(f"{skin_id}_"):
            bpy.data.objects.remove(obj, do_unlink=True)


def render_still(path: Path, width: int, height: int):
    scene = bpy.context.scene
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def render_direction_frames(output_root: Path, skin_id: str, state: str):
    out_dir = output_root / skin_id
    out_dir.mkdir(parents=True, exist_ok=True)

    for direction, yaw in DIRECTIONS.items():
        for frame in range(4):
            clear_skin_objects(skin_id)
            walk_offset = frame / 4.0
            build_character(
                skin_id,
                yaw,
                walk_offset,
                state,
                frame,
            )
            render_still(
                out_dir / f"{state}_{direction}_{frame}.png",
                RENDER_SIZE,
                RENDER_SIZE,
            )


def generate_players(output_root: Path, skins: list[str]):
    for skin_id in skins:
        clear_skin_objects(skin_id)
        render_direction_frames(output_root, skin_id, "walk")
        clear_skin_objects(skin_id)
        render_direction_frames(output_root, skin_id, "idle")


if __name__ == "__main__":
    import sys

    # Blender prepends its own args before script args.
    raw_args = sys.argv
    if "--" in raw_args:
        raw_args = raw_args[raw_args.index("--") + 1:]

    if raw_args and "render_player_sprites.py" in raw_args[0]:
        raw_args = raw_args[1:]

    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", default="public/assets/art001_render_tmp/player")
    parser.add_argument("--skins", default=",".join(PLAYER_SKINS.keys()))
    args = parser.parse_args(raw_args)

    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    selected = [item.strip() for item in args.skins.split(",") if item.strip()]
    selected = [skin for skin in selected if skin in PLAYER_SKINS] or list(PLAYER_SKINS.keys())

    reset_scene()
    create_orthographic_camera()
    generate_players(output_root, selected)
