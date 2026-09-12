"""Headless inspector: list nodes/materials/bounds/tris of a GLB. Arg: glb path."""
import bpy
import sys

path = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
print("NODES", len(bpy.data.objects))
total = 0
for o in bpy.data.objects:
    if o.type != "MESH":
        print("NONMESH", o.name, o.type)
        continue
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    total += tris
    mats = [m.name if m else None for m in o.data.materials]
    print("MESH", o.name, "tris=", tris, "mats=", mats)
print("TOTAL_TRIS", total)
print("MATERIALS", sorted(m.name for m in bpy.data.materials))
