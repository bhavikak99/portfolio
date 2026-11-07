import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// How "on" the city lights are: 0 = all off, 1 = every building lit.
// Golden hour starts with a few lit. Later, night mode will turn this up.
export const cityLights = { value: 0.12 };

// One window "tile" covers 8 columns x 8 floors on a building's wall.
const TILE_WIDTH = 9.6;
const TILE_HEIGHT = 12.8;

// ---------- Window pictures, drawn with plain 2D canvas ----------

// The wall: light concrete with dark glass windows.
function makeWallTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#d4d6da";
  ctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      ctx.fillStyle = "#1e2533";
      ctx.fillRect(col * 32 + 6, row * 32 + 7, 21, 20);
    }
  }
  return toTexture(canvas);
}

// The lights: black everywhere, except some windows painted warm or office-white.
function makeLightsTexture(howManyLit) {
  const warm = ["#ffd49a", "#ffc27a", "#ffe2b8", "#ffb866", "#fff0d6"];
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    const isOfficeFloor = Math.random() < 0.14; // whole office floors light up together
    const floorBusy = Math.random();
    for (let col = 0; col < 8; col++) {
      const on = isOfficeFloor ? Math.random() < 0.85 : Math.random() < howManyLit * (0.5 + floorBusy);
      if (!on) continue;
      ctx.globalAlpha = 0.45 + Math.random() * 0.55; // some windows dimmer than others
      ctx.fillStyle = isOfficeFloor ? "#e3ecff" : warm[Math.floor(Math.random() * warm.length)];
      ctx.fillRect(col * 32 + 6, row * 32 + 7, 21, 20);
    }
  }
  return toTexture(canvas);
}

function toTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; // repeat up and across the building
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8; // keeps windows sharp at an angle
  return texture;
}

// Each building gets a random "turn on" time. A building only glows once
// cityLights.value passes its time, so lights come on one building at a time.
function addTurnOnTimes(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.cityLights = cityLights;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float turnOnAt;\nvarying float vTurnOnAt;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvTurnOnAt = turnOnAt;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float cityLights;\nvarying float vTurnOnAt;")
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= smoothstep(vTurnOnAt, vTurnOnAt + 0.05, cityLights);"
      );
  };
}

// ---------- One building ----------

const BUILDING_COLORS = ["#8b8f96", "#a39d93", "#6f7680", "#b8b2a6", "#7d858f", "#9aa3ad", "#5d6570", "#c2bcb0"].map(
  (hex) => new THREE.Color(hex)
);

function makeBuilding(x, z, width, depth, height, baseHeight = 0) {
  const geometry = new THREE.BoxGeometry(width, height, depth);

  // Stretch the window picture so windows stay the same size on tall and short buildings.
  // A box has 6 faces: right, left, top, bottom, front, back.
  const faceWidths = [depth, depth, 0, 0, width, width];
  const uv = geometry.attributes.uv;
  for (let face = 0; face < 6; face++) {
    for (let corner = 0; corner < 4; corner++) {
      const i = face * 4 + corner;
      if (faceWidths[face] === 0) uv.setXY(i, 0.003, 0.003); // roof: plain wall, no windows
      else uv.setXY(i, (uv.getX(i) * faceWidths[face]) / TILE_WIDTH, (uv.getY(i) * height) / TILE_HEIGHT);
    }
  }

  // Every corner of this building gets the same color and the same "turn on" time.
  const color = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];
  const turnOnAt = Math.random() * 0.92;
  const colors = [];
  const times = [];
  for (let i = 0; i < uv.count; i++) {
    colors.push(color.r, color.g, color.b);
    times.push(turnOnAt);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("turnOnAt", new THREE.Float32BufferAttribute(times, 1));

  geometry.translate(x, baseHeight + height / 2, z); // sit it on the ground
  return geometry;
}

// ---------- The whole city ----------

