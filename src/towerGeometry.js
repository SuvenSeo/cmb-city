import {Float32BufferAttribute, Matrix4, Raycaster, Vector3} from 'three';

// The exported pavilion has a ceramic cap only 4.8 mm below its limestone
// terrace. Recess that cap inside the existing slab, preserving its closed
// sides and the visible terrace, parapet and rooftop equipment.
const PAVING = 'Paving | pale limestone', CERAMIC = 'Pavilion and radome | warm white ceramic';
// Sample points on the pavilion terrace annulus (viewer metres, Y up).
const TERRACE_SAMPLES = [[28.3, 7.9], [-24.7, 16.3], [12.3, -29.1], [-8.2, -26.7]];
// The terrace is a disc centred on the tower axis with a 79.5 m design diameter.
const TERRACE_RADIUS = 79.5 / 2;

function materialsOf(mesh) {
  const material = mesh.material;
  return Array.isArray(material) ? material : [material];
}

function hasMaterial(mesh, name) {
  return materialsOf(mesh).some(material => material?.name === name);
}

function terraceTop(root) {
  // Locate the limestone terrace by raycast, robust to exporter mesh joins
  // that merge named parts into multi-material nodes.
  const ray = new Raycaster(), down = new Vector3(0, -1, 0), tops = [];
  for (const [x, z] of TERRACE_SAMPLES) {
    ray.set(new Vector3(x, 30, z), down);
    const hit = ray.intersectObject(root, true).find(h =>
      h.object.isMesh && hasMaterial(h.object, PAVING) && h.point.y > 10 && h.point.y < 25);
    if (hit) tops.push(hit.point.y);
  }
  if (!tops.length) return 0;
  return tops.reduce((a, b) => a + b, 0) / tops.length;
}

export function separatePavilionRoof(root) {
  root.updateMatrixWorld(true);
  const top = terraceTop(root);
  if (!top) return 0;
  const centre = new Vector3(0, top, 0), capHeight = top - .1;
  const world = new Vector3(), inverse = new Matrix4();
  let adjusted = 0;
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const mats = materialsOf(mesh);
    const ceramicIndex = mats.findIndex(material => material?.name === CERAMIC);
    if (ceramicIndex < 0) return;
    const position = mesh.geometry.attributes.position;
    // Multi-material nodes carry one geometry group per primitive; only the
    // ceramic primitives may move. Single-material meshes use the full range.
    const ranges = mesh.geometry.groups?.length
      ? mesh.geometry.groups.filter(group => group.materialIndex === ceramicIndex)
      : [{start: 0, count: position.count}];
    if (!ranges.length) return;
    let replacement;
    inverse.copy(mesh.matrixWorld).invert();
    for (const {start, count} of ranges) {
      for (let i = start; i < start + count; i++) {
        world.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        const distance = Math.hypot(world.x - centre.x, world.z - centre.z);
        // Cap vertices lie on its outer circumference. Keep the equipment bases
        // at the same elevation, and the separately authored parapet, untouched.
        if (Math.abs(world.y - top) > .02 || distance < TERRACE_RADIUS * .95 || distance > TERRACE_RADIUS * 1.05) continue;
        if (!replacement) {
          // glTF positions are normalized Int16; expand before a small correction
          // so writing metres cannot truncate or overflow the compressed values.
          const values = new Float32Array(position.count * 3);
          for (let j = 0; j < position.count; j++) {
            values[j * 3] = position.getX(j); values[j * 3 + 1] = position.getY(j); values[j * 3 + 2] = position.getZ(j);
          }
          replacement = new Float32BufferAttribute(values, 3);
        }
        world.y = capHeight;
        world.applyMatrix4(inverse);
        replacement.setXYZ(i, world.x, world.y, world.z);
        adjusted++;
      }
    }
    if (replacement) {
      mesh.geometry.setAttribute('position', replacement);
      mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
    }
  });
  return adjusted;
}
