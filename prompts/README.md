# Build a 3D model from reference images

Upload your references, fill in the brief below, and paste the complete prompt in
one message. It works as a starting brief for buildings, landmarks, furniture,
vehicles, props, sculptures and original characters.

This is a reusable version of the reference-based approach behind Colombo Atlas,
not a verbatim record of the original conversations or a guarantee of a perfect
model from one photograph. Our [model notes](../docs/MODELS.md) describe the actual
landmark assets and their limitations.

Use the prompt with a tool that can operate Blender or run Blender Python. A
text-only assistant can help write a modeling script, but you still need Blender
to execute it and inspect the result.

## Before you paste

1. **Name the subject precisely.** For a real place, include its location and the
   building or part you want. Similar names can refer to different structures.
2. **Upload useful views.** Start with a clear overall image, then add different
   sides, a top view if available, and close-ups of important details. Sharp
   frames extracted from video also work; label their viewing direction.
3. **Provide one reliable measurement if possible.** A known height, width or
   object dimension helps establish scale. Label estimates as estimates.
4. **Say where the model will be used.** A browser map, a close-up render,
   animation and 3D printing need different geometry and exports.
5. **Define the boundary.** Specify the subject alone or its surroundings,
   exterior or interior, and the details that matter most.

You can label uploads with this worksheet. Use the actual attachment names in
the prompt so the views cannot be confused.

| Reference | Filename | What it establishes |
| --- | --- | --- |
| Main view | `01-overall.jpg` | Overall form, proportions and intended version |
| Another side | `02-side.jpg` | Depth, side features and connections |
| Rear view | `03-rear.jpg` | Features hidden in the main image |
| Top or plan | `04-top.jpg` | Footprint, roof or upper surfaces |
| Detail | `05-detail.jpg` | Materials, joints, ornament or lettering |
| Scale | `06-dimension.jpg` | A reliable measurement, with units and source |

These filenames are examples. Fewer images are fine; leave missing views marked
as unavailable. A generated concept image can define an original design, but
generated extra angles do not verify the unseen parts of a real object.

## The single-shot prompt

Copy this entire block. Replace the bracketed fields and attach your images.
At minimum, fill in the subject, uploaded references and intended use. Leave
other fields as “use the defaults” if you do not have a preference, or “unknown”
for measurements you cannot verify.

The `.blend` is the editable Blender project; the `.glb` is the portable 3D model
for a compatible viewer. Preview PNGs are pictures of that model, not substitutes
for it. You can leave technical limits such as triangle and texture budgets at
their defaults.

