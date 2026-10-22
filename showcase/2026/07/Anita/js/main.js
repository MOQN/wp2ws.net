
import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { Pane } from "tweakpane";

const container = document.getElementById("container-three");

if (!container) {
  throw new Error('Add <div id="container-three"></div> to your HTML.');
}

const params = {
  fps: 0,

  // web structure
  webParticles: 550,
  connectionDistance: 55,
  maxConnections: 8000,
  bridgeConnections: 5,
  lineOpacity: 0.58,
  webSpeed: 3,
  showWeb: true,

  // particle interaction
  attractionStrength: 0.08,
  repulsionStrength: 0.40,
  interactionDistance: 200,

  // vortex atmosphere
  atmosphereParticles: 7000,
  vortexStrength: 3.2,
  turbulence: 0.9,
  thermalGlow: 0.7,
  showAtmosphere: true,

  // world
  fogNear: 25,
  fogFar: 240,
  moveSpeed: 14,
};

const WORLD = { x: 400, y: 190, z: 400 };
const HALF = { x: WORLD.x / 2, y: WORLD.y / 2, z: WORLD.z / 2 };

const thermalColors = [
  "#0800ff",
  "#00cfff",
  "#00ff50",
  "#8000FF",
].map((hex) => new THREE.Color(hex));

let scene;
let camera;
let renderer;
let controls;
let pane;
let webNodes = [];
let bridgePairs = [];
let atmosphere = [];
let webLines;
let webLineGeometry;
let webLineMaterial;
let atmosphereCloud;
let atmosphereGeometry;
let atmosphereMaterial;
let frameCount = 0;
let fpsElapsed = 0;

const keys = new Set();
const clock = new THREE.Clock();

// attraction and repulsion pulse independently
let attractionTarget = params.attractionStrength;
let attractionCurrent = params.attractionStrength;
let nextAttractionChange = 0;

let repulsionTarget = params.repulsionStrength;
let repulsionCurrent = params.repulsionStrength;
let nextRepulsionChange = 0;

function thermalColor(t) {
  const value = THREE.MathUtils.clamp(t, 0, 1) * (thermalColors.length - 1);
  const index = Math.min(Math.floor(value), thermalColors.length - 2);

  return thermalColors[index].clone().lerp(
    thermalColors[index + 1],
    value - index
  );
}

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);

  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.16, "rgba(255,255,255,0.82)");
  gradient.addColorStop(0.42, "rgba(255,255,255,0.22)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

const glowTexture = makeGlowTexture();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#030408");
  scene.fog = new THREE.Fog("#030408", params.fogNear, params.fogFar);

  camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.1,
    1200
  );

  camera.position.set(0, 0, HALF.z - 25);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, renderer.domElement);

  renderer.domElement.addEventListener("click", () => {
    if (!controls.isLocked) controls.lock();
  });

  document.addEventListener("keydown", (event) => {
    keys.add(event.code);

    if (
      ["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft"].includes(event.code)
    ) {
      event.preventDefault();
    }
  });

  document.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => keys.clear());

  scene.add(new THREE.AmbientLight(0x91a7ff, 0.45));

  const cyanLight = new THREE.PointLight(0x00cfff, 160, 240);
  cyanLight.position.set(-100, 55, -90);
  scene.add(cyanLight);

  const magentaLight = new THREE.PointLight(0xff168e, 130, 220);
  magentaLight.position.set(115, -35, 70);
  scene.add(magentaLight);

  const greenLight = new THREE.PointLight(0x00ff75, 95, 180);
  greenLight.position.set(0, 95, 150);
  scene.add(greenLight);

  createWeb();
  createAtmosphere();
  createPane();
  addInstructions();

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(animate);
}

