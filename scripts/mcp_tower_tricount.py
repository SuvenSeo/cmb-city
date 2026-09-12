"""Sum triangles by object-name group across tower collections."""
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
groups = {}
total = 0
for cname in tower_cols:
    col = bpy.data.collections.get(cname)
    if col is None:
        continue
    for o in col.objects:
        if o.type != "MESH":
            continue
        try:
            t = sum(len(p.vertices) - 2 for p in o.data.polygons)
        except Exception:
            t = 0
        total += t
        n = o.name
        if "pour joint" in n:
            k = "joints"
        elif any(k in n for k in ("handrail", "middle rail", "uprights", "guardrail", "balustrade", "drainage")):
            k = "rails"
        elif "parapet" in n:
            k = "parapets"
        elif "Petal" in n and "rib" not in n and "mullion" not in n:
            k = "petals"
        elif "mullion" in n:
            k = "mullions"
        elif "rib" in n:
            k = "ribs"
        elif "Sepal" in n:
            k = "sepals"
        elif "platform" in n or "Platform" in n:
            k = "platforms"
        elif "beacon" in n or "Beacon" in n or "antenna" in n or "Antenna" in n or "finial" in n:
            k = "mast_top"
        elif "slab" in n or "fascia" in n or "glazing" in n or "drum" in n:
            k = "tower_house"
        elif "Pavilion" in n or "pavilion" in n or "Paving" in n:
            k = "pavilion"
        elif "shaft" in n or "Shaft" in n or "Calyx" in n or "calyx" in n or "Envelope" in n or "envelope" in n:
            k = "shaft_crown"
        else:
            k = "other:" + n[:40]
        g = groups.setdefault(k, {"tris": 0, "n": 0})
        g["tris"] += t
        g["n"] += 1
RESULT = {"total": total, "groups": groups}
"""

result = execute_blender_code(CODE)
print(json.dumps(result, indent=1)[:4000])
