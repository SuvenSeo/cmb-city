import {Box3, Float32BufferAttribute, Matrix4, Vector3} from 'three';

// The exported pavilion has a ceramic cap only 4.8 mm below its limestone
// terrace. Recess that cap inside the existing slab, preserving its closed
// sides and the visible terrace, parapet and rooftop equipment.
export function separatePavilionRoof(root) {
  root.updateMatrixWorld(true);
  const roof = root.getObjectByName('Pavilion_|_limestone_roof_terrace');
  if (!roof) return 0;
  const bounds = new Box3().setFromObject(roof);
  const top = bounds.max.y, capHeight = top - .1;
  const centre = bounds.getCenter(new Vector3());
  const radius = Math.min(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) / 2;
  const world = new Vector3(), inverse = new Matrix4();
  let adjusted = 0;
  root.traverse(mesh => {
    if (!mesh.isMesh || mesh.material?.name !== 'Pavilion and radome | warm white ceramic') return;
    const position = mesh.geometry.attributes.position;
    let replacement;
    inverse.copy(mesh.matrixWorld).invert();
    for (let i = 0; i < position.count; i++) {
      world.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      const distance = Math.hypot(world.x - centre.x, world.z - centre.z);
      // Cap vertices lie on its outer circumference. Keep the equipment bases
      // at the same elevation, and the separately authored parapet, untouched.
      if (Math.abs(world.y - top) > .02 || distance < radius * .95 || distance > radius * 1.05) continue;
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
    if (replacement) {
      mesh.geometry.setAttribute('position', replacement);
      mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
    }
  });
  return adjusted;
}
