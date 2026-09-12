"""Headless: report node names of the two packed test files."""
import bpy
import sys
import os

for path in [
    "C:/Users/suven/AppData/Local/Temp/opencode/merge-cc.glb",
    "C:/Users/suven/AppData/Local/Temp/opencode/merge-kn.glb",
]:
    print("FILE", path, os.path.getsize(path))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    print("NODES", sorted(o.name for o in bpy.data.objects))
