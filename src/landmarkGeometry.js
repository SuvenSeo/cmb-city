import {Box3, Vector3} from 'three';

// Replacement extents are geographic metres in Blender XY. Terrain and roads
// remain intact; only the old architectural surfaces are cut out of the batches.
export function insideLandmark(x, z, mask) {
  return x >= mask[0] && x <= mask[2] && z >= -mask[1] && z <= -mask[3];
}

export function replaceLandmarkSurfaces(root, models) {
  const position = new Vector3(), bounds = new Box3();
  let removed = 0;
  root.updateMatrixWorld(true);
  root.traverse(object => {
    if (!object.isMesh) return;
    const surface = object.userData.surface || object.material?.name || '';
    if (!/Facade|Roof|Altair|Trees.*trunks/.test(surface)) return;
    object.geometry.computeBoundingBox();
    bounds.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
    const nearby = models.filter(({mask}) => bounds.max.x >= mask[0] && bounds.min.x <= mask[2] && bounds.max.z >= -mask[1] && bounds.min.z <= -mask[3]);
    if (!nearby.length) return;
    const geometry = object.geometry, source = geometry.attributes.position, index = geometry.index;
    const count = index ? index.count : source.count, retained = [];
    let changed = false;
    for (let i = 0; i < count; i += 3) {
      const a = index ? index.getX(i) : i, b = index ? index.getX(i+1) : i+1, c = index ? index.getX(i+2) : i+2;
      position.set((source.getX(a)+source.getX(b)+source.getX(c))/3, (source.getY(a)+source.getY(b)+source.getY(c))/3, (source.getZ(a)+source.getZ(b)+source.getZ(c))/3).applyMatrix4(object.matrixWorld);
      if (nearby.some(({mask}) => insideLandmark(position.x, position.z, mask))) { changed = true; removed++; }
      else retained.push(a,b,c);
    }
    if (changed) { geometry.setIndex(retained); object.visible = retained.length > 0; }
  });
  return removed;
}
