import * as THREE from "three";
import { createSky, SUN_DIRECTION } from "./sky.js";
import { createCity } from "./city.js";
import { createWater, createHills } from "./water.js";

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
  camera.position.set(-70, 8, 300);
  camera.lookAt(-50, 45, -30);

  // Everything in the world
  const sky = createSky();
  scene.add(sky);
  createCity(scene);
  createHills(scene);
  const water = createWater(scene, { reflections: !isSmallScreen });

  // Lights. The sun sits behind the city, so buildings show up as warm silhouettes.
  scene.add(new THREE.HemisphereLight("#ffd2ad", "#2a2330", 0.9));
  const sun = new THREE.DirectionalLight("#ffb27a", 2.4);
  sun.position.copy(SUN_DIRECTION).multiplyScalar(500);
  scene.add(sun);

  // Keep things the right size when the window changes.
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  // The animation loop. `time` is in milliseconds; we turn it into seconds.
  renderer.setAnimationLoop((time) => {
    const seconds = time / 1000;
    water.update(seconds);
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
  });
}
