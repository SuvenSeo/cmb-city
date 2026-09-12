import {Vector3} from 'three';

export const STUDIO_DIRECTIONS = {
  lotus:[1,.5,1],altair:[1,.65,1],wtc:[1,.65,-1],gangaramaya:[.5,.65,1],fort:[.3,.7,1],museum:[.25,.45,-1],
  'jami-ul-alfar':[.8,.5,1],
  'old-parliament':[.7,.5,1],
  'independence-hall':[1,.65,1],
  'town-hall':[.8,.55,1],
  'galle-face-hotel':[.8,.6,1],
  'clock-tower':[.9,.45,1],
};
export const INTERIOR_CAMERAS = {
  fort:{position:[-47,2.9,29],target:[-18,3,20]},
  museum:{position:[0,3.3,-32],target:[0,4.9,-22]},
};

export function boxCorners(box){
  const points=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new Vector3(x,y,z));
  return points;
}

// Solve the frustum constraints for every corner, including depth, instead of
// giving flat buildings and tall towers a shared fixed camera distance.
export function fittedView(box,aspect,fov,direction=[1,.6,1],padding=1.16){
  const target=box.getCenter(new Vector3()),forward=new Vector3(...direction).normalize();
  const right=new Vector3(0,1,0).cross(forward).normalize(),up=forward.clone().cross(right).normalize();
  const tanV=Math.tan(fov*Math.PI/360),tanH=tanV*aspect;
  let distance=0;
  for(const corner of boxCorners(box)){
    const p=corner.sub(target),depth=p.dot(forward);
    distance=Math.max(distance,depth+Math.abs(p.dot(right))*padding/tanH,depth+Math.abs(p.dot(up))*padding/tanV);
  }
  return {target,position:target.clone().addScaledVector(forward,Math.max(distance,.1))};
}

export function roofObject(name=''){return name.startsWith('Roof');}
export function studioModelUrl(model){return model.id==='lotus'?'/map/lotus-tower.glb':`/landmarks/${model.id}/${model.id}.glb`;}
