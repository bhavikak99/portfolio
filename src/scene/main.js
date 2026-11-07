import * as THREE from "three";

// Starts the 3D scene inside the <canvas> you give it.
export function startScene(canvas) {
  // 1. The renderer: draws the 3D world onto the canvas.
  //    alpha: true makes the background see-through, so the CSS sky shows behind it.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  // 2. The scene: the empty 3D world we put things into.
  const scene = new THREE.Scene();

  // 3. The camera: where we look from.
  //    (40 = how wide it sees, then the screen shape, then the nearest and farthest it can see)
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8); // 8 steps back from the middle

  // 4. A box: a shape (geometry) + what it's made of (material).
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.6, 1.6),
    new THREE.MeshStandardMaterial({
      color: "#d9d4cc",
      emissive: "#e9a548", // a little warm glow, like a lit window
      emissiveIntensity: 0.25,
      roughness: 0.4,
    })
  );
  box.position.set(2.5, 0.3, 0); // to the right, away from your text
  scene.add(box);

  // 5. Lights: without them, the box would be black.
  scene.add(new THREE.HemisphereLight("#ffd2ad", "#2a2330", 1.2)); // soft light from sky + ground
  const sun = new THREE.DirectionalLight("#ffb27a", 2.5); // a warm "sun"
  sun.position.set(-3, 2, 4);
  scene.add(sun);

  // 6. Keep things the right size when the window changes.
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  // 7. The animation loop: runs about 60 times a second.
  renderer.setAnimationLoop((time) => {
    box.rotation.x = time * 0.0004;
    box.rotation.y = time * 0.0006;
    renderer.render(scene, camera);
  });
}