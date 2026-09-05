import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchScene} from './batchScene.js';

test('compressed and uncompressed geometry batches preserve world positions',()=>{
  const root=new THREE.Group(),material=new THREE.MeshStandardMaterial();
  const a=new THREE.BufferGeometry();
  a.setAttribute('position',new THREE.Int16BufferAttribute([0,0,0,32767,0,0,0,32767,0],3,true));
  a.setAttribute('normal',new THREE.Int8BufferAttribute([0,0,127,0,0,127,0,0,127],3,true));
  a.setAttribute('uv',new THREE.Uint16BufferAttribute([0,0,65535,0,0,65535],2,true));
  const b=new THREE.BufferGeometry();
  b.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));
  const one=new THREE.Mesh(a,material);one.position.x=10;one.scale.setScalar(3);
  const two=new THREE.Mesh(b,material);two.position.x=-5;root.add(one,two);
  const merged=batchScene(root);assert.equal(merged.children.length,1);
  const box=merged.children[0].geometry.boundingBox;
  assert.equal(box.min.x,-5);assert.equal(box.max.x,13);assert.equal(box.max.y,3);
  assert.equal(merged.children[0].geometry.attributes.position.count,6);
  merged.children[0].geometry.dispose();material.dispose();
});
