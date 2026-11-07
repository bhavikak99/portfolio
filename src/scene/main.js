import * as THREE from "three";
import { createSky, SUN_DIRECTION } from "./sky.js";
import { createCity } from "./city.js";
import { createWater, createHills } from "./water.js";
import { createBridges } from "./bridges.js";

// Starts the 3D scene inside the <canvas> you give it.
export function startScene(canvas) {
  // Phones and small screens get a lighter version (no mirror reflections).
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) < 700;

  // The renderer: draws the 3D world onto the canvas.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isSmallScreen, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmallScreen ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  // The scene: the empty 3D world we put things into.
  const scene = new THREE.Scene();

  // Fog: things fade into this color the farther away they are.
  // (color, where fading starts, where things fully disappear)
  scene.fog = new THREE.Fog("#c48c7c", 140, 760);

  // The camera: far out on the water, looking back at the city.
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.5, 5000);

  // Aim the camera based on the screen's shape, so the city and both bridges fit.
  // (Wide laptop screens, square-ish tablet screens, and tall phone screens each need a different view.)
  function aimCamera() {
    const shape = window.innerWidth / window.innerHeight; // bigger = wider screen
    camera.aspect = shape;
    if (shape > 1.4) {
      // Laptop: city on the right half, leaving the left side for your text
      camera.fov = 34;
      camera.position.set(-70, 8, 300);
      camera.lookAt(-15, 45, -30);
    } else if (shape > 0.9) {
      // Tablet / small window
      camera.fov = 42;
      camera.position.set(-40, 8, 320);
      camera.lookAt(30, 55, -30);
    } else {
      // Phone: center on downtown and the bridges
      camera.fov = 56;
      camera.position.set(0, 8, 360);
      camera.lookAt(70, 95, -30);
    }
    camera.updateProjectionMatrix();
  }
  aimCamera();

  // Everything in the world
  const sky = createSky();
  scene.add(sky);
  createCity(scene);
  createHills(scene);
  const water = createWater(scene, { reflections: !isSmallScreen });
  const bridges = createBridges(scene, { fogColor: scene.fog.color });

  // Lights. The sun sits behind the city, so buildings show up as warm silhouettes.
  scene.add(new THREE.HemisphereLight("#ffd2ad", "#2a2330", 0.9));
  const sun = new THREE.DirectionalLight("#ffb27a", 2.4);
  sun.position.copy(SUN_DIRECTION).multiplyScalar(500);
  scene.add(sun);

  // Keep things the right size when the window changes.
  window.addEventListener("resize", () => {
    aimCamera();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  // The animation loop. `time` is in milliseconds; we turn it into seconds.
  renderer.setAnimationLoop((time) => {
    const seconds = time / 1000;
    water.update(seconds);
    bridges.update(seconds);
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
  });
}
