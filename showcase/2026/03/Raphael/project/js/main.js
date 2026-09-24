let params = {
  fps: 0,
  numOfBars: 0,
  numOfCrystals: 0,
  // growth
  seed: 7,
  mode: "cycle", // cycle, steady, once
  hold: 24, // seconds
  pulse: 1,
  speed: 12,
  branch: 0.12,
  maxBars: 2200,
  pause: false,
  // form (applies to new crystals)
  varyRounds: true,
  variety: 0.8,
  unit: 18,
  rise: 20,
  steps: 10,
  decay: 0.82,
  sparse: 0.3,
  upward: 1.5,
  wander: 120,
  overshoot: 0.14,
  plate: 0.14,
  spire: 0.05,
  lip: 0.5,
  key: 0.35,
  crown: 0.35,
  contrast: 0.7,
  rhythm: 1.1,
  voids: 2,
  cube: 0.35,
  // section (live)
  wall: 0.3,
  wallHeight: 0.5,
  // oxide film (live)
  palette: "temper",
  oxide: 6,
  gradient: 9,
  variation: 8,
  accent: 0,
  drift: 14,
  touch: 1,
  oxidation: 0.012,
  iridescence: 0.12,
  // view
  autoRotate: true,
  autoFrame: true,
  background: "#2b2c31",
};

// oxide film presets, in nm: thickness at the rim, extra per ring of depth,
// variation between crystals, offset of the accent crystals
const PALETTES = {
  metal: { oxide: 6, gradient: 9, variation: 8, accent: 0 },
  gold: { oxide: 262, gradient: 5, variation: 16, accent: 62 }, // gold, magenta, blue
  sea: { oxide: 185, gradient: 4, variation: 14, accent: 60 }, // blue, teal, some orange
  aurora: { oxide: 292, gradient: 6, variation: 14, accent: -40 }, // violet, blue, green
  ember: { oxide: 138, gradient: 5, variation: 12, accent: 45 }, // amber, red, some blue
  spectrum: { oxide: 235, gradient: -4, variation: 60, accent: 0 },
};

const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;

const OXIDE_INDEX = 2.5; // refractive index of the bismuth oxide film
const WAVELENGTHS = [610, 540, 465]; // nm, used for R, G, B
const METAL_TINT = [1, 0.96, 0.94]; // bare bismuth is slightly pink
const FACE_SHADES = [0.62, 0.34, 1.0, 0.16, 0.46, 0.26]; // +x -x +y -y +z -z
const ACCENT_CHANCE = 0.12; // chance that a crystal uses the accent offset
const DRIFT_PERIOD = 80 * 60; // frames per cycle of the slow thickness drift
const MIN_SCALE = 0.3; // crystals smaller than this do not branch
const BIG_SCALE = 0.55; // crystals larger than this can have satellites
const MAX_SATELLITES = 4;
const MAX_GROWING = 8; // crystals growing at the same time
const MELT_INTERVAL = 240; // frames between two remelts
const MELT_SWEEP = 0.6; // melt delay in frames per unit of height below the top
const MELT_SAG = 70; // how far a bar drops while melting
const TEMPER_TIME = 600; // frames

const PULSE_PERIOD = 8 * 60; // frames for a heat pulse to travel bottom to top
const PULSE_WIDTH = 110;

const HEAT_RADIUS = 48; // half size of the heated square around the pointer, in pixels
const HEAT_RATE = 0.9; // nm per frame at the pointer
const HEAT_MAX = 170;
const HOT_COLOR = [1, 0.74, 0.42]; // glow color under the pointer

const PHASES = ["grow", "temper", "hold", "melt"];

// bar sections, as multipliers of wall and wallHeight
const PROFILES = [
  { wall: 1, height: 1, weight: 0.45 }, // line
  { wall: 0.7, height: 3.2, weight: 0.25 }, // fin
  { wall: 2.4, height: 0.5, weight: 0.2 }, // ribbon
  { wall: 2.4, height: 2.4, weight: 0.1 }, // solid
];

let bars = [];
let crystals = [];
let voids = []; // empty boxes: no crystal may grow into them

let boxGeometry;
let activeSeed;
let lastTime = 0;
let accumulator = 0; // frames not simulated yet
let meltTimer = MELT_INTERVAL;
let isRegenerating = false;
let isFull = false; // no room (or no corner) for another crystal
let relaxations = 0; // times maxChildren was raised to keep growing
let hasCube = false; // one cube per round at most
let worldRadius = WORLD_HALF * 0.4; // max distance of a new crystal from the y axis
let roundPalette = "gold"; // palette this round tempers to

let phase = "grow";
let phaseTime = 0;
let meltCount = 1; // bars at the start of the melt
let clock = 0;
let fade = null; // current palette transition
let captionKey = ""; // last state written to the caption
let toneKey = ""; // last tones written to the CSS variables
let isGUIOpen = true; // toggles .gui-open on body, see style.css
let viewShift = 0; // horizontal view offset while the GUI is open, in pixels
let viewKey = ""; // last window size and offset applied
let autoDistance = 0; // camera distance that fits the cluster
let frameDistance = 0; // camera distance set in the last frame
let userZoom = 1; // zoom by the viewer, multiplied with autoDistance
let pointer = { x: 0, y: 0, isOver: false, isWarm: false, isFresh: true };
let lens = { x: 0, y: 0, reading: "" }; // the frame that follows the pointer
let pulseAmount = 0; // 0 to 1, eases in during the hold phase
let pulseY = 0; // current height of the heat pulse

function setupThree() {
  setupGUI();

  // view
  camera.fov = 40;
  // near = 0.1 (template) caused z-fighting where two bars meet at this distance
  camera.near = 20;
  camera.far = 12000;
  camera.updateProjectionMatrix();
  camera.position.set(900, 520, 1300);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.enablePan = false; // the camera target is set by updateFraming()
  controls.autoRotateSpeed = 0.5;
  scene.fog = new THREE.Fog(0x000000, 1, 2);
  setBackdrop(params.background);

  // one geometry shared by every bar
  boxGeometry = getShadedBoxGeometry();

  // the seed can be given in the address: index.html#1042
  const number = parseInt(location.hash.slice(1));
  if (!isNaN(number)) params.seed = number;
  window.addEventListener("hashchange", () => {
    const number = parseInt(location.hash.slice(1));
    if (isNaN(number) || number === activeSeed) return;
    params.seed = number;
    regenerate(false);
  });

  seedCrystal();

  window.addEventListener("keydown", keyDown);
  document.getElementById("regenerate").addEventListener("click", () => regenerate(true));
  document.getElementById("pause").addEventListener("click", () => (params.pause = !params.pause));
  document.getElementById("gui").addEventListener("click", () => setGUI(!isGUIOpen));
  setGUI(window.innerWidth >= 1000 && window.innerHeight >= 620); // closed on small windows

  // the pointer heats the bars while hovering, not while dragging
  renderer.domElement.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.isOver = true;
    pointer.isWarm = event.pointerType === "touch" || event.buttons === 0;
  });
  renderer.domElement.addEventListener("pointerdown", () => (pointer.isWarm = false));
  renderer.domElement.addEventListener("pointerup", (event) => (pointer.isWarm = event.pointerType !== "touch"));
  renderer.domElement.addEventListener("pointerleave", () => (pointer.isOver = false));
}

