# Colombo Map

A full-window 3D map of Colombo around Lotus Tower and Beira Lake, built with
Vite, React and Three.js. The app opens directly to the map at `/`.

```sh
npm install
npm run dev
```

Open [Colombo Map](http://127.0.0.1:5174/). Drag to orbit, scroll or pinch to zoom,
and select Aerial, City overview or Lakeside. Reset restores the selected camera.

- `src/` — the map viewer and camera controls.
- `public/map/` — compressed 3D models, tree placements, camera positions and credits.
- `public/environment/` — the daylight environment.
- `models/colombo.blend` — the editable Blender city, including Lotus Tower.
- `data/` — geographic source data and provenance.

All runtime assets are included locally. The main map downloads about 31 MB of
models and placement data plus a 5.4 MB environment. The distant skyline loads
afterward (about 19 MB). The Blender source and geographic working data are not
included in the website build.

The main area covers 22.617 km² with 43,570 mapped building footprints; another
61,383 footprints form the distant skyline. Coordinates use metres around Lotus
Tower: X east, Y up, negative Z north in the website. Source and estimated heights,
approximate façades, planting and distant elevations are recorded in the map
credits. Browser materials and lighting differ from Blender's rendered output.

Run `npm test` for camera, geometry and local asset checks, and `npm run build`
to create the deployable website in `dist/`. `npm run preview` serves that build.
