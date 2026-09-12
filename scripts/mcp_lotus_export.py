"""Export the full tower (visible objects in collections 01-05+15) to a temp GLB."""
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
bpy.ops.object.select_all(action="DESELECT")
targets = []
for cname in tower_cols:
    col = bpy.data.collections.get(cname)
    if col is None:
        continue
    for o in col.objects:
        if o.type in ("MESH", "CURVE") and not o.hide_viewport and not col.hide_viewport:
            targets.append(o)
curves = [o for o in targets if o.type == "CURVE"]
bpy.context.view_layer.objects.active = curves[0] if curves else None
for o in curves:
    o.select_set(True)
if curves:
    bpy.ops.object.convert(target="MESH")
bpy.ops.object.select_all(action="DESELECT")
for o in targets:
    try:
        o.select_set(True)
    except Exception:
        pass
bpy.context.view_layer.objects.active = targets[0]
out = "C:/Users/suven/Desktop/OneDriveBackupFiles/Documents/ALL WORK/colombo-atlas/public/map/lotus-tower-new.glb"
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True,
                           export_extras=True, export_yup=True, export_animations=False)
import os
RESULT = {"selected": len(targets), "curves_converted": len(curves),
          "bytes": os.path.getsize(out)}
"""

result = execute_blender_code(CODE)
print(json.dumps(result, indent=1)[:2000])
