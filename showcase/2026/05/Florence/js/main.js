import * as THREE from 'three';

export const params = {
  particleCount: 5000,
  density: 1.15,
  shape: 'mobius',
  deformation: 0.35,
  size: 1,
  flowSpeed: 1,
  disturbanceStrength: 0.65,
};

const MAX_PARTICLES = 6000;
const TAU = Math.PI * 2;
const RADIUS = 3.1;
const WIDTH = 1.15;
export const particles = [];
const positions = new Float32Array(MAX_PARTICLES * 3);
const colors = new Float32Array(MAX_PARTICLES * 3);
export const geometry = new THREE.BufferGeometry();
const positionAttribute = new THREE.BufferAttribute(positions, 3);
positionAttribute.setUsage(THREE.DynamicDrawUsage);
geometry.setAttribute('position', positionAttribute);
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
export let drawCount = params.particleCount;

const disturbance = { x: 0, y: 0, z: 0, strength: 0 };
const motion = { flowSpeed: params.flowSpeed, disturbanceStrength: params.disturbanceStrength };
const shapeSettings = {
  mobius: { twist: 1, eight: 0, wave: 0 },
  ring: { twist: 0, eight: 0, wave: 0 },
  wave: { twist: 1, eight: 0, wave: 1 },
  eight: { twist: 1, eight: 1, wave: 0 },
};
const form = { density: params.density, deformation: params.deformation, size: params.size,
  twist: 1, eight: 0, wave: 0 };

function surfacePoint(u, v, time, point) {
  const across = v / form.density;
  const radialOffset = across * ((1 - form.twist) + form.twist * Math.cos(u / 2));
  const ripple = form.deformation * 0.24 * Math.sin(3 * u - time * 0.3);
  const ring = RADIUS + radialOffset + ripple;
  point.x = ring * Math.cos(u);
  point.y = across * Math.sin(u / 2) * form.twist;
  point.y += form.wave * 0.7 * Math.sin(3 * u - time * 0.18);
  point.y += form.deformation * 0.5 * Math.sin(2 * u + time * 0.25);
  point.z = ring * Math.sin(u) * (1 - form.eight + form.eight * 1.4 * Math.cos(u));
}

const palette = ['#146aaa', '#168db6', '#26c6cc', '#74dfe8', '#d9f0f3'];

export class Particle {
  constructor(index) {
    this.index = index;
    this.position = new THREE.Vector3();
    this.angle = Math.random() * TAU * 2;
    this.speed = 0.075 + Math.random() * 0.045;
    this.phase = Math.random() * TAU;
    this.offset = (Math.random() + Math.random() - 1) * WIDTH;
    this.drift = 0.025 + Math.random() * 0.07;
    this.depthOffset = (Math.random() - 0.5) * 0.07;
    const color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
    color.multiplyScalar(0.65 + Math.random() * 0.5);
    color.toArray(colors, index * 3);
  }

  update(delta, time) {
    this.angle = (this.angle + delta * this.speed * motion.flowSpeed) % (TAU * 2);

    const gathering = 0.13 + 0.08 * Math.sin(time * 0.19);
    const u = this.angle + gathering * Math.sin(3 * this.angle - time * 0.10);
    const breathing = 0.88 + 0.12 * Math.sin(2 * u - time * 0.23);
    const v = this.offset * breathing + this.drift * Math.sin(time * 0.36 + this.phase);

    surfacePoint(u, v, time, this.position);
    let x = this.position.x;
    let y = this.position.y;
    let z = this.position.z;

    x += this.drift * Math.sin(time * 0.27 + 2 * u + this.phase);
    y += this.depthOffset + this.drift * Math.sin(time * 0.31 + u + this.phase);
    z += this.drift * Math.cos(time * 0.29 + 2 * u + this.phase);
    const dx = x - disturbance.x;
    const dy = y - disturbance.y;
    const dz = z - disturbance.z;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    const swirl = disturbance.strength * Math.exp(-distanceSquared / 0.55);
    x += dx * (Math.cos(swirl) - 1) - dy * Math.sin(swirl);
    y += dx * Math.sin(swirl) + dy * (Math.cos(swirl) - 1);

    this.position.set(x, y, z).multiplyScalar(form.size);
    this.position.toArray(positions, this.index * 3);
  }
}

export function setupThree(scene) {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const particle = new Particle(i);
    particle.update(0, 0);
    particles.push(particle);
  }
  const material = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    sizeAttenuation: true,
  });
  const ocean = new THREE.Points(geometry, material);
  ocean.name = 'One-Sided Ocean';
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
  geometry.setDrawRange(0, drawCount);
  scene.add(ocean);
}

export function updateThree(delta, time) {
  const easing = 1 - Math.exp(-delta * 3);
  motion.flowSpeed += (params.flowSpeed - motion.flowSpeed) * easing;
  motion.disturbanceStrength += (params.disturbanceStrength - motion.disturbanceStrength) * easing;
  for (const key of ['density', 'deformation', 'size']) {
    form[key] += (params[key] - form[key]) * easing;
  }
  const target = shapeSettings[params.shape];
  for (const key of ['twist', 'eight', 'wave']) {
    form[key] += (target[key] - form[key]) * easing;
  }
  const cycle = Math.floor(time / 18);
  const age = time % 18;
  const centerAngle = 1.2 + cycle * 2.4;
  const centerWidth = 0.25;
  surfacePoint(centerAngle, centerWidth, time, disturbance);
  const envelope = age < 10 ? Math.sin(Math.PI * age / 10) ** 2 : 0;
  disturbance.strength = motion.disturbanceStrength * envelope * 1.4;

  for (const particle of particles) particle.update(delta, time);
  drawCount = Math.round(params.particleCount);
  geometry.setDrawRange(0, drawCount);
  positionAttribute.needsUpdate = true;
}
