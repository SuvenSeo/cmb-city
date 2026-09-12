import * as THREE from 'three';

export const TOUR_WAYPOINTS = [
  {
    id: 'beira',
    title: 'Beira Lake & Gangaramaya',
    sinhala: 'බේරේ වැව සහ ගංගාරාමය',
    tamil: 'பேரே ஏரி மற்றும் கங்காராமய',
    description: 'Tranquil sacred waters reflecting Colombo’s high-rise transformation.',
    position: [-380, 70, 1350],
    target: [-190, 10, 1175],
    duration: 6.5,
  },
  {
    id: 'lotus',
    title: 'Lotus Tower Soaring Elevation',
    sinhala: 'නෙළුම් කුලුන',
    tamil: 'தாமரை கோபுரம்',
    description: 'South Asia’s tallest self-supported tower blooming over the city.',
    position: [-240, 220, 260],
    target: [0, 200, 0],
    duration: 7.0,
  },
  {
    id: 'cinnamon_life',
    title: 'Cinnamon Life · City of Dreams',
    sinhala: 'සිනමන් ලයිෆ්',
    tamil: 'சினமன் லைஃப்',
    description: 'Cecil Balmond’s sculptural cantilevered waterfront integrated resort.',
    position: [-850, 130, 480],
    target: [-1100, 75, 240],
    duration: 6.5,
  },
  {
    id: 'altair',
    title: 'Altair Residences',
    sinhala: 'අල්ටෙයාර් නිවාස',
    tamil: 'அல்டெயர் குடியிருப்பு',
    description: 'Moshe Safdie’s daring paired towers leaning above Beira Lake.',
    position: [-280, 180, 1100],
    target: [-414, 116, 896],
    duration: 6.0,
  },
  {
    id: 'galle_face',
    title: 'Galle Face Green & Coastal Surf',
    sinhala: 'ගාලු මුවදොර පිටිය',
    tamil: 'காலி முகத்திடல்',
    description: 'Historic oceanfront promenade where Colombo gathers by the Indian Ocean.',
    position: [-1150, 60, 800],
    target: [-1410, 15, 350],
    duration: 7.0,
  },
  {
    id: 'one_galle_face',
    title: 'One Galle Face & Shangri-La',
    sinhala: 'වන් ගෝල් ෆේස්',
    tamil: 'ஒன் காலி முகத்திடல்',
    description: 'Gleaming 194m luxury glass towers fronting the ocean sunsets.',
    position: [-1120, 150, -80],
    target: [-1450, 110, 20],
    duration: 6.5,
  },
  {
    id: 'port_city',
    title: 'Colombo Port City & Marina',
    sinhala: 'කොළඹ වරාය නගරය',
    tamil: 'கொழும்பு துறைமுக நகரம்',
    description: 'Reclaimed financial metropolis and maritime marina reaching into the blue sea.',
    position: [-1550, 120, -750],
    target: [-1950, 20, -350],
    duration: 7.5,
  },
];

export function createCinematicTour(callbacks = {}) {
  let currentIndex = 0;
  let active = false;
  let paused = false;
  let waypointStartTime = 0;
  let fromPos = new THREE.Vector3();
  let fromTarget = new THREE.Vector3();
  let toPos = new THREE.Vector3();
  let toTarget = new THREE.Vector3();

  function setupWaypoint(index, currentCameraPos, currentCameraTarget, now) {
    currentIndex = index % TOUR_WAYPOINTS.length;
    const wp = TOUR_WAYPOINTS[currentIndex];
    fromPos.copy(currentCameraPos);
    fromTarget.copy(currentCameraTarget);
    toPos.set(...wp.position);
    toTarget.set(...wp.target);
    waypointStartTime = now;
    callbacks.onWaypointChange?.(wp, currentIndex, TOUR_WAYPOINTS.length);
  }

  return {
    get isActive() { return active; },
    get isPaused() { return paused; },
    get currentWaypoint() { return TOUR_WAYPOINTS[currentIndex]; },
    get waypoints() { return TOUR_WAYPOINTS; },
    
    start(currentCameraPos, currentCameraTarget, startIndex = 0) {
      active = true;
      paused = false;
      setupWaypoint(startIndex, currentCameraPos, currentCameraTarget, performance.now());
    },
    
    stop() {
      active = false;
      paused = false;
      callbacks.onTourEnd?.();
    },

    togglePause() {
      paused = !paused;
      return paused;
    },

    next(currentCameraPos, currentCameraTarget) {
      if (!active) return;
      setupWaypoint((currentIndex + 1) % TOUR_WAYPOINTS.length, currentCameraPos, currentCameraTarget, performance.now());
    },

    prev(currentCameraPos, currentCameraTarget) {
      if (!active) return;
      const prevIdx = (currentIndex - 1 + TOUR_WAYPOINTS.length) % TOUR_WAYPOINTS.length;
      setupWaypoint(prevIdx, currentCameraPos, currentCameraTarget, performance.now());
    },

    update(now, camera, controls) {
      if (!active || paused) return null;
      const wp = TOUR_WAYPOINTS[currentIndex];
      const elapsedSec = (now - waypointStartTime) / 1000;
      const duration = wp.duration;
      const rawProgress = Math.min(1, elapsedSec / duration);

      // Smooth hermite s-curve easing
      const t = rawProgress * rawProgress * (3 - 2 * rawProgress);
      camera.position.lerpVectors(fromPos, toPos, t);
      controls.target.lerpVectors(fromTarget, toTarget, t);
      controls.update();

      callbacks.onProgress?.(rawProgress, elapsedSec, duration);

      if (rawProgress >= 1) {
        // Move to next waypoint
        const nextIdx = (currentIndex + 1) % TOUR_WAYPOINTS.length;
        setupWaypoint(nextIdx, camera.position, controls.target, now);
      }

      return {
        waypoint: wp,
        progress: rawProgress,
      };
    }
  };
}
