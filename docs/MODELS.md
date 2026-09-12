# Working with the models

To create a new subject from your own reference images, use the
[single-shot 3D modeling prompt and guide](../prompts/README.md). The commands
below rebuild the existing Colombo Atlas landmarks.

The collection contains five original Blender architectural
reconstructions: Altair, World Trade Center, Gangaramaya Temple (the main temple,
not the separate Seema Malaka pavilion), Colombo Fort Station and Colombo
National Museum. Each folder in `public/landmarks/` includes an editable `.blend`,
a detailed standard `.glb`, a compressed `map.glb`, overview and detail renders,
reference/accuracy notes, and a ZIP package. `colombo-landmarks.zip` contains all
five packages in separate folders. The catalogue records dimensions, triangle
counts, geographic placement and download sizes.

These are architectural visual studies, with approximate exterior dimensions,
materials and ornament. They do not include measured plans or complete interiors.
The station and Museum include selective, furnished interiors and roof-off cutaway
renders. Their `REFERENCES.md` files identify observed features and inferred layout.
Both buildings face their northern approaches in the map; the station entrance
faces Olcott Mawatha. The Museum tag targets the main northern façade. The map removes
old building surfaces within the replacement sites before displaying the new
models. If an optional model fails to load, its original mapped building remains.
The five compressed web models stay within a combined 2.5 MB budget; interiors,
fine ornament and source scenes are kept in the downloads.

To rebuild with Blender 5.1 on macOS:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python scripts/build_landmarks.py -- all
python3 scripts/package_landmarks.py
```

Replace `all` with `altair`, `wtc`, `gangaramaya`, `fort` or `museum` to rebuild one
model, then run the packaging command. Rendering uses four CPU threads: 24 samples at 1200×1000 for the original studies,
and 32 samples at 1600×1000 for the heritage models. No GPU-intensive city render is needed. Packaging uses the
pinned `gltfpack` development dependency and preserves the detailed GLB for
viewers that do not support Meshopt compression.

The heritage builders are in `scripts/heritage_landmarks.py`. Their shaped Sinhala
sign outlines are stored in `scripts/heritage_lettering.json`, so Blender needs no
font add-on or external texture. To regenerate the outlines, install `fonttools`
and `uharfbuzz` in a Python environment and run
`python3 scripts/prepare_heritage_lettering.py`. The bundled Noto Sans Sinhala
font and its OFL licence are in `scripts/fonts/`.

Files are served by the existing local app. Public hosting can use the same
`dist/` output; no external asset upload is performed by the build scripts.

## Photoreal export pipeline

Both builders (`scripts/build_landmarks.py`, `scripts/build_expansion_blender.py`)
now finish every mesh with `photoreal_finish()`: an angle-limited bevel for soft
construction edges, a weighted-normal modifier for crisp flat faces, and a Smart
UV Project so all parts are texture-ready. Glazing uses real dielectric
transmission (IOR 1.45, exports `KHR_materials_transmission`) instead of a
metallic tint. Survey corrections are baked in: the Clock Tower is Z-scaled to
its surveyed 29 m, Altair uses the surveyed 13.8° lean with terraces to the
roof and outrigger links, WTC has uniform curtain glass with thin stone bands,
and Nelum Pokuna petals are true curved shells with champagne centre ribs.

To apply these to the shipped GLBs, re-run the Blender builders above (plus
`blender --background --threads 4 --python scripts/build_expansion_blender.py -- all`
for the twelve expansion landmarks), then commit the regenerated `map.glb`,
`.glb`, `.blend`, previews and catalogues. On Windows, replace the macOS Blender
path with the installed `blender.exe`; no Blender add-ons are required.
