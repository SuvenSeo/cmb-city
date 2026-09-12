# Colombo National Museum — Colombo landmark model

Italianate arcades, fanlight sash windows, rusticated portico, carved capitals, urn finials and a furnished interior with a bifurcated timber staircase.

## Included files
- museum.blend: editable Blender 5.1 source, organized architectural collections, PBR materials, preview camera and lighting.
- museum.glb: standalone detailed model; metres, glTF Y up; no external textures needed.
- map.glb: lighter export without interiors, micro-ornament, fine tiles or small window bars.
- preview.png and detail.png: exterior studio views.
- interior.png: ticket hall or staircase view.
- cutaway.png: roof removed to reveal the interior structure.
- REFERENCES.md: visual evidence, coverage and uncertainty.
- FONT-LICENSE.txt: licence for the shaped Sinhala sign geometry.

## Fidelity
Exterior visual reconstruction from public photographs, mapped footprint context and published building descriptions. Heights, plans, colours and ornament are approximate unless supported by the reference. Selected interiors are reconstructed from visitor photographs. Room dimensions, connections, ornament and sculpture are interpretive; no measured survey or photogrammetry is claimed. See REFERENCES.md for feature-level evidence and limitations. Suitable for city visualization and further refinement; not construction or navigation.

Detailed mesh: 307,788 triangles. Map mesh: 56,059 triangles.
Dimensions (X / Y / Z in Blender metres): 78.0 / 105.0 / 15.67.

Reference: https://www.museum.gov.lk/
Reference photos are not included or embedded as textures. Original geometry and materials are editable; no third-party model is included. Architectural designs and names remain associated with their respective owners. A public redistribution licence has not been assigned to this model package.

Map origin / placement (Three.js X east, Y up, Z south): [291, 6, 1833]; local Blender Z rotation: -0.185 rad.
Built from scripts/build_landmarks.py. To change detail, edit the named architectural collections or the reusable builder. Studio objects are intentionally excluded from GLB exports.

Interior collections begin with Interior /. Hide Roof / collections for a cutaway. Four named cameras are saved in the source. Supplemental interior lights are in the Studio collection, disabled for exterior views; enable them when rendering an interior. No interior or studio light is loaded into the city map.

The map.glb export uses Meshopt compression and KHR_mesh_quantization; use a compatible glTF loader. The detailed GLB is uncompressed for broad compatibility.

The Museum city LOD targets 40% of its exterior triangles with a 0.1% relative mesh-error bound. The detailed GLB and Blender source retain the full architectural geometry.