function updateThree() {
  // simulate in fixed steps of 1/60 s, independent of the display rate.
  // random() is then called in the same order, so a seed always gives the same result
  const frameDelta = getDelta();
  if (!params.pause) accumulator += frameDelta;
  const steps = Math.min(Math.floor(accumulator), 4);
  accumulator -= Math.floor(accumulator);

  controls.autoRotate = params.autoRotate;
  controls.update();

  updateViewOffset(frameDelta);
  updateFraming(frameDelta);

  // keep the fog range relative to the camera distance
  scene.fog.near = frameDistance - 200;
  scene.fog.far = frameDistance + 1800;

  for (let i = 0; i < steps; i++) {
    simulate();
  }
  updateHeat(frameDelta);

  // update
  for (let bar of bars) {
    bar.update(steps, frameDelta);
  }

  // remove bars that are done
  for (let i = bars.length - 1; i >= 0; i--) {
    let bar = bars[i];
    if (bar.isDone) {
      scene.remove(bar.mesh);
      bar.mesh.material.dispose();
      bar.crystal.numOfBars--;
      bars.splice(i, 1);
    }
  }

  // remove crystals that have melted away
  for (let i = crystals.length - 1; i >= 0; i--) {
    let crystal = crystals[i];
    if (crystal.isMelting && crystal.numOfBars === 0) {
      if (crystal.parent && crystal.isSatellite) crystal.parent.satellites--;
      else if (crystal.parent && crystal.isCounted) crystal.parent.children--;
      if (crystal.site) {
        crystal.site.isUsed = false; // the corner is free again
        crystal.site.isTaken = false;
      }
      crystals.splice(i, 1);
    }
  }

  // update the value(s) in the GUI
  params.numOfBars = bars.length;
  params.numOfCrystals = crystals.length;
  updateCaption();
}

function simulate() {
  clock++;
  updatePalette(1);

  // heat pulses during the hold phase
  pulseAmount += ((phase === "hold" ? 1 : 0) - pulseAmount) * 0.02;
  pulseY = (((clock % PULSE_PERIOD) / PULSE_PERIOD) * 1.4 - 0.7) * WORLD_SIZE;

  // generate
  if (isRegenerating) {
    if (bars.length === 0) seedCrystal();
  }
  else {
    nucleate(1);
    remelt(1);
    updateCycle(1);
  }

  for (let crystal of crystals) {
    crystal.update(1);
  }
}

function setupGUI() {
  pane.addBinding(params, "numOfBars", { label: "bars", readonly: true, format: (v) => v.toFixed(0) });
  pane.addBinding(params, "numOfCrystals", { label: "crystals", readonly: true, format: (v) => v.toFixed(0) });

  const growth = pane.addFolder({ title: "Growth" });
  growth.addBinding(params, "seed", { step: 1 }).on("change", (ev) => {
    if (ev.last && ev.value !== activeSeed) regenerate(false);
  });
  growth.addBinding(params, "mode", {
    options: { "Cycle": "cycle", "Steady remelt": "steady", "Grow once": "once" },
  });
  growth.addBinding(params, "hold", { min: 5, max: 120, step: 1 });
  growth.addBinding(params, "pulse", { min: 0, max: 2, step: 0.05 });
  growth.addBinding(params, "speed", { min: 1, max: 40, step: 1 });
  growth.addBinding(params, "branch", { min: 0, max: 0.3, step: 0.01 });
  growth.addBinding(params, "maxBars", { min: 100, max: 5000, step: 50 });
  growth.addBinding(params, "pause");

  const section = pane.addFolder({ title: "Section" });
  section.addBinding(params, "wall", { min: 0.05, max: 0.9, step: 0.01 });
  section.addBinding(params, "wallHeight", { label: "wall height", min: 0.1, max: 4, step: 0.05 });

  const film = pane.addFolder({ title: "Oxide film (nm)" });
  film.addBinding(params, "palette", {
    options: {
      "Temper (metal to colour)": "temper",
      "Bare metal": "metal",
      "Gold magenta blue": "gold",
      "Sea": "sea",
      "Aurora": "aurora",
      "Ember": "ember",
      "Spectrum": "spectrum",
    },
  }).on("change", (ev) => {
    // "temper" depends on the phase: metal while growing, the round's palette afterwards
    let name = ev.value;
    if (name === "temper") name = phase === "grow" ? "metal" : roundPalette;
    fadePalette(name, 180);
  });
  film.addBinding(params, "oxide", { min: 0, max: 400, step: 1 });
  film.addBinding(params, "gradient", { min: -30, max: 30, step: 0.5 });
  film.addBinding(params, "variation", { min: 0, max: 150, step: 1 });
  film.addBinding(params, "accent", { min: -150, max: 150, step: 1 });
  film.addBinding(params, "drift", { min: 0, max: 40, step: 1 });
  film.addBinding(params, "touch", { min: 0, max: 3, step: 0.05 });
  film.addBinding(params, "oxidation", { min: 0.002, max: 0.05, step: 0.001 });
  film.addBinding(params, "iridescence", { min: 0, max: 1, step: 0.01 });

  const form = pane.addFolder({ title: "Form (new crystals)", expanded: false });
  form.addBinding(params, "varyRounds", { label: "vary rounds" });
  form.addBinding(params, "variety", { min: 0, max: 1, step: 0.01 });
  form.addBinding(params, "unit", { min: 8, max: 32, step: 1 });
  form.addBinding(params, "rise", { min: 0, max: 32, step: 1 });
  form.addBinding(params, "steps", { min: 3, max: 24, step: 1 });
  form.addBinding(params, "decay", { min: 0.4, max: 0.95, step: 0.01 });
  form.addBinding(params, "sparse", { min: 0, max: 1, step: 0.01 });
  form.addBinding(params, "upward", { min: 0, max: 6, step: 0.1 });
  form.addBinding(params, "wander", { min: 0, max: 1000, step: 10 });
  form.addBinding(params, "overshoot", { min: 0, max: 0.5, step: 0.01 });
  form.addBinding(params, "plate", { min: 0, max: 0.6, step: 0.01 });
  form.addBinding(params, "spire", { min: 0, max: 0.3, step: 0.01 });
  form.addBinding(params, "lip", { min: 0, max: 1, step: 0.01 });
  form.addBinding(params, "key", { min: 0, max: 1, step: 0.01 });
  form.addBinding(params, "crown", { min: 0, max: 1, step: 0.01 });
  form.addBinding(params, "contrast", { min: 0, max: 1, step: 0.01 });
  form.addBinding(params, "rhythm", { min: 0.9, max: 1.25, step: 0.01 });
  form.addBinding(params, "voids", { min: 0, max: 4, step: 1 });
  form.addBinding(params, "cube", { min: 0, max: 1, step: 0.01 });

  const view = pane.addFolder({ title: "View", expanded: false });
  view.addBinding(params, "autoRotate", { label: "auto rotate" });
  view.addBinding(params, "autoFrame", { label: "auto frame" });
  view.addBinding(params, "background").on("change", (ev) => {
    setBackdrop(ev.value);
  });

  pane.addButton({ title: "New sculpture (R)" }).on("click", () => regenerate(true));
}

function keyDown(event) {
  if (event.target.tagName === "INPUT") return; // typing in the GUI
  if (event.key === "r" || event.key === "R") {
    regenerate(true);
  }
  else if (event.key === " ") {
    params.pause = !params.pause;
    event.preventDefault();
  }
  else if (event.key === "g" || event.key === "G") {
    setGUI(!isGUIOpen);
  }
  else if (event.key === "h" || event.key === "H") {
    document.body.classList.toggle("bare"); // hide the interface
  }
}

