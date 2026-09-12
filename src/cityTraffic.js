import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {trafficRoutes} from './trafficRoutes.js';

function addPartColor(geo, r, g, b) {
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function createRealisticTukTukGeometry() {
  const parts = [];
  const chassis = addPartColor(new THREE.BoxGeometry(1.25, 0.65, 1.7), 1, 1, 1);
  chassis.translate(0, 0.45, -0.2);
  parts.push(chassis);

  const nose = addPartColor(new THREE.BoxGeometry(0.9, 0.6, 0.7), 1, 1, 1);
  nose.translate(0, 0.45, 0.85);
  parts.push(nose);

  const roof = addPartColor(new THREE.BoxGeometry(1.28, 0.12, 1.85), 0.18, 0.18, 0.2);
  roof.translate(0, 1.45, -0.15);
  parts.push(roof);

  const windshield = addPartColor(new THREE.BoxGeometry(1.05, 0.55, 0.05), 0.65, 0.85, 1.0);
  windshield.rotateX(-0.25);
  windshield.translate(0, 1.05, 0.65);
  parts.push(windshield);

  const fw = addPartColor(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12), 0.12, 0.12, 0.12);
  fw.rotateZ(Math.PI / 2);
  fw.translate(0, 0.22, 0.8);
  parts.push(fw);

  const rwl = addPartColor(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12), 0.12, 0.12, 0.12);
  rwl.rotateZ(Math.PI / 2);
  rwl.translate(-0.55, 0.22, -0.7);
  parts.push(rwl);

  const rwr = addPartColor(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12), 0.12, 0.12, 0.12);
  rwr.rotateZ(Math.PI / 2);
  rwr.translate(0.55, 0.22, -0.7);
  parts.push(rwr);

  const p1 = addPartColor(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), 0.25, 0.25, 0.25);
  p1.translate(-0.48, 1.05, 0.6);
  parts.push(p1);

  const p2 = addPartColor(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), 0.25, 0.25, 0.25);
  p2.translate(0.48, 1.05, 0.6);
  parts.push(p2);

  const hl = addPartColor(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10), 1.0, 0.95, 0.7);
  hl.rotateX(Math.PI / 2);
  hl.translate(0, 0.65, 1.22);
  parts.push(hl);

  return mergeGeometries(parts);
}

function createRealisticBusGeometry() {
  const parts = [];
  const lower = addPartColor(new THREE.BoxGeometry(2.4, 1.4, 9.6), 0.82, 0.12, 0.14);
  lower.translate(0, 0.95, 0);
  parts.push(lower);

  const roof = addPartColor(new THREE.BoxGeometry(2.4, 0.45, 9.6), 0.96, 0.94, 0.88);
  roof.translate(0, 2.85, 0);
  parts.push(roof);

  const win = addPartColor(new THREE.BoxGeometry(2.44, 0.95, 8.8), 0.2, 0.35, 0.45);
  win.translate(0, 2.15, -0.2);
  parts.push(win);

  const frontWin = addPartColor(new THREE.BoxGeometry(2.38, 0.95, 0.2), 0.25, 0.45, 0.55);
  frontWin.translate(0, 2.15, 4.75);
  parts.push(frontWin);

  const sign = addPartColor(new THREE.BoxGeometry(1.6, 0.3, 0.15), 0.98, 0.95, 0.6);
  sign.translate(0, 2.85, 4.8);
  parts.push(sign);

  const grille = addPartColor(new THREE.BoxGeometry(1.8, 0.4, 0.12), 0.15, 0.15, 0.15);
  grille.translate(0, 0.7, 4.8);
  parts.push(grille);

  const fwL = addPartColor(new THREE.CylinderGeometry(0.48, 0.48, 0.26, 12), 0.12, 0.12, 0.12);
  fwL.rotateZ(Math.PI / 2);
  fwL.translate(-1.15, 0.48, 2.8);
  parts.push(fwL);

  const fwR = addPartColor(new THREE.CylinderGeometry(0.48, 0.48, 0.26, 12), 0.12, 0.12, 0.12);
  fwR.rotateZ(Math.PI / 2);
  fwR.translate(1.15, 0.48, 2.8);
  parts.push(fwR);

  const rwL = addPartColor(new THREE.CylinderGeometry(0.48, 0.48, 0.42, 12), 0.12, 0.12, 0.12);
  rwL.rotateZ(Math.PI / 2);
  rwL.translate(-1.15, 0.48, -2.6);
  parts.push(rwL);

  const rwR = addPartColor(new THREE.CylinderGeometry(0.48, 0.48, 0.42, 12), 0.12, 0.12, 0.12);
  rwR.rotateZ(Math.PI / 2);
  rwR.translate(1.15, 0.48, -2.6);
  parts.push(rwR);

  return mergeGeometries(parts);
}

function createRealisticCarGeometry() {
  const parts = [];
  parts.push(addPartColor(new THREE.BoxGeometry(1.8, 0.45, 1.4), 1, 1, 1).translate(0, 0.55, 1.35));
  parts.push(addPartColor(new THREE.BoxGeometry(1.72, 0.65, 2.0), 1, 1, 1).translate(0, 1.05, -0.15));
  parts.push(addPartColor(new THREE.BoxGeometry(1.8, 0.5, 0.95), 1, 1, 1).translate(0, 0.58, -1.6));

  const fWin = addPartColor(new THREE.BoxGeometry(1.65, 0.65, 0.08), 0.25, 0.4, 0.5);
  fWin.rotateX(-0.5);
  fWin.translate(0, 1.0, 0.75);
  parts.push(fWin);

  const rWin = addPartColor(new THREE.BoxGeometry(1.65, 0.6, 0.08), 0.25, 0.4, 0.5);
  rWin.rotateX(0.45);
  rWin.translate(0, 1.0, -1.05);
  parts.push(rWin);

  for (const sx of [-0.88, 0.88]) {
    for (const sz of [-1.35, 1.35]) {
      const w = addPartColor(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 10), 0.12, 0.12, 0.12);
      w.rotateZ(Math.PI / 2);
      w.translate(sx, 0.32, sz);
      parts.push(w);
    }
  }
  return mergeGeometries(parts);
}

function createRealisticSwanBoatGeometry() {
  const parts = [];
  parts.push(addPartColor(new THREE.BoxGeometry(0.45, 0.35, 2.4), 0.95, 0.95, 0.95).translate(-0.55, 0.18, 0));
  parts.push(addPartColor(new THREE.BoxGeometry(0.45, 0.35, 2.4), 0.95, 0.95, 0.95).translate(0.55, 0.18, 0));
  parts.push(addPartColor(new THREE.BoxGeometry(1.2, 0.15, 1.6), 0.2, 0.55, 0.75).translate(0, 0.28, -0.1));

  const neck = addPartColor(new THREE.CylinderGeometry(0.1, 0.14, 0.9, 8), 0.98, 0.98, 0.98);
  neck.rotateX(0.3);
  neck.translate(0, 0.7, 0.95);
  parts.push(neck);

  const head = addPartColor(new THREE.SphereGeometry(0.18, 8, 8), 0.98, 0.98, 0.98);
  head.translate(0, 1.15, 1.1);
  parts.push(head);

  const beak = addPartColor(new THREE.ConeGeometry(0.08, 0.22, 6), 0.95, 0.45, 0.05);
  beak.rotateX(Math.PI / 2);
  beak.translate(0, 1.1, 1.32);
  parts.push(beak);

  const canopy = addPartColor(new THREE.BoxGeometry(1.4, 0.08, 1.6), 0.95, 0.75, 0.15);
  canopy.translate(0, 1.25, -0.15);
  parts.push(canopy);

  return mergeGeometries(parts);
}