export function createCity(scene) {
  const wall = makeWallTexture();
  const lightPictures = [makeLightsTexture(0.3), makeLightsTexture(0.22), makeLightsTexture(0.38), makeLightsTexture(0.2)];
  const groups = [[], [], [], []]; // buildings split into 4 groups, each with its own light pattern

  // Downtown is around this point. Buildings get taller the closer they are to it.
  const downtown = { x: 5, z: -25 };
  const closeness = (dx, dz, spread) => Math.exp(-(dx * dx + dz * dz) / (spread * spread));

  const STEP = 10; // one city block
  for (let x = -230; x <= 230; x += STEP) {
    for (let z = -280; z <= 22; z += STEP) {
      const dx = x - downtown.x;
      const dz = z - downtown.z;
      const core = closeness(dx, dz, 48); // close to downtown
      const area = closeness(dx, dz, 120); // in the wider city

      if (Math.random() > 0.28 + 0.65 * area) continue; // fewer buildings far from downtown
      if (Math.abs(x + 34) < 10 && Math.abs(z + 8) < 10) continue; // keep space for the pyramid
      if (x > 70 && z < -120) continue; // open water under the Golden Gate
      if (x > 120 && Math.random() < 0.35) continue; // the waterfront thins out to the right

      let height = 3 + Math.random() ** 2 * 10 + 22 * area * Math.random() + 62 * core * (0.25 + 0.75 * Math.random());
      if (x > 60) height = Math.min(height, 5 + Math.random() * 9); // low waterfront, so the Golden Gate stays visible
      const width = 4.6 + Math.random() * (STEP - 6);
      const depth = 4.6 + Math.random() * (STEP - 6);
      const bx = x + (Math.random() - 0.5) * (STEP - width) * 0.8;
      const bz = z + (Math.random() - 0.5) * (STEP - depth) * 0.8;

      groups[Math.floor(Math.random() * 4)].push(makeBuilding(bx, bz, width, depth, height));

      // Some tall buildings get a smaller top section, like real skyscrapers.
      if (height > 34 && Math.random() < 0.5) {
        const top = 4 + Math.random() * 10;
        groups[Math.floor(Math.random() * 4)].push(makeBuilding(bx, bz, width * 0.65, depth * 0.65, top, height));
      }
    }
  }

  // Glue each group into ONE shape, so the computer draws 4 things instead of ~500 (much faster).
  groups.forEach((buildings, i) => {
    const material = new THREE.MeshStandardMaterial({
      map: wall,
      emissiveMap: lightPictures[i],
      emissive: "#ffffff",
      emissiveIntensity: 1.7,
      vertexColors: true,
      roughness: 0.55,
      metalness: 0.3,
    });
    addTurnOnTimes(material);
    scene.add(new THREE.Mesh(mergeGeometries(buildings), material));
  });

  // ---------- Two landmarks ----------

  // A Transamerica-style pyramid: a cone with 4 sides.
  const pyramidMaterial = new THREE.MeshStandardMaterial({ color: "#d9d3c8", roughness: 0.55 });
  const pyramid = new THREE.Mesh(new THREE.ConeGeometry(6.2, 70, 4), pyramidMaterial);
  pyramid.rotation.y = Math.PI / 4; // turn it so a corner faces us
  pyramid.position.set(-34, 35.3, -8);
  scene.add(pyramid);

  // A Salesforce-style tower: a rounded shape made by spinning an outline around (like a pottery wheel).
  const outline = [[0, 0], [7.4, 0], [7.4, 74], [7.2, 82], [6.6, 88], [5.4, 93], [3.6, 97], [1.6, 99], [0, 99.6]].map(
    ([x, y]) => new THREE.Vector2(x, y)
  );
  const towerWall = makeWallTexture();
  towerWall.repeat.set(4.8, 7.5);
  const towerLights = makeLightsTexture(0.6);
  towerLights.repeat.set(4.8, 7.5);
  const towerMaterial = new THREE.MeshStandardMaterial({
    color: "#a7b0bd",
    map: towerWall,
    emissiveMap: towerLights,
    emissive: "#ffffff",
    emissiveIntensity: 0, // dark by day, lit at night
    roughness: 0.25,
    metalness: 0.6,
  });
  const tower = new THREE.Mesh(new THREE.LatheGeometry(outline, 40), towerMaterial);
  tower.position.set(42, 0.3, -18);
  scene.add(tower);

  // ---------- The ground under the city ----------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 520),
    new THREE.MeshStandardMaterial({ color: "#23252b", roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2; // lay it flat
  ground.position.set(-160, 0.2, -220);
  scene.add(ground);

  // A second piece of land: the waterfront to the right, under the Bay Bridge
  const waterfront = new THREE.Mesh(new THREE.PlaneGeometry(180, 170), ground.material);
  waterfront.rotation.x = -Math.PI / 2;
  waterfront.position.set(180, 0.2, -40);
  scene.add(waterfront);

  // ---------- Night mode ----------
  // night = 0 is golden hour, night = 1 is full night.
  return {
    setNight(night) {
      cityLights.value = THREE.MathUtils.lerp(0.12, 1, night); // more and more buildings switch on
      towerMaterial.emissiveIntensity = 1.8 * THREE.MathUtils.smoothstep(night, 0.3, 0.8);
      pyramidMaterial.emissive.set("#ffe9c8");
      pyramidMaterial.emissiveIntensity = 0.28 * THREE.MathUtils.smoothstep(night, 0.2, 0.7); // soft floodlights
    },
  };
}
