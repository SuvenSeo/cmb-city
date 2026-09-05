export const blenderToThree = ([x,north,height]) => [x,height,-north];
// The lakeside camera sits below its target and must be able to look upward.
export const CITY_MAX_POLAR_ANGLE = Math.PI - .08;

// Preserve the square reference's horizontal field on a narrow phone viewport.
export function cameraFieldOfView(lens,aspect) {
  return 2*Math.atan(36/(2*lens)/Math.min(1,Math.max(.2,aspect)))*180/Math.PI;
}

export function treeCell([x,,z],size=600) {
  return [Math.floor(x/size),Math.floor(z/size)];
}
