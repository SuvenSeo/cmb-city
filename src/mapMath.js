export const blenderToThree = ([x,north,height]) => [x,height,-north];
// The lakeside camera sits below its target and must be able to look upward.
export const CITY_MAX_POLAR_ANGLE = Math.PI - .08;

// Widen portrait views moderately, without exposing the distant terrain edge
// or shrinking the landmark into a tiny object on a tall phone screen.
export function cameraFieldOfView(lens,aspect) {
  return 2*Math.atan(36/(2*lens)/Math.min(1,Math.max(.72,aspect)))*180/Math.PI;
}

export function treeCell([x,,z],size=600) {
  return [Math.floor(x/size),Math.floor(z/size)];
}

export function clearOrbitMomentum(controls) {
  const position = controls.object.position.clone(), target = controls.target.clone();
  const damping = controls.enableDamping;
  // One undamped update consumes pending input through the public API.
  controls.enableDamping = false;
  controls.update();
  controls.object.position.copy(position); controls.target.copy(target);
  controls.enableDamping = damping;
  controls.update();
}