function setGUI(isOpen) {
  isGUIOpen = isOpen;
  document.body.classList.toggle("gui-open", isOpen);
}

function isGUIVisible() {
  return isGUIOpen && !document.body.classList.contains("bare") && window.innerWidth >= 760;
}

function updateViewOffset(frameDelta) {
  // shift the view to the left while the GUI is open, with easing
  const w = window.innerWidth;
  const h = window.innerHeight;
  const target = isGUIVisible() ? 150 : 0;
  viewShift += (target - viewShift) * (1 - Math.pow(0.92, frameDelta));
  if (Math.abs(target - viewShift) < 0.05) viewShift = target;

  const key = w + "x" + h + "," + viewShift.toFixed(2);
  if (key === viewKey) return;
  viewKey = key;

  if (viewShift === 0) camera.clearViewOffset();
  else camera.setViewOffset(w, h, viewShift, 0, w, h);
}

function updateFraming(frameDelta) {
  // keep the zoom the viewer applied since the last frame
  const offset = camera.position.clone().sub(controls.target);
  if (frameDistance > 0) {
    userZoom = constrain((userZoom * offset.length()) / frameDistance, 0.35, 2.5);
  }

  // bounding box of the bars that are not melting away
  const low = new THREE.Vector3(Infinity, Infinity, Infinity);
  const high = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  const middle = new THREE.Vector3();
  let count = 0;
  for (let bar of bars) {
    if (bar.lifespan < 0.5 || bar instanceof Spire) continue; // long rods are allowed to leave the frame
    low.min(bar.pos);
    high.max(bar.pos);
    middle.add(bar.pos);
    count++;
  }

  if (params.autoFrame && low.x <= high.x) {
    // target: halfway between the box center and the average position,
    // so a single long bar does not move the cluster off center
    const center = low.clone().add(high).multiplyScalar(0.5).lerp(middle.divideScalar(count), 0.5);
    const halfHeight = Math.max(high.y - center.y, center.y - low.y, 200);
    const reachX = Math.max(high.x - center.x, center.x - low.x);
    const reachZ = Math.max(high.z - center.z, center.z - low.z);
    const halfWidth = Math.max(Math.hypot(reachX, reachZ), 200);

    // fit into the area not covered by the title, the panel and the GUI
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isOpen = isGUIVisible();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    const freeV = (tanV * Math.max(h - (h < 620 ? 110 : 190), h * 0.5)) / h;
    const freeH = (tanV * Math.max(w - (isOpen ? 360 : 60), w * 0.5)) / h;
    const wanted = Math.max((halfHeight / freeV) * 0.95, (halfWidth / freeH) * 0.8) + halfWidth * 0.4;

    // ease towards the target and the distance
    if (autoDistance === 0) autoDistance = wanted;
    const ease = Math.min(0.012 * frameDelta, 1);
    controls.target.lerp(center, ease);
    autoDistance += (wanted - autoDistance) * ease;
  }
  if (autoDistance === 0) autoDistance = offset.length();

  frameDistance = autoDistance * userZoom;
  camera.position.copy(controls.target).add(offset.setLength(frameDistance));
}

function updateHeat(frameDelta) {
  const cursor = document.getElementById("cursor");
  const dot = document.getElementById("dot");
  const isHeating = pointer.isOver && pointer.isWarm && params.touch > 0;
  cursor.classList.toggle("on", pointer.isOver);
  cursor.classList.toggle("drag", pointer.isOver && !isHeating); // smaller while dragging
  dot.classList.toggle("on", pointer.isOver);
  if (!pointer.isOver) {
    pointer.isFresh = true;
    return;
  }

  // the dot is at the pointer, the frame follows with a delay
  if (pointer.isFresh) {
    lens.x = pointer.x;
    lens.y = pointer.y;
    pointer.isFresh = false;
  }
  const follow = 1 - Math.pow(0.8, frameDelta);
  lens.x += (pointer.x - lens.x) * follow;
  lens.y += (pointer.y - lens.y) * follow;
  dot.style.transform = "translate(" + pointer.x + "px, " + pointer.y + "px)";
  cursor.style.transform = "translate(" + lens.x + "px, " + lens.y + "px)";

  // bars near the pointer (in screen space) get a thicker film. it stays until the melt
  let peak = 0;
  if (isHeating) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const spot = new THREE.Vector3();
    camera.updateMatrixWorld();
    for (let bar of bars) {
      spot.copy(bar.pos).project(camera);
      if (spot.z > 1) continue; // behind the camera
      const dx = (spot.x * 0.5 + 0.5) * w - lens.x;
      const dy = (-spot.y * 0.5 + 0.5) * h - lens.y;
      // square falloff, to match the square frame
      const reach = Math.max(Math.abs(dx), Math.abs(dy));
      const falloff = (reach * reach) / (HEAT_RADIUS * HEAT_RADIUS);
      if (falloff > 4) continue;
      const warmth = params.touch * Math.exp(-falloff) * frameDelta;
      bar.heat = Math.min(bar.heat + HEAT_RATE * warmth, HEAT_MAX);
      bar.glow = Math.min(bar.glow + 0.05 * warmth, 1);
      if (falloff < 0.5) peak = Math.max(peak, bar.heat);
    }
  }

  // show the largest heat value inside the frame
  const reading = peak >= 1 ? "+" + Math.round(peak) + " nm" : "";
  if (reading !== lens.reading) {
    lens.reading = reading;
    document.getElementById("reading").textContent = reading;
    cursor.classList.toggle("hot", peak >= 1);
    document.getElementById("arc").style.strokeDasharray = (peak / HEAT_MAX) * 100 + " 100";
  }
}

function getDelta() {
  // elapsed time in frames at 60fps
  const delta = lastTime ? (time - lastTime) / (1000 / 60) : 1;
  lastTime = time;
  return Math.min(delta, 3);
}

function getShadedBoxGeometry() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  // bars are never rotated, so each face always points the same way.
  // a fixed brightness per face replaces lighting for now (Stage 2 adds lights)
  const colors = [];
  for (let shade of FACE_SHADES) {
    for (let i = 0; i < 4; i++) {
      colors.push(shade, shade, shade); // 4 vertices per face
    }
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function getBox() {
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
  });
  const mesh = new THREE.Mesh(boxGeometry, material);
  return mesh;
}

function setBackdrop(hex) {
  // radial gradient background: lighter in the middle, darker at the corners
  const center = new THREE.Color(hex);
  const edge = center.clone().multiplyScalar(0.12);

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(256, 230, 0, 256, 256, 400);
  gradient.addColorStop(0, "#" + center.getHexString());
  gradient.addColorStop(1, "#" + edge.getHexString());
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);

  if (scene.background) scene.background.dispose();
  scene.background = new THREE.CanvasTexture(canvas);
  scene.background.colorSpace = THREE.SRGBColorSpace;
  scene.fog.color.copy(center).multiplyScalar(0.6);
}

