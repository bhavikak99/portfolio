import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createSky, createStars, updateSky, SUN_DIRECTION } from "./sky.js";
import { createCity } from "./city.js";
import { createWater, createHills } from "./water.js";
import { createBridges } from "./bridges.js";

// The light and air for golden hour vs night. The scene blends between them.
const GOLDEN_HOUR = { fog: "#c48c7c", sun: "#ffb27a", sunStrength: 2.4, skyLight: "#ffd2ad", groundLight: "#2a2330", softLight: 0.9, glow: 0.45 };
const NIGHT = { fog: "#1a1b33", sun: "#8ea3ff", sunStrength: 0.35, skyLight: "#33427a", groundLight: "#05060c", softLight: 0.35, glow: 0.9 };

// Starts the 3D scene inside the <canvas> you give it.
// Returns a remote control: setNight(0 to 1).
export function startScene(canvas) {
  // Phones and small screens get a lighter version (no mirror reflections).
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) < 700;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The renderer: draws the 3D world onto the canvas.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isSmallScreen, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmallScreen ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  // The scene: the empty 3D world we put things into.
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(GOLDEN_HOUR.fog, 140, 760);

  // The camera: far out on the water, looking back at the city.
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.5, 5000);

  // Aim the camera based on the screen's shape, so the city and both bridges fit.
  function aimCamera() {
    const shape = window.innerWidth / window.innerHeight; // bigger = wider screen
    camera.aspect = shape;
    if (shape > 1.4) {
      camera.fov = 34;
      camera.position.set(-70, 8, 300);
      camera.lookAt(-15, 45, -30);
    } else if (shape > 0.9) {
      camera.fov = 42;
      camera.position.set(-40, 8, 320);
      camera.lookAt(30, 55, -30);
    } else {
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
  const stars = createStars();
  scene.add(stars);
  const city = createCity(scene);
  createHills(scene);
  const water = createWater(scene, { reflections: !isSmallScreen });
  const bridges = createBridges(scene, { fogColor: scene.fog.color });

  // Lights
  const softLight = new THREE.HemisphereLight(GOLDEN_HOUR.skyLight, GOLDEN_HOUR.groundLight, GOLDEN_HOUR.softLight);
  scene.add(softLight);
  const sun = new THREE.DirectionalLight(GOLDEN_HOUR.sun, GOLDEN_HOUR.sunStrength);
  sun.position.copy(SUN_DIRECTION).multiplyScalar(500);
  scene.add(sun);

  // Glow: after drawing the scene, make bright things (lit windows, lights) glow softly, like a camera lens.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const glow = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), GOLDEN_HOUR.glow, 0.55, 0.82);
  composer.addPass(glow);
  composer.addPass(new OutputPass()); // fixes up the final colors for the screen

  // Keep things the right size when the window changes.
  window.addEventListener("resize", () => {
    aimCamera();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  // Night: `night` is where we are now, `targetNight` is where we're heading.
  // Each frame we move a little closer, so day turns into night smoothly.
  let night = 0;
  let targetNight = 0;
  const color = new THREE.Color();

  function applyNight(n) {
    updateSky(sky, n);
    stars.material.opacity = Math.max(0, n - 0.35) * 1.2;
    scene.fog.color.set(GOLDEN_HOUR.fog).lerp(color.set(NIGHT.fog), n);
    sun.color.set(GOLDEN_HOUR.sun).lerp(color.set(NIGHT.sun), n);
    sun.intensity = THREE.MathUtils.lerp(GOLDEN_HOUR.sunStrength, NIGHT.sunStrength, n);
    softLight.color.set(GOLDEN_HOUR.skyLight).lerp(color.set(NIGHT.skyLight), n);
    softLight.groundColor.set(GOLDEN_HOUR.groundLight).lerp(color.set(NIGHT.groundLight), n);
    softLight.intensity = THREE.MathUtils.lerp(GOLDEN_HOUR.softLight, NIGHT.softLight, n);
    glow.strength = THREE.MathUtils.lerp(GOLDEN_HOUR.glow, NIGHT.glow, n);
    city.setNight(n);
  }

  // The animation loop. `time` is in milliseconds; we turn it into seconds.
  let lastSeconds = 0;
  renderer.setAnimationLoop((time) => {
    const seconds = time / 1000;
    const frame = Math.min(seconds - lastSeconds, 0.05);
    lastSeconds = seconds;

    night += (targetNight - night) * Math.min(1, frame * 1.4); // ease toward the target
    if (Math.abs(targetNight - night) < 0.001) night = targetNight;
    applyNight(night);

    water.update(reduceMotion ? 0 : seconds, night);
    bridges.update(reduceMotion ? 0 : seconds, night);
    sky.position.copy(camera.position);
    stars.position.copy(camera.position);
    composer.render();
  });

  // The remote control the page uses
  return {
    setNight(value, { instant = false } = {}) {
      targetNight = value;
      if (instant || reduceMotion) night = value;
    },
  };
}
