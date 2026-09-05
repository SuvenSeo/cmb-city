import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {blenderToThree,cameraFieldOfView,treeCell,CITY_MAX_POLAR_ANGLE} from './mapMath.js';

test('camera preserves the authored geographic directions and full tower framing',()=>{
  const camera=new THREE.PerspectiveCamera(cameraFieldOfView(64,1),1,3,30000);
  camera.position.fromArray(blenderToThree([390,570,230]));
  camera.lookAt(...blenderToThree([35,-60,180]));camera.updateMatrixWorld();
  for(const z of [0,356.3]){
    const p=new THREE.Vector3(...blenderToThree([0,0,z])).project(camera);
    assert.ok(p.x>.25&&p.x<.4,'Tower remains to the right of centre');
    assert.ok(Math.abs(p.y)<1&&Math.abs(p.z)<1,'Full tower fits in the camera');
  }
  assert.deepEqual(blenderToThree([0,1000,10]),[0,10,-1000]);
});

test('narrow view preserves the reference horizontal field rather than clipping the tower',()=>{
  const square=Math.tan(THREE.MathUtils.degToRad(cameraFieldOfView(64,1))/2);
  const phone=Math.tan(THREE.MathUtils.degToRad(cameraFieldOfView(64,.46))/2)*.46;
  assert.ok(Math.abs(square-phone)<1e-10);
  assert.deepEqual(treeCell([-1,5,-601]),[-1,-2]);
});

test('orbit limits preserve the upward-looking lakeside camera',()=>{
  const camera=new THREE.PerspectiveCamera();
  const controls=new OrbitControls(camera,null);
  const position=new THREE.Vector3(...blenderToThree([-430,-440,74]));
  camera.position.copy(position);
  controls.target.fromArray(blenderToThree([0,0,167]));
  controls.maxPolarAngle=CITY_MAX_POLAR_ANGLE;
  controls.update();
  assert.ok(camera.position.distanceTo(position)<1e-8,'Orbit limits must not raise the camera');
});
