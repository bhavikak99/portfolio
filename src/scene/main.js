import * as THREE from "three";
import { createSky, SUN_DIRECTION } from "./sky.js";
import { createCity } from "./city.js";

// Starts the 3D scene inside the <canvas> you give it.
export function startScene(canvas) {
  // The renderer: draws the 3D world onto the canvas.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  // The scene: the empty 3D world we put things into.
  const scene = new THREE.Scene();

  // The camera: now far out on the water, looking back at the city.
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.5, 5000);
  camera.position.set(-70, 8, 300);
  camera.lookAt(-50, 45, -30);

  // The sky and the city
  const sky = createSky();
  scene.add(sky);
  createCity(scene);

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

  // The animation loop
  renderer.setAnimationLoop(() => {
    sky.position.copy(camera.position); // the sky ball always stays centered on the camera
    renderer.render(scene, camera);
  });
}