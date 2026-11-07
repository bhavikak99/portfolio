import * as THREE from "three";
import { createSky, SUN_DIRECTION } from "./sky.js";

// Starts the 3D scene inside the <canvas> you give it.
export function startScene(canvas) {
  // The renderer: draws the 3D world onto the canvas.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  // The scene: the empty 3D world we put things into.
  const scene = new THREE.Scene();

  // The camera. It can now see up to 1000 steps away, so the sky ball (500 away) fits.
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 1.5, 0); // tilt up a little, so the sky fills more of the screen

  // The sky
  const sky = createSky();
  scene.add(sky);

  // The box (we'll replace it with the city soon)
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.6, 1.6),
    new THREE.MeshStandardMaterial({
      color: "#d9d4cc",
      emissive: "#e9a548",
      emissiveIntensity: 0.25,
      roughness: 0.4,
    })
  );
  box.position.set(2.5, 1.2, 0);
  scene.add(box);

  // Lights. The sun light now comes from the same place as the glow in the sky.
  scene.add(new THREE.HemisphereLight("#ffd2ad", "#2a2330", 1.2));
  const sun = new THREE.DirectionalLight("#ffb27a", 2.5);
  sun.position.copy(SUN_DIRECTION).multiplyScalar(100);
  scene.add(sun);

  // Keep things the right size when the window changes.
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  // The animation loop
  renderer.setAnimationLoop((time) => {
    box.rotation.x = time * 0.0004;
    box.rotation.y = time * 0.0006;
    sky.position.copy(camera.position); // the sky ball always stays centered on the camera
    renderer.render(scene, camera);
  });
}