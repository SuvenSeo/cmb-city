import * as THREE from 'three';

export function createTukTukPhysics(options = {}) {
  // State variables - Spawn on Galle Road facing North toward Galle Face & Fort
  const position = new THREE.Vector3(options.startX !== undefined ? options.startX : -1290, options.startY !== undefined ? options.startY : 4.5, options.startZ !== undefined ? options.startZ : 700);
  let heading = options.startHeading !== undefined ? options.startHeading : Math.PI; // Radians, Math.PI = facing North (-Z)
  let speed = 0; // m/s
  let steerAngle = 0; // Radians
  let bodyRoll = 0;
  let bodyPitch = 0;
  let totalDistanceMeters = 0;
  let fareLKR = 100.0; // Standard Colombo starting taxi flag-drop

  // Physics tuning constants
  const MAX_SPEED = 12.8; // ~46 km/h
  const MAX_REVERSE_SPEED = 3.5; // ~12 km/h
  const ACCELERATION = 7.5; // m/s^2
  const BRAKING = 16.0; // m/s^2
  const HANDBRAKE_DECEL = 24.0; // m/s^2
  const NATURAL_DECEL = 4.0; // friction / engine drag
  const MAX_STEER = 0.58; // ~33 degrees maximum steering angle
  const STEER_RETURN_SPEED = 4.5;
  const STEER_SPEED = 3.2;

  // Chase camera smoothing vectors
  const smoothCamPos = new THREE.Vector3().copy(position).add(new THREE.Vector3(0, 2.5, -5));
  const smoothCamTarget = new THREE.Vector3().copy(position).add(new THREE.Vector3(0, 1.0, 2));

  // Forward and normal vectors
  const forward = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  return {
    get position() { return position; },
    get heading() { return heading; },
    get speed() { return speed; },
    get speedKmH() { return Math.round(Math.abs(speed) * 3.6); },
    get steerAngle() { return steerAngle; },
    get bodyRoll() { return bodyRoll; },
    get bodyPitch() { return bodyPitch; },
    get fareLKR() { return fareLKR; },
    get distanceKm() { return Number((totalDistanceMeters / 1000).toFixed(2)); },

    teleport(x, y, z, newHeading = 0) {
      position.set(x, y, z);
      heading = newHeading;
      speed = 0;
      steerAngle = 0;
      bodyRoll = 0;
      bodyPitch = 0;
      smoothCamPos.set(x, y + 2.5, z - 5);
      smoothCamTarget.set(x, y + 1.0, z + 2);
    },

    updateDrive(delta, input) {
      const dt = Math.min(delta, 0.1);

      // 1. Steering input & return
      if (input.left) {
        steerAngle = Math.min(MAX_STEER, steerAngle + STEER_SPEED * dt);
      } else if (input.right) {
        steerAngle = Math.max(-MAX_STEER, steerAngle - STEER_SPEED * dt);
      } else {
        // Return to center
        if (steerAngle > 0) steerAngle = Math.max(0, steerAngle - STEER_RETURN_SPEED * dt);
        else if (steerAngle < 0) steerAngle = Math.min(0, steerAngle + STEER_RETURN_SPEED * dt);
      }

      // 2. Throttle & Braking
      if (input.forward) {
        if (speed < 0) {
          speed += BRAKING * dt;
        } else {
          speed = Math.min(MAX_SPEED, speed + ACCELERATION * dt);
        }
      } else if (input.backward) {
        if (speed > 0.2) {
          speed -= BRAKING * dt;
        } else {
          speed = Math.max(-MAX_REVERSE_SPEED, speed - ACCELERATION * 0.6 * dt);
        }
      } else {
        // Natural coasting drag
        if (speed > 0) speed = Math.max(0, speed - NATURAL_DECEL * dt);
        else if (speed < 0) speed = Math.min(0, speed + NATURAL_DECEL * dt);
      }

      if (input.handbrake) {
        if (speed > 0) speed = Math.max(0, speed - HANDBRAKE_DECEL * dt);
        else if (speed < 0) speed = Math.min(0, speed + HANDBRAKE_DECEL * dt);
      }

      // 3. Turning & Heading
      if (Math.abs(speed) > 0.05) {
        // Three-wheeler turning radius
        const turnRate = (steerAngle * (speed / 2.2)) * dt;
        heading += turnRate;

        // Dynamic 3-wheeler cornering body lean & brake pitch
        const targetRoll = -steerAngle * (speed / MAX_SPEED) * 0.22;
        bodyRoll += (targetRoll - bodyRoll) * Math.min(1, dt * 8);

        const targetPitch = (input.backward && speed > 0 ? 0.08 : (input.forward ? -0.04 : 0));
        bodyPitch += (targetPitch - bodyPitch) * Math.min(1, dt * 6);
      } else {
        bodyRoll *= Math.max(0, 1 - dt * 6);
        bodyPitch *= Math.max(0, 1 - dt * 6);
      }

      // 4. Translate position
      forward.set(Math.sin(heading), 0, Math.cos(heading));
      const step = speed * dt;
      position.addScaledVector(forward, step);

      // Distance & Fare Meter (Flag-drop 100 LKR + 80 LKR per km)
      if (Math.abs(step) > 0) {
        const absMeters = Math.abs(step);
        totalDistanceMeters += absMeters;
        fareLKR = 100.0 + (totalDistanceMeters / 1000) * 80.0;
      }

      // Colombo road coordinate bounds clamp (keep on island context)
      position.x = Math.max(-2300, Math.min(1200, position.x));
      position.z = Math.max(-1800, Math.min(3200, position.z));
    },

    updateCruise(delta, targetPosition, targetTangent, speedKmH) {
      position.copy(targetPosition);
      heading = Math.atan2(targetTangent.x, targetTangent.z);
      speed = (speedKmH / 3.6);

      // Subtle road vibration
      bodyRoll = Math.sin(performance.now() * 0.01) * 0.012;
      bodyPitch = 0;

      totalDistanceMeters += Math.abs(speed * delta);
      fareLKR = 100.0 + (totalDistanceMeters / 1000) * 80.0;
    },

    updateCamera(camera, controls, perspective = 'chase', delta = 0.016) {
      forward.set(Math.sin(heading), 0, Math.cos(heading));
      const right = new THREE.Vector3().crossVectors(forward, up).normalize();

      if (perspective === 'cockpit') {
        // First-person Driver perspective (sitting inside behind handlebars)
        const eyePos = position.clone()
          .add(new THREE.Vector3(0, 1.15, 0))
          .addScaledVector(forward, 0.08);
        const lookTarget = eyePos.clone()
          .add(new THREE.Vector3(0, -0.04, 0))
          .addScaledVector(forward, 25.0);

        camera.position.copy(eyePos);
        controls.target.copy(lookTarget);
      } else if (perspective === 'passenger') {
        // Back-seat passenger viewpoint looking slightly past driver
        const passengerPos = position.clone()
          .add(new THREE.Vector3(0, 1.18, 0))
          .addScaledVector(forward, -0.45)
          .addScaledVector(right, 0.28);
        const lookTarget = passengerPos.clone()
          .addScaledVector(forward, 20.0)
          .addScaledVector(right, -0.8);

        camera.position.copy(passengerPos);
        controls.target.copy(lookTarget);
      } else {
        // Third-person smooth Spring Chase Cam
        const idealCamPos = position.clone()
          .add(new THREE.Vector3(0, 2.3, 0))
          .addScaledVector(forward, -5.2);
        const idealTarget = position.clone()
          .add(new THREE.Vector3(0, 1.0, 0))
          .addScaledVector(forward, 4.0);

        const lerpFactor = Math.min(1.0, delta * 7.5);
        smoothCamPos.lerp(idealCamPos, lerpFactor);
        smoothCamTarget.lerp(idealTarget, lerpFactor);

        camera.position.copy(smoothCamPos);
        controls.target.copy(smoothCamTarget);
      }
    }
  };
}
