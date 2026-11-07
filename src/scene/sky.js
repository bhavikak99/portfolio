import * as THREE from "three";

// Where the sun is: far to the left, just above the horizon.
// (x = left/right, y = up/down, z = forward/back)
export const SUN_DIRECTION = new THREE.Vector3(-0.8, 0.06, -1).normalize();

// Golden hour colors, from the top of the sky down to the horizon.
const GOLDEN_HOUR = {
  top: "#1b3566",     // deep blue overhead
  middle: "#7d6a91",  // soft purple in between
  horizon: "#f4a565", // warm orange near the horizon
  glow: "#ffcf94",    // the glow around the sun
};

// The sky is a giant ball around the camera. We paint the inside of it.
export function createSky() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(GOLDEN_HOUR.top) },
      middleColor: { value: new THREE.Color(GOLDEN_HOUR.middle) },
      horizonColor: { value: new THREE.Color(GOLDEN_HOUR.horizon) },
      glowColor: { value: new THREE.Color(GOLDEN_HOUR.glow) },
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
        color += glowColor * (pow(towardSun, 6.0) * 0.55 + pow(towardSun, 60.0) * 0.9 + pow(towardSun, 900.0) * 3.0);

        // Below the horizon (where the water will go later)
        if (height < 0.0) color = horizonColor * 0.55;

        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

  return new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), material);
}