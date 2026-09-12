import * as THREE from 'three';

export function createTukTukModel(options = {}) {
  const root = new THREE.Group();
  root.name = 'Colombo Authentic Bajaj RE Tuk-Tuk';

  // Primary body color (Default: iconic Ceylon emerald green)
  const primaryColor = options.primaryColor || 0x1b5e20;
  const secondaryColor = options.secondaryColor || 0xf9a825; // Warm marigold yellow stripe/accent

  // Materials
  const paintMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.35,
    metalness: 0.25,
  });

  const stripeMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    roughness: 0.4,
    metalness: 0.1,
  });

  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x181a1b,
    roughness: 0.85,
    metalness: 0.05,
  });

  const blackMetalMat = new THREE.MeshStandardMaterial({
    color: 0x212121,
    roughness: 0.5,
    metalness: 0.6,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,
    roughness: 0.15,
    metalness: 0.95,
  });

  const rubberMat = new THREE.MeshStandardMaterial({
    color: 0x141414,
    roughness: 0.88,
    metalness: 0.05,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeef5,
    transmission: 0.85,
    opacity: 0.4,
    transparent: true,
    roughness: 0.08,
    ior: 1.5,
  });

  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x422718, // Deep saddle brown leather
    roughness: 0.65,
    metalness: 0.05,
  });

  const lightLensMat = new THREE.MeshStandardMaterial({
    color: 0xfff3cc,
    emissive: 0xffea9f,
    emissiveIntensity: 0.8,
    roughness: 0.1,
  });

  const amberLensMat = new THREE.MeshStandardMaterial({
    color: 0xff9100,
    emissive: 0xff9100,
    emissiveIntensity: 0.6,
    roughness: 0.15,
  });

  const redLensMat = new THREE.MeshStandardMaterial({
    color: 0xd50000,
    emissive: 0xb71c1c,
    emissiveIntensity: 0.5,
    roughness: 0.15,
  });

  // Tilting chassis group for realistic cornering lean
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'TukTuk Body';
  root.add(bodyGroup);

  // 1. Lower Chassis Frame
  const chassisGeo = new THREE.BoxGeometry(1.26, 0.22, 2.3);
  const chassis = new THREE.Mesh(chassisGeo, blackMetalMat);
  chassis.position.set(0, 0.32, 0);
  chassis.castShadow = true;
  bodyGroup.add(chassis);

  // 2. Cabin Base Floor & Side Panels
  const floorGeo = new THREE.BoxGeometry(1.24, 0.06, 2.1);
  const floor = new THREE.Mesh(floorGeo, blackMetalMat);
  floor.position.set(0, 0.44, 0);
  bodyGroup.add(floor);

  // Passenger Cabin Side Half-Doors / Panels
  const leftPanelGeo = new THREE.BoxGeometry(0.06, 0.52, 1.25);
  const leftPanel = new THREE.Mesh(leftPanelGeo, paintMat);
  leftPanel.position.set(-0.62, 0.72, -0.28);
  bodyGroup.add(leftPanel);

  const rightPanel = leftPanel.clone();
  rightPanel.position.x = 0.62;
  bodyGroup.add(rightPanel);

  // Sri Lankan classic Yellow Accent Stripe along side panels
  const leftStripeGeo = new THREE.BoxGeometry(0.065, 0.1, 1.25);
  const leftStripe = new THREE.Mesh(leftStripeGeo, stripeMat);
  leftStripe.position.set(-0.62, 0.72, -0.28);
  bodyGroup.add(leftStripe);

  const rightStripe = leftStripe.clone();
  rightStripe.position.x = 0.62;
  bodyGroup.add(rightStripe);

  // Rear Engine Compartment & Tailgate
  const rearBoxGeo = new THREE.BoxGeometry(1.26, 0.68, 0.42);
  const rearBox = new THREE.Mesh(rearBoxGeo, paintMat);
  rearBox.position.set(0, 0.76, -0.98);
  rearBox.castShadow = true;
  bodyGroup.add(rearBox);

  // Rear Bumper Bar
  const bumperGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.36, 12);
  const bumper = new THREE.Mesh(bumperGeo, chromeMat);
  bumper.rotation.z = Math.PI / 2;
  bumper.position.set(0, 0.38, -1.22);
  bodyGroup.add(bumper);

  // Registration Number Plate: "WP - AB 7724"
  const plateGeo = new THREE.BoxGeometry(0.38, 0.14, 0.02);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xededed, roughness: 0.5 });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.set(0, 0.56, -1.2);
  bodyGroup.add(plate);

  // Rear Tail Lights
  for (const side of [-0.52, 0.52]) {
    const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.04), redLensMat);
    tailLight.position.set(side, 0.78, -1.2);
    bodyGroup.add(tailLight);

    const indLight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.04), amberLensMat);
    indLight.position.set(side > 0 ? side - 0.09 : side + 0.09, 0.78, -1.2);
    bodyGroup.add(indLight);
  }

  // 3. Passenger Seat & Cushions
  const rearSeatGeo = new THREE.BoxGeometry(1.14, 0.16, 0.48);
  const rearSeat = new THREE.Mesh(rearSeatGeo, seatMat);
  rearSeat.position.set(0, 0.56, -0.65);
  bodyGroup.add(rearSeat);

  const rearBackrestGeo = new THREE.BoxGeometry(1.14, 0.45, 0.12);
  const rearBackrest = new THREE.Mesh(rearBackrestGeo, seatMat);
  rearBackrest.position.set(0, 0.88, -0.86);
  bodyGroup.add(rearBackrest);

  // Driver Center Seat
  const driverSeatGeo = new THREE.BoxGeometry(0.48, 0.14, 0.38);
  const driverSeat = new THREE.Mesh(driverSeatGeo, seatMat);
  driverSeat.position.set(0, 0.62, 0.28);
  bodyGroup.add(driverSeat);

  // 4. Curved Front Nose / Cowl (Fixed to body)
  const frontCowlGeo = new THREE.BoxGeometry(0.88, 0.62, 0.65);
  const frontCowl = new THREE.Mesh(frontCowlGeo, paintMat);
  frontCowl.position.set(0, 0.66, 0.82);
  bodyGroup.add(frontCowl);

  const frontAccent = new THREE.Mesh(new THREE.BoxGeometry(0.89, 0.1, 0.66), stripeMat);
  frontAccent.position.set(0, 0.66, 0.82);
  bodyGroup.add(frontAccent);

  // Chrome Headlamp Housing
  const headlampBezelGeo = new THREE.CylinderGeometry(0.15, 0.17, 0.12, 16);
  const headlampBezel = new THREE.Mesh(headlampBezelGeo, chromeMat);
  headlampBezel.rotation.x = Math.PI / 2;
  headlampBezel.position.set(0, 0.74, 1.15);
  bodyGroup.add(headlampBezel);

  // Glowing Headlight Glass
  const headlampLensGeo = new THREE.SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const headlampLens = new THREE.Mesh(headlampLensGeo, lightLensMat);
  headlampLens.rotation.x = Math.PI / 2;
  headlampLens.position.set(0, 0.74, 1.21);
  bodyGroup.add(headlampLens);

  // Front Turn Indicators
  for (const side of [-0.34, 0.34]) {
    const frontInd = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10), amberLensMat);
    frontInd.rotation.x = Math.PI / 2;
    frontInd.position.set(side, 0.68, 1.14);
    bodyGroup.add(frontInd);
  }

  // Windshield Frame & Glass
  const windshieldFrameGeo = new THREE.BoxGeometry(1.18, 0.68, 0.04);
  const windshieldFrame = new THREE.Mesh(windshieldFrameGeo, blackMetalMat);
  windshieldFrame.rotation.x = -0.16;
  windshieldFrame.position.set(0, 1.26, 0.76);
  bodyGroup.add(windshieldFrame);

  const glassGeo = new THREE.BoxGeometry(1.08, 0.58, 0.02);
  const windshieldGlass = new THREE.Mesh(glassGeo, glassMat);
  windshieldGlass.rotation.x = -0.16;
  windshieldGlass.position.set(0, 1.26, 0.76);
  bodyGroup.add(windshieldGlass);

  // Single Front Wiper
  const wiperGeo = new THREE.BoxGeometry(0.02, 0.42, 0.02);
  const wiper = new THREE.Mesh(wiperGeo, blackMetalMat);
  wiper.rotation.z = -0.45;
  wiper.position.set(0.08, 1.28, 0.79);
  bodyGroup.add(wiper);

  // 5. Canvas Canopy Roof & Support Frame
  const roofGeo = new THREE.BoxGeometry(1.32, 0.12, 2.38);
  const roof = new THREE.Mesh(roofGeo, canopyMat);
  roof.position.set(0, 1.72, -0.06);
  roof.castShadow = true;
  bodyGroup.add(roof);

  // Curved Canopy Front Visor / Lip
  const visorGeo = new THREE.BoxGeometry(1.28, 0.18, 0.28);
  const visor = new THREE.Mesh(visorGeo, canopyMat);
  visor.rotation.x = -0.25;
  visor.position.set(0, 1.68, 1.05);
  bodyGroup.add(visor);

  // Canopy Tubular Support Pillars (4 corner steel tubes)
  const tubeGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.0, 8);
  const tubePositions = [
    [-0.58, 1.22, 0.74],
    [0.58, 1.22, 0.74],
    [-0.58, 1.22, -0.88],
    [0.58, 1.22, -0.88],
  ];
  for (const pos of tubePositions) {
    const pillar = new THREE.Mesh(tubeGeo, blackMetalMat);
    pillar.position.set(...pos);
    bodyGroup.add(pillar);
  }

  // Interior rearview mirror & lucky charm hanging from canopy frame
  const mirrorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 6), chromeMat);
  mirrorArm.position.set(0, 1.58, 0.68);
  bodyGroup.add(mirrorArm);

  const mirrorGeo = new THREE.BoxGeometry(0.18, 0.08, 0.02);
  const mirror = new THREE.Mesh(mirrorGeo, chromeMat);
  mirror.position.set(0, 1.51, 0.68);
  bodyGroup.add(mirror);

  // Lucky hanging trinket / charm (tassel)
  const tasselGeo = new THREE.ConeGeometry(0.035, 0.12, 8);
  const tasselMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.8 });
  const tassel = new THREE.Mesh(tasselGeo, tasselMat);
  tassel.rotation.x = Math.PI;
  tassel.position.set(0, 1.48, 0.66);
  bodyGroup.add(tassel);

  // 6. Steerable Front Wheel & Handlebars Assembly
  const steerGroup = new THREE.Group();
  steerGroup.name = 'TukTuk Steering Column';
  steerGroup.position.set(0, 0.52, 0.78);
  bodyGroup.add(steerGroup);

  // Fork Strut
  const forkGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8);
  const fork = new THREE.Mesh(forkGeo, blackMetalMat);
  fork.position.set(0, -0.15, 0.1);
  steerGroup.add(fork);

  // Front Mudguard
  const mudguardGeo = new THREE.BoxGeometry(0.24, 0.22, 0.48);
  const mudguard = new THREE.Mesh(mudguardGeo, paintMat);
  mudguard.position.set(0, -0.18, 0.14);
  steerGroup.add(mudguard);

  // Front Wheel
  const wheelTireGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 16);
  wheelTireGeo.rotateZ(Math.PI / 2);
  const frontWheel = new THREE.Mesh(wheelTireGeo, rubberMat);
  frontWheel.position.set(0, -0.28, 0.14);
  frontWheel.castShadow = true;
  steerGroup.add(frontWheel);

  // Front Chrome Hub Cap
  const hubCapGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.16, 12);
  hubCapGeo.rotateZ(Math.PI / 2);
  const frontHub = new THREE.Mesh(hubCapGeo, chromeMat);
  frontWheel.add(frontHub);

  // Handlebars Column & Grips
  const columnGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8);
  const col = new THREE.Mesh(columnGeo, blackMetalMat);
  col.position.set(0, 0.12, 0);
  steerGroup.add(col);

  const barGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.72, 8);
  barGeo.rotateZ(Math.PI / 2);
  const bar = new THREE.Mesh(barGeo, chromeMat);
  bar.position.set(0, 0.26, 0);
  steerGroup.add(bar);

  // Black Rubber Grips
  for (const side of [-0.32, 0.32]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.12, 8), rubberMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(side, 0.26, 0);
    steerGroup.add(grip);
  }

  // Side Mirrors on Handlebars
  for (const side of [-0.36, 0.36]) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), chromeMat);
    stem.position.set(side, 0.34, 0.03);
    steerGroup.add(stem);

    const mirrorHead = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.015, 12), chromeMat);
    mirrorHead.rotation.x = Math.PI / 2;
    mirrorHead.position.set(side, 0.42, 0.03);
    steerGroup.add(mirrorHead);
  }

  // Dashboard Speedometer Gauge on Handlebar Base
  const gaugeGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 12);
  gaugeGeo.rotateX(0.4);
  const gauge = new THREE.Mesh(gaugeGeo, chromeMat);
  gauge.position.set(0, 0.26, -0.05);
  steerGroup.add(gauge);

  const dialGeo = new THREE.CircleGeometry(0.062, 12);
  dialGeo.rotateX(-0.4);
  const dialMat = new THREE.MeshBasicMaterial({ color: 0xededed });
  const dial = new THREE.Mesh(dialGeo, dialMat);
  dial.position.set(0, 0.28, -0.05);
  steerGroup.add(dial);

  // 7. Rear Left and Right Wheels
  const rearWheels = [];
  for (const side of [-0.58, 0.58]) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(side, 0.24, -0.68);
    bodyGroup.add(wheelGroup);

    const rWheel = new THREE.Mesh(wheelTireGeo.clone(), rubberMat);
    rWheel.castShadow = true;
    wheelGroup.add(rWheel);

    const rHub = new THREE.Mesh(hubCapGeo.clone(), chromeMat);
    rWheel.add(rHub);

    // Mudflap behind rear wheel
    const flapGeo = new THREE.BoxGeometry(0.18, 0.22, 0.015);
    const flap = new THREE.Mesh(flapGeo, rubberMat);
    flap.position.set(0, 0, -0.24);
    wheelGroup.add(flap);

    rearWheels.push(rWheel);
  }

  // 8. Dedicated Camera Anchors
  const cameraMounts = {
    // 1st-person Cockpit (looking forward through windscreen past handlebars)
    cockpit: new THREE.Vector3(0, 1.22, 0.18),
    cockpitTarget: new THREE.Vector3(0, 1.18, 4.5),

    // Passenger Back Seat (looking out past the driver with wide panorama)
    passenger: new THREE.Vector3(0.25, 1.15, -0.48),
    passengerTarget: new THREE.Vector3(0, 1.25, 6.0),

    // 3rd-person Cinematic Chase Cam
    chaseOffset: new THREE.Vector3(0, 2.4, -4.8),
    chaseTarget: new THREE.Vector3(0, 0.9, 1.2),
  };

  return {
    root,
    bodyGroup,
    steerGroup,
    frontWheel,
    rearWheels,
    cameraMounts,

    // Dynamic animation hook
    setSteerAngle(angle) {
      steerGroup.rotation.y = angle;
    },

    setBodyRoll(roll, pitch = 0) {
      bodyGroup.rotation.z = roll;
      bodyGroup.rotation.x = pitch;
    },

    rollWheels(deltaDistance) {
      const tireRadius = 0.25;
      const angle = deltaDistance / tireRadius;
      frontWheel.rotation.x += angle;
      rearWheels[0].rotation.x += angle;
      rearWheels[1].rotation.x += angle;
    },

    dispose() {
      root.traverse(obj => {
        if (obj.isMesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material?.dispose();
        }
      });
    }
  };
}
