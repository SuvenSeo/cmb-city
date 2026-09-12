"""Inspect Lotus crown petal geometry inside the already-open colombo.blend."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from blender_mcp_client import execute_blender_code

CODE = r"""
import bpy, math
col = bpy.data.collections.get("02 · Lotus crown — glazed petal shells")
names = [o.name for o in col.objects] if col else []
info = []
for name in names[:24]:
    o = bpy.data.objects.get(name)
    if o is None or o.type != "MESH":
        continue
    me = o.data
    nverts = len(me.vertices)
    xs = [v.co.x for v in me.vertices]
    ys = [v.co.y for v in me.vertices]
    angs = sorted(set(round(math.degrees(math.atan2(y, x)), 1) for x, y in zip(xs, ys)))
    span = (max(angs) - min(angs)) if angs else 0
    wrap = span > 300
    zs = [v.co.z for v in me.vertices]
    info.append({"name": name, "verts": nverts,
                 "dim": [round(v, 1) for v in o.dimensions],
                 "z": [round(min(zs), 1), round(max(zs), 1)],
                 "angular_span_deg": round(span, 1), "full_wrap": wrap,
                 "mat": o.data.materials[0].name if len(o.data.materials) else None})
shaft_col = bpy.data.collections.get("01 · Emerald concrete shaft")
shaft_names = [o.name for o in shaft_col.objects][:12] if shaft_col else []
mast_col = bpy.data.collections.get("04 · Telecommunications mast")
mast_names = [o.name for o in mast_col.objects][:16] if mast_col else []
pav_col = bpy.data.collections.get("05 · Circular entrance pavilion")
pav_names = [o.name for o in pav_col.objects][:16] if pav_col else []
RESULT = {"crown_n": len(names), "crown": info,
          "shaft_sample": shaft_names, "mast": mast_names, "pavilion": pav_names}
"""

result = execute_blender_code(CODE)
print(json.dumps(result, indent=1)[:6000])
