"""Curated tower re-export: decimated micro-bars, 12 pour joints, everything else."""
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
for cname in tower_cols:
    col = bpy.data.collections.get(cname)
    if col is None:
        continue
    for o in col.objects:
        if o.type != "MESH":
            continue
        n = o.name.lower()
        ratio = 0.08 if "mullion" in n else (0.15 if "rib" in n else 0)
        if ratio and "Decimate" not in o.modifiers:
            d = o.modifiers.new("Decimate", "DECIMATE")
            d.ratio = ratio
joints = sorted([o for o in bpy.data.objects if o.name.startswith("Shaft | subtle pour joint")],
                key=lambda o: o.name)
keep_joints = set(joints[i].name for i in range(0, len(joints), 5))
bpy.ops.object.select_all(action="DESELECT")
count = 0
for cname in tower_cols:
    col = bpy.data.collections.get(cname)
    if col is None:
        continue
    for o in col.objects:
        if o.type != "MESH" or o.hide_viewport or col.hide_viewport:
            continue
        if o.name.startswith("Shaft | subtle pour joint") and o.name not in keep_joints:
            continue
        try:
            o.select_set(True)
            count += 1
        except Exception:
            pass
sel = [o for o in bpy.context.selected_objects]
if sel:
    bpy.context.view_layer.objects.active = sel[0]
out = "C:/Users/suven/Desktop/OneDriveBackupFiles/Documents/ALL WORK/colombo-atlas/public/map/lotus-tower-new.glb"
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True,
                           export_extras=True, export_yup=True, export_animations=False)
import os
RESULT = {"selected": count, "joints_kept": len(keep_joints), "bytes": os.path.getsize(out)}
"""

result = execute_blender_code(CODE)
print(json.dumps(result, indent=1)[:2000])