export function createCityTraffic(scene) {
  const group = new THREE.Group();
  group.name = 'Colombo living traffic';
  scene.add(group);

  // 1. Build smooth 3D curves from routes
  const curves = trafficRoutes.map(points => {
    const vectors = points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    return new THREE.CatmullRomCurve3(vectors, false, 'centripetal');
  });

  // 2. Vehicle Geometries & Materials
  const tukCombinedGeo = createRealisticTukTukGeometry();
  const busGeo = createRealisticBusGeometry();
  const carGeo = createRealisticCarGeometry();
  const boatGeo = createRealisticSwanBoatGeometry();

  // Materials with vertex colors enabled
  const tukMat = new THREE.MeshStandardMaterial({roughness: 0.42, metalness: 0.25, vertexColors: true});
  const busMat = new THREE.MeshStandardMaterial({roughness: 0.38, metalness: 0.35, vertexColors: true});
  const carMat = new THREE.MeshStandardMaterial({roughness: 0.28, metalness: 0.65, vertexColors: true});
  const boatMat = new THREE.MeshStandardMaterial({roughness: 0.35, metalness: 0.1, vertexColors: true});

  // Glowing Lights Materials
  const headlightMat = new THREE.MeshBasicMaterial({color: 0xfff0b3});
  const taillightMat = new THREE.MeshBasicMaterial({color: 0xff1a1a});
  const lightGeo = new THREE.SphereGeometry(0.12, 10, 10);

  // 3. Vehicles setup
  const NUM_TUKS = 36;
  const NUM_BUSES = 10;
  const NUM_CARS = 26;
  const NUM_BOATS = 6;

  const tukMesh = new THREE.InstancedMesh(tukCombinedGeo, tukMat, NUM_TUKS);
  const busMesh = new THREE.InstancedMesh(busGeo, busMat, NUM_BUSES);
  const carMesh = new THREE.InstancedMesh(carGeo, carMat, NUM_CARS);
  const boatMesh = new THREE.InstancedMesh(boatGeo, boatMat, NUM_BOATS);

  const totalVehicles = NUM_TUKS + NUM_BUSES + NUM_CARS;
  const headlightsMesh = new THREE.InstancedMesh(lightGeo, headlightMat, totalVehicles * 2);
  const taillightsMesh = new THREE.InstancedMesh(lightGeo, taillightMat, totalVehicles * 2);

  // Soft blob contact shadows ground every vehicle. The city bakes its shadow
  // map once (autoUpdate=false), so moving traffic would otherwise float.
  const blobGeo = new THREE.CircleGeometry(1, 20);
  blobGeo.rotateX(-Math.PI / 2);
  const blobMat = new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false});
  const blobMesh = new THREE.InstancedMesh(blobGeo, blobMat, totalVehicles);
  blobMesh.renderOrder = 1;

  const tukColors = [
    new THREE.Color(0x1b5e20), // Ceylon Forest Green
    new THREE.Color(0xb71c1c), // Crimson
    new THREE.Color(0x0d47a1), // Royal Blue
    new THREE.Color(0xf57f17), // Marigold
  ];
  const carColors = [
    new THREE.Color(0xf5f5f5), // Pearl White
    new THREE.Color(0x37474f), // Charcoal
    new THREE.Color(0x90a4ae), // Silver
    new THREE.Color(0x263238), // Dark
  ];

  const vehicles = [];
  const dummy = new THREE.Object3D();
  const upVec = new THREE.Vector3(0, 1, 0);

  // Initialize Tuk-Tuks
  for (let i = 0; i < NUM_TUKS; i++) {
    const curveIdx = (i + 4) % curves.length;
    const curve = curves[curveIdx];
    const laneDir = (i % 2 === 0) ? 1 : -1;
    vehicles.push({
      type: 'tuktuk',
      meshIndex: i,
      curve,
      curveLength: curve.getLength(),
      t: (i / NUM_TUKS + (i * 0.13)) % 1,
      speed: 11 + (i % 5),
      dir: laneDir,
      // Magnitude only: the update keeps left-hand traffic by offsetting to
      // the left of each vehicle's own direction of travel.
      laneOffset: 1.2 + (i % 3) * 0.3,
    });
    tukMesh.setColorAt(i, tukColors[i % tukColors.length]);
  }
  tukMesh.instanceColor.needsUpdate = true;

  // Initialize Buses
  for (let i = 0; i < NUM_BUSES; i++) {
    const curveIdx = (i * 2) % curves.length;
    const curve = curves[curveIdx];
    const laneDir = (i % 2 === 0) ? 1 : -1;
    vehicles.push({
      type: 'bus',
      meshIndex: i,
      curve,
      curveLength: curve.getLength(),
      t: (i / NUM_BUSES + 0.15) % 1,
      speed: 8 + (i % 3),
      dir: laneDir,
      laneOffset: 1.8,
    });
    busMesh.setColorAt(i, new THREE.Color(0xcc181e));
  }
  busMesh.instanceColor.needsUpdate = true;

  // Initialize Cars
  for (let i = 0; i < NUM_CARS; i++) {
    const curveIdx = (i + 1) % curves.length;
    const curve = curves[curveIdx];
    const laneDir = (i % 2 === 0) ? 1 : -1;
    vehicles.push({
      type: 'car',
      meshIndex: i,
      curve,
      curveLength: curve.getLength(),
      t: (i / NUM_CARS + 0.3) % 1,
      speed: 13 + (i % 4),
      dir: laneDir,
      laneOffset: 1.4 + (i % 2) * 0.4,
    });
    carMesh.setColorAt(i, carColors[i % carColors.length]);
  }
  carMesh.instanceColor.needsUpdate = true;

  // Beira Lake Swan Boats
  const boatCenters = [
    [-220, 850], [-260, 920], [-180, 890],
    [-290, 780], [-240, 810], [-310, 860]
  ];
  const boats = boatCenters.map((center, i) => ({
    cx: center[0],
    cz: center[1],
    phase: i * 1.1,
    radius: 20 + i * 8,
    speed: 0.15 + i * 0.04,
  }));

  group.add(tukMesh);
  group.add(busMesh);
  group.add(carMesh);
  group.add(boatMesh);
  group.add(headlightsMesh);
  group.add(taillightsMesh);
  group.add(blobMesh);

  const normal = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const tangent = new THREE.Vector3();

  return {
    group,
    update(delta, elapsed, isNight) {
      headlightsMesh.visible = true;
      taillightsMesh.visible = true;

      let lightIdx = 0;

      for (const v of vehicles) {
        const step = (v.speed * delta) / v.curveLength;
        v.t = (v.t + step * v.dir) % 1;
        if (v.t < 0) v.t += 1;

        v.curve.getPointAt(v.t, pos);
        v.curve.getTangentAt(v.t, tangent).normalize();

        if (v.dir < 0) tangent.negate();

        // Left-hand traffic: cross(tangent, up) points to the right of travel,
        // so negate to keep every vehicle left of its own direction.
        normal.crossVectors(tangent, upVec).normalize().multiplyScalar(-v.laneOffset);
        pos.add(normal);

        dummy.position.copy(pos);
        dummy.position.y += 0.05;
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        dummy.updateMatrix();

        if (!v.lastPos) v.lastPos = new THREE.Vector3();
        if (!v.lastTangent) v.lastTangent = new THREE.Vector3();
        v.lastPos.copy(dummy.position);
        v.lastTangent.copy(tangent);

        if (v.type === 'tuktuk') tukMesh.setMatrixAt(v.meshIndex, dummy.matrix);
        else if (v.type === 'bus') busMesh.setMatrixAt(v.meshIndex, dummy.matrix);
        else if (v.type === 'car') carMesh.setMatrixAt(v.meshIndex, dummy.matrix);

        // Blob contact shadow follows the vehicle on the road surface.
        const blobSize = v.type === 'bus' ? [1.3, 5.0] : v.type === 'car' ? [1.0, 2.2] : [0.8, 1.2];
        dummy.position.set(pos.x, pos.y + 0.04, pos.z);
        dummy.quaternion.identity();
        dummy.scale.set(blobSize[0], 1, blobSize[1]);
        dummy.updateMatrix();
        blobMesh.setMatrixAt(lightIdx, dummy.matrix);
        dummy.scale.set(1, 1, 1);

        {
          const halfWidth = v.type === 'bus' ? 1.0 : (v.type === 'car' ? 0.75 : 0.35);
          const halfLen = v.type === 'bus' ? 4.8 : (v.type === 'car' ? 2.1 : 1.15);
          const lightY = pos.y + (v.type === 'bus' ? 0.9 : (v.type === 'tuktuk' ? 0.65 : 0.5));

          // Headlights
          dummy.position.set(pos.x + tangent.x * halfLen - normal.x * halfWidth, lightY, pos.z + tangent.z * halfLen - normal.z * halfWidth);
          dummy.updateMatrix();
          headlightsMesh.setMatrixAt(lightIdx * 2, dummy.matrix);

          dummy.position.set(pos.x + tangent.x * halfLen + normal.x * halfWidth, lightY, pos.z + tangent.z * halfLen + normal.z * halfWidth);
          dummy.updateMatrix();
          headlightsMesh.setMatrixAt(lightIdx * 2 + 1, dummy.matrix);

          // Taillights
          dummy.position.set(pos.x - tangent.x * halfLen - normal.x * halfWidth, lightY, pos.z - tangent.z * halfLen - normal.z * halfWidth);
          dummy.updateMatrix();
          taillightsMesh.setMatrixAt(lightIdx * 2, dummy.matrix);

          dummy.position.set(pos.x - tangent.x * halfLen + normal.x * halfWidth, lightY, pos.z - tangent.z * halfLen + normal.z * halfWidth);
          dummy.updateMatrix();
          taillightsMesh.setMatrixAt(lightIdx * 2 + 1, dummy.matrix);
        }
        lightIdx++;
      }

      tukMesh.instanceMatrix.needsUpdate = true;
      busMesh.instanceMatrix.needsUpdate = true;
      carMesh.instanceMatrix.needsUpdate = true;
      blobMesh.instanceMatrix.needsUpdate = true;
      headlightsMesh.instanceMatrix.needsUpdate = true;
      taillightsMesh.instanceMatrix.needsUpdate = true;

      // Update Beira Lake Swan Boats
      const lakeWaterY = -5.8;
      for (let i = 0; i < boats.length; i++) {
        const b = boats[i];
        const angle = elapsed * b.speed + b.phase;
        const bx = b.cx + Math.cos(angle) * b.radius;
        const bz = b.cz + Math.sin(angle) * (b.radius * 0.6);
        const bob = Math.sin(elapsed * 2.5 + b.phase) * 0.08;

        dummy.position.set(bx, lakeWaterY + 0.4 + bob, bz);
        dummy.rotation.set(Math.sin(elapsed * 1.8 + i) * 0.04, -angle + Math.PI / 2, Math.cos(elapsed * 2.0 + i) * 0.05);
        dummy.updateMatrix();
        boatMesh.setMatrixAt(i, dummy.matrix);
      }
      boatMesh.instanceMatrix.needsUpdate = true;
    },
    getTukTukCount() {
      return NUM_TUKS;
    },
    getTukTukPose(index = 0) {
      const tuks = vehicles.filter(v => v.type === 'tuktuk');
      const v = tuks[index % tuks.length];
      if (!v || !v.lastPos || !v.lastTangent) return null;
      return {
        position: v.lastPos,
        tangent: v.lastTangent,
        speedKmH: Math.round(v.speed * 3.6),
        index: v.meshIndex,
      };
    },
    dispose() {
      scene.remove(group);
      tukCombinedGeo.dispose();
      busGeo.dispose();
      carGeo.dispose();
      boatGeo.dispose();
      lightGeo.dispose();
      blobGeo.dispose();
      tukMat.dispose();
      busMat.dispose();
      carMat.dispose();
      boatMat.dispose();
      headlightMat.dispose();
      taillightMat.dispose();
      blobMat.dispose();
    }
  };
}