function seedCrystal() {
  activeSeed = params.seed;
  history.replaceState(null, "", "#" + activeSeed);
  randomSeed(scramble(activeSeed));
  noiseSeed(scramble(activeSeed));

  isRegenerating = false;
  isFull = false;
  relaxations = 0;
  hasCube = false;
  meltTimer = MELT_INTERVAL;
  phase = "grow";
  phaseTime = 0;
  roundPalette = "gold";
  if (params.palette === "temper") fadePalette("metal", 1);
  if (params.varyRounds) drawCharacter();

  // empty boxes: the cluster has to grow around them
  voids = [];
  for (let i = 0; i < params.voids; i++) {
    const half = new THREE.Vector3(random(90, 210), random(90, 210), random(90, 210));
    const angle = random(TWO_PI);
    const radius = Math.max(half.x, half.z) + random(70, 200); // not on the y axis
    const center = new THREE.Vector3(Math.cos(angle) * radius, random(-150 + half.y, 420), Math.sin(angle) * radius); // above the first crystal
    voids.push(new THREE.Box3(center.clone().sub(half), center.clone().add(half)));
  }

  // the first crystal opens upward
  const root = new Crystal(new THREE.Vector3(0, -420, 0), 1, 1, 1, null);
  root.isCore = true;
  crystals.push(root);

  // a wide first crystal still needs corners inside worldRadius
  const rim = root.getGrid(root.steps + 1) * root.unit;
  worldRadius = Math.max(WORLD_HALF * 0.4, Math.hypot(rim * root.aspect, rim) * 1.05);
}

function getCube(parent, corner, away, size) {
  // hopper cube: five crystals around one center, each opening outward.
  // they share steps, rise and section, so their rims meet at the edges of a cube.
  // the face pointing back to the parent corner is skipped
  const steps = 5;
  const gauge = params.unit * Math.sqrt(size);
  const shared = { steps: steps, rise: gauge * 0.8, wallScale: 1.5, heightScale: 1.7 };
  const reach = steps * gauge;
  const center = corner.pos.clone();
  center.setComponent(away.axis, center.getComponent(away.axis) + away.sign * reach);

  const faces = [];
  for (let axis = 0; axis < 3; axis++) {
    for (let sign of [1, -1]) {
      if (axis === away.axis && sign === -away.sign) continue;
      const face = new Crystal(center, axis, sign, size, parent, shared);
      // rims end slightly before the cube edge, so two faces do not overlap
      const climb = Math.abs(face.getHeight(steps * 4 - 1) - face.origin.getComponent(axis));
      face.origin.setComponent(axis, center.getComponent(axis) + sign * (reach - gauge * 0.35 - climb));
      face.isCore = true; // never remelted during hold
      face.isCounted = axis === away.axis; // only one face counts as a child of the parent
      faces.push(face);
    }
  }

  const half = new THREE.Vector3(reach, reach, reach);
  return { faces: faces, box: new THREE.Box3(center.clone().sub(half), center.clone().add(half)) };
}

function isInVoid(box) {
  for (let v of voids) {
    if (v.intersectsBox(box)) return true;
  }
  return false;
}

function scramble(n) {
  // p5 gives similar random numbers for similar seeds (7 and 8 would look alike),
  // so the bits of the seed are mixed first
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}

function drawCharacter() {
  // each round gets its own Form parameters from the seed (shown in the GUI)
  params.unit = Math.round(random(14, 22));
  params.rise = Math.round(random(12, 30));
  params.steps = Math.round(random(7, 13));
  params.sparse = Math.round(random(0.1, 0.6) * 100) / 100;
  params.upward = Math.round(random(1.2, 3.5) * 10) / 10; // always grows upward
  params.wander = Math.round(random(6, 22)) * 10;
  params.overshoot = Math.round(random(0.05, 0.3) * 100) / 100;
  params.plate = Math.round(random(0.04, 0.3) * 100) / 100;
  params.spire = Math.round(random(0.02, 0.14) * 100) / 100;
  params.variety = Math.round(random(0.5, 1) * 100) / 100;

  // palette the round tempers to
  roundPalette = random() < 0.4 ? "gold" : random(["sea", "aurora", "ember"]);

  // details of the crystals
  params.lip = Math.round(random(0.2, 0.8) * 100) / 100;
  params.key = Math.round(random(0.1, 0.5) * 100) / 100;
  params.crown = Math.round(random(0.1, 0.6) * 100) / 100;

  // overall form
  params.contrast = Math.round(random(0.4, 1) * 100) / 100;
  params.rhythm = Math.round(random(0.96, 1.18) * 100) / 100;
  params.voids = Math.floor(random(1, 4));
}

function pickProfile() {
  let pick = random();
  for (let profile of PROFILES) {
    pick -= profile.weight;
    if (pick <= 0) return profile;
  }
  return PROFILES[0];
}

function regenerate(newSeed, sweep = 0) {
  if (isRegenerating) return;
  if (newSeed) params.seed = Math.floor(Math.random() * 10000);

  isRegenerating = true;
  phase = "melt";
  phaseTime = 0;
  meltCount = Math.max(bars.length, 1);

  // melt from the top down: the higher a bar, the shorter its delay
  let top = -WORLD_HALF;
  for (let bar of bars) {
    top = Math.max(top, bar.pos.y);
  }
  for (let crystal of crystals) {
    crystal.isMelting = true;
    crystal.isGrowing = false;
  }
  for (let bar of bars) {
    bar.melt((top - bar.pos.y) * sweep, sweep > 0 ? 0.03 : 0.2);
  }
}

function updateCycle(delta) {
  phaseTime += delta;

  if (phase === "grow") {
    const isStill = !crystals.some((c) => c.isGrowing);
    if (isFull && isStill) {
      setPhase(params.palette === "temper" ? "temper" : "hold");
    }
  }
  else if (phase === "temper") {
    if (phaseTime > TEMPER_TIME) setPhase("hold");
  }
  else if (phase === "hold") {
    // only "cycle" ends the hold
    if (params.mode === "cycle" && phaseTime > params.hold * 60) {
      regenerate(true, MELT_SWEEP);
    }
  }
}

function setPhase(name) {
  phase = name;
  phaseTime = 0;
  if (name === "temper") fadePalette(roundPalette, TEMPER_TIME);
}

function fadePalette(name, duration) {
  const to = PALETTES[name];
  const from = {};
  for (let key in to) {
    from[key] = params[key];
  }
  fade = { from: from, to: to, time: 0, duration: duration };
}

function updatePalette(delta) {
  if (fade === null) return;
  fade.time += delta;

  // ease the film parameters from one palette to the other
  const t = Math.min(fade.time / fade.duration, 1);
  const ease = t * t * (3 - 2 * t);
  for (let key in fade.to) {
    params[key] = lerp(fade.from[key], fade.to[key], ease);
  }
  if (t >= 1) fade = null;
}

function updateCaption() {
  let progress = 1;
  if (phase === "grow") progress = bars.length / params.maxBars;
  else if (phase === "temper") progress = phaseTime / TEMPER_TIME;
  else if (phase === "hold" && params.mode === "cycle") progress = phaseTime / (params.hold * 60);
  else if (phase === "melt") progress = 1 - bars.length / meltCount;

  // the progress line is clipped, so its gradient is not squeezed
  const rest = (1 - Math.min(progress, 1)) * 100;
  document.getElementById("progress").style.clipPath = "inset(0 " + rest + "% 0 0)";
  updateTones();

  // update the rest only when the state changes
  const key = phase + activeSeed + params.pause + isGUIOpen;
  if (key === captionKey) return;
  captionKey = key;

  const names = document.getElementById("phases").children;
  for (let i = 0; i < PHASES.length; i++) {
    names[i].className = PHASES[i] === phase ? "active" : "";
  }
  document.getElementById("number").textContent = "No. " + activeSeed;
  document.getElementById("pause-label").textContent = params.pause ? "Resume" : "Pause";

  // button states
  document.body.classList.toggle("paused", params.pause);
  document.body.classList.toggle("melting", phase === "melt");
  document.getElementById("gui").classList.toggle("active", isGUIOpen);
}

