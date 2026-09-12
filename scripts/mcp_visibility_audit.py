"""Audit viewport/render visibility of tower objects to mirror the shipped selection."""
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
rows = []
for cname in tower_cols:
    col = bpy.data.collections.get(cname)
    if col is None:
        continue
    excluded = col.hide_viewport
    for o in col.objects:
        rows.append({"c": cname[:2], "name": o.name, "type": o.type,
                     "hide_vp": bool(o.hide_viewport), "hide_r": bool(o.hide_render),
                     "col_excluded": bool(excluded)})
vis_mesh = sum(1 for r in rows if r["type"] == "MESH" and not r["hide_vp"] and not r["col_excluded"])
hid = [r for r in rows if r["hide_vp"] or r["hide_r"] or r["col_excluded"]]
RESULT = {"total": len(rows), "visible_mesh": vis_mesh,
          "hidden": hid[:60], "n_hidden": len(hid),
          "curves": [r["name"] for r in rows if r["type"] == "CURVE"][:30]}
"""

result = execute_blender_code(CODE)
print(json.dumps(result, indent=1)[:5000])
