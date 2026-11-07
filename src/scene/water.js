import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

// The bay: a mirror that reflects the city, with a moving ripple layer on top.
// `reflections` can be turned off on phones, because the mirror is expensive to draw.
export function createWater(scene, { reflections }) {
  // 1. The mirror. It draws the whole scene upside down, like a reflection in a lake.
  if (reflections) {
    const mirror = new Reflector(new THREE.PlaneGeometry(4000, 4000), {
      textureWidth: Math.round(window.innerWidth * 0.75),
      textureHeight: Math.round(window.innerHeight * 0.75),
      color: new THREE.Color(0.5, 0.52, 0.58), // slightly blue-grey, so it isn't a perfect mirror
      clipBias: 0.003,
    });
    mirror.rotation.x = -Math.PI / 2; // lay it flat
    scene.add(mirror);
  }

  // 2. The ripples: a see-through layer of water color that moves over time.
  //    Where it's thin you see the reflection; where it's thick you see water.
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog, // lets the water fade into the fog too
    {
      waterColor: { value: new THREE.Color("#2e3352") },
      time: { value: 0 },
      thickness: { value: reflections ? 0.62 : 1 }, // no mirror = solid water
    },
  ]);

  const ripples = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.ShaderMaterial({
      uniforms,
      transparent: reflections,
      depthWrite: false,
      fog: true,
      vertexShader: /* glsl */ `
        #include <fog_pars_vertex>
        varying vec3 vWorld;
        void main() {
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 waterColor;
        uniform float time;
        uniform float thickness;
        varying vec3 vWorld;
        #include <common>
        #include <fog_pars_fragment>

        void main() {
          vec2 p = vWorld.xz;
          // Two sets of waves moving at different speeds and directions
          float wave = sin(p.x * 0.21 + time * 0.5 + sin(p.y * 0.6 + time * 0.3) * 1.6) * sin(p.y * 1.35 - time * 0.9);
          wave += 0.6 * sin(p.x * 0.9 - time * 1.2 + p.y * 0.35) * sin(p.y * 2.3 + time * 0.7);

          gl_FragColor = vec4(waterColor * (1.0 + 0.25 * wave), clamp(thickness + 0.26 * wave, 0.0, 1.0));
          #include <fog_fragment>
          #include <colorspace_fragment>
        }
      `,
    })
  );
  ripples.rotation.x = -Math.PI / 2;
  ripples.position.y = 0.08; // just above the mirror
  scene.add(ripples);

  // Called every frame so the waves keep moving. The water also darkens at night.
  const dayWater = new THREE.Color("#2e3352");
  const nightWater = new THREE.Color("#060a17");
  return {
    update(seconds, night = 0) {
      uniforms.time.value = seconds;
      uniforms.waterColor.value.copy(dayWater).lerp(nightWater, night);
    },
  };
}

// Low hills far behind the city, so the skyline has something behind it.
export function createHills(scene) {
  const geometry = new THREE.PlaneGeometry(1600, 320, 120, 18);
  geometry.rotateX(-Math.PI / 2);
  const points = geometry.attributes.position;

  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i);
    const z = points.getZ(i);
    const back = THREE.MathUtils.clamp((160 - z) / 320, 0, 1); // 0 at the front edge, 1 at the back
    // A few gentle waves added together make a hilly outline, plus one taller peak on the left.
    const ridge =
      34 + 22 * Math.sin(x * 0.007 + 1.3) + 12 * Math.sin(x * 0.019 + 0.4) + 6 * Math.sin(x * 0.051) +
      46 * Math.exp(-(((x + 190) / 70) ** 2));
    points.setY(i, Math.max(0, ridge) * back ** 0.7);
  }
  geometry.computeVertexNormals();

  const hills = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: "#1b1d25", roughness: 1, flatShading: true }));
  hills.position.set(-60, 0, -440);
  scene.add(hills);
}
