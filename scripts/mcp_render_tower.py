"""Render a verification view of the tower with an existing aerial camera (Eevee)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from blender_mcp_client import execute_blender_code

CODE = r"""
import bpy
cams = [o for o in bpy.data.objects if o.type == "CAMERA"]
names = [c.name for c in cams]
pick = None
for key in ("ower", "ot us", "Aerial", "aerial", "City", "04", "Lotus"):
    for c in cams:
        if key.lower() in c.name.lower():
            pick = c
            break
    if pick:
        break
if pick is None and cams:
    pick = cams[0]
sc = bpy.context.scene
sc.camera = pick
sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x = 960
sc.render.resolution_y = 720
sc.render.resolution_percentage = 100
sc.render.film_transparent = False
out = "C:/Users/suven/AppData/Local/Temp/opencode/lotus-verify.png"
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
RESULT = {"camera": pick.name if pick else None, "all_cameras": names[:20], "file": out}
"""

result = execute_blender_code(CODE)
print(json.dumps(result, indent=1)[:2000])
