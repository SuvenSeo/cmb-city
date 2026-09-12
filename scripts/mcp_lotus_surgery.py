"""Lotus material surgery: daylight-correct shaft + baked LED emissive on petals."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from blender_mcp_client import execute_blender_code

CODE = r"""
import bpy
report = {}
shaft_mat = bpy.data.materials.get("Shaft | emerald mineral coating")
if shaft_mat and shaft_mat.use_nodes:
    p = shaft_mat.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (0.843, 0.851, 0.839, 1.0)
    p.inputs["Roughness"].default_value = 0.8
    p.inputs["Metallic"].default_value = 0.0
    report["shaft"] = "pale grey #d7d9d6 rough .8 metal 0"
done = []
for i in range(12):
    m = bpy.data.materials.get("Petal glazing | rose tint %02d" % i)
    if m and m.use_nodes:
        p = m.node_tree.nodes.get("Principled BSDF")
        if p:
            ec = p.inputs.get("Emission Color")
            es = p.inputs.get("Emission Strength")
            if ec is not None:
                ec.default_value = (1.0, 0.31, 0.64, 1.0)
            if es is not None:
                es.default_value = 0.6
            done.append(m.name)
report["petal_emissive"] = len(done)
bpy.ops.wm.save_as_mainfile(filepath="C:/Users/suven/Desktop/OneDriveBackupFiles/Documents/ALL WORK/colombo-atlas/models/colombo-lotus-export.blend")
report["saved"] = "models/colombo-lotus-export.blend"
RESULT = report
"""

result = execute_blender_code(CODE)
print(json.dumps(result, indent=1)[:2000])
