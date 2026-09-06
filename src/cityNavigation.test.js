import test from 'node:test';
import assert from 'node:assert/strict';
import {bearingFromDirection,compassLabel,placeLabels,coordinateLabel} from './cityNavigation.js';
import {LANDMARKS} from './landmarks.js';
import {PerspectiveCamera,Vector3} from 'three';
import {cameraFieldOfView} from './mapMath.js';

test('the compass follows geographic north, east, south and west',()=>{
  for(const [x,z,angle,label] of [[0,-1,0,'N'],[1,0,90,'E'],[0,1,180,'S'],[-1,0,270,'W']]){
    assert.equal(bearingFromDirection(x,z),angle);assert.equal(compassLabel(angle),label);
  }
  assert.equal(compassLabel(359),'N');
});
test('map tags avoid controls, clipped points and each other while favouring the selection',()=>{
  const labels=placeLabels([{id:'other',x:0,y:0,z:.5},{id:'selected',x:.02,y:0,z:.5},{id:'behind',x:.5,y:0,z:2},{id:'header',x:0,y:.9,z:.5}],1280,720,'selected');
  assert.deepEqual(labels.filter(p=>p.visible).map(p=>p.id),['selected']);
});
test('landmark views include their roof and base on desktop and portrait screens',()=>{
  for(const place of LANDMARKS)for(const aspect of [1280/720,390/844]){
    const camera=new PerspectiveCamera(cameraFieldOfView(place.lens,aspect),aspect,3,30000);
    camera.position.fromArray(place.view);camera.lookAt(...place.target);camera.updateMatrixWorld();
    for(const height of [0,place.point[1]]){
      const p=new Vector3(place.point[0],height,place.point[2]).project(camera);
      assert.ok(Math.abs(p.x)<.9 && Math.abs(p.y)<.9,place.name+' must fit its dedicated view');
    }
  }
  assert.equal(coordinateLabel([6.92703,79.85832]),'6.92703° N · 79.85832° E');
});