function updateTones() {
  // accent colors of the interface: film color at the rim, halfway down and at the bottom of a funnel
  const rim = params.oxide * 0.97;
  const tones = [rim, rim + params.gradient * 4, rim + params.gradient * 8].map(getTone);
  const key = tones.join();
  if (key === toneKey) return;
  toneKey = key;

  const style = document.documentElement.style;
  style.setProperty("--tone-a", tones[0]);
  style.setProperty("--tone-b", tones[1]);
  style.setProperty("--tone-c", tones[2]);
}

function getTone(thickness) {
  const color = new THREE.Color();
  setOxideColor(color, Math.max(thickness, 0));

  // keep the tone bright enough to read
  const peak = Math.max(color.r, color.g, color.b);
  if (peak < 0.35) color.multiplyScalar(0.35 / peak);
  return "#" + color.getHexString();
}

function nucleate(delta) {
  let growing = 0;
  let committed = 0;
  for (let crystal of crystals) {
    if (crystal.isGrowing) {
      growing++;
      committed += crystal.getRemaining();
    }
  }
  if (growing >= MAX_GROWING) return;
  if (random() > params.branch * delta) return;

  // sometimes add a satellite (a very small crystal on a big one) instead of a normal child
  if (random() < params.contrast * 0.5 && addSatellite(committed)) return;

  // pick the highest free rim corner, with some noise, so the cluster grows upward
  let parent, corner, best;
  for (let p of crystals) {
    if (!p.canBranch()) continue;
    for (let c of p.corners) {
      if (c.isUsed || !c.isRim) continue;
      const score = c.pos.y + random(-1, 1) * params.wander;
      if (best === undefined || score > best) {
        parent = p;
        corner = c;
        best = score;
      }
    }
  }
  if (corner === undefined) {
    // no free corner. if there is still room, allow one more child per crystal and retry
    if (growing > 0) return; // wait: growing crystals will add corners
    const hasRoom = bars.length + committed < params.maxBars * 0.8;
    if (hasRoom && relaxations < 3) {
      for (let crystal of crystals) {
        crystal.maxChildren++;
        for (let c of crystal.corners) {
          if (!c.isTaken) c.isUsed = false; // rejected corners can be tried again
        }
      }
      relaxations++;
      if (relaxations === 2) voids = []; // drop the empty boxes rather than stop growing
    }
    else {
      isFull = true;
    }
    return;
  }
  corner.isUsed = true; // do not try this corner again

  // sometimes the child is as large as its parent (a giant), and a giant can be a cube
  const isGiant = random() < params.contrast * 0.2;
  const scale = isGiant ? Math.min(parent.size * random(0.95, 1.2), 1.3) : parent.size * params.decay * random(0.75, 1.1);
  if (isGiant && !hasCube && random() < params.cube) {
    if (!isFreeSite(parent, corner, scale)) return;
    const cube = getCube(parent, corner, pickNormal(corner), scale * 0.8);
    if (isInVoid(cube.box)) return;
    const needed = cube.faces.reduce((sum, face) => sum + face.getRemaining(), 0);
    isFull = bars.length + committed + needed > params.maxBars;
    if (isFull) {
      corner.isUsed = false;
      return;
    }
    for (let face of cube.faces) {
      if (face.isCounted) face.site = corner;
      crystals.push(face);
    }
    corner.isTaken = true;
    hasCube = true;
    parent.children++;
    return;
  }

  const child = getChild(parent, corner, scale);
  if (child === null) return;

  isFull = bars.length + committed + child.getRemaining() > params.maxBars;
  if (isFull) {
    corner.isUsed = false; // keep the corner for later
    return;
  }

  child.site = corner;
  corner.isTaken = true;
  parent.children++;
  crystals.push(child);
}

function addSatellite(committed) {
  // not on rim corners: those are needed for normal children
  const isFree = (k) => !k.isUsed && !k.isRim;
  const parents = crystals.filter((c) => !c.isMelting && c.size >= BIG_SCALE && c.satellites < MAX_SATELLITES && c.corners.some(isFree));
  if (parents.length === 0) return false;
  const parent = random(parents);
  const corner = random(parent.corners.filter(isFree));
  corner.isUsed = true;

  const child = getChild(parent, corner, random(0.16, 0.28));
  if (child === null) return true; // this attempt is used up
  if (bars.length + committed + child.getRemaining() > params.maxBars) {
    corner.isUsed = false;
    return false;
  }

  child.site = corner;
  corner.isTaken = true;
  child.isSatellite = true;
  parent.satellites++;
  crystals.push(child);
  return true;
}

function isFreeSite(parent, corner, scale) {
  // inside the world and not too close to another crystal?
  if (Math.abs(corner.pos.y) > WORLD_HALF * 0.5) return false;
  if (Math.hypot(corner.pos.x, corner.pos.z) > worldRadius) return false;
  const clearance = Math.min(params.unit * Math.sqrt(scale) * 5, parent.gauge * 5);
  for (let crystal of crystals) {
    if (crystal.origin.distanceTo(corner.pos) < clearance) return false;
  }
  return true;
}

function pickNormal(corner) {
  // weighted choice of the direction a new crystal opens to: up is preferred
  const weights = corner.normals.map((n) => {
    if (n.axis !== 1) return 1;
    return n.sign > 0 ? 1 + params.upward : 0.15;
  });
  let pick = random(weights.reduce((a, b) => a + b));
  for (let i = 0; i < weights.length; i++) {
    pick -= weights[i];
    if (pick <= 0) return corner.normals[i];
  }
  return corner.normals[0];
}

function getChild(parent, corner, scale) {
  if (!isFreeSite(parent, corner, scale)) return null;

  // try the preferred direction first, then the others, until one avoids the empty boxes
  const first = pickNormal(corner);
  const order = [first].concat(corner.normals.filter((n) => n !== first));
  for (let normal of order) {
    const child = new Crystal(corner.pos, normal.axis, normal.sign, scale, parent);
    if (!isInVoid(child.getBox())) return child;
  }
  return null;
}

function remelt(delta) {
  meltTimer -= delta;
  if (meltTimer > 0) return;

  const isOver = bars.length > params.maxBars;
  const isStill = !crystals.some((c) => c.isGrowing);
  // crystals are replaced in "steady" mode and during the hold of "cycle"
  const isTurning = params.mode === "steady" || (params.mode === "cycle" && phase === "hold");
  if (!isOver && !(isTurning && isStill && isFull)) return;

  // melt the oldest crystal that has no children
  for (let crystal of crystals) {
    if (!crystal.isCore && !crystal.isMelting && crystal.children === 0 && crystal.satellites === 0) {
      crystal.melt(0.02);
      isFull = false;
      meltTimer = isOver ? 30 : MELT_INTERVAL;
      return;
    }
  }
}

function setOxideColor(color, thickness) {
  // thin-film interference: reflections from the film surface and from the metal
  // interfere, depending on the optical path difference
  const path = 2 * OXIDE_INDEX * thickness;
  const rgb = WAVELENGTHS.map((wavelength, i) => {
    const wave = 0.5 + 0.5 * Math.cos((Math.PI * 2 * path) / wavelength);
    return (0.2 + 0.68 * wave) * METAL_TINT[i];
  });
  color.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
}

///// CLASS /////

