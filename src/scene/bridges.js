import * as THREE from "three";

// Small helper: a point partway along a straight line, pushed sideways, at a height.
// `start` = where the bridge begins, `direction` = which way it goes,
// `along` = how far along, `sideways` = left/right of the center line, `height` = how high.
function pointOnBridge(start, direction, side, along, sideways, height) {
  const p = start.clone().addScaledVector(direction, along).addScaledVector(side, sideways);
  p.y = height;
  return p;
}

// A blinking red light, like the ones on top of real towers (warns airplanes).
function makeWarningLight(position) {
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshBasicMaterial({ color: "#000" }));
  light.position.copy(position);
  light.userData.offset = Math.random() * 6; // so they don't all blink at the same moment
  return light;
}

// ---------- The Golden Gate Bridge ----------

function createGoldenGate(scene, fogColor, warningLights) {
  const DECK = 30; // height of the road
  const TOP = 100; // height of the towers

  // The two towers. Everything else is measured from them.
  const tower1 = new THREE.Vector3(120, 0, -190);
  const tower2 = new THREE.Vector3(196, 0, -208);
  const direction = tower2.clone().sub(tower1);
  const mainSpan = direction.length(); // distance between the towers
  direction.normalize();
  const side = new THREE.Vector3(-direction.z, 0, direction.x); // points across the road
  const sideSpan = mainSpan * 0.27; // the short parts at each end
  const length = mainSpan + 2 * sideSpan;
  const start = tower1.clone().addScaledVector(direction, -sideSpan);
  const angle = -Math.atan2(direction.z, direction.x);
  const at = (along, sideways, height) => pointOnBridge(start, direction, side, along, sideways, height);

  // International Orange, mixed with a little fog because it's far away.
  const orange = new THREE.Color("#c0402c").lerp(fogColor, 0.12);
  const paint = new THREE.MeshStandardMaterial({ color: orange, roughness: 0.55, metalness: 0.1, fog: false, emissive: "#ff5a2a", emissiveIntensity: 0.12 });

  // The road
  const road = new THREE.Mesh(new THREE.BoxGeometry(length, 1.3, 5.5), paint);
  road.position.copy(at(length / 2, 0, DECK));
  road.rotation.y = angle;
  scene.add(road);

  // The two towers: two legs each, joined by crossbeams (that "ladder" look is what makes it the Golden Gate).
  [sideSpan, sideSpan + mainSpan].forEach((towerAt) => {
    [-1, 1].forEach((leftOrRight) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(2.2, TOP, 2), paint);
      leg.position.copy(at(towerAt, leftOrRight * 3.3, TOP / 2));
      leg.rotation.y = angle;
      scene.add(leg);
    });
    [DECK + 8, DECK + 19, DECK + 30, TOP - 1.4].forEach((height, i) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.5, i === 3 ? 2.2 : 1.4, 6.8), paint);
      beam.position.copy(at(towerAt, 0, height));
      beam.rotation.y = angle;
      scene.add(beam);
    });
    warningLights.push(makeWarningLight(at(towerAt, 0, TOP + 0.8)));
  });

  // The main cable's height at any point: high at the towers, sagging in between.
  const towerA = sideSpan;
  const towerB = sideSpan + mainSpan;
  function cableHeight(along) {
    const drop = TOP - DECK - 2;
    if (along <= towerA) { const u = along / sideSpan; return DECK + 2 + drop * u - 3 * u * (1 - u); }
    if (along >= towerB) { const v = (length - along) / sideSpan; return DECK + 2 + drop * v - 3 * v * (1 - v); }
    const w = (along - towerA) / mainSpan;
    return TOP - (drop - 0.5) * 4 * w * (1 - w); // 4w(1-w) is a smooth "U" shape
  }

  const deckLights = [];
  const hangers = [];
  [-1, 1].forEach((leftOrRight) => {
    // The main cable: lots of points along the curve, turned into a thin tube.
    const points = [];
    for (let i = 0; i <= 160; i++) {
      const along = (length * i) / 160;
      points.push(at(along, leftOrRight * 3.3, cableHeight(along)));
    }
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 200, 0.3, 4, false), paint));

    // Lights along the road, and the thin vertical cables that hang from the main cable.
    for (let along = 0; along <= length; along += 2.5) {
      const p = at(along, leftOrRight * 3, DECK + 1.1);
      deckLights.push(p.x, p.y, p.z);
      if (Math.abs(along - towerA) > 1.5 && Math.abs(along - towerB) > 1.5) {
        const bottom = at(along, leftOrRight * 3.3, DECK);
        const top = at(along, leftOrRight * 3.3, cableHeight(along));
        hangers.push(bottom.x, bottom.y, bottom.z, top.x, top.y, top.z);
      }
    }
  });

  const hangerLines = new THREE.BufferGeometry();
  hangerLines.setAttribute("position", new THREE.Float32BufferAttribute(hangers, 3));
  scene.add(new THREE.LineSegments(hangerLines, new THREE.LineBasicMaterial({ color: orange, fog: false, transparent: true, opacity: 0.6 })));

  // Road lights (off during golden hour; night mode turns them on later)
  const lightDots = new THREE.BufferGeometry();
  lightDots.setAttribute("position", new THREE.Float32BufferAttribute(deckLights, 3));
  const roadLights = new THREE.PointsMaterial({ color: "#ffc070", size: 1.1, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  scene.add(new THREE.Points(lightDots, roadLights));

  return { roadLights };
}

// ---------- The Bay Bridge (with moving traffic) ----------

function createBayBridge(scene) {
  const start = new THREE.Vector3(52, 0, 14);
  const end = new THREE.Vector3(340, 0, 110);
  const direction = end.clone().sub(start);
  const length = direction.length();
  direction.normalize();
  const side = new THREE.Vector3(-direction.z, 0, direction.x);
  const angle = -Math.atan2(direction.z, direction.x);
  const at = (along, sideways, height) => pointOnBridge(start, direction, side, along, sideways, height);
  const DECK = 19;
  const TOP = 58;

  const steel = new THREE.MeshStandardMaterial({ color: "#aab0b9", roughness: 0.5, metalness: 0.5 });

  const road = new THREE.Mesh(new THREE.BoxGeometry(length, 1.6, 7), steel);
  road.position.copy(at(length / 2, 0, DECK));
  road.rotation.y = angle;
  scene.add(road);

  // Four towers, spread along the bridge (as fractions of its length)
  const towers = [0.16, 0.39, 0.62, 0.85];
  towers.forEach((t) => {
    [-1, 1].forEach((leftOrRight) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.6, TOP, 1.6), steel);
      leg.position.copy(at(length * t, leftOrRight * 3.4, TOP / 2));
      scene.add(leg);
    });
    [DECK + 12, DECK + 26, TOP - 2].forEach((height) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 7.6), steel);
      beam.position.copy(at(length * t, 0, height));
      beam.rotation.y = angle;
      scene.add(beam);
    });
  });

  // Cable height: sags between towers, and runs down to the road at both ends.
  const stops = [0, ...towers, 1];
  function cableHeight(t) {
    for (let k = 0; k < stops.length - 1; k++) {
      const a = stops[k];
      const b = stops[k + 1];
      if (t < a || t > b) continue;
      const u = (t - a) / (b - a);
      const isEnd = k === 0 || k === stops.length - 2;
      const fromHeight = k === 0 ? DECK + 2 : TOP;
      const toHeight = k === stops.length - 2 ? DECK + 2 : TOP;
      const sag = isEnd ? 6 : TOP - DECK - 3;
      return fromHeight + (toHeight - fromHeight) * u - sag * 4 * u * (1 - u);
    }
    return DECK;
  }

  [-1, 1].forEach((leftOrRight) => {
    const points = [];
    for (let i = 0; i <= 400; i++) points.push(at((length * i) / 400, leftOrRight * 3.4, cableHeight(i / 400)));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 400, 0.18, 4, false), steel));
  });

  // Traffic: little dots moving along the road. One lane has white headlights, the other red taillights.
  const CARS = Math.min(window.innerWidth, window.innerHeight) < 700 ? 70 : 140;
  const cars = [];
  for (let i = 0; i < CARS; i++) {
    const lane = i % 2 ? 1 : -1;
    cars.push({ along: Math.random(), lane, speed: (0.012 + Math.random() * 0.01) * lane });
  }
  const positions = new Float32Array(CARS * 3);
  const colors = new Float32Array(CARS * 3);
  const carDots = new THREE.BufferGeometry();
  carDots.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  carDots.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  scene.add(new THREE.Points(carDots, new THREE.PointsMaterial({ size: 0.9, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));

  function moveCars(seconds, brightness) {
    cars.forEach((car, i) => {
      car.along = (car.along + car.speed * seconds + 1) % 1; // wrap around at the ends
      const p = at(length * car.along, car.lane * 1.5, DECK + 1.1);
      positions.set([p.x, p.y, p.z], i * 3);
      if (car.lane > 0) colors.set([brightness, brightness * 0.92, brightness * 0.75], i * 3); // headlights
      else colors.set([brightness * 1.1, brightness * 0.12, brightness * 0.08], i * 3); // taillights
    });
    carDots.attributes.position.needsUpdate = true;
    carDots.attributes.color.needsUpdate = true;
  }

  return { moveCars };
}

// ---------- Both bridges ----------

export function createBridges(scene, { fogColor }) {
  const warningLights = [];
  const goldenGate = createGoldenGate(scene, fogColor, warningLights);
  const bayBridge = createBayBridge(scene);
  warningLights.forEach((light) => scene.add(light));

  let lastTime = 0;
  return {
    // `night` goes from 0 (golden hour) to 1 (night). It stays 0 until we add night mode.
    update(seconds, night = 0) {
      const step = Math.min(seconds - lastTime, 0.05); // time since the last frame
      lastTime = seconds;
      bayBridge.moveCars(step, 0.6 + 2.2 * night);
      goldenGate.roadLights.opacity = night;
      warningLights.forEach((light) => {
        const on = Math.sin(seconds * 2.2 + light.userData.offset) > 0.55;
        light.material.color.setRGB(on ? 1 : 0.05, on ? 0.06 : 0, on ? 0.03 : 0);
      });
    },
  };
}
