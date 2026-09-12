"""Headless: build a 10-cube 2-material test GLB for gltfpack flag experiments."""
import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
red = bpy.data.materials.new("TestRed")
red.use_nodes = True
blue = bpy.data.materials.new("TestBlue")
blue.use_nodes = True
for i in range(10):
    bpy.ops.mesh.primitive_cube_add(location=(i * 3, 0, 0))
    o = bpy.context.active_object
    o.name = "NamedCube_%02d" % i
    o.data.materials.append(red if i % 2 == 0 else blue)
bpy.ops.export_scene.gltf(
    filepath="C:/Users/suven/AppData/Local/Temp/opencode/merge-test.glb",
    export_format="GLB",
    use_selection=False,
)
print("MERGE_TEST_WRITTEN")