class Crystal {
  constructor(origin, nAxis, nSign, size, parent, shared = null) {
    this.parent = parent;
    this.site = null; // the corner of the parent it sits on
    this.isCore = false; // first crystal or cube face: not replaced during hold
    this.isSatellite = false;
    this.isCounted = true; // counts towards parent.children
    this.satellites = 0;
    this.generation = parent ? parent.generation + 1 : 0;
    this.children = 0;
    this.maxChildren = parent ? 2 : 3;

    // the funnel opens along the normal, the spiral runs on the other two axes
    this.origin = origin.clone();
    this.origin.x += random(-0.5, 0.5); // avoids coplanar faces between crystals
    this.origin.y += random(-0.5, 0.5);
    this.origin.z += random(-0.5, 0.5);
    this.nAxis = nAxis;
    this.nSign = nSign;
    this.aAxis = (nAxis + 1) % 3;
    this.bAxis = (nAxis + 2) % 3;
    if (random() < 0.5) {
      // mirrored spiral
      this.aAxis = (nAxis + 2) % 3;
      this.bAxis = (nAxis + 1) % 3;
    }

    // size
    this.size = size; // relative to the first crystal
    this.gauge = params.unit * Math.sqrt(size); // base size for the bar sections

    // sparse crystals: same reach, wider spacing, fewer turns
    this.spread = parent && random() < params.sparse ? random(2.2, 3) : 1;
    this.unit = this.gauge * this.spread; // spacing of the spiral
    this.rise = params.rise * Math.sqrt(size) * this.spread; // climb per turn
    this.steps = Math.max(2, Math.round((params.steps * Math.sqrt(size)) / this.spread));

    // per-crystal variation: aspect ratio, depth, section
    const variety = params.variety;
    const profile = pickProfile();
    this.aspect = Math.pow(2, random(-0.8, 0.8) * variety); // stretch along the a axis
    this.rise *= Math.pow(2, random(-1.2, 0.8) * variety);
    this.wallScale = lerp(1, profile.wall, variety);
    this.heightScale = lerp(1, profile.height, variety);

    // cube faces use shared values
    if (shared !== null) {
      this.spread = 1;
      this.unit = this.gauge;
      this.steps = shared.steps;
      this.rise = shared.rise;
      this.aspect = 1;
      this.wallScale = shared.wallScale;
      this.heightScale = shared.heightScale;
    }

    // spacing of the turns grows by the factor params.rhythm per turn (shrinks below 1).
    // meter rescales it so the reach stays the same as with even spacing
    this.rhythm = params.rhythm;
    this.meter = this.rhythm === 1 ? 1 : (this.steps * (this.rhythm - 1)) / (Math.pow(this.rhythm, this.steps) - 1);

    // spiral walker, in grid coordinates (see getGrid)
    this.ga = 0;
    this.gb = 0;
    this.dir = Math.floor(random(4)); // 0: +a, 1: +b, 2: -a, 3: -b
    this.len = 1; // in grid steps
    this.segment = 0;
    this.current = null;
    this.corners = [];

    // color
    this.tint = random(-1, 1);
    this.isAccent = random() < ACCENT_CHANCE;

    // details: lip = raised outer edge of each bar, key = square meander in a long side,
    // crown = posts on the rim corners
    this.hasLip = random() < params.lip;
    this.keyChance = this.wallScale <= 1.2 ? params.key : 0; // no keys on thick sections
    this.hasCrown = random() < params.crown;
    this.pieces = []; // bars still to be grown on the current side
    if (shared !== null) {
      this.hasLip = true;
      this.keyChance = 0;
      this.hasCrown = true;
    }

    this.numOfBars = 0;
    this.isGrowing = true;
    this.isMelting = false;
  }

  getRemaining() {
    // estimate of the bars still to be added, for the maxBars check
    const perSide = (this.hasLip ? 2 : 1) * (1 + this.keyChance * 1.5) + (this.hasCrown ? 0.3 : 0);
    return Math.round((this.steps * 4 - this.segment) * perSide);
  }

  getStretch(axis) {
    return axis === this.aAxis ? this.aspect : 1;
  }

  getDirection(dir) {
    return {
      axis: dir % 2 === 0 ? this.aAxis : this.bAxis,
      sign: dir < 2 ? 1 : -1,
    };
  }

  canBranch() {
    return (
      !this.isMelting &&
      this.children < this.maxChildren &&
      this.size * params.decay >= MIN_SCALE
    );
  }

  add(bar) {
    bars.push(bar);
    this.numOfBars++;
    return bar;
  }

  update(delta) {
    // grow the current bar, then continue with the next one
    let step = params.speed * Math.sqrt(this.size) * delta;
    while (this.isGrowing && step > 0) {
      if (this.current === null) this.addPiece();
      step = this.current.grow(step);
      if (this.current.isGrown) {
        this.current = null;
        if (this.pieces.length === 0) this.turn();
      }
    }
  }

  addPiece() {
    if (this.pieces.length === 0) this.addSegment();
    const piece = this.pieces.shift();
    const ring = Math.floor(this.segment / 4);

    this.current = this.add(new Bar(this, piece.start, piece.axis, piece.sign, piece.length, ring));
    if (this.hasLip && piece.out) {
      this.add(new Lip(this.current, piece.out));
    }
  }

  getGrid(j) {
    // distance of grid line j from the center, in units
    const m = Math.abs(j);
    const g = this.rhythm === 1 ? m : (this.meter * (Math.pow(this.rhythm, m) - 1)) / (this.rhythm - 1);
    return j < 0 ? -g : g;
  }

  getPoint(ga, gb, segment) {
    const point = this.origin.clone();
    point.setComponent(this.aAxis, point.getComponent(this.aAxis) + this.getGrid(ga) * this.unit * this.aspect);
    point.setComponent(this.bAxis, point.getComponent(this.bAxis) + this.getGrid(gb) * this.unit);
    point.setComponent(this.nAxis, this.getHeight(segment));
    return point;
  }

  getBox() {
    // approximate bounding box when fully grown
    const reach = this.getGrid(this.steps) * this.unit * Math.max(this.aspect, 1) * 0.8;
    const top = this.origin.clone();
    top.setComponent(this.nAxis, this.getHeight(this.steps * 4));
    const box = new THREE.Box3().setFromPoints([this.origin, top]);
    const margin = new THREE.Vector3(reach, reach, reach);
    margin.setComponent(this.nAxis, 0);
    return box.expandByVector(margin);
  }