function createWeb() {
  webNodes = [];
  bridgePairs = [];

  // Cluster centers are closer together to make one connected environment.
  const clusterCenters = [
    new THREE.Vector3(-105, 30, -85),
    new THREE.Vector3(0, -25, -15),
    new THREE.Vector3(105, 40, 75),
    new THREE.Vector3(-45, -35, 115),
    new THREE.Vector3(70, 15, -125),
  ];

  // Each cluster has a dense core and a wider outer region.
  for (let i = 0; i < params.webParticles; i++) {
    const clusterIndex = i % clusterCenters.length;
    const center = clusterCenters[clusterIndex];
    const spread = Math.random() < 0.65 ? 45 : 85;

    const position = new THREE.Vector3(
      center.x + (Math.random() - 0.5) * spread * 2,
      center.y + (Math.random() - 0.5) * spread * 1.4,
      center.z + (Math.random() - 0.5) * spread * 2
    );

    webNodes.push({
      index: i,
      clusterIndex,
      position,
      origin: position.clone(),
      interactionOffset: new THREE.Vector3(),
      interactionVelocity: new THREE.Vector3(),
      force: new THREE.Vector3(),
      phase: Math.random() * Math.PI * 2,
      drift: 0.25 + Math.random() * 0.75,
    });
  }

  // Build a guaranteed chain between the clusters.
  for (let c = 0; c < clusterCenters.length; c++) {
    const next = (c + 1) % clusterCenters.length;

    const nodesA = webNodes.filter((node) => node.clusterIndex === c);
    const nodesB = webNodes.filter((node) => node.clusterIndex === next);

    // Connect the outer edges of each cluster to create long strands.
    for (let k = 0; k < params.bridgeConnections; k++) {
      const angle = (k / params.bridgeConnections) * Math.PI * 2;

      const targetA = clusterCenters[c].clone().add(
        new THREE.Vector3(
          Math.cos(angle) * 45,
          Math.sin(angle * 1.7) * 25,
          Math.sin(angle) * 45
        )
      );

      const targetB = clusterCenters[next].clone().add(
        new THREE.Vector3(
          Math.cos(angle + Math.PI) * 45,
          Math.sin(angle * 1.7 + Math.PI) * 25,
          Math.sin(angle + Math.PI) * 45
        )
      );

      const a = nodesA.reduce((best, node) =>
        node.position.distanceToSquared(targetA) <
        best.position.distanceToSquared(targetA)
          ? node
          : best
      );

      const b = nodesB.reduce((best, node) =>
        node.position.distanceToSquared(targetB) <
        best.position.distanceToSquared(targetB)
          ? node
          : best
      );

      bridgePairs.push([a.index, b.index]);
    }
  }

  // Prepare the line buffers.
  const maxSegments = params.maxConnections;

  webLineGeometry = new THREE.BufferGeometry();

  webLineGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(maxSegments * 6), 3)
      .setUsage(THREE.DynamicDrawUsage)
  );

  webLineGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(maxSegments * 6), 3)
      .setUsage(THREE.DynamicDrawUsage)
  );

  webLineGeometry.setDrawRange(0, 0);

  webLineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: params.lineOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  webLines = new THREE.LineSegments(webLineGeometry, webLineMaterial);
  scene.add(webLines);
}

function rebuildWeb() {
  scene.remove(webLines);
  webLineGeometry.dispose();
  webLineMaterial.dispose();
  createWeb();
}

function resizeLineBuffers() {
  const oldGeometry = webLineGeometry;
  webLineGeometry = new THREE.BufferGeometry();

  webLineGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array(params.maxConnections * 6),
      3
    ).setUsage(THREE.DynamicDrawUsage)
  );

  webLineGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(
      new Float32Array(params.maxConnections * 6),
      3
    ).setUsage(THREE.DynamicDrawUsage)
  );

  webLineGeometry.setDrawRange(0, 0);
  webLines.geometry = webLineGeometry;
  oldGeometry.dispose();
}

