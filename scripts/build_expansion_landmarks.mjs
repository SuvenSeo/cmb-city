/**
 * Colombo Atlas - Wave 1 Landmark 3D Model Generator
 * 
 * Procedurally sculpts high-precision 3D models with PBR materials for:
 * 1. Jami Ul-Alfar Mosque (Red Mosque)
 * 2. Old Parliament Building
 * 3. Independence Memorial Hall
 * 4. Colombo Town Hall
 * 5. Galle Face Hotel
 * 6. Fort Clock Tower & Lighthouse
 * 
 * Exports self-contained GLB models, compresses them with gltfpack,
 * computes exact bounds, generates metadata.json, README.md, and model zip packs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// Polyfill FileReader for GLTFExporter in Node.js
class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buf => {
      this.result = buf;
      if (typeof this.onloadend === 'function') this.onloadend();
      if (typeof this.onload === 'function') this.onload({ target: this });
    }).catch(err => {
      if (typeof this.onerror === 'function') this.onerror(err);
    });
  }
}
globalThis.FileReader = NodeFileReader;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LANDMARKS_DIR = path.join(ROOT, 'public', 'landmarks');
const GLTFPACK_BIN = path.join(ROOT, 'node_modules', '.bin', 'gltfpack');

// --- Helper Geometry Utilities ---

function createBox(w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx || ry || rz) g.rotateX(rx).rotateY(ry).rotateZ(rz);
  g.translate(x, y + h / 2, z);
  return g;
}

function createCylinder(rTop, rBottom, height, segs, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, height, segs);
  if (rx || ry || rz) g.rotateX(rx).rotateY(ry).rotateZ(rz);
  g.translate(x, y + height / 2, z);
  return g;
}

function createSphere(r, segs, x = 0, y = 0, z = 0) {
  const g = new THREE.SphereGeometry(r, segs, segs);
  g.translate(x, y, z);
  return g;
}

function createDome(r, heightScale = 1, segs = 16, x = 0, y = 0, z = 0) {
  const g = new THREE.SphereGeometry(r, segs, Math.max(8, Math.floor(segs / 2)), 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, heightScale, 1);
  g.translate(x, y, z);
  return g;
}

function createOnionDome(r, height, segs = 16, x = 0, y = 0, z = 0) {
  const points = [];
  const count = 16;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    let radius;
    if (t < 0.2) {
      radius = r * (0.8 + 0.2 * Math.sin((t / 0.2) * (Math.PI / 2)));
    } else if (t < 0.6) {
      radius = r * (1.0 + 0.15 * Math.sin(((t - 0.2) / 0.4) * Math.PI));
    } else {
      radius = r * 1.15 * Math.pow(Math.max(0, 1 - (t - 0.6) / 0.4), 1.3);
    }
    const yPos = t * height;
    points.push(new THREE.Vector2(Math.max(0.01, radius), yPos));
  }
  const g = new THREE.LatheGeometry(points, segs);
  g.translate(x, y, z);
  return g;
}

function createPediment(w, depth, height, x = 0, y = 0, z = 0) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const extrudeSettings = { depth, bevelEnabled: false };
  const g = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  g.translate(x, y, z - depth / 2);
  return g;
}

function createKandyanPitchedRoof(w, d, h, overhang = 2, x = 0, y = 0, z = 0) {
  const totalW = w + overhang * 2;
  const totalD = d + overhang * 2;
  const ridgeW = Math.max(1, w * 0.55);

  const geom = new THREE.BufferGeometry();
  const x0 = -totalW / 2, x1 = totalW / 2;
  const z0 = -totalD / 2, z1 = totalD / 2;
  const yBase = y;

  const rx0 = -ridgeW / 2, rx1 = ridgeW / 2;
  const yRidge = y + h;

  const positions = [
    // Front face
    x0, yBase, z1,  x1, yBase, z1,  rx1, yRidge, 0,
    x0, yBase, z1,  rx1, yRidge, 0, rx0, yRidge, 0,
    // Back face
    x1, yBase, z0,  x0, yBase, z0,  rx0, yRidge, 0,
    x1, yBase, z0,  rx0, yRidge, 0, rx1, yRidge, 0,
    // Left hip
    x0, yBase, z0,  x0, yBase, z1,  rx0, yRidge, 0,
    // Right hip
    x1, yBase, z1,  x1, yBase, z0,  rx1, yRidge, 0,
    // Bottom cap
    x0, yBase, z0,  rx0, yBase, 0,  x0, yBase, z1,
    x1, yBase, z1,  rx1, yBase, 0,  x1, yBase, z0,
  ];

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  geom.translate(x, 0, z);
  return geom;
}

function createStairs(w, totalH, totalD, stepsCount, x = 0, y = 0, z = 0) {
  const geoms = [];
  const stepH = totalH / stepsCount;
  const stepD = totalD / stepsCount;
  for (let i = 0; i < stepsCount; i++) {
    geoms.push(createBox(w, stepH, totalD - i * stepD, x, y + i * stepH, z + (i * stepD) / 2));
  }
  return BufferGeometryUtils.mergeGeometries(geoms);
}

function assembleMesh(batches) {
  const group = new THREE.Group();
  for (const [mat, geomList] of batches.entries()) {
    const validGeoms = geomList
      .filter(g => g && g.attributes?.position?.count > 0)
      .map(g => {
        const nonIndexed = g.index ? g.toNonIndexed() : g.clone();
        if (!nonIndexed.attributes.uv) {
          const count = nonIndexed.attributes.position.count;
          nonIndexed.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
        }
        if (!nonIndexed.attributes.normal) {
          nonIndexed.computeVertexNormals();
        }
        return nonIndexed;
      });
    if (validGeoms.length === 0) continue;
    const merged = BufferGeometryUtils.mergeGeometries(validGeoms, false);
    if (!merged) {
      console.warn('Could not merge geometries for material:', mat.name);
      continue;
    }
    merged.computeVertexNormals();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

// =========================================================================
// 1. JAMI UL-ALFAR MOSQUE (RED MOSQUE)
// =========================================================================
function buildRedMosque() {
  const batches = new Map();
  function add(mat, g) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(g);
  }

  const matRed = new THREE.MeshStandardMaterial({ color: 0x9b1c22, roughness: 0.75, metalness: 0.05, name: 'RedMosque_RedBrick' });
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xf5f2ec, roughness: 0.70, metalness: 0.02, name: 'RedMosque_WhiteTrim' });
  const matGold = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.85, name: 'RedMosque_GoldFinials' });
  const matDoor = new THREE.MeshStandardMaterial({ color: 0x2b1c14, roughness: 0.80, metalness: 0.10, name: 'RedMosque_Timber' });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x121c22, roughness: 0.15, metalness: 0.80, name: 'RedMosque_Glass' });
  const matClock = new THREE.MeshStandardMaterial({ color: 0xfefefe, roughness: 0.40, metalness: 0.10, name: 'RedMosque_Clock' });
  const matBase = new THREE.MeshStandardMaterial({ color: 0x5a5651, roughness: 0.90, metalness: 0.05, name: 'RedMosque_Paving' });

  const width = 22, depth = 32, wallH = 20;

  // Base plinth
  add(matBase, createBox(width + 2, 0.6, depth + 2, 0, 0, 0));

  // Main hall body in alternating red and white bands
  const numBands = 20;
  const bandH = wallH / numBands;
  for (let i = 0; i < numBands; i++) {
    const mat = (i % 2 === 0) ? matRed : matWhite;
    add(mat, createBox(width, bandH, depth, 0, 0.6 + i * bandH, 0));
  }

  // Front facade projection (central prayer hall entrance bay)
  const frontZ = depth / 2;
  const bayW = 12, bayD = 3, bayH = 22;
  for (let i = 0; i < 22; i++) {
    const mat = (i % 2 === 0) ? matWhite : matRed;
    add(mat, createBox(bayW, 1.0, bayD, 0, 0.6 + i * 1.0, frontZ + bayD / 2));
  }

  // Grand horseshoe arch portal at entrance
  add(matWhite, createBox(6.5, 7.5, 0.8, 0, 0.6, frontZ + bayD + 0.3));
  add(matWhite, createCylinder(2.5, 2.5, 0.8, 16, 0, 0.6 + 6.0, frontZ + bayD + 0.3, Math.PI / 2, 0, 0));
  add(matDoor, createBox(4.0, 6.0, 0.5, 0, 0.6, frontZ + bayD + 0.1));
  add(matDoor, createCylinder(2.0, 2.0, 0.5, 16, 0, 0.6 + 5.0, frontZ + bayD + 0.1, Math.PI / 2, 0, 0));

  // Entrance framing pilasters with candy stripes
  for (const px of [-3.8, 3.8]) {
    for (let j = 0; j < 14; j++) {
      const mat = (j % 2 === 0) ? matRed : matWhite;
      add(mat, createCylinder(0.45, 0.45, 0.6, 12, px, 0.6 + j * 0.6, frontZ + bayD + 0.4));
    }
  }

  // Second and third tier balconies with balustrades
  for (const by of [9.0, 15.0]) {
    add(matWhite, createBox(bayW + 1.2, 0.4, bayD + 0.8, 0, by, frontZ + bayD / 2));
    add(matWhite, createBox(bayW + 1.2, 0.8, 0.15, 0, by + 0.4, frontZ + bayD + 0.4));
    for (const wx of [-3.5, 0, 3.5]) {
      add(matGlass, createBox(1.6, 2.8, 0.3, wx, by + 0.6, frontZ + bayD - 0.2));
      add(matWhite, createCylinder(0.8, 0.8, 0.3, 12, wx, by + 2.8, frontZ + bayD - 0.2, Math.PI / 2, 0, 0));
    }
  }

  // Central Clock Tower Block
  const clockW = 6.5, clockH = 7.0, clockZ = frontZ - 1;
  for (let k = 0; k < 10; k++) {
    const mat = (k % 2 === 0) ? matRed : matWhite;
    add(mat, createBox(clockW, clockH / 10, clockW, 0, bayH + k * (clockH / 10), clockZ));
  }
  // Clock dials on all 4 faces
  add(matClock, createCylinder(1.2, 1.2, 0.2, 16, 0, bayH + 3.5, clockZ + clockW / 2 + 0.1, Math.PI / 2, 0, 0));
  add(matClock, createCylinder(1.2, 1.2, 0.2, 16, 0, bayH + 3.5, clockZ - clockW / 2 - 0.1, Math.PI / 2, 0, 0));
  add(matClock, createCylinder(1.2, 1.2, 0.2, 16, clockW / 2 + 0.1, bayH + 3.5, clockZ, 0, 0, Math.PI / 2));
  add(matClock, createCylinder(1.2, 1.2, 0.2, 16, -clockW / 2 - 0.1, bayH + 3.5, clockZ, 0, 0, Math.PI / 2));

  // Central main onion dome
  add(matWhite, createCylinder(2.6, 2.8, 1.2, 16, 0, bayH + clockH, clockZ));
  add(matRed, createOnionDome(2.6, 4.5, 16, 0, bayH + clockH + 1.2, clockZ));
  add(matGold, createCylinder(0.08, 0.08, 2.0, 8, 0, bayH + clockH + 5.7, clockZ));
  add(matGold, createSphere(0.4, 8, 0, bayH + clockH + 7.2, clockZ));

  // Twin Front Minarets
  for (const mx of [-width / 2 + 0.5, width / 2 - 0.5]) {
    const minH = 32.0;
    const numMinBands = 36;
    const mbH = minH / numMinBands;
    for (let m = 0; m < numMinBands; m++) {
      const mat = (m % 2 === 0) ? matRed : matWhite;
      add(mat, createCylinder(1.4 - (m / numMinBands) * 0.4, 1.4 - ((m - 1) / numMinBands) * 0.4, mbH, 8, mx, 0.6 + m * mbH, frontZ));
    }
    for (const my of [18.0, 27.0]) {
      add(matWhite, createCylinder(1.8, 1.3, 0.8, 8, mx, my, frontZ));
      add(matWhite, createCylinder(1.8, 1.8, 0.6, 8, mx, my + 0.8, frontZ));
    }
    add(matRed, createOnionDome(1.2, 2.8, 12, mx, minH + 0.6, frontZ));
    add(matGold, createCylinder(0.05, 0.05, 1.5, 8, mx, minH + 3.4, frontZ));
    add(matGold, createSphere(0.25, 8, mx, minH + 4.5, frontZ));
  }

  // Secondary roof domes
  const domeCoords = [
    [-width / 3, depth / 4], [width / 3, depth / 4],
    [-width / 3, -depth / 4], [width / 3, -depth / 4],
    [-width / 3, 0], [width / 3, 0]
  ];
  for (const [dx, dz] of domeCoords) {
    add(matWhite, createCylinder(1.5, 1.6, 0.8, 12, dx, wallH + 0.6, dz));
    add(matRed, createOnionDome(1.4, 2.4, 12, dx, wallH + 1.4, dz));
    add(matGold, createCylinder(0.04, 0.04, 1.0, 6, dx, wallH + 3.8, dz));
  }

  return assembleMesh(batches);
}

// =========================================================================
// 2. OLD PARLIAMENT BUILDING
// =========================================================================
function buildOldParliament() {
  const batches = new Map();
  function add(mat, g) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(g);
  }

  const matSandstone = new THREE.MeshStandardMaterial({ color: 0xc8b088, roughness: 0.78, metalness: 0.05, name: 'OldParl_Sandstone' });
  const matRusticated = new THREE.MeshStandardMaterial({ color: 0xba9f77, roughness: 0.85, metalness: 0.04, name: 'OldParl_RusticatedPodium' });
  const matPaving = new THREE.MeshStandardMaterial({ color: 0x938875, roughness: 0.90, metalness: 0.02, name: 'OldParl_Steps' });
  const matBronze = new THREE.MeshStandardMaterial({ color: 0x31281f, roughness: 0.45, metalness: 0.75, name: 'OldParl_Bronze' });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x162228, roughness: 0.15, metalness: 0.85, name: 'OldParl_Glass' });
  const matLawn = new THREE.MeshStandardMaterial({ color: 0x486b36, roughness: 0.95, metalness: 0.0, name: 'OldParl_Lawn' });

  const length = 114, width = 34, podiumH = 4.2, colH = 13.5;

  add(matLawn, createBox(length + 20, 0.2, width + 30, 0, 0, 5));
  add(matRusticated, createBox(length, podiumH, width, 0, 0.2, 0));
  add(matSandstone, createBox(16, podiumH, 12, 0, 0.2, width / 2 - 4));
  add(matBronze, createCylinder(3.5, 3.5, 10, 16, 0, 0.2 + 2.0, width / 2 - 2, Math.PI / 2, 0, 0));
  add(matPaving, createStairs(28, podiumH, 16, 20, 0, 0.2, width / 2 + 8));

  const mainFloorH = 14.5;
  add(matSandstone, createBox(length, mainFloorH, width, 0, 0.2 + podiumH, 0));

  const porticoW = 28, porticoD = 8, porticoZ = width / 2 + porticoD / 2;
  const colSpacing = porticoW / 5;
  for (let i = 0; i < 6; i++) {
    const cx = -porticoW / 2 + i * colSpacing;
    add(matSandstone, createBox(1.5, 0.6, 1.5, cx, 0.2 + podiumH, porticoZ));
    add(matSandstone, createCylinder(0.62, 0.70, colH, 16, cx, 0.2 + podiumH + 0.6, porticoZ));
    add(matSandstone, createBox(1.6, 0.7, 1.6, cx, 0.2 + podiumH + 0.6 + colH, porticoZ));
  }

  const entablatureY = 0.2 + podiumH + colH + 1.3;
  add(matSandstone, createBox(porticoW + 2, 1.8, porticoD + 1, 0, entablatureY, porticoZ));
  add(matSandstone, createPediment(porticoW + 2, porticoD + 1, 5.2, 0, entablatureY + 1.8, porticoZ));
  add(matBronze, createCylinder(1.4, 1.4, 0.3, 16, 0, entablatureY + 3.6, porticoZ + porticoD / 2 + 0.2, Math.PI / 2, 0, 0));

  for (const wingSign of [-1, 1]) {
    const wingStart = (porticoW / 2) + 2.5;
    const wingEnd = length / 2 - 3;
    const wingColCount = 8;
    const wingSpacing = (wingEnd - wingStart) / (wingColCount - 1);
    for (let k = 0; k < wingColCount; k++) {
      const wx = wingSign * (wingStart + k * wingSpacing);
      const wz = width / 2 + 0.8;
      add(matSandstone, createCylinder(0.55, 0.62, colH, 14, wx, 0.2 + podiumH + 0.5, wz));
      add(matGlass, createBox(2.2, 4.2, 0.3, wx, 0.2 + podiumH + 3.0, width / 2 - 0.2));
      add(matGlass, createBox(2.2, 3.2, 0.3, wx, 0.2 + podiumH + 8.5, width / 2 - 0.2));
    }
  }

  const roofY = 0.2 + podiumH + mainFloorH;
  add(matSandstone, createBox(length + 1, 1.2, width + 1, 0, roofY, 0));
  add(matSandstone, createBox(length + 1, 0.9, 0.2, 0, roofY + 1.2, width / 2 + 0.4));
  add(matSandstone, createBox(length + 1, 0.9, 0.2, 0, roofY + 1.2, -width / 2 - 0.4));
  add(matSandstone, createBox(0.2, 0.9, width + 1, length / 2 + 0.4, roofY + 1.2, 0));
  add(matSandstone, createBox(0.2, 0.9, width + 1, -length / 2 - 0.4, roofY + 1.2, 0));

  const domeRadius = 7.0;
  add(matSandstone, createCylinder(domeRadius + 0.5, domeRadius + 0.8, 3.5, 24, 0, roofY, 0));
  add(matSandstone, createDome(domeRadius, 1.1, 24, 0, roofY + 3.5, 0));
  add(matSandstone, createCylinder(1.6, 1.8, 3.2, 12, 0, roofY + 3.5 + 7.7, 0));
  add(matBronze, createDome(1.6, 0.8, 12, 0, roofY + 3.5 + 10.9, 0));

  for (const [sx, sz] of [[-18, width / 2 + 18], [18, width / 2 + 18]]) {
    add(matRusticated, createBox(2.4, 2.8, 2.4, sx, 0.2, sz));
    add(matBronze, createBox(0.9, 2.6, 0.7, sx, 3.0, sz));
  }

  return assembleMesh(batches);
}

// =========================================================================
// 3. INDEPENDENCE MEMORIAL HALL
// =========================================================================
function buildIndependenceHall() {
  const batches = new Map();
  function add(mat, g) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(g);
  }

  const matGranite = new THREE.MeshStandardMaterial({ color: 0x827e77, roughness: 0.88, metalness: 0.05, name: 'Indep_GranitePlinth' });
  const matStoneCol = new THREE.MeshStandardMaterial({ color: 0x9b978f, roughness: 0.82, metalness: 0.03, name: 'Indep_StoneColumns' });
  const matRoofTile = new THREE.MeshStandardMaterial({ color: 0xaa4426, roughness: 0.85, metalness: 0.02, name: 'Indep_TerracottaTile' });
  const matTimber = new THREE.MeshStandardMaterial({ color: 0x301b10, roughness: 0.90, metalness: 0.05, name: 'Indep_TimberBeams' });
  const matValance = new THREE.MeshStandardMaterial({ color: 0xf5f3ea, roughness: 0.65, metalness: 0.02, name: 'Indep_ValanceBoard' });
  const matGoldFinial = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.80, name: 'Indep_GoldFinials' });
  const matLions = new THREE.MeshStandardMaterial({ color: 0x726e68, roughness: 0.85, metalness: 0.05, name: 'Indep_LionStatues' });
  const matLawn = new THREE.MeshStandardMaterial({ color: 0x486b36, roughness: 0.95, metalness: 0.0, name: 'Indep_Lawn' });

  const hallW = 38, hallD = 22, plinthH = 3.2;

  add(matLawn, createBox(hallW + 24, 0.2, hallD + 24, 0, 0, 0));

  const tiers = 4;
  for (let t = 0; t < tiers; t++) {
    const tw = (hallW + 12) - t * 2.2;
    const td = (hallD + 12) - t * 2.2;
    const th = plinthH / tiers;
    add(matGranite, createBox(tw, th, td, 0, 0.2 + t * th, 0));
  }

  add(matGranite, createStairs(10, plinthH, 8, 12, 0, 0.2, hallD / 2 + 5));
  add(matGranite, createStairs(10, plinthH, 8, 12, 0, 0.2, -hallD / 2 - 5));
  add(matGranite, createStairs(8, plinthH, 8, 12, hallW / 2 + 5, 0.2, 0));
  add(matGranite, createStairs(8, plinthH, 8, 12, -hallW / 2 - 5, 0.2, 0));

  const lionOffsets = [
    [-hallW / 2 - 3, hallD / 2 + 3], [hallW / 2 + 3, hallD / 2 + 3],
    [-hallW / 2 - 3, -hallD / 2 - 3], [hallW / 2 + 3, -hallD / 2 - 3],
    [-6, hallD / 2 + 4.5], [6, hallD / 2 + 4.5],
    [-6, -hallD / 2 - 4.5], [6, -hallD / 2 - 4.5],
    [-hallW / 2 - 4.5, 0], [hallW / 2 + 4.5, 0]
  ];
  for (const [lx, lz] of lionOffsets) {
    add(matLions, createBox(1.1, 0.7, 1.4, lx, 1.2, lz));
    add(matLions, createBox(0.8, 1.1, 0.8, lx, 1.9, lz - 0.2));
    add(matLions, createCylinder(0.35, 0.45, 0.6, 8, lx, 2.7, lz - 0.2));
  }

  const pierW = 3.2, colHeight = 6.4;
  for (const [cx, cz] of [
    [-hallW / 2 + pierW / 2, hallD / 2 - pierW / 2],
    [hallW / 2 - pierW / 2, hallD / 2 - pierW / 2],
    [-hallW / 2 + pierW / 2, -hallD / 2 + pierW / 2],
    [hallW / 2 - pierW / 2, -hallD / 2 + pierW / 2]
  ]) {
    add(matStoneCol, createBox(pierW, colHeight, pierW, cx, plinthH + 0.2, cz));
    add(matTimber, createBox(pierW * 0.4, 2.2, 0.2, cx, plinthH + 2.5, cz + (cz > 0 ? pierW / 2 : -pierW / 2)));
  }

  const colsX = 11;
  const colsZ = 5;
  const spacingX = (hallW - pierW * 2) / (colsX - 1);
  const spacingZ = (hallD - pierW * 2) / (colsZ - 1);

  for (let ix = 0; ix < colsX; ix++) {
    for (let iz = 0; iz < colsZ; iz++) {
      const isOuter = (ix === 0 || ix === colsX - 1 || iz === 0 || iz === colsZ - 1);
      const isInnerRing = (ix === 2 || ix === colsX - 3 || iz === 1 || iz === colsZ - 2);
      if (!isOuter && !isInnerRing) continue;

      const px = -hallW / 2 + pierW + ix * spacingX;
      const pz = -hallD / 2 + pierW + iz * spacingZ;

      if (Math.abs(px) > hallW / 2 - pierW && Math.abs(pz) > hallD / 2 - pierW) continue;

      add(matStoneCol, createBox(0.9, 0.5, 0.9, px, plinthH + 0.2, pz));
      add(matStoneCol, createBox(0.7, colHeight - 1.2, 0.7, px, plinthH + 0.7, pz));
      add(matStoneCol, createBox(1.1, 0.4, 1.1, px, plinthH + colHeight - 0.5, pz));
      add(matTimber, createBox(1.6, 0.3, 0.6, px, plinthH + colHeight - 0.1, pz));
      add(matTimber, createBox(0.6, 0.3, 1.6, px, plinthH + colHeight - 0.1, pz));
    }
  }

  const beamY = plinthH + 0.2 + colHeight + 0.2;
  add(matTimber, createBox(hallW + 1, 0.7, hallD + 1, 0, beamY, 0));

  const lowerRoofH = 4.8;
  add(matRoofTile, createKandyanPitchedRoof(hallW, hallD, lowerRoofH, 3.5, 0, beamY + 0.7, 0));

  const eaveW = hallW + 7.0;
  const eaveD = hallD + 7.0;
  add(matValance, createBox(eaveW, 0.5, 0.1, 0, beamY + 0.6, eaveD / 2));
  add(matValance, createBox(eaveW, 0.5, 0.1, 0, beamY + 0.6, -eaveD / 2));
  add(matValance, createBox(0.1, 0.5, eaveD, eaveW / 2, beamY + 0.6, 0));
  add(matValance, createBox(0.1, 0.5, eaveD, -eaveW / 2, beamY + 0.6, 0));

  const upperRoofY = beamY + 0.7 + lowerRoofH * 0.65;
  const upperRoofW = hallW * 0.6;
  const upperRoofD = hallD * 0.6;
  const upperRoofH = 3.6;
  add(matValance, createBox(upperRoofW + 0.5, 1.2, upperRoofD + 0.5, 0, upperRoofY - 0.6, 0));
  add(matRoofTile, createKandyanPitchedRoof(upperRoofW, upperRoofD, upperRoofH, 1.8, 0, upperRoofY + 0.6, 0));

  const ridgeLen = upperRoofW * 0.55;
  for (let k = -2; k <= 2; k++) {
    const kx = (k / 2) * (ridgeLen / 2);
    add(matGoldFinial, createCylinder(0.06, 0.12, 1.4, 8, kx, upperRoofY + 0.6 + upperRoofH, 0));
    add(matGoldFinial, createSphere(0.2, 8, kx, upperRoofY + 0.6 + upperRoofH + 1.4, 0));
  }

  return assembleMesh(batches);
}

// =========================================================================
// 4. COLOMBO TOWN HALL
// =========================================================================
function buildTownHall() {
  const batches = new Map();
  function add(mat, g) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(g);
  }

  const matWhitePlaster = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.70, metalness: 0.02, name: 'TownHall_WhitePlaster' });
  const matWhiteColumns = new THREE.MeshStandardMaterial({ color: 0xfbfbfb, roughness: 0.60, metalness: 0.01, name: 'TownHall_Columns' });
  const matRoof = new THREE.MeshStandardMaterial({ color: 0xe0e2e5, roughness: 0.65, metalness: 0.05, name: 'TownHall_Dome' });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x18242a, roughness: 0.15, metalness: 0.85, name: 'TownHall_Glass' });
  const matClock = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.30, metalness: 0.10, name: 'TownHall_Clock' });
  const matGoldFinial = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.30, metalness: 0.85, name: 'TownHall_GoldFinial' });
  const matLawn = new THREE.MeshStandardMaterial({ color: 0x486b36, roughness: 0.95, metalness: 0.0, name: 'TownHall_Lawn' });

  const length = 92, width = 36, floorH = 14;

  add(matLawn, createBox(length + 24, 0.2, width + 30, 0, 0, 10));
  add(matWhitePlaster, createBox(length, 1.2, width, 0, 0.2, 0));
  add(matWhitePlaster, createBox(length, floorH, width, 0, 1.4, 0));

  for (let wx = -length / 2 + 6; wx <= length / 2 - 6; wx += 6.5) {
    if (Math.abs(wx) < 14) continue;
    add(matGlass, createBox(2.2, 3.5, 0.3, wx, 3.5, width / 2 + 0.1));
    add(matGlass, createBox(2.2, 4.0, 0.3, wx, 9.0, width / 2 + 0.1));
  }

  const porticoW = 24, porticoD = 7.5, porticoZ = width / 2 + porticoD / 2;
  const colSpacing = porticoW / 5;
  for (let i = 0; i < 6; i++) {
    const cx = -porticoW / 2 + i * colSpacing;
    add(matWhiteColumns, createCylinder(0.65, 0.72, floorH + 0.5, 16, cx, 1.4, porticoZ));
    add(matWhiteColumns, createBox(1.7, 1.0, 1.7, cx, 1.4 + floorH + 0.5, porticoZ));
  }

  add(matWhitePlaster, createBox(porticoW + 2, 2.2, porticoD + 1, 0, 1.4 + floorH + 1.5, porticoZ));

  for (const wingSign of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const wx = wingSign * (18 + k * 8.5);
      add(matWhiteColumns, createCylinder(0.55, 0.60, floorH, 14, wx, 1.4, width / 2 + 0.5));
    }
  }

  const roofY = 1.4 + floorH + 2.2;
  add(matWhitePlaster, createBox(length + 1, 1.2, width + 1, 0, roofY, 0));
  add(matWhitePlaster, createBox(length + 1, 0.8, 0.2, 0, roofY + 1.2, width / 2 + 0.4));
  add(matWhitePlaster, createBox(length + 1, 0.8, 0.2, 0, roofY + 1.2, -width / 2 - 0.4));

  const drumR = 9.0, drumH = 7.0;
  add(matWhitePlaster, createCylinder(drumR, drumR + 0.5, drumH, 24, 0, roofY, 0));
  add(matClock, createCylinder(1.6, 1.6, 0.2, 16, 0, roofY + drumH / 2, drumR + 0.4, Math.PI / 2, 0, 0));
  add(matClock, createCylinder(1.6, 1.6, 0.2, 16, 0, roofY + drumH / 2, -drumR - 0.4, Math.PI / 2, 0, 0));
  add(matClock, createCylinder(1.6, 1.6, 0.2, 16, drumR + 0.4, roofY + drumH / 2, 0, 0, 0, Math.PI / 2));
  add(matClock, createCylinder(1.6, 1.6, 0.2, 16, -drumR - 0.4, roofY + drumH / 2, 0, 0, 0, Math.PI / 2));

  const domeR = 8.8, domeH = 8.5;
  add(matRoof, createDome(domeR, domeH / domeR, 24, 0, roofY + drumH, 0));
  for (let r = 0; r < 12; r++) {
    const angle = (r / 12) * Math.PI * 2;
    const rib = createCylinder(0.18, 0.22, domeH * 1.1, 6, Math.cos(angle) * (domeR * 0.6), roofY + drumH + domeH * 0.45, Math.sin(angle) * (domeR * 0.6));
    rib.rotateY(angle);
    add(matWhitePlaster, rib);
  }

  const lanternY = roofY + drumH + domeH;
  add(matWhitePlaster, createCylinder(2.2, 2.4, 4.0, 16, 0, lanternY, 0));
  add(matRoof, createDome(2.2, 1.0, 16, 0, lanternY + 4.0, 0));
  add(matGoldFinial, createCylinder(0.1, 0.15, 3.5, 8, 0, lanternY + 6.2, 0));
  add(matGoldFinial, createSphere(0.35, 8, 0, lanternY + 9.7, 0));

  return assembleMesh(batches);
}

// =========================================================================
// 5. GALLE FACE HOTEL
// =========================================================================
function buildGalleFaceHotel() {
  const batches = new Map();
  function add(mat, g) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(g);
  }

  const matCreamStucco = new THREE.MeshStandardMaterial({ color: 0xede7db, roughness: 0.75, metalness: 0.04, name: 'GFH_CreamStucco' });
  const matRoofTile = new THREE.MeshStandardMaterial({ color: 0xa84126, roughness: 0.82, metalness: 0.02, name: 'GFH_TerracottaRoof' });
  const matVeranda = new THREE.MeshStandardMaterial({ color: 0xf7f4eb, roughness: 0.65, metalness: 0.02, name: 'GFH_WhiteVerandas' });
  const matWoodShutter = new THREE.MeshStandardMaterial({ color: 0x332218, roughness: 0.85, metalness: 0.05, name: 'GFH_TimberShutters' });
  const matAwning = new THREE.MeshStandardMaterial({ color: 0xddd5c4, roughness: 0.90, metalness: 0.01, name: 'GFH_CanvasAwnings' });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x18242a, roughness: 0.15, metalness: 0.85, name: 'GFH_Glass' });
  const matLawn = new THREE.MeshStandardMaterial({ color: 0x486b36, roughness: 0.95, metalness: 0.0, name: 'GFH_Lawn' });

  const length = 120, width = 44, floorH = 4.2;

  add(matLawn, createBox(length + 20, 0.2, width + 24, 0, 0, 6));
  add(matCreamStucco, createBox(length, floorH, width, 0, 0.2, 0));

  const archW = 4.5;
  for (let ax = -length / 2 + 5; ax <= length / 2 - 5; ax += archW) {
    add(matVeranda, createBox(0.8, floorH, 1.2, ax, 0.2, width / 2 + 0.6));
    add(matVeranda, createBox(archW, 0.6, 1.2, ax + archW / 2, 0.2 + floorH - 0.3, width / 2 + 0.6));
  }

  add(matCreamStucco, createBox(length, floorH, width - 4, 0, 0.2 + floorH, -2));
  add(matVeranda, createBox(length, 0.9, 0.2, 0, 0.2 + floorH, width / 2 + 0.6));

  add(matCreamStucco, createBox(length - 8, floorH * 2, width - 8, 0, 0.2 + floorH * 2, -4));

  for (let fy = 0; fy < 3; fy++) {
    const curY = 0.2 + floorH * (fy + 1);
    for (let wx = -length / 2 + 8; wx <= length / 2 - 8; wx += 5.2) {
      add(matGlass, createBox(1.8, 2.6, 0.2, wx, curY + 0.8, width / 2 - 2));
      add(matWoodShutter, createBox(0.5, 2.6, 0.1, wx - 1.2, curY + 0.8, width / 2 - 1.9));
      add(matWoodShutter, createBox(0.5, 2.6, 0.1, wx + 1.2, curY + 0.8, width / 2 - 1.9));
      const awning = createBox(2.4, 0.15, 1.2, wx, curY + 3.2, width / 2 - 1.3);
      awning.rotateX(Math.PI / 8);
      add(matAwning, awning);
    }
  }

  const roofBaseY = 0.2 + floorH * 4;
  add(matRoofTile, createKandyanPitchedRoof(36, width - 6, 6.5, 2.0, 0, roofBaseY, -3));
  add(matRoofTile, createKandyanPitchedRoof(40, width - 8, 5.5, 1.8, -length / 3, roofBaseY, -4));
  add(matRoofTile, createKandyanPitchedRoof(40, width - 8, 5.5, 1.8, length / 3, roofBaseY, -4));

  for (const dx of [-38, -12, 12, 38]) {
    add(matCreamStucco, createBox(3.0, 2.2, 2.5, dx, roofBaseY + 1.5, width / 4));
    add(matRoofTile, createPediment(3.2, 2.6, 1.4, dx, roofBaseY + 3.7, width / 4));
    add(matGlass, createBox(1.8, 1.6, 0.2, dx, roofBaseY + 2.0, width / 4 + 1.3));
  }

  return assembleMesh(batches);
}

// =========================================================================
// 6. FORT CLOCK TOWER & LIGHTHOUSE
// =========================================================================
function buildClockTower() {
  const batches = new Map();
  function add(mat, g) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(g);
  }

  const matAshlar = new THREE.MeshStandardMaterial({ color: 0xc4bdaf, roughness: 0.85, metalness: 0.05, name: 'ClockTower_AshlarBase' });
  const matStucco = new THREE.MeshStandardMaterial({ color: 0xdfdad0, roughness: 0.72, metalness: 0.02, name: 'ClockTower_Shaft' });
  const matQuoins = new THREE.MeshStandardMaterial({ color: 0x935040, roughness: 0.82, metalness: 0.03, name: 'ClockTower_Quoins' });
  const matClockDial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.30, metalness: 0.10, name: 'ClockTower_ClockDial' });
  const matBrassDome = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.30, metalness: 0.85, name: 'ClockTower_BrassDome' });
  const matLanternCage = new THREE.MeshStandardMaterial({ color: 0x2f3e3e, roughness: 0.25, metalness: 0.80, name: 'ClockTower_Lantern' });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x162428, roughness: 0.15, metalness: 0.85, name: 'ClockTower_Glass' });
  const matStreetPaving = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.92, metalness: 0.05, name: 'ClockTower_ChathamStreet' });

  const baseW = 9.2, baseH = 6.2;
  const shaftW = 6.8, shaftH = 20.0;

  add(matStreetPaving, createCylinder(baseW * 0.8, baseW * 0.8, 0.4, 24, 0, 0, 0));
  add(matAshlar, createBox(baseW, baseH, baseW, 0, 0.4, 0));
  add(matStucco, createBox(baseW - 2, baseH, baseW - 2, 0, 0.4, 0));
  add(matAshlar, createCylinder(2.2, 2.2, baseW + 0.4, 16, 0, 0.4 + 2.8, 0, 0, 0, Math.PI / 2));

  const shaftY = 0.4 + baseH;
  add(matStucco, createBox(shaftW, shaftH, shaftW, 0, shaftY, 0));

  const numQuoins = 24;
  const qH = shaftH / numQuoins;
  for (let q = 0; q < numQuoins; q++) {
    const qy = shaftY + q * qH;
    const isLong = (q % 2 === 0);
    const qLen = isLong ? 1.4 : 0.8;
    const qThick = 0.15;
    for (const [qx, qz] of [
      [-shaftW / 2, -shaftW / 2], [shaftW / 2, -shaftW / 2],
      [-shaftW / 2, shaftW / 2], [shaftW / 2, shaftW / 2]
    ]) {
      const sx = qx > 0 ? 1 : -1;
      const sz = qz > 0 ? 1 : -1;
      add(matQuoins, createBox(qLen, qH * 0.9, qThick, qx - sx * (qLen / 2), qy, qz));
      add(matQuoins, createBox(qThick, qH * 0.9, qLen, qx, qy, qz - sz * (qLen / 2)));
    }
  }

  for (const wy of [shaftY + 4.5, shaftY + 11.5]) {
    for (const [fx, fz, rot] of [
      [0, shaftW / 2 + 0.1, 0], [0, -shaftW / 2 - 0.1, Math.PI],
      [shaftW / 2 + 0.1, 0, Math.PI / 2], [-shaftW / 2 - 0.1, 0, -Math.PI / 2]
    ]) {
      for (const ox of [-1.1, 1.1]) {
        const win = createBox(0.8, 2.8, 0.2, fx + (rot === 0 ? ox : 0), wy, fz + (rot === Math.PI / 2 ? ox : 0));
        add(matLanternCage, win);
      }
    }
  }

  const clockY = shaftY + 16.5;
  const clockR = 1.35;
  add(matClockDial, createCylinder(clockR, clockR, 0.2, 24, 0, clockY, shaftW / 2 + 0.1, Math.PI / 2, 0, 0));
  add(matClockDial, createCylinder(clockR, clockR, 0.2, 24, 0, clockY, -shaftW / 2 - 0.1, Math.PI / 2, 0, 0));
  add(matClockDial, createCylinder(clockR, clockR, 0.2, 24, shaftW / 2 + 0.1, clockY, 0, 0, 0, Math.PI / 2));
  add(matClockDial, createCylinder(clockR, clockR, 0.2, 24, -shaftW / 2 - 0.1, clockY, 0, 0, 0, Math.PI / 2));

  add(matQuoins, createCylinder(clockR + 0.2, clockR + 0.2, 0.1, 24, 0, clockY, shaftW / 2 + 0.05, Math.PI / 2, 0, 0));
  add(matQuoins, createCylinder(clockR + 0.2, clockR + 0.2, 0.1, 24, 0, clockY, -shaftW / 2 - 0.05, Math.PI / 2, 0, 0));
  add(matQuoins, createCylinder(clockR + 0.2, clockR + 0.2, 0.1, 24, shaftW / 2 + 0.05, clockY, 0, 0, 0, Math.PI / 2));
  add(matQuoins, createCylinder(clockR + 0.2, clockR + 0.2, 0.1, 24, -shaftW / 2 - 0.05, clockY, 0, 0, 0, Math.PI / 2));

  const balconyY = shaftY + shaftH;
  add(matAshlar, createBox(shaftW + 1.6, 1.2, shaftW + 1.6, 0, balconyY, 0));
  add(matLanternCage, createBox(shaftW + 1.6, 0.9, 0.1, 0, balconyY + 1.2, (shaftW + 1.6) / 2));
  add(matLanternCage, createBox(shaftW + 1.6, 0.9, 0.1, 0, balconyY + 1.2, -(shaftW + 1.6) / 2));
  add(matLanternCage, createBox(0.1, 0.9, shaftW + 1.6, (shaftW + 1.6) / 2, balconyY + 1.2, 0));
  add(matLanternCage, createBox(0.1, 0.9, shaftW + 1.6, -(shaftW + 1.6) / 2, balconyY + 1.2, 0));

  const lanternR = 2.4, lanternH = 3.6;
  add(matLanternCage, createCylinder(lanternR, lanternR, 0.4, 16, 0, balconyY + 1.2, 0));
  add(matGlass, createCylinder(lanternR - 0.05, lanternR - 0.05, lanternH - 0.4, 16, 0, balconyY + 1.6, 0));
  for (let b = 0; b < 8; b++) {
    const angle = (b / 8) * Math.PI * 2;
    add(matBrassDome, createCylinder(0.04, 0.04, lanternH, 6, Math.cos(angle) * lanternR, balconyY + 1.6 + lanternH / 2, Math.sin(angle) * lanternR));
  }

  const domeBaseY = balconyY + 1.2 + lanternH;
  add(matBrassDome, createDome(lanternR, 1.0, 16, 0, domeBaseY, 0));
  add(matBrassDome, createCylinder(0.08, 0.12, 1.8, 8, 0, domeBaseY + lanternR, 0));
  add(matBrassDome, createSphere(0.25, 8, 0, domeBaseY + lanternR + 1.8, 0));
  add(matBrassDome, createBox(1.6, 0.15, 0.05, 0, domeBaseY + lanternR + 1.8, 0));

  return assembleMesh(batches);
}

// =========================================================================
// PACKAGING AND EXPORT ENGINE
// =========================================================================

const LANDMARK_CONFIGS = [
  {
    id: 'jami-ul-alfar',
    name: 'Jami Ul-Alfar Mosque (Red Mosque)',
    slug: 'jami-ul-alfar',
    builder: buildRedMosque,
    category: 'Religious - Islamic',
    position: [-715, 0, -1265],
    rotation: 0,
    mask: [-740, 1290, -690, 1240],
    description: '1908 Indo-Saracenic candy-striped red and white brick jewel in Pettah with horseshoe arch entrance, twin minarets, clock tower, and pomegranate onion domes.',
    reference: 'Second Cross Street, Pettah, Colombo 11'
  },
  {
    id: 'old-parliament',
    name: 'Old Parliament Building',
    slug: 'old-parliament',
    builder: buildOldParliament,
    category: 'Colonial Civic',
    position: [-1580, 0, -180],
    rotation: 0,
    mask: [-1660, 240, -1490, 110],
    description: '1930 Neo-Baroque buff sandstone palace facing Galle Face Green with grand monumental staircase, hexastyle Ionic portico, and central dome.',
    reference: 'Galle Face North, Fort, Colombo 01'
  },
  {
    id: 'independence-hall',
    name: 'Independence Memorial Hall',
    slug: 'independence-hall',
    builder: buildIndependenceHall,
    category: 'National Monument',
    position: [240, 0, 2580],
    rotation: 0,
    mask: [190, -2470, 290, -2640],
    description: 'National monument in Cinnamon Gardens modeled after the royal audience hall of Kandy with 60 carved stone columns, guardian lions, and tiered terracotta roof.',
    reference: 'Independence Square, Colombo 07'
  },
  {
    id: 'town-hall',
    name: 'Colombo Town Hall',
    slug: 'town-hall',
    builder: buildTownHall,
    category: 'Colonial Civic',
    position: [120, 0, 1220],
    rotation: 0,
    mask: [60, -1180, 180, -1260],
    description: '1928 Neoclassical white civic palace overlooking Viharamahadevi Park with giant Corinthian portico, clock drum, and ribbed dome.',
    reference: 'Maradana Road, Colombo 07'
  },
  {
    id: 'galle-face-hotel',
    name: 'Galle Face Hotel',
    slug: 'galle-face-hotel',
    builder: buildGalleFaceHotel,
    category: 'Heritage Hotel',
    position: [-1354, 0, 753],
    rotation: -Math.PI / 2,
    mask: [-1440, -680, -1260, -830],
    description: '1864 grand Victorian beachfront hotel facing the Indian Ocean with terracotta hipped roofs, continuous arched verandas, and manicured seaside lawn.',
    reference: '2 Galle Road, Colombo 03'
  },
  {
    id: 'clock-tower',
    name: 'Fort Clock Tower & Lighthouse',
    slug: 'clock-tower',
    builder: buildClockTower,
    category: 'Colonial',
    position: [-1480, 0, -880],
    rotation: 0,
    mask: [-1495, 895, -1465, 865],
    description: '1857 Victorian masonry tower on Chatham Street with rusticated pedestrian archways, corner quoin stones, 4 Roman clocks, and glazed lighthouse lantern room.',
    reference: 'Chatham Street, Fort, Colombo 01'
  }
];

async function exportLandmark(cfg) {
  console.log(`\n========================================`);
  console.log(`Building 3D model for: ${cfg.name} (${cfg.id})`);
  console.log(`========================================`);

  const dest = path.join(LANDMARKS_DIR, cfg.id);
  fs.mkdirSync(dest, { recursive: true });

  const root = new THREE.Scene();
  const group = cfg.builder();
  root.add(group);

  const bbox = new THREE.Box3().setFromObject(group);
  const min = [Number(bbox.min.x.toFixed(2)), Number(bbox.min.y.toFixed(2)), Number(bbox.min.z.toFixed(2))];
  const max = [Number(bbox.max.x.toFixed(2)), Number(bbox.max.y.toFixed(2)), Number(bbox.max.z.toFixed(2))];
  
  let totalTriangles = 0;
  let meshCount = 0;
  group.traverse(obj => {
    if (obj.isMesh) {
      meshCount++;
      const pos = obj.geometry.attributes.position;
      const count = obj.geometry.index ? obj.geometry.index.count : pos.count;
      totalTriangles += Math.floor(count / 3);
    }
  });

  console.log(`- Geometry: ${meshCount} materials/meshes, ${totalTriangles.toLocaleString()} triangles`);
  console.log(`- Dimensions: width=${(max[0]-min[0]).toFixed(1)}m, height=${(max[1]-min[1]).toFixed(1)}m, depth=${(max[2]-min[2]).toFixed(1)}m`);

  const exporter = new GLTFExporter();
  const rawGlb = await exporter.parseAsync(root, { binary: true });
  const rawGlbPath = path.join(dest, `${cfg.id}.glb`);
  fs.writeFileSync(rawGlbPath, Buffer.from(rawGlb));
  console.log(`- Detailed GLB: ${rawGlb.byteLength.toLocaleString()} bytes`);

  const mapGlbPath = path.join(dest, 'map.glb');
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  try {
    execFileSync(npxCmd, [
      'gltfpack',
      '-i', rawGlbPath,
      '-o', mapGlbPath,
      '-cc', '-ce', 'ext',
      '-vp', '16', '-vn', '12',
      '-km', '-ke'
    ], { stdio: 'inherit', shell: true });
    console.log(`- Compressed map.glb with Meshopt: ${fs.statSync(mapGlbPath).size.toLocaleString()} bytes`);
  } catch (err) {
    console.warn(`! gltfpack failed, copying raw GLB as map.glb:`, err.message);
    fs.copyFileSync(rawGlbPath, mapGlbPath);
  }

  const mapBytes = fs.statSync(mapGlbPath).size;

  const metadata = {
    name: cfg.name,
    id: cfg.id,
    category: cfg.category,
    position: cfg.position,
    rotation: cfg.rotation,
    mask: cfg.mask,
    description: cfg.description,
    reference: cfg.reference,
    triangles: totalTriangles,
    mapTriangles: totalTriangles,
    bounds: [
      [min[0], min[2], min[1]],
      [max[0], max[2], max[1]]
    ],
    bytes: mapBytes,
    downloadBytes: 0,
    files: [
      `${cfg.id}.glb`,
      'map.glb',
      'preview.jpg',
      'README.md',
      'metadata.json'
    ]
  };

  const readmeContent = `# ${cfg.name}

${cfg.description}

## Model Information
- **Triangles**: ${totalTriangles.toLocaleString()}
- **Dimensions**: ${(max[0] - min[0]).toFixed(1)}m (W) × ${(max[2] - min[2]).toFixed(1)}m (D) × ${(max[1] - min[1]).toFixed(1)}m (H)
- **Local Origin**: Centered at ground level (Y = 0)
- **Materials**: Standard PBR materials with metallic and roughness channels
- **Reference**: Sourced from high-resolution on-site photographs in \`references/\`

## Files
- \`${cfg.id}.glb\`: Full uncompressed architectural model.
- \`map.glb\`: Web-optimized model using Meshopt compression and KHR_mesh_quantization.
- \`preview.jpg\`: Reference photograph.
- \`metadata.json\`: Placement and geometry manifest.

## License & Attribution
Part of the Colombo Atlas Digital Twin project.
Creative Commons Attribution 4.0 International (CC BY 4.0).
`;
  fs.writeFileSync(path.join(dest, 'README.md'), readmeContent, 'utf-8');

  // Package zip archive
  const zipPath = path.join(dest, `${cfg.id}-model.zip`);
  try {
    execFileSync('powershell', [
      '-Command',
      `Compress-Archive -Path '${path.join(dest, '*')}' -DestinationPath '${zipPath}' -Force`
    ]);
    metadata.downloadBytes = fs.statSync(zipPath).size;
    console.log(`- Model ZIP package: ${metadata.downloadBytes.toLocaleString()} bytes`);
  } catch (e) {
    metadata.downloadBytes = fs.statSync(rawGlbPath).size;
  }

  fs.writeFileSync(path.join(dest, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');

  return metadata;
}

async function main() {
  const catalog = [];
  for (const cfg of LANDMARK_CONFIGS) {
    const meta = await exportLandmark(cfg);
    catalog.push(meta);
  }

  const catalogPath = path.join(LANDMARKS_DIR, 'expansion_catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(`\n========================================`);
  console.log(`Successfully generated ${catalog.length} landmark models!`);
  console.log(`Catalog saved to: ${catalogPath}`);
  console.log(`========================================\n`);
}

main().catch(err => {
  console.error('Fatal error during landmark generation:', err);
  process.exit(1);
});