```text
Create a realistic, editable 3D model in Blender using my uploaded reference
images. Complete the modeling, materials, inspection, refinement and exports as
one task. The result must be actual geometry that can be viewed from different
angles, not a rendered image presented as a model.

MY BRIEF
- Subject and identifying details: [name; location for a landmark; version/year
  if relevant; or a description of an original design]
- Intended use: [browser/real-time viewer, still renders, animation, 3D printing,
  or another purpose; default: an interactive desktop-browser model]
- Scope: [subject alone or surroundings; exterior, selected interior, or both;
  default: subject alone, exterior only]
- Uploaded references: [actual filenames, viewing direction and what each shows]
- Main reference: [filename; default: the clearest overall image]
- Known dimensions: [measurements, units and sources; write “unknown” if absent]
- Features that must match: [silhouette, proportions, openings, roof, face,
  ornament, components, exact lettering, or other identifying details]
- Additional research: [allowed/not allowed; default: search for public reference
  images and reliable dimensions when needed, if browsing is available]
- Deliverables and limits: [output folder, render size, file/triangle/texture
  budgets, animation or print requirements; default: a clearly named new folder,
  editable Blender source, a self-contained GLB and four preview renders with
  a 1600px longest edge]
- Optional frames: [turntable frame count or named views; default: no additional
  animation, just the four previews]

1. ESTABLISH THE REFERENCE
Identify the exact subject and inspect every supplied image before modeling.
Separate visible facts, published measurements and estimates. Account for camera
perspective, lens distortion, lighting, obstructions and differences between
dates or versions. Do not mistake a shadow or a photograph's perspective for a
physical feature. Prioritize my brief and main reference; explain significant
conflicts rather than silently mixing incompatible views.

If research is allowed and available, find the missing angles or details needed
to understand the subject. Prefer reliable first-party references, plans and
documented measurements. Record the URLs and the features they support. If a
view or measurement remains unavailable, make a restrained, plausible estimate
and label it. Do not invent sources or claim research you could not perform.

Proceed with reasonable, documented assumptions. Ask a question only if the
subject cannot be identified, required attachments are missing, or a major
contradiction prevents a useful result.

2. BUILD THE FORM
Set an appropriate real-world scale and document the units, origin and axes.
If scale is unknown, choose and disclose a working assumption. Build the main
silhouette, footprint and proportions first; then add the larger secondary
forms, openings and distinctive details. Compare the blockout with the
references before adding fine detail.

Use suitable methods for the subject: modular or hard-surface modeling for
constructed objects, and sculpting/retopology where organic form requires it.
Keep major parts separately editable and clearly named. Reuse repeated geometry
where practical. Avoid accidental intersections, floating parts, inverted
normals and duplicate surfaces. Preserve intentional asymmetry.

Model the requested scope. Do not invent a detailed interior or hidden mechanism
from exterior photographs. Treat unseen surfaces as inferred. Reproduce supplied
lettering accurately; report anything that cannot be verified or reproduced
instead of replacing it with gibberish. Do not add unrelated scenery or features.

3. CREATE BELIEVABLE MATERIALS
Match the subject's material types, colors, roughness and transparency under
neutral lighting. Use textures at a believable physical scale. Add restrained
surface variation, edge treatment and wear supported by the references; avoid
uniform plastic shading, exaggerated damage and excessive gloss.

Use suitable PBR materials and UVs where needed. Build an independently usable
3D asset: do not put the reference photograph behind the model or project the
whole photograph onto flat geometry to fake its shape. Use reference images for
visual guidance; only reuse third-party textures or models when permission or
their licence permits it, and record their attribution.

4. PREPARE THE INTENDED OUTPUT
Preserve an editable master. For real-time use, also prepare a lighter export
with shared materials, efficient textures and simpler distant geometry where
useful. Follow supplied budgets; otherwise choose practical limits and report
the actual triangle count, texture sizes and file sizes. Keep the recognizable
silhouette and key features when simplifying. Do not promise a frame rate
without testing the intended viewer and device.

Use export-compatible materials and bake necessary procedural detail when it
would otherwise be lost. Check the exported appearance separately from Blender.
For animation, provide the requested topology, pivots and rig requirements.
For printing, provide the requested printable format and check scale, closed
volume, wall thickness and disconnected parts. Do not claim animation or print
readiness without the relevant checks.

5. INSPECT AND REFINE
Render and inspect the model from several angles, including a view close to the
main reference and one that reveals depth. Use neutral lighting first so dramatic
effects cannot hide shape or material problems. Check proportions, silhouette,
part placement, surface scale, shading and important details. Correct visible
mismatches and inspect again before delivery.

Reopen the saved Blender file and import the exported model into a fresh scene
or compatible viewer. Verify scale, orientation, materials, textures and missing
parts. Ensure portable files do not depend on unprovided local paths. Report
checks you could not perform and any remaining material differences.

6. DELIVER
Provide the editable .blend, a standard self-contained .glb for visual/browser
use, and any additional format requested for the intended use. If supplying a
compressed GLB, identify its required decoder and include a broadly compatible
version too. Keep presentation lights and background geometry out of asset-only
exports unless requested. Include textures if they are not embedded or packed.

Unless I specified other views, render four useful previews: a three-quarter
overall view, a front view, another side or rear view, and a close-up of an
identifying detail. Keep the complete subject visible in the overall views.
If I requested turntable frames, rotate
the camera consistently around the same finished model with fixed lighting,
exposure, focal length and framing; save sequentially numbered frames rather
than independently regenerating the subject for each image.

Include brief model notes listing dimensions, files, sources/attribution,
observed versus inferred details, export limitations and completed checks.
Provide a reproducible Blender Python script if you used one to build the model.
Do not overwrite unrelated files. Do not stop at a plan when you can execute
Blender. If you cannot run the necessary tools, state that clearly and provide
the runnable script and remaining steps without claiming that files or renders
have already been created.
```

## Example briefs

Keep the complete prompt above and replace only its **MY BRIEF** fields. You do
not need a separate prompt for each modeling stage.

| Subject | Useful brief details |
| --- | --- |
| Lotus Tower / Nelum Kuluna, Colombo | Exterior tower and entrance podium; prioritize the shaft proportions, lotus crown, petal arrangement and antenna. Attach overall and crown close-ups. Supply a sourced height or mark it unknown. |
| Gangaramaya Temple, Colombo | Identify the main land-based temple compound or the separate Seema Malaka pavilion explicitly. Define the boundary and prioritize the gateway, roof profiles and visible ornament. Request interiors only with supporting references. |
| Colombo National Museum | Specify the main building and façade. Prioritize the portico, arcades and roofline. If requesting the staircase, attach interior views and identify room connections that remain unknown. |
| A wooden chair | Subject only; attach front, side, rear and joinery details, with a measured seat height. Prioritize leg angles, backrest shape and wood grain scale. |
| An original creature | Label the images as concept art. Specify which design is authoritative, a consistent pose, assumed size, and whether the output is a static sculpture or needs a rig. |

## Getting a better result

“Make it realistic” is an objective, not enough evidence by itself. Replace vague
requests with observable features: “match the spacing of these windows,” “keep
the roof pitch from image 2,” or “the leg is 42 cm long.” An image with a visible
measurement is more useful than several near-identical angles.

Keep **model accuracy** and **presentation** separate. First compare the shape
and materials in neutral views; then ask for a particular camera, light or
background. A flattering render can hide errors that appear when the model turns.

For additional render frames, fill in the optional field with something concrete,
such as “12 equally spaced views around the vertical axis, no repeated endpoint,
1600 × 1600 PNGs, transparent background.” The frames should all come from the
same mesh. For a still-image set, name the views and details you want instead.

A single complete brief can start the whole task, but results still depend on
the references and available tools. A useful correction identifies the image,
part and change: “In `02-side.jpg`, the rear roof is lower than the front roof;
adjust that section and rerender the side view.”

## Check what you receive

- Open the `.blend` and inspect named parts and materials.
- Rotate the exported model to inspect views absent from the main reference.
- Confirm the scale against your known measurement.
- Compare distinctive features with the source images, not just the beauty render.
- Check that textures travel with the files and source credits are present.
- Read the uncertainty notes before treating an inferred feature as a fact.

The aim is a convincing, useful reconstruction with clear limits. Photographs
alone do not establish an exact surveyed model of every unseen surface.
