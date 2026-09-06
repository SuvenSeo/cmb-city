# World Trade Center — Colombo landmark model

Twin curved office towers with 39 tower levels, a four-level podium, articulated glass panels, stone bands and an entrance canopy.

## Included files
- wtc.blend: editable Blender 5.1 source, organized architectural collections, PBR materials, preview camera and lighting.
- wtc.glb: standalone detailed model; metres, glTF Y up; no external textures needed.
- map.glb: lighter export without the smallest rail, tile and window details.
- preview.png: rendered preview, transparent background.

## Fidelity
Exterior visual reconstruction from public photographs, mapped footprint context and published building descriptions. Heights, plans, colours and ornament are approximate unless supported by the reference. No measured survey, interior reconstruction or photogrammetry is claimed. Decorative sculpture is simplified. Suitable for city visualization and further refinement; not construction or navigation.

Detailed mesh: 108,936 triangles. Map mesh: 71,400 triangles.
Dimensions (X / Y / Z in Blender metres): 106.0 / 83.0 / 153.6.

Reference: https://wtc.lk/about/
Reference photos are not included or embedded as textures. Original geometry and materials are editable; no third-party model is included. Architectural designs and names remain associated with their respective owners. A public redistribution licence has not been assigned to this model package.

Map origin / placement (Three.js X east, Y up, Z south): [-1599, 8, -633]; local Blender Z rotation: 0 rad.
Built from scripts/build_landmarks.py. To change detail, edit the named architectural collections or the reusable builder. Studio objects are intentionally excluded from GLB exports.

The map.glb export uses Meshopt compression and KHR_mesh_quantization; use a compatible glTF loader. The detailed GLB is uncompressed for broad compatibility.