  addSegment() {
    // one side of the spiral: a single bar, or five bars if it contains a key
    // (the path moves sideways, continues for one or two steps, and moves back)
    const d = this.getDirection(this.dir);
    const next = this.getDirection((this.dir + 1) % 4);
    const out = { axis: next.axis, sign: -next.sign }; // pointing away from the spiral center
    const isAlongA = this.dir % 2 === 0;

    // s0: grid coordinate along the side, q: the fixed one across
    const s0 = isAlongA ? this.ga : this.gb;
    const q = isAlongA ? this.gb : this.ga;
    const along = (t) => Math.abs(this.getGrid(s0 + d.sign * t) - this.getGrid(s0)) * this.unit * this.getStretch(d.axis);
    const across = (side) => Math.abs(this.getGrid(q + side) - this.getGrid(q)) * this.unit * this.getStretch(next.axis);

    const start = this.getPoint(this.ga, this.gb, this.segment);
    const length = along(this.len);
    let extra = 0;
    if (random() < params.overshoot * this.spread) {
      extra = Math.floor(random(1, 5)) * this.unit; // overshoots the corner
    }
    this.treadWidth = across(-next.sign); // distance to the next turn outward

    if (this.len < 4 || random() >= this.keyChance) {
      this.pieces.push({ start: start, axis: d.axis, sign: d.sign, length: length + extra, out: out });
      return;
    }

    const width = Math.floor(random(1, 3)); // grid steps
    const from = Math.floor(random(1, this.len - width)); // grid steps from the start of the side
    const aside = random() < 0.6 ? next.sign : -next.sign; // inward or outward
    const depth = across(aside) * 0.45;
    const lift = this.nSign * Math.max(this.rise * 0.12, 1.2); // small offset to avoid coplanar faces

    const b = this.offset(start, d.axis, d.sign * along(from));
    const c = this.offset(this.offset(b, next.axis, aside * depth), this.nAxis, lift);
    const e = this.offset(c, d.axis, d.sign * (along(from + width) - along(from)));
    const f = this.offset(start, d.axis, d.sign * along(from + width));
    this.pieces.push({ start: start, axis: d.axis, sign: d.sign, length: along(from), out: out });
    this.pieces.push({ start: this.offset(b, this.nAxis, lift * 0.5), axis: next.axis, sign: aside, length: depth });
    this.pieces.push({ start: c, axis: d.axis, sign: d.sign, length: along(from + width) - along(from), out: out });
    this.pieces.push({ start: this.offset(e, this.nAxis, -lift * 0.5), axis: next.axis, sign: -aside, length: depth });
    this.pieces.push({ start: f, axis: d.axis, sign: d.sign, length: length - along(from + width) + extra, out: out });
    this.hasKey = true;
  }

  offset(point, axis, amount) {
    const moved = point.clone();
    moved.setComponent(axis, moved.getComponent(axis) + amount);
    return moved;
  }

  turn() {
    const d = this.getDirection(this.dir);
    const next = this.getDirection((this.dir + 1) % 4);
    const ring = Math.floor(this.segment / 4);
    const from = this.getPoint(this.ga, this.gb, this.segment);

    // move to the corner
    if (this.dir % 2 === 0) this.ga += d.sign * this.len;
    else this.gb += d.sign * this.len;
    const corner = this.getPoint(this.ga, this.gb, this.segment);
    const length = from.distanceTo(corner);

    // plate between this wall and the next turn (not on sides with a key)
    if (this.len >= 2 && !this.hasKey && random() < params.plate) {
      const start = from.clone().lerp(corner, 0.5);
      start.setComponent(this.nAxis, start.getComponent(this.nAxis) + this.nSign * this.rise * 0.5);
      this.add(new Plate(this, start, next.axis, -next.sign, this.treadWidth, ring, d.axis, length));
    }

    // posts on the corners of the outer rings
    if (this.hasCrown && ring >= this.steps - 3) {
      this.add(new Post(this, corner, ring));
    }

    // thin rods: only on the rim, more likely higher up, mostly short.
    // 70% follow the crystal's axis, 30% point up
    if (ring >= this.steps - 1) {
      const level = constrain((corner.y + WORLD_HALF * 0.45) / (WORLD_HALF * 0.9), 0, 1);
      if (random() < params.spire * (0.3 + 3 * level)) {
        const length = this.gauge * (3 + 30 * Math.pow(random(), 3));
        if (random() < 0.7) this.add(new Spire(this, corner, this.nAxis, this.nSign, length, ring));
        else this.add(new Spire(this, corner, 1, 1, length, ring));
      }
    }

    // remember the corner: rim corners for normal children, the others for satellites
    if (ring >= 1) {
      this.corners.push({
        isUsed: false,
        isRim: ring >= this.steps - 2,
        pos: corner,
        normals: [
          { axis: this.nAxis, sign: this.nSign },
          { axis: d.axis, sign: d.sign },
          { axis: next.axis, sign: -next.sign },
        ],
      });
    }

    // turn left. the side gets one step longer every second turn
    this.dir = (this.dir + 1) % 4;
    if (this.segment % 2 === 1) this.len++;
    this.segment++;
    this.current = null;
    this.hasKey = false;

    if (this.segment >= this.steps * 4) this.isGrowing = false;
  }

  getHeight(segment) {
    // height follows the same spacing as the grid, so the slope stays constant
    const x = segment * 0.25;
    const g = this.rhythm === 1 ? x : (this.meter * (Math.pow(this.rhythm, x) - 1)) / (this.rhythm - 1);
    return this.origin.getComponent(this.nAxis) + this.nSign * g * this.rise;
  }

  melt(lifeReduction) {
    if (this.isMelting) return;
    this.isMelting = true;
    this.isGrowing = false;

    // outer bars melt first
    let delay = 0;
    for (let i = bars.length - 1; i >= 0; i--) {
      let bar = bars[i];
      if (bar.crystal !== this) continue;
      bar.melt(delay, lifeReduction);
      delay += lifeReduction > 0.1 ? 0.2 : 1.5;
    }
  }
}

class Bar {
  constructor(crystal, start, axis, sign, length, ring) {
    this.crystal = crystal;

    // mesh
    this.mesh = getBox();
    scene.add(this.mesh);

    this.pos = this.mesh.position; // reference to the mesh position
    this.scale = this.mesh.scale; // reference to the mesh scale
    this.color = this.mesh.material.color; // reference to the mesh color

    // growth: from start, along one axis
    this.start = start.clone();
    this.axis = axis;
    this.sign = sign;
    this.sideAxis = 3 - axis - crystal.nAxis; // the third axis
    this.length = 0;
    this.targetLength = length;
    this.growSpeed = 0; // 0: grown by the crystal
    this.isGrown = false;

    // section: thicker at the bottom of the funnel, thinner at the rim
    const t = crystal.steps > 1 ? ring / (crystal.steps - 1) : 0;
    this.taper = lerp(1, lerp(1.5, 0.7, t), params.variety);
    this.pulse = 0;
    this.heat = 0; // nm added by the pointer
    this.glow = 0; // 0 to 1, glow under the pointer

    // oxide film
    this.ring = ring;
    this.age = 0;
    this.tint = crystal.tint * 0.4 + (noise(start.x * 0.004 + 50, start.y * 0.004 + 50, start.z * 0.004 + 50) - 0.5) * 2.4;

    // lifespan
    this.lifespan = 1; // 100%
    this.lifeReduction = 0;
    this.meltDelay = 0;
    this.isMelting = false;
    this.isDone = false;

    this.update(0);
  }

  grow(step) {
    const used = Math.min(step, this.targetLength - this.length);
    this.length += used;
    if (this.length >= this.targetLength - 0.0001) {
      this.length = this.targetLength;
      this.isGrown = true;
    }
    return step - used; // remaining step for the next bar
  }

  melt(delay, lifeReduction) {
    this.isMelting = true;
    this.meltDelay = delay;
    this.lifeReduction = lifeReduction * random(0.6, 1.4);
  }

  update(delta, frameDelta = 0) {
    if (this.growSpeed > 0 && !this.isGrown) {
      this.grow(this.growSpeed * delta);
    }
    this.age += delta;
    this.glow *= Math.pow(0.965, frameDelta); // fades in about a second

    // strength of the heat pulse at this bar
    const offset = (this.pos.y - pulseY) / PULSE_WIDTH;
    this.pulse = pulseAmount * params.pulse * Math.exp(-offset * offset);

    this.updateLifespan(delta);
    this.updatePosition();
    this.updateScale();
    this.updateColor();
  }

