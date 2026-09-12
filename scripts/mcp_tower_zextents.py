"""Query precise world z-extents of tower parts + shaft material values."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from blender_mcp_client import execute_blender_code

CODE = r"""
import bpy
from mathutils import Vector
def wext(o):
    ws = [o.matrix_world @ v.co for v in o.data.vertices]
    return [round(min(w.z for w in ws), 2), round(max(w.z for w in ws), 2)]
out = {}
col2 = bpy.data.collections.get("02 · Lotus crown — glazed petal shells")
tiers = {}
for o in col2.objects:
    if o.type != "MESH" or not o.name.startswith("Petal"):
        continue
    tier = o.name.split()[1].split(".")[0]
    z = wext(o)
    t = tiers.setdefault(tier, {"zmin": 1e9, "zmax": -1e9, "n": 0})
    t["zmin"] = min(t["zmin"], z[0]); t["zmax"] = max(t["zmax"], z[1]); t["n"] += 1
out["petal_tiers"] = tiers
for single in ["Crown | inner continuous glazed envelope", "Calyx | flared green throat",
               "Tower shaft | tapered reinforced concrete",
               "Telecommunications | stepped antenna mast",
               "Upper observation glazing | taper",
               "Observation deck | white projecting fascia"]:
    o = bpy.data.objects.get(single)
    out[single] = wext(o) if o and o.type == "MESH" else None
col3 = bpy.data.collections.get("03 · Crown framing and observation levels")
slabs = []
for o in col3.objects:
    if o.type == "MESH" and o.name.startswith("Tower house | floor slab"):
        slabs.append([o.name, wext(o)])
out["floor_slabs"] = sorted(slabs)
shaft_mat = bpy.data.materials.get("Shaft | emerald mineral coating")
vals = {}
if shaft_mat and shaft_mat.use_nodes:
    p = shaft_mat.node_tree.nodes.get("Principled BSDF")
    if p:
        for k in ("Base Color", "Metallic", "Roughness", "Emission Color", "Emission Strength"):
            s = p.inputs.get(k)
            if s is not None:
                try:
                    v = tuple(round(float(x), 4) for x in s.default_value) if hasattr(s.default_value, "__len__") else round(float(s.default_value), 4)
                except Exception:
                    v = str(s.default_value)
                vals[k] = v
out["shaft_mat"] = vals
beacon = bpy.data.materials.get("Aviation | red obstruction light")
bv = {}
if beacon and beacon.use_nodes:
    p = beacon.node_tree.nodes.get("Principled BSDF")
    if p:
        for k in ("Base Color", "Emission Color", "Emission Strength"):
            s = p.inputs.get(k)
            if s is not None:
                try:
                    v = tuple(round(float(x), 4) for x in s.default_value) if hasattr(s.default_value, "__len__") else round(float(s.default_value), 4)
                except Exception:
                    v = str(s.default_value)
                bv[k] = v
out["beacon_mat"] = bv
RESULT = out
"""

result = execute_blender_code(CODE)
print(json.dumps(result, indent=1)[:5000])
