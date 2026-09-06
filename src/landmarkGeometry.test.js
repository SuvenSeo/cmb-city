import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Mesh,MeshStandardMaterial,Group} from 'three';
import {insideLandmark,replaceLandmarkSurfaces} from './landmarkGeometry.js';

test('landmark extents convert north in source data to south in the viewer',()=>{
  const mask=[243,-1773,341,-1892];
  assert.equal(insideLandmark(291,1833,mask),true);
  assert.equal(insideLandmark(291,-1833,mask),false);
  assert.equal(insideLandmark(205,1833,mask),false);
});

test('replacement removes transformed building geometry but retains terrain and neighbours',()=>{
  const root=new Group(),material=new MeshStandardMaterial();
  const make=(surface,x)=>{const mesh=new Mesh(new BoxGeometry(4,10,4),material);mesh.userData.surface=surface;mesh.position.set(x,5,30);root.add(mesh);return mesh;};
  const building=make('Facade 00',20),ground=make('Ground',20),neighbour=make('Facade 00',50);
  assert.equal(replaceLandmarkSurfaces(root,[{mask:[15,-25,25,-35]}]),12);
  assert.equal(building.geometry.index.count,0);
  assert.equal(building.visible,false);
  assert.equal(ground.geometry.index.count,36);
  assert.equal(neighbour.geometry.index.count,36);
});

test('failed optional asset leaves the mapped building intact',()=>{
  const root=new Group(),mesh=new Mesh(new BoxGeometry(4,10,4),new MeshStandardMaterial());
  mesh.userData.surface='Facade 00';root.add(mesh);
  assert.equal(replaceLandmarkSurfaces(root,[]),0);
  assert.equal(mesh.geometry.index.count,36);
});
