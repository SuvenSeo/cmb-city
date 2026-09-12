"""Census tower collections 01-05+15 in the already-open colombo.blend."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from blender_mcp_client import execute_blender_code

CODE = r"""
import bpy
tower_cols = ["01 · Emerald concrete shaft",
              "02 · Lotus crown — glazed petal shells",
              "03 · Crown framing and observation levels",
              "04 · Telecommunications mast",
              "05 · Circular entrance pavilion",
              "15 · Tower grounds"]
census = {}
total_tris = 0
for cname in tower_cols:
    col = bpy.data.collections.get(cname)
    if col is None:
        census[cname] = None
        continue
    objs = [o for o in col.objects if o.type == "MESH"]
    tris = 0
    for o in objs:
        try:
            tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
        except Exception:
            pass
    total_tris += tris
    census[cname] = {"meshes": len(objs),
                     "tris": tris,
                     "names": [o.name for o in objs][:40]}
crown3 = bpy.data.collections.get("03 · Crown framing and observation levels")
l3 = []
if crown3:
    for o in list(crown3.objects)[:40]:
        try:
            d = [round(v, 1) for v in o.dimensions]
            z = [round(o.matrix_world.translation.z + o.bound_box[i][2] * o.dimensions.z, 1) for i in (0, 1)] if o.type == "MESH" else None
        except Exception:
            d, z = None, None
        l3.append({"name": o.name, "type": o.type, "dim": d, "z": z})
shaft_mat = bpy.data.materials.get("Shaft | emerald mineral coating")
shaft_inputs = {}
if shaft_mat and shaft_mat.use_nodes:
    p = shaft_mat.node_tree.nodes.get("Principled BSDF")
    if p:
        for k in ("Base Color", "Metallic", "Roughness", "Emission Color", "Emission Strength"):
            s = p.inputs.get(k)
            if s is not None:
                try:
                    v = tuple(round(float(x), 3) for x in s.default_value) if hasattr(s.default_value, "__len__") else round(float(s.default_value), 3)
                except Exception:
                    v = str(s.default_value)
                shaft_inputs[k] = v
RESULT = {"census": census, "total_tower_tris": total_tris, "crown03": l3, "shaft_mat": shaft_inputs}
"""

result = execute_blender_code(CODE)
print(json.dumps(result, indent=1)[:6000])