  updateLifespan(delta) {
    if (!this.isMelting) return;
    if (this.meltDelay > 0) {
      this.meltDelay -= delta;
      return;
    }
    this.lifespan -= this.lifeReduction * delta;
    if (this.lifespan <= 0) {
      this.lifespan = 0;
      this.isDone = true;
    }
  }

  updatePosition() {
    this.pos.copy(this.start);
    this.pos.setComponent(this.axis, this.start.getComponent(this.axis) + this.sign * this.length * 0.5);

    // drop while melting
    if (this.isMelting) {
      this.pos.y -= (1 - this.lifespan) * (1 - this.lifespan) * MELT_SAG;
    }
  }

  getSection() {
    const c = this.crystal;
    let thickness = c.gauge * params.wall * c.wallScale * this.taper;
    thickness = Math.min(thickness, c.unit * Math.min(c.aspect, 1) * 0.9); // stay clear of the next turn
    // taller during a heat pulse and under the pointer
    const height = c.gauge * params.wallHeight * c.heightScale * this.taper * (1 + this.pulse * 1.2 + this.glow * 0.5);
    return [thickness, height];
  }

  updateScale() {
    const [thickness, height] = this.getSection();
    // slightly shorter than the full corner, so the end cap stays inside the next bar
    this.setSize(this.axis, this.length + thickness * 0.9);
    this.setSize(this.sideAxis, thickness * this.lifespan);
    this.setSize(this.crystal.nAxis, height * this.lifespan);
  }

  setSize(axis, size) {
    this.scale.setComponent(axis, Math.max(size, 0.001));
  }

  updateColor() {
    // film thickness: thicker deeper in the funnel
    const depth = (this.crystal.steps - 1 - this.ring) * this.crystal.spread;
    let thickness = params.oxide + params.gradient * depth + params.variation * this.tint;
    if (this.crystal.isAccent) thickness += params.accent;
    thickness += this.pulse * 40; // heat pulse

    // slow drift over time and height
    const wave = Math.sin((clock / DRIFT_PERIOD) * Math.PI * 2 - this.pos.y * 0.004 + this.crystal.tint * 2);
    thickness += params.drift * wave * Math.min(thickness / 120, 1);

    thickness *= 1 - Math.exp(-this.age * params.oxidation);
    thickness += this.heat; // added by the pointer
    thickness *= this.lifespan;

    // viewing angle: the optical path gets shorter at an angle
    const n = this.crystal.nAxis;
    const dx = camera.position.x - this.pos.x;
    const dy = camera.position.y - this.pos.y;
    const dz = camera.position.z - this.pos.z;
    const along = n === 0 ? dx : n === 1 ? dy : dz;
    const sinSq = 1 - (along * along) / (dx * dx + dy * dy + dz * dz);
    thickness *= Math.sqrt(1 - params.iridescence * sinSq);

    setOxideColor(this.color, Math.max(thickness, 0));

    // darker towards the bottom of the funnel
    this.color.multiplyScalar(0.4 + 0.6 * ((this.ring + 1) / this.crystal.steps));

    // glow under the pointer, mixed in after the film color
    if (this.glow > 0.004) {
      const g = this.glow * 0.85;
      this.color.r += (HOT_COLOR[0] - this.color.r) * g;
      this.color.g += (HOT_COLOR[1] - this.color.g) * g;
      this.color.b += (HOT_COLOR[2] - this.color.b) * g;
    }
  }
}

// plate: a thin sheet between two turns, grows sideways out of a bar
class Plate extends Bar {
  constructor(crystal, start, axis, sign, length, ring, spanAxis, span) {
    super(crystal, start, axis, sign, length, ring);
    this.spanAxis = spanAxis;
    this.span = span;
    this.growSpeed = params.speed * 0.1;
    this.update(0);
  }

  updateScale() {
    if (this.span === undefined) return; // called by super() before the span is known
    this.setSize(this.axis, this.length);
    this.setSize(this.spanAxis, this.span * this.lifespan);
    this.setSize(this.crystal.nAxis, this.crystal.gauge * 0.12 * this.lifespan);
  }
}

// thin square rod
class Spire extends Bar {
  constructor(crystal, start, axis, sign, length, ring) {
    super(crystal, start, axis, sign, length, ring);
    this.growSpeed = params.speed * 0.5;
  }

  updateScale() {
    const thickness = this.crystal.gauge * params.wall * 0.6 * this.lifespan;
    this.setSize(0, thickness);
    this.setSize(1, thickness);
    this.setSize(2, thickness);
    this.setSize(this.axis, this.length);
  }
}


// lip: a thin, slightly taller strip along the outer edge of a bar
class Lip extends Bar {
  constructor(host, out) {
    super(host.crystal, host.start, host.axis, host.sign, host.targetLength, host.ring);
    this.host = host;
    this.out = out;
    this.tint -= 0.5; // slightly thinner film than its bar
    this.update(0);
  }

  update(delta, frameDelta = 0) {
    if (this.host === undefined) return; // called by super() before the host is known
    this.length = this.host.length; // same length as its bar
    this.isGrown = this.host.isGrown;
    super.update(delta, frameDelta);
  }

  getLip() {
    const [thickness, height] = this.host.getSection();
    const lipThickness = Math.max(thickness * 0.32, 1);
    const lipHeight = height + this.crystal.gauge * 0.55;
    return [thickness, height, lipThickness, lipHeight];
  }

  updatePosition() {
    super.updatePosition();
    const [thickness, height, lipThickness, lipHeight] = this.getLip();
    // on the outer edge, offset a little to avoid coplanar faces
    const n = this.crystal.nAxis;
    const aside = this.out.sign * ((thickness - lipThickness) * 0.5 + 0.7);
    const above = this.crystal.nSign * ((lipHeight - height) * 0.5 + 0.4) * this.lifespan;
    this.pos.setComponent(this.out.axis, this.pos.getComponent(this.out.axis) + aside);
    this.pos.setComponent(n, this.pos.getComponent(n) + above);
  }

  updateScale() {
    if (this.host === undefined) return;
    const [thickness, height, lipThickness, lipHeight] = this.getLip();
    this.setSize(this.axis, this.length + thickness * 0.9 - 1);
    this.setSize(this.out.axis, lipThickness * this.lifespan);
    this.setSize(this.crystal.nAxis, lipHeight * this.lifespan);
  }
}

// post: a short square bar on a rim corner, along the crystal's axis
class Post extends Bar {
  constructor(crystal, corner, ring) {
    super(crystal, corner, crystal.nAxis, crystal.nSign, 1, ring); // length 0 to 1 is used as the growth factor
    this.growSpeed = 0.05;
    this.tint += 0.4;
  }

  getPost() {
    const [thickness, height] = this.getSection();
    return [thickness * 1.35 + 0.8, (height * 0.5 + this.crystal.gauge * 1.1) * this.length];
  }

  updatePosition() {
    const tall = this.getPost()[1];
    this.pos.copy(this.start);
    this.pos.setComponent(this.axis, this.start.getComponent(this.axis) + this.sign * (tall * 0.5 - 0.3));
    if (this.isMelting) {
      this.pos.y -= (1 - this.lifespan) * (1 - this.lifespan) * MELT_SAG;
    }
  }

  updateScale() {
    const [side, tall] = this.getPost();
    this.setSize(0, side * this.lifespan);
    this.setSize(1, side * this.lifespan);
    this.setSize(2, side * this.lifespan);
    this.setSize(this.axis, tall * this.lifespan);
  }
}
