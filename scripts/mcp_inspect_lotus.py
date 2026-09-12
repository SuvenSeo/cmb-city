"""Inspect the Lotus Tower inside models/colombo.blend via the Blender MCP server."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from blender_mcp_client import execute_blender_code

CODE = r"""
import bpy
bpy.ops.wm.open_mainfile(filepath="C:/Users/suven/Desktop/OneDriveBackupFiles/Documents/ALL WORK/colombo-atlas/models/colombo.blend")
cols = sorted(c.name for c in bpy.data.collections)
mats = sorted(m.name for m in bpy.data.materials)
key_hits = [o.name for o in bpy.data.objects
            if any(k in o.name.lower() for k in ("lotus", "petal", "calyx", "shaft", "mast", "radome", "pavilion", "bud"))]
sized = []
for name in key_hits[:40]:
    o = bpy.data.objects.get(name)
    if o is None:
        continue
    try:
        d = [round(v, 2) for v in o.dimensions]
        loc = [round(v, 2) for v in o.location]
    except Exception:
        d, loc = None, None
    sized.append({"name": name, "type": o.type, "dim": d, "loc": loc,
                  "mat": o.data.materials[0].name if o.type == "MESH" and o.data and len(o.data.materials) else None})
RESULT = {"collections": cols, "n_materials": len(mats), "materials": mats,
          "n_objects": len(bpy.data.objects), "n_meshes": sum(1 for o in bpy.data.objects if o.type == "MESH"),
          "n_key_hits": len(key_hits), "key": sized}
"""

result = execute_blender_code(CODE)
print(json.dumps(result, indent=1)[:6000])
