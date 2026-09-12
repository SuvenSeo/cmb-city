"""Headless inspector: world bounds + tri count per node of a GLB. Arg: glb path."""
import bpy
import sys
from mathutils import Vector

path = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
for o in bpy.data.objects:
    if o.type != "MESH":
        continue
    ws = [o.matrix_world @ v.co for v in o.data.vertices]
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    print(
        "BOUNDS",
        o.name,
        "tris=",
        tris,
        "x=[%.1f,%.1f]" % (min(w.x for w in ws), max(w.x for w in ws)),
        "y=[%.1f,%.1f]" % (min(w.y for w in ws), max(w.y for w in ws)),
        "z=[%.1f,%.1f]" % (min(w.z for w in ws), max(w.z for w in ws)),
    )
