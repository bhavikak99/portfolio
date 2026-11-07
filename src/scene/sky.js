import * as THREE from "three";

// Where the sun is: far to the left, just above the horizon.
// (x = left/right, y = up/down, z = forward/back)
export const SUN_DIRECTION = new THREE.Vector3(-0.8, 0.06, -1).normalize();

// Sky colors for golden hour and for night. The sky blends between them.
const GOLDEN_HOUR = { top: "#1b3566", middle: "#7d6a91", horizon: "#f4a565", glow: "#ffcf94", glowAmount: 1 };
const NIGHT = { top: "#02040b", middle: "#0a1230", horizon: "#2b2648", glow: "#5a63c9", glowAmount: 0.12 };

// The sky is a giant ball around the camera. We paint the inside of it.
export function createSky() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(GOLDEN_HOUR.top) },
      middleColor: { value: new THREE.Color(GOLDEN_HOUR.middle) },
      horizonColor: { value: new THREE.Color(GOLDEN_HOUR.horizon) },
      glowColor: { value: new THREE.Color(GOLDEN_HOUR.glow) },
      glowAmount: { value: GOLDEN_HOUR.glowAmount },
      sunDirection: { value: SUN_DIRECTION },
    },
    side: THREE.BackSide, // paint the INSIDE of the ball, since we're inside it
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 middleColor;
      uniform vec3 horizonColor;
      uniform vec3 glowColor;
      uniform float glowAmount;
      uniform vec3 sunDirection;
      varying vec3 vDirection;

      void main() {
        vec3 direction = normalize(vDirection);
        float height = direction.y; // 0 at the horizon, 1 straight up

        // Blend: horizon -> middle -> top as you look higher
        vec3 color = mix(horizonColor, middleColor, smoothstep(-0.02, 0.16, height));
        color = mix(color, topColor, smoothstep(0.14, 0.62, height));

        // The sun's glow: brighter the closer you look toward the sun
        float towardSun = max(dot(direction, sunDirection), 0.0);
        color += glowColor * glowAmount * (pow(towardSun, 6.0) * 0.55 + pow(towardSun, 60.0) * 0.9 + pow(towardSun, 900.0) * 3.0);

        // Below the horizon (hidden behind the water)
        if (height < 0.0) color = horizonColor * 0.55;

        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

  return new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 24), material);
}

// Blend the sky between golden hour (night = 0) and night (night = 1).
export function updateSky(sky, night) {
  const u = sky.material.uniforms;
  u.topColor.value.set(GOLDEN_HOUR.top).lerp(new THREE.Color(NIGHT.top), night);
  u.middleColor.value.set(GOLDEN_HOUR.middle).lerp(new THREE.Color(NIGHT.middle), night);
  u.horizonColor.value.set(GOLDEN_HOUR.horizon).lerp(new THREE.Color(NIGHT.horizon), night);
  u.glowColor.value.set(GOLDEN_HOUR.glow).lerp(new THREE.Color(NIGHT.glow), night);
  u.glowAmount.value = THREE.MathUtils.lerp(GOLDEN_HOUR.glowAmount, NIGHT.glowAmount, night);
}

// Stars: hundreds of tiny dots scattered on a big dome. Invisible until night.
export function createStars() {
  const positions = [];
  for (let i = 0; i < 900; i++) {
    const around = Math.random() * Math.PI * 2; // which direction around you
    const up = (0.06 + Math.random() * 0.9) * (Math.PI / 2); // how high above the horizon
    const distance = 1800;
    positions.push(
      Math.cos(around) * Math.cos(up) * distance,
      Math.sin(up) * distance,
      Math.sin(around) * Math.cos(up) * distance
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: "#ffffff", size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })
  );
}