function createAtmosphere() {
  atmosphere = [];

  const count = params.atmosphereParticles;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const p = {
      position: new THREE.Vector3(
        (Math.random() - 0.5) * WORLD.x,
        (Math.random() - 0.5) * WORLD.y,
        (Math.random() - 0.5) * WORLD.z
      ),
      phase: Math.random() * Math.PI * 2,
      drift: 0.6 + Math.random() * 1.2,
      heat: Math.random(),
    };

    atmosphere.push(p);

    const j = i * 3;
    positions[j] = p.position.x;
    positions[j + 1] = p.position.y;
    positions[j + 2] = p.position.z;

    const color = thermalColor(p.heat);
    colors[j] = color.r;
    colors[j + 1] = color.g;
    colors[j + 2] = color.b;
  }

  atmosphereGeometry = new THREE.BufferGeometry();

  atmosphereGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
  );

  atmosphereGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage)
  );

  atmosphereMaterial = new THREE.PointsMaterial({
    size: 2.4,
    map: glowTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.82,
    alphaTest: 0.01,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  atmosphereCloud = new THREE.Points(atmosphereGeometry, atmosphereMaterial);
  scene.add(atmosphereCloud);
}

function rebuildAtmosphere() {
  scene.remove(atmosphereCloud);
  atmosphereGeometry.dispose();
  atmosphereMaterial.dispose();
  createAtmosphere();
}

function createPane() {
  pane = new Pane({ title: "WE(B)SCAPE / CONTROLS" });

  const webFolder = pane.addFolder({ title: "WEB STRUCTURE" });

  webFolder.addBinding(params, "webParticles", {
    min: 250,
    max: 1400,
    step: 50,
  }).on("change", rebuildWeb);

  webFolder.addBinding(params, "connectionDistance", {
    min: 20,
    max: 100,
    step: 1,
  });

  webFolder.addBinding(params, "maxConnections", {
    min: 1000,
    max: 9000,
    step: 500,
  }).on("change", resizeLineBuffers);

  webFolder.addBinding(params, "bridgeConnections", {
    min: 2,
    max: 15,
    step: 1,
  }).on("change", rebuildWeb);

  webFolder.addBinding(params, "lineOpacity", {
    min: 0.08,
    max: 1,
    step: 0.04,
  }).on("change", () => {
    webLineMaterial.opacity = params.lineOpacity;
  });

  webFolder.addBinding(params, "webSpeed", {
    min: 0,
    max: 6,
    step: 0.02,
  });

  webFolder.addBinding(params, "showWeb").on("change", () => {
    webLines.visible = params.showWeb;
  });

  const interactionFolder = pane.addFolder({
    title: "LINE INTERACTION",
    expanded: true,
  });

  interactionFolder.addBinding(params, "attractionStrength", {
    min: 0,
    max: 0.5,
    step: 0.01,
  });

  interactionFolder.addBinding(params, "repulsionStrength", {
    min: 0,
    max: 0.5,
    step: 0.01,
  });

  interactionFolder.addBinding(params, "interactionDistance", {
    min: 10,
    max: 200,
    step: 5,
  });

  const airFolder = pane.addFolder({ title: "VORTEX ATMOSPHERE" });

  airFolder.addBinding(params, "atmosphereParticles", {
    min: 1000,
    max: 8000,
    step: 500,
  }).on("change", rebuildAtmosphere);

  airFolder.addBinding(params, "vortexStrength", {
    min: 0,
    max: 6,
    step: 0.1,
  });

  airFolder.addBinding(params, "turbulence", {
    min: 0,
    max: 2,
    step: 0.05,
  });

  airFolder.addBinding(params, "thermalGlow", {
    min: 0.2,
    max: 1.8,
    step: 0.1,
  });

  airFolder.addBinding(params, "showAtmosphere").on("change", () => {
    atmosphereCloud.visible = params.showAtmosphere;
  });

  const worldFolder = pane.addFolder({ title: "WORLD / FOG" });

  worldFolder.addBinding(params, "fogNear", {
    min: 10,
    max: 150,
    step: 5,
  }).on("change", updateFog);

  worldFolder.addBinding(params, "fogFar", {
    min: 100,
    max: 650,
    step: 10,
  }).on("change", updateFog);

  worldFolder.addBinding(params, "moveSpeed", {
    min: 5,
    max: 60,
    step: 1,
  });

  pane.addBinding(params, "fps", {
    readonly: true,
    format: (value) => value.toFixed(1),
  });
}

function addInstructions() {
  const instructions = document.createElement("div");

  instructions.innerHTML =
    "<strong>WE(B)SCAPE</strong><br>" +
    "CLICK to Enter | WASD to Move | MOUSE to Look | SPACE/SHIFT to Rise/Descend | ESC to Release";

  Object.assign(instructions.style, {
  position: "fixed",
  left: "18px",
  bottom: "18px",
  zIndex: "5",
  padding: "0",
  color: "#dce7ff",
  background: "transparent",
  border: "none",
  font: "11px/1.6 monospace",
  letterSpacing: ".06em",
  textShadow: `
    0 0 5px rgba(130, 180, 255, 0.9),
    0 0 12px rgba(80, 140, 255, 0.7),
    0 0 24px rgba(0, 100, 255, 0.4)
  `,
  pointerEvents: "none",
});

  document.body.appendChild(instructions);
}

function updateFog() {
  params.fogFar = Math.max(params.fogFar, params.fogNear + 20);
  scene.fog.near = params.fogNear;
  scene.fog.far = params.fogFar;
}

function updateMovement(dt) {
  if (!controls.isLocked) return;

  const speed = params.moveSpeed * dt;

  if (keys.has("KeyW")) controls.moveForward(speed);
  if (keys.has("KeyS")) controls.moveForward(-speed);
  if (keys.has("KeyA")) controls.moveRight(-speed);
  if (keys.has("KeyD")) controls.moveRight(speed);

  if (keys.has("Space")) camera.position.y += speed;
  if (keys.has("ShiftLeft")) camera.position.y -= speed;

  camera.position.x = THREE.MathUtils.clamp(
    camera.position.x, -HALF.x + 4, HALF.x - 4
  );

  camera.position.y = THREE.MathUtils.clamp(
    camera.position.y, -HALF.y + 4, HALF.y - 4
  );

  camera.position.z = THREE.MathUtils.clamp(
    camera.position.z, -HALF.z + 4, HALF.z - 4
  );
}


function updateInteractionPulses(time, dt) {
  // Attraction shifts rapidly to create a more turbulent web.
  if (time >= nextAttractionChange) {
    attractionTarget = THREE.MathUtils.randFloat(0.005, 0.32);
    nextAttractionChange = time + THREE.MathUtils.randFloat(0.3, 1.4);
  }

  // Add layered fluctuations so attraction feels less predictable.
  const attractionNoise =
    Math.sin(time * 3.7) * 0.035 +
    Math.sin(time * 7.9 + 1.8) * 0.02 +
    (Math.random() - 0.5) * 0.025;

  attractionCurrent = THREE.MathUtils.damp(
    attractionCurrent,
    attractionTarget,
    2.8,
    dt
  );

  params.attractionStrength = THREE.MathUtils.clamp(
    attractionCurrent + attractionNoise,
    0,
    0.38
  );

  // Repulsion pulses independently at a slightly slower pace.
  if (time >= nextRepulsionChange) {
    repulsionTarget = THREE.MathUtils.randFloat(0.05, 0.5);
    nextRepulsionChange = time + THREE.MathUtils.randFloat(1.2, 3.8);
  }

  repulsionCurrent = THREE.MathUtils.damp(
    repulsionCurrent,
    repulsionTarget,
    1.0,
    dt
  );

  params.repulsionStrength = repulsionCurrent;
}


function updateWeb(time, dt) {
  webLines.visible = params.showWeb;
  if (!params.showWeb) return;

  const positions = webLineGeometry.getAttribute("position").array;
  const colors = webLineGeometry.getAttribute("color").array;
  const grid = new Map();

  const interactionCellSize = Math.max(1, params.interactionDistance);
  const interactionDistanceSq = params.interactionDistance ** 2;

  const repulsionRadius = Math.min(
    params.interactionDistance * 0.35,
    params.connectionDistance * 0.5
  );

  // Reset each node to its gentle base motion plus its interaction offset.
  for (const node of webNodes) {
    const p = node.position;

    p.set(
      node.origin.x + Math.sin(time * params.webSpeed * node.drift + node.phase) * 4 + node.interactionOffset.x,
      node.origin.y + Math.cos(time * params.webSpeed * node.drift + node.phase) * 3 + node.interactionOffset.y,
      node.origin.z + Math.sin(time * params.webSpeed * 0.85 * node.drift + node.phase * 1.3) * 4 + node.interactionOffset.z
    );

    node.force.set(0, 0, 0);

    const gx = Math.floor(p.x / interactionCellSize);
    const gy = Math.floor(p.y / interactionCellSize);
    const gz = Math.floor(p.z / interactionCellSize);
    const key = `${gx},${gy},${gz}`;

    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(node);
  }

  // Attraction pulls nodes together; repulsion pushes very close nodes apart.
  for (const node of webNodes) {
    const p = node.position;

    const gx = Math.floor(p.x / interactionCellSize);
    const gy = Math.floor(p.y / interactionCellSize);
    const gz = Math.floor(p.z / interactionCellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const nearby = grid.get(`${gx + dx},${gy + dy},${gz + dz}`);
          if (!nearby) continue;

          for (const other of nearby) {
            if (other.index <= node.index) continue;

            const delta = new THREE.Vector3().subVectors(other.position, p);
            const distanceSq = delta.lengthSq();

            if (distanceSq < 0.0001 || distanceSq > interactionDistanceSq) continue;

            const distance = Math.sqrt(distanceSq);
            const direction = delta.multiplyScalar(1 / distance);

            const attractionFalloff = 1 - distance / params.interactionDistance;

            const repulsionFalloff = distance < repulsionRadius
              ? 1 - distance / repulsionRadius
              : 0;

            const forceAmount =
              params.attractionStrength * attractionFalloff * 12 -
              params.repulsionStrength * repulsionFalloff * 16;

            direction.multiplyScalar(forceAmount);
            node.force.add(direction);
            other.force.sub(direction);
          }
        }
      }
    }
  }

  // Smooth the motion and limit displacement so clusters keep their shape.
  for (const node of webNodes) {
    node.interactionVelocity.addScaledVector(node.force, dt);
    node.interactionVelocity.multiplyScalar(0.94);
    node.interactionOffset.addScaledVector(node.interactionVelocity, dt);
    node.interactionOffset.clampLength(0, 30);

    const p = node.position;

    p.set(
      node.origin.x + Math.sin(time * params.webSpeed * node.drift + node.phase) * 4 + node.interactionOffset.x,
      node.origin.y + Math.cos(time * params.webSpeed * node.drift + node.phase) * 3 + node.interactionOffset.y,
      node.origin.z + Math.sin(time * params.webSpeed * 0.85 * node.drift + node.phase * 1.3) * 4 + node.interactionOffset.z
    );
  }

  // Build a fresh grid for the visible strands.
  const connectionCellSize = Math.max(1, params.connectionDistance);
  const connectionGrid = new Map();

  for (const node of webNodes) {
    const p = node.position;
    const gx = Math.floor(p.x / connectionCellSize);
    const gy = Math.floor(p.y / connectionCellSize);
    const gz = Math.floor(p.z / connectionCellSize);
    const key = `${gx},${gy},${gz}`;

    if (!connectionGrid.has(key)) connectionGrid.set(key, []);
    connectionGrid.get(key).push(node);
  }

  let segments = 0;

  function addSegment(a, b, strength) {
    if (segments >= params.maxConnections) return;

    const i = segments * 6;

    positions[i] = a.x;
    positions[i + 1] = a.y;
    positions[i + 2] = a.z;
    positions[i + 3] = b.x;
    positions[i + 4] = b.y;
    positions[i + 5] = b.z;

    const color = thermalColor(strength);

    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;
    colors[i + 3] = color.r;
    colors[i + 4] = color.g;
    colors[i + 5] = color.b;

    segments++;
  }

  // Draw long bridge strands first so local connections cannot crowd them out.
  for (const [aIndex, bIndex] of bridgePairs) {
    if (segments >= params.maxConnections) break;

    const a = webNodes[aIndex];
    const b = webNodes[bIndex];

    if (a && b) addSegment(a.position, b.position, 0.95);
  }

  // Draw local strands between nodes within connectionDistance.
  const maxDistanceSq = params.connectionDistance ** 2;

  for (const node of webNodes) {
    if (segments >= params.maxConnections) break;

    const p = node.position;
    const gx = Math.floor(p.x / connectionCellSize);
    const gy = Math.floor(p.y / connectionCellSize);
    const gz = Math.floor(p.z / connectionCellSize);

    for (let dx = -1; dx <= 1 && segments < params.maxConnections; dx++) {
      for (let dy = -1; dy <= 1 && segments < params.maxConnections; dy++) {
        for (let dz = -1; dz <= 1 && segments < params.maxConnections; dz++) {
          const nearby = connectionGrid.get(`${gx + dx},${gy + dy},${gz + dz}`);
          if (!nearby) continue;

          for (const other of nearby) {
            if (other.index <= node.index) continue;

            const distanceSq = p.distanceToSquared(other.position);
            if (distanceSq > maxDistanceSq) continue;

            const distance = Math.sqrt(distanceSq);
            const strength = 0.12 + 0.72 * (1 - distance / params.connectionDistance);

            addSegment(p, other.position, strength);

            if (segments >= params.maxConnections) break;
          }
        }
      }
    }
  }

  webLineGeometry.getAttribute("position").needsUpdate = true;
  webLineGeometry.getAttribute("color").needsUpdate = true;
  webLineGeometry.setDrawRange(0, segments * 2);
  webLineMaterial.opacity = params.lineOpacity;
}

function updateAtmosphere(time, dt) {
  atmosphereCloud.visible = params.showAtmosphere;
  if (!params.showAtmosphere) return;

  const positionAttribute = atmosphereGeometry.getAttribute("position");
  const colorAttribute = atmosphereGeometry.getAttribute("color");
  const positions = positionAttribute.array;
  const colors = colorAttribute.array;

  // Alternating vortex centres create a Kármán-street-like flow.
  const vortexCount = 10;

  for (let i = 0; i < atmosphere.length; i++) {
    const p = atmosphere[i];
    const pos = p.position;

    let flowX = 0.35;
    let flowY = Math.sin(time * 0.4 + p.phase) * 0.18;
    let flowZ = Math.cos(time * 0.25 + p.phase) * 0.2;

    for (let k = 0; k < vortexCount; k++) {
      const cx = -HALF.x + ((k + 0.5) / vortexCount) * WORLD.x;
      const cy = (k % 2 === 0 ? 1 : -1) *
        (28 + 12 * Math.sin(time * 0.18 + k));
      const cz = Math.sin(k * 1.7) * 120;

      const dx = pos.x - cx;
      const dy = pos.y - cy;
      const dz = pos.z - cz;

      const distanceSq = dx * dx + dy * dy + dz * dz + 90;
      const influence = Math.exp(-distanceSq / 7200);

      const strength = params.vortexStrength *
        (k % 2 === 0 ? 1 : -1) * influence;

      flowX -= strength * dy / distanceSq * 85;
      flowY += strength * dx / distanceSq * 85;
      flowZ += strength * dz / distanceSq * 22;
    }

    flowY += Math.sin(pos.x * 0.018 + time + p.phase) *
      params.turbulence * 0.7;

    flowZ += Math.cos(pos.x * 0.014 - time * 0.7 + p.phase) *
      params.turbulence * 0.6;

    pos.x += flowX * dt * p.drift * 5;
    pos.y += flowY * dt * p.drift;
    pos.z += flowZ * dt * p.drift;

    if (pos.x > HALF.x) pos.x = -HALF.x;
    if (pos.x < -HALF.x) pos.x = HALF.x;
    if (pos.y > HALF.y) pos.y = -HALF.y;
    if (pos.y < -HALF.y) pos.y = HALF.y;
    if (pos.z > HALF.z) pos.z = -HALF.z;
    if (pos.z < -HALF.z) pos.z = HALF.z;

    const j = i * 3;

    positions[j] = pos.x;
    positions[j + 1] = pos.y;
    positions[j + 2] = pos.z;

    const heat = THREE.MathUtils.clamp(
      0.08 + 0.82 * (
        0.5 + 0.5 * Math.sin(p.phase + time * 0.35 + pos.y * 0.008)
      ),
      0,
      1
    );

    const color = thermalColor(heat);

    colors[j] = color.r * params.thermalGlow;
    colors[j + 1] = color.g * params.thermalGlow;
    colors[j + 2] = color.b * params.thermalGlow;
  }

  positionAttribute.needsUpdate = true;
  colorAttribute.needsUpdate = true;

  atmosphereMaterial.size = 2.2 + params.thermalGlow * 0.6;
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);
  const time = clock.elapsedTime;

  updateMovement(dt);
  updateInteractionPulses(time, dt);
  updateWeb(time, dt);
  updateAtmosphere(time, dt);

  renderer.render(scene, camera);

  frameCount++;
  fpsElapsed += dt;

  if (fpsElapsed >= 0.5) {
    params.fps = frameCount / fpsElapsed;
    frameCount = 0;
    fpsElapsed = 0;
    pane.refresh();
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
