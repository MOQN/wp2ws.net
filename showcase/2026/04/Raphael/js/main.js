let params = {
  fps: 0,
  numOfBars: 0,
  numOfCrystals: 0,
  // growth
  seed: 7,
  mode: "cycle", // cycle, steady, once
  hold: 12, // seconds
  pulse: 1,
  speed: 18,
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
  wall: 0.52,
  wallHeight: 0.9,
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
  // light
  lightMode: "outside",
  lightMove: true,
  lightAngle: 220,
  lightHeight: 0.55,
  lightPower: 6.5,
  fill: 1,
  shininess: 90,
  shadows: true,
  // material
  study: "cycle",
  stage: "grow",
  opacity: 0.4,
  reflection: 0.32,
  refraction: 1.52,
  roughness: 0.06,
  surfaceMotion: 1,
  colouredShadows: true,
  // view
  autoRotate: false,
  autoFrame: true,
  background: "#030811",
};

// oxide film presets, in nm: thickness at the rim, extra per ring of depth,
// variation between crystals, offset of the accent crystals
const PALETTES = {
  temper: { oxide: 181, gradient: 2, variation: 5, accent: 0 },
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
const ACCENT_CHANCE = 0.12; // chance that a crystal uses the accent offset
const DRIFT_PERIOD = 80 * 60; // frames per cycle of the slow thickness drift
const MIN_SCALE = 0.3; // crystals smaller than this do not branch
const BIG_SCALE = 0.55; // crystals larger than this can have satellites
const MAX_SATELLITES = 4;
const MAX_GROWING = 8; // crystals growing at the same time
const MELT_INTERVAL = 240; // frames between two remelts
const MELT_SWEEP = 0.35; // melt delay in frames per unit of height below the top
const MELT_SAG = 70; // how far a bar drops while melting
const TEMPER_TIME = 360; // frames

const HEAT_RADIUS = 48; // half size of the heated square around the pointer, in pixels
const HEAT_RATE = 0.9; // nm per frame at the pointer
const HEAT_MAX = 170;
const HOT_COLOR = [1, 0.74, 0.42]; // glow color under the pointer

const PHASES = ["grow", "temper", "hold", "melt"];
const LOOKS = {
  grow:   { glass: 1, mirror: 0, threads: 0, mass: 0, spread: 1, lift: 1, dome: 0, cone: 0, shadow: 0.62 },
  temper: { glass: 0, mirror: 0, threads: 0, mass: 1, spread: 1, lift: 0.96, dome: 1, cone: 0, shadow: 1 },
  hold:   { glass: 0.3, mirror: 1, threads: 0, mass: 0, spread: 1.12, lift: 1.25, dome: 0, cone: 1, shadow: 0.95 },
  melt:   { glass: 1, mirror: 0.15, threads: 1, mass: 0, spread: 1, lift: 1, dome: 0, cone: 0, shadow: 0.6 },
};
let look = { ...LOOKS.grow };
let visualTime = 0, studyTime = 0, temperProgress = 0;

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

let boxGeometry, barGeometry, reflectionMap, surfaceMap, glassColor, threadColor, edgeColor;
let barBatch, barSurface, barMetal, barMatrix;
const barSlots = [];
let activeSeed;
let lastTime = 0;
let accumulator = 0; // frames not simulated yet
let meltTimer = MELT_INTERVAL;
let isRegenerating = false;
let isFull = false; // no room (or no corner) for another crystal
let relaxations = 0; // times maxChildren was raised to keep growing
let hasCube = false; // one cube per round at most
let worldRadius = WORLD_HALF * 0.4; // max distance of a new crystal from the y axis

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
let light, fillLight, innerLight, softLight, rimLight, deckGroup;
let lightCenter;
let lightWidth = 260;
let lightHeight = 400;
let lightClock = 0;
let inside = 0;
let insideView = 0;
let innerTarget, innerStep;

function setupThree() {
  setupGUI();

  // view
  camera.fov = 40;
  // near = 0.1 (template) caused z-fighting where two bars meet at this distance
  camera.near = 20;
  camera.far = 40000;
  camera.updateProjectionMatrix();
  camera.position.set(1100, 1000, 1700);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.enablePan = false; // the camera target is set by updateFraming()
  controls.minPolarAngle = 0.02;
  controls.maxPolarAngle = Math.PI - 0.02;
  controls.autoRotateSpeed = 0.5;
  scene.fog = new THREE.Fog(0x000000, 1, 2);
  setBackdrop(params.background);

  // one geometry shared by every bar
  boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  barGeometry = getCrystalGeometry();
  surfaceMap = getSurface();
  glassColor = new THREE.Color(0xdceeff);
  threadColor = new THREE.Color();
  edgeColor = new THREE.Color(0xdcc9d7);
  setupStation();
  setupLights();
  reflectionMap = getReflection();
  setupBarBatch();

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
  document.getElementById("pause").addEventListener("click", togglePause);
  document.getElementById("gui").addEventListener("click", () => setGUI(!isGUIOpen));
  for (const button of document.getElementById("phases").children) {
    button.addEventListener("click", () => jumpToStage(button.dataset.phase));
  }
  setGUI(false);

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
  updateLook(frameDelta);
  if (!params.pause) accumulator += frameDelta;
  const steps = Math.min(Math.floor(accumulator), 4);
  accumulator -= Math.floor(accumulator);

  controls.autoRotate = params.autoRotate;
  controls.update();

  updateViewOffset(frameDelta);
  updateFraming(frameDelta);

  // keep the fog range relative to the camera distance
  scene.fog.near = frameDistance + 1800;
  scene.fog.far = frameDistance + 20000;

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
      releaseBar(bar);
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

  updateBarBatch();

  // update the value(s) in the GUI
  params.numOfBars = bars.length;
  params.numOfCrystals = crystals.length;
  updateStars(frameDelta);
  updateLights(frameDelta);
  updateDeck(frameDelta);
  updateCaption();
}

function simulate() {
  clock++;
  updatePalette(1);

  // generate
  if (isRegenerating && bars.length === 0 && (storm.time < 0 || storm.hits === stars.length)) {
    closeDeck();
    if (isDeckGone()) seedCrystal();
    return;
  }
  if (!isDeckReady()) return;
  if (!isRegenerating) {
    if (phase !== "melt") {
      nucleate(1);
      remelt(1);
    }
    updateCycle(1);
  }

  for (let crystal of crystals) {
    crystal.update(1);
  }
}

function setupGUI() {
  pane.addBinding(params, "numOfBars", { label: "bars", readonly: true, format: (v) => v.toFixed(0) });
  pane.addBinding(params, "numOfCrystals", { label: "crystals", readonly: true, format: (v) => v.toFixed(0) });

  const lighting = pane.addFolder({ title: "Light" });
  lighting.addBinding(params, "lightMode", { label: "lighting", options: { "Stage lights": "outside", "Inner light": "inside" } });
  lighting.addBinding(params, "lightMove", { label: "moving light" });
  lighting.addBinding(params, "lightAngle", { label: "angle", min: 0, max: 360, step: 1 });
  lighting.addBinding(params, "lightHeight", { label: "height", min: 0, max: 1, step: 0.01 });
  lighting.addBinding(params, "lightPower", { label: "brightness", min: 0, max: 8, step: 0.1 });
  lighting.addBinding(params, "fill", { min: 0, max: 1.5, step: 0.05 });
  lighting.addBinding(params, "shininess", { min: 10, max: 160, step: 1 });
  lighting.addBinding(params, "shadows");
  lighting.addBinding(params, "colouredShadows", { label: "colour shadows" });

  const surface = pane.addFolder({ title: "Surface" });
  surface.addBinding(params, "stage", { label: "play from", options: { Grow: "grow", Temper: "temper", Hold: "hold", Melt: "melt" } }).on("change", (ev) => {
    if (ev.value !== phase) jumpToStage(ev.value);
  });
  surface.addBinding(params, "opacity", { min: 0.1, max: 0.85, step: 0.01 });
  surface.addBinding(params, "reflection", { min: 0, max: 0.8, step: 0.01 });
  surface.addBinding(params, "refraction", { label: "crystal IOR", min: 1, max: 2.3, step: 0.01 });
  surface.addBinding(params, "roughness", { label: "crystal roughness", min: 0.02, max: 0.4, step: 0.01 });

  const growth = pane.addFolder({ title: "Growth", expanded: false });
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

  const section = pane.addFolder({ title: "Section", expanded: false });
  section.addBinding(params, "wall", { min: 0.05, max: 0.9, step: 0.01 });
  section.addBinding(params, "wallHeight", { label: "wall height", min: 0.1, max: 4, step: 0.05 });

  const film = pane.addFolder({ title: "Oxide film (nm)", expanded: false });
  film.addBinding(params, "palette", {
    options: {
      "Follow the cycle": "temper",
      "Bare metal": "metal",
      "Gold magenta blue": "gold",
      "Sea": "sea",
      "Aurora": "aurora",
      "Ember": "ember",
      "Spectrum": "spectrum",
    },
  }).on("change", (ev) => {
    let name = ev.value;
    const stage = params.study === "cycle" ? phase : params.study;
    if (name === "temper") name = stage === "grow" ? "sea" : "temper";
    fadePalette(name, params.pause ? 1 : 180);
    if (params.pause) updatePalette(1);
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
  view.addBinding(params, "surfaceMotion", { label: "surface motion", min: 0, max: 1, step: 0.05 });
  view.addBinding(params, "background").on("change", (ev) => {
    setBackdrop(ev.value);
  });

  pane.addButton({ title: "New sculpture (R)" }).on("click", () => regenerate(true));
}

function keyDown(event) {
  if (event.target.tagName === "INPUT") return; // typing in the GUI
  if (event.key.toLowerCase() === "m") jumpToStage(PHASES[(PHASES.indexOf(phase) + 1) % PHASES.length]);
  if (event.key === "r" || event.key === "R") {
    regenerate(true);
  }
  else if (event.key === " ") {
    togglePause();
    event.preventDefault();
  }
  else if (event.key === "g" || event.key === "G") {
    setGUI(!isGUIOpen);
  }
  else if (event.key === "h" || event.key === "H") {
    document.body.classList.toggle("bare"); // hide the interface
  }
  else if (event.key === "l" || event.key === "L") {
    changeLight();
  }
}

function changeLight() {
  params.lightMode = params.lightMode === "inside" ? "outside" : "inside";
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
  const target = isGUIVisible() ? 150 : w >= 1000 ? 90 : 0;
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

  if (low.x <= high.x) {
    // target: halfway between the box center and the average position,
    // so a single long bar does not move the cluster off center
    const center = low.clone().add(high).multiplyScalar(0.5).lerp(middle.divideScalar(count), 0.5);
    let halfHeight = Math.max(high.y - center.y, center.y - low.y, 200);
    const reachX = Math.max(high.x - center.x, center.x - low.x);
    const reachZ = Math.max(high.z - center.z, center.z - low.z);
    const halfWidth = Math.max(Math.hypot(reachX, reachZ), 200);
    const easeLight = Math.min(0.02 * frameDelta, 1);
    lightCenter.lerp(center, easeLight);
    lightWidth += (halfWidth - lightWidth) * easeLight;
    lightHeight += (high.y - low.y - lightHeight) * easeLight;

    // leave room for the shadow below the crystal
    const margin = Math.min(lightHeight * 0.25 + 200, 380);
    center.y -= margin * 0.65;
    halfHeight += margin * 0.5;

    // fit into the area not covered by the title, the panel and the GUI
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isOpen = isGUIVisible();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    const freeV = (tanV * Math.max(h - (h < 620 ? 110 : 190), h * 0.5)) / h;
    const freeH = (tanV * Math.max(w - (isOpen ? 360 : 60), w * 0.5)) / h;
    const viewWidth = Math.max(halfWidth, deckSize * 0.95);
    const wanted = Math.max((halfHeight / freeV) * 1.1, (viewWidth / freeH) * 0.95) + halfWidth * 0.5;

    // ease towards the target and the distance
    if (params.autoFrame && !(phase === "melt" && isRegenerating)) {
      if (autoDistance === 0) autoDistance = wanted;
      const ease = Math.min(0.012 * frameDelta, 1);
      controls.target.lerp(center, ease);
      autoDistance += (wanted - autoDistance) * ease;
    }
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

function getCrystalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.47, -0.47);
  shape.lineTo(0.47, -0.47);
  shape.lineTo(0.47, 0.47);
  shape.lineTo(-0.47, 0.47);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.94, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, steps: 1 });
  geometry.translate(0, 0, -0.47);
  geometry.clearGroups();
  return geometry;
}

function setupBarBatch() {
  barMatrix = new THREE.Matrix4();
  barSurface = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    specular: 0xe6f2ff,
    envMap: reflectionMap,
    combine: THREE.MixOperation,
    bumpMap: surfaceMap,
  });
  barMetal = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    envMap: reflectionMap,
    bumpMap: surfaceMap,
    roughnessMap: surfaceMap,
    clearcoatRoughness: 0.2,
  });
  resizeBarBatch(Math.max(1024, 2 ** Math.ceil(Math.log2(params.maxBars + 256))));
}

function resizeBarBatch(capacity) {
  const previous = barBatch;
  barBatch = new THREE.InstancedMesh(barGeometry, previous ? previous.material : barSurface, capacity);
  barBatch.name = "crystal-bars";
  barBatch.count = barSlots.length;
  barBatch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  barBatch.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
  barBatch.castShadow = true;
  barBatch.receiveShadow = true;
  barBatch.frustumCulled = false;
  scene.add(barBatch);
  if (previous) {
    barBatch.visible = previous.visible;
    scene.remove(previous);
    previous.dispose();
  }
}

function allocateBar(bar) {
  if (barSlots.length === barBatch.instanceMatrix.count) resizeBarBatch(barSlots.length * 2);
  const index = barSlots.length;
  barSlots.push(bar);
  return index;
}

function releaseBar(bar) {
  const index = bar.instanceIndex;
  if (index < 0) return;
  const last = barSlots.pop();
  if (last !== bar) {
    barSlots[index] = last;
    last.instanceIndex = index;
  }
  bar.instanceIndex = -1;
}

function updateBarMaterial() {
  const stage = params.study === "cycle" ? phase : params.study;
  const glass = look.glass;
  const silver = look.mirror * (1 - look.threads);
  const opacity = lerp(1, Math.min(params.opacity + 0.14, 0.95), glass);
  barSurface.opacity = opacity;
  barSurface.depthWrite = glass < 0.08;
  barSurface.reflectivity = lerp(params.reflection, 0.65, look.mirror);
  barSurface.shininess = params.shininess * (1.4 + look.mirror);
  barSurface.bumpScale = look.mirror * 0.025;
  const material = stage === "temper" || stage === "hold" ? barMetal : barSurface;
  if (material === barMetal) {
    const solid = Math.min(1, Math.max(look.mass, silver) * 2);
    barMetal.ior = params.refraction;
    barMetal.metalness = Math.max(silver, look.mass * (0.72 + temperProgress * 0.16));
    barMetal.opacity = lerp(opacity, 1, solid);
    barMetal.depthWrite = barMetal.opacity >= 0.999;
    barMetal.roughness = Math.min(0.6, params.roughness + 0.08 - look.mass * temperProgress * 0.06 + silver * 0.03);
    barMetal.bumpScale = silver * 0.06 + look.mass * 0.06;
    barMetal.envMapIntensity = lerp(0.6 + params.reflection * 2, 2.1, Math.max(silver, look.mass));
    barMetal.clearcoat = look.mass * 0.22;
  }
  const transparent = material.opacity < 0.999;
  if (material.transparent !== transparent) {
    material.transparent = transparent;
    material.needsUpdate = true;
  }
  barBatch.material = material;
}

function updateBarBatch() {
  updateBarMaterial();
  barBatch.count = barSlots.length;
  for (let i = 0; i < barSlots.length; i++) {
    const bar = barSlots[i];
    barMatrix.makeScale(bar.scale.x, bar.scale.y, bar.scale.z).setPosition(bar.pos);
    barBatch.setMatrixAt(i, barMatrix);
    barBatch.setColorAt(i, bar.color);
  }
  if (barBatch.count === 0) return;
  for (const attribute of [barBatch.instanceMatrix, barBatch.instanceColor]) {
    attribute.clearUpdateRanges();
    attribute.addUpdateRange(0, barBatch.count * attribute.itemSize);
    attribute.needsUpdate = true;
  }
}

function jumpToStage(name) {
  if (!PHASES.includes(name)) return;
  params.study = "cycle";
  params.pause = false;
  params.mode = "cycle";
  accumulator = 0;
  if (name === "grow" || isRegenerating || bars.length === 0) {
    bars.length = crystals.length = barSlots.length = 0;
    barBatch.count = 0;
    params.seed = activeSeed;
    seedCrystal();
  } else resetStars();
  setPhase(name);
  if (name === "melt") {
    meltCount = Math.max(bars.length, 1);
    beginStorm();
  }
}

function selectStudy(name) {
  params.study = name;
  studyTime = 0;
  if (name === "temper") temperProgress = 0;
  if (name === "melt") previewTime = 0;
  params.pause = name !== "cycle";
  if (params.palette === "temper") {
    const stage = name === "cycle" ? phase : name;
    fadePalette(stage === "grow" ? "sea" : "temper", name === "cycle" ? 180 : 1);
    if (params.pause) updatePalette(1);
  }
}

function togglePause() {
  if (params.study !== "cycle") selectStudy("cycle");
  else params.pause = !params.pause;
}

function updateLook(delta) {
  if (!params.pause || params.study !== "cycle") {
    visualTime += delta / 60;
    if (params.study !== "cycle") studyTime += delta / 60;
  }
  const stage = params.study === "cycle" ? phase : params.study;
  if (stage === "temper" && (!params.pause || params.study !== "cycle")) {
    const progress = params.study === "cycle" ? constrain(phaseTime / TEMPER_TIME, 0, 1) : 0.5 - Math.cos(studyTime * 0.35) * 0.5;
    temperProgress += (progress - temperProgress) * (1 - Math.pow(0.96, delta));
  }
  const target = LOOKS[stage];
  const ease = 1 - Math.pow(0.97, delta);
  for (const key in look) {
    const optical = key === "glass" || key === "mirror" || key === "mass";
    const speed = stage === "melt" && optical ? 1 - Math.pow(0.85, delta) : ease;
    look[key] += (target[key] - look[key]) * speed;
  }
}

function getSurface() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(64, 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const value = 175 + 35 * Math.sin(y * 1.3) + 35 * Math.sin(x * 12.73 + y * 39.17);
      image.data.set([value, value, value, 255], (y * 64 + x) * 4);
    }
  }
  ctx.putImageData(image, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

function setupLights() {
  lightCenter = new THREE.Vector3(0, -250, 0);
  innerTarget = new THREE.Vector3();
  innerStep = new THREE.Vector3();
  scene.add(new THREE.HemisphereLight(0xa9bfdb, 0x19121b, 0.28));
  light = new THREE.SpotLight(0xffead6, 1, 0, 1.28, 0.35, 2);
  fillLight = new THREE.SpotLight(0xb8d4ff, 1, 0, 1.35, 0.4, 2);
  innerLight = new THREE.PointLight(0xffead6, 0, 0, 2);
  for (const lamp of [light, fillLight, innerLight]) {
    lamp.shadow.mapSize.set(lamp === innerLight ? 1024 : 2048, lamp === innerLight ? 1024 : 2048);
    lamp.shadow.camera.near = lamp === innerLight ? 2 : 20;
    lamp.shadow.camera.far = 7000;
    lamp.shadow.bias = -0.00002;
    lamp.shadow.normalBias = 0.7;
    lamp.shadow.radius = 1.5;
    scene.add(lamp);
  }
  scene.add(light.target, fillLight.target);
  softLight = new THREE.RectAreaLight(0xfff6eb, 4.5, 1250, 800);
  rimLight = new THREE.RectAreaLight(0xe1f2ff, 3.5, 450, 1600);
  scene.add(softLight, rimLight);
  updateLights(0);
}

function updateLights(delta) {
  const frozen = params.pause && params.study === "cycle" && delta > 0;
  const stage = params.study === "cycle" ? phase : params.study;
  if (params.lightMove && !frozen) lightClock += delta / 60;
  const manual = params.lightMode === "inside" ? 1 : 0;
  const target = manual || (stage === "hold" ? 0.55 : 0);
  const ease = 1 - Math.pow(0.97, delta);
  inside += (target - inside) * ease;
  insideView += (manual - insideView) * ease;
  if (Math.abs(target - inside) < 0.001) inside = target;
  if (Math.abs(manual - insideView) < 0.001) insideView = manual;

  const angle = params.lightAngle * Math.PI / 180 + lightClock * 0.11;
  const radius = lightWidth + 600;
  const clear = look.glass * (1 - look.mirror) * (1 - look.threads);
  const low = 400 + params.lightHeight * 600 + Math.sin(lightClock * 0.26) * 150 * look.mass;
  let high = Math.max(1400, lightHeight * 1.4 + 900) + (params.lightHeight - 0.55) * 500;
  for (const bar of bars) high = Math.max(high, bar.pos.y + bar.scale.y * 0.5 - lightCenter.y + 500);
  const height = lerp(low, high, Math.max(clear, look.mirror * 0.38));
  const reach = lerp(radius, Math.min(950, lightWidth * 0.5 + 450), clear);
  if (!frozen) {
    light.position.set(
      lightCenter.x + Math.cos(angle) * reach,
      lightCenter.y + height,
      lightCenter.z + Math.sin(angle) * reach
    );
    light.target.position.copy(lightCenter);
    light.target.position.y = lerp(lightCenter.y, deckGroup.position.y, 0.3);
  }
  light.color.setRGB(1, 0.6 + look.mass * 0.06, 0.26 + look.mass * 0.04);
  light.intensity = params.lightPower * 420000 * (1 + look.mass * 0.3) * (1 - insideView * 0.55);
  light.intensity *= (reach * reach + height * height) / (radius * radius + low * low);
  light.castShadow = params.shadows;
  light.shadow.intensity = look.shadow;

  const wasVisible = innerLight.visible;
  innerLight.visible = inside > 0.001 && bars.length > 0;
  if (innerLight.visible && (!frozen || !wasVisible)) {
    innerTarget.set(
      lightCenter.x + Math.sin(lightClock * 0.6) * Math.min(lightWidth * 0.42, 260),
      lightCenter.y + Math.sin(lightClock * 0.38 + 0.6) * Math.min(lightHeight * 0.32, 360),
      lightCenter.z + Math.sin(lightClock * 0.43 + 1.4) * Math.min(lightWidth * 0.36, 240)
    );
    moveLightOut(innerTarget);
    if (!wasVisible) {
      innerLight.position.copy(innerTarget);
    } else {
      // Follow the clear point without snapping to a different face.
      innerStep.copy(innerTarget).sub(innerLight.position).multiplyScalar(ease).clampLength(0, Math.max(0, delta) * 2.5);
      innerLight.position.add(innerStep);
    }
  }
  innerLight.color.setRGB(1, 0.78, 0.48);
  innerLight.intensity = params.lightPower * 420000 * 0.015 * inside;
  innerLight.castShadow = params.shadows && innerLight.visible;
  innerLight.shadow.intensity = look.shadow;

  const sweep = lightClock * 0.2;
  if (!frozen) {
    softLight.position.set(lightCenter.x + 1000 * Math.cos(sweep), lightCenter.y + 1250, lightCenter.z + 900 + Math.sin(sweep) * 600);
    rimLight.position.set(lightCenter.x - 1300, lightCenter.y + 450 + Math.sin(sweep * 0.7) * 180, lightCenter.z - 750);
    softLight.lookAt(lightCenter);
    rimLight.lookAt(lightCenter);
  }
  softLight.intensity = (look.mass * 7 + look.mirror * 3.8) * params.lightPower / 6.5;
  rimLight.intensity = (look.mass * 5 + look.mirror * 3.2) * params.fill;

  const fillPosition = new THREE.Vector3(
    lightCenter.x + lightWidth + 650 + look.mass * 200,
    lightCenter.y + lerp(900, 220 + Math.sin(sweep) * 120, look.mass),
    lightCenter.z + lerp(lightWidth + 600, 250, look.mass)
  );
  const fillDistance = fillPosition.distanceToSquared(lightCenter);
  const x = lightCenter.x + Math.cos(angle + 1.5) * reach;
  const y = lightCenter.y + high;
  const z = lightCenter.z + Math.sin(angle + 1.5) * reach;
  fillPosition.set(lerp(fillPosition.x, x, clear), lerp(fillPosition.y, y, clear), lerp(fillPosition.z, z, clear));
  if (!frozen) {
    fillLight.position.copy(fillPosition);
    fillLight.target.position.copy(light.target.position);
  }
  fillLight.intensity = params.fill * 2000000 * (1 + look.mass * 0.25) * (1 - insideView * 0.15);
  fillLight.intensity *= fillLight.position.distanceToSquared(lightCenter) / fillDistance;
  fillLight.castShadow = params.shadows && params.colouredShadows;
  fillLight.shadow.intensity = look.shadow * 0.8;
  fillLight.color.setRGB(0.23 + look.mass * 0.08, 0.44 + look.mass * 0.04, 1);
  if (!params.colouredShadows) {
    light.color.set(0xffffff);
    innerLight.color.set(0xffffff);
    fillLight.color.set(0xffffff);
  }
}

function moveLightOut(p = innerLight.position) {
  // keep the small lamp clear of the bars
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (const bar of bars) {
      if (bar.isDone || bar.lifespan < 0.03) continue;
      const x = bar.scale.x * 0.5 + 8 - Math.abs(p.x - bar.pos.x);
      const y = bar.scale.y * 0.5 + 8 - Math.abs(p.y - bar.pos.y);
      const z = bar.scale.z * 0.5 + 8 - Math.abs(p.z - bar.pos.z);
      if (x <= 0.00001 || y <= 0.00001 || z <= 0.00001) continue;
      const axis = x < y && x < z ? 0 : y < z ? 1 : 2;
      const side = Math.sign(p.getComponent(axis) - bar.pos.getComponent(axis)) || 1;
      p.setComponent(axis, bar.pos.getComponent(axis) + side * (bar.scale.getComponent(axis) * 0.5 + 8));
      moved = true;
    }
    if (!moved) return true;
  }
  return false;
}

function setBackdrop(hex) {
  scene.background = new THREE.Color(hex);
  scene.fog.color.set(hex);
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
  deckBottom = -450;
  meltTimer = MELT_INTERVAL;
  phase = "grow";
  params.stage = phase;
  phaseTime = 0;
  resetDeck();
  resetStars();
  if (params.palette === "temper") fadePalette("sea", 1);
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

  // keep the form sequence for older seeds
  if (random() >= 0.4) random();

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
  if (newSeed && sweep === 0) {
    params.study = "cycle";
    params.pause = false;
  }
  if (isRegenerating) return;
  if (newSeed) params.seed = Math.floor(Math.random() * 10000);

  if (sweep === 0) storm.time = -1;
  isRegenerating = true;
  phase = "melt";
  params.stage = phase;
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
      setPhase("temper");
    }
  }
  else if (phase === "temper") {
    if (phaseTime > TEMPER_TIME) setPhase("hold");
  }
  else if (phase === "hold") {
    // only "cycle" ends the hold
    if (params.mode === "cycle") {
      if (phaseTime > Math.max(0, params.hold * 60 - 240)) beginStorm();
      if (storm.hits > 0) regenerate(true, MELT_SWEEP);
    }
  }
  else if (phase === "melt" && storm.hits > 0) regenerate(true, MELT_SWEEP);
}

function setPhase(name) {
  phase = name;
  params.stage = name;
  phaseTime = 0;
  if (name === "temper") temperProgress = 0;
  if (name === "temper" && params.palette === "temper") fadePalette("temper", TEMPER_TIME);
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
  else if (phase === "melt") {
    progress = 1 - bars.length / meltCount;
    if (storm.time >= 0) progress = Math.min(progress, storm.hits / stars.length);
    progress = progress * 0.8 + (deckClosing ? 1 - deckPresence : 0) * 0.2;
  }

  // the progress line is clipped, so its gradient is not squeezed
  const rest = (1 - Math.min(progress, 1)) * 100;
  document.getElementById("progress").style.clipPath = "inset(0 " + rest + "% 0 0)";
  updateTones();

  // update the rest only when the state changes
  const stage = params.study === "cycle" ? phase : params.study;
  const falling = stage === "hold" && params.study === "cycle" && storm.time >= 0;
  const ending = stage === "melt" && deckClosing;
  const opening = stage === "grow" && !isDeckReady();
  const key = stage + activeSeed + params.pause + isGUIOpen + params.lightMode + params.study + falling + ending + opening;
  if (key === captionKey) return;
  captionKey = key;

  const names = document.getElementById("phases").children;
  for (let i = 0; i < PHASES.length; i++) {
    names[i].className = PHASES[i] === stage ? "active" : "";
    names[i].setAttribute("aria-pressed", PHASES[i] === stage);
  }
  const story = {
    grow: "Matter gathers in the dark.",
    temper: "A thin colour travels through the terraces.",
    hold: "The lattice holds the sky.",
    melt: "Too much light. The lattice gives way.",
  };
  document.getElementById("story").textContent = ending ? "The last surface returns to the dark." :
    opening ? "A surface gathers in the dark." : falling ? "The stars begin to fall inward." : story[stage];
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
  const stage = params.study === "cycle" ? phase : params.study;
  const tones = (stage === "temper" ? [168, 183, 197] : [rim, rim + params.gradient * 4, rim + params.gradient * 8]).map(getTone);
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
  // in cycle mode, the first star impact starts the melt
  const isTurning = params.mode === "steady";
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

    this.instanceIndex = allocateBar(this);
    this.pos = new THREE.Vector3();
    this.scale = new THREE.Vector3(1, 1, 1);
    this.color = new THREE.Color();

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

    // newly formed bars cool down
    this.pulse = this.isMelting ? 0 : params.pulse * Math.exp(-this.age / 75);

    this.updateLifespan(delta);
    this.updatePosition();
    this.updateScale();
    this.updateForm();
    this.updateColor();
  }

  updateForm() {
    const c = this.crystal;
    for (let axis = 0; axis < 3; axis++) {
      const stretch = axis === c.nAxis ? look.lift : look.spread;
      const distance = this.pos.getComponent(axis) - c.origin.getComponent(axis);
      this.pos.setComponent(axis, c.origin.getComponent(axis) + distance * stretch);
      this.scale.setComponent(axis, this.scale.getComponent(axis) * stretch);
    }
    const base = crystals[0] ? crystals[0].origin.y : -420;
    this.pos.y = lerp(this.pos.y, base + (this.pos.y - base) * 0.9, look.mass);
    this.scale.y *= 1 - look.mass * 0.1;
    const layer = Math.sin(visualTime * 0.65 - this.ring * 0.6 + c.tint);
    const lift = look.mass * c.gauge * 0.35 * layer;
    this.pos.setComponent(c.nAxis, this.pos.getComponent(c.nAxis) + c.nSign * lift);
    if (this instanceof Spire) this.scale.multiplyScalar(1 - look.mass * 0.94);
    // the stepped walls open into vertical threads
    const t = look.threads;
    const thin = c.gauge * 0.12 * this.lifespan;
    this.scale.x = lerp(this.scale.x, thin, t);
    this.scale.z = lerp(this.scale.z, thin, t);
    const height = (35 + Math.min(this.targetLength, 250)) * this.lifespan;
    this.scale.y = lerp(this.scale.y, height, t);
    this.pos.y += height * t * 0.35;
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
    let height = c.gauge * params.wallHeight * c.heightScale * this.taper * (1 + this.pulse * 0.12 + this.glow * 0.15);
    if (this.constructor === Bar) {
      const step = c.meter * Math.pow(c.rhythm, this.ring);
      const width = c.unit * step * (this.sideAxis === c.aAxis ? c.aspect : 1) * 0.43;
      thickness = lerp(thickness, width, look.mass);
      height = lerp(height, c.rise * step * 0.48, look.mass);
    }
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
    thickness += this.pulse * 12;

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

    const glass = look.glass;
    const mist = Math.max(this.glow * 0.7, this.pulse * 0.6);
    this.color.lerp(glassColor, Math.min(glass * (0.08 + mist * 0.3) + look.mirror * 0.85, 0.95));
    const height = constrain((this.pos.y - lightCenter.y) / Math.max(lightHeight, 200) + 0.5, 0, 1);
    threadColor.setHSL(0.1 + height * 0.52, 0.7, 0.6);
    this.color.lerp(threadColor, look.threads * 0.8);
    if (look.mass > 0) {
      const band = Math.sin(temperProgress * Math.PI * 2 - this.ring * 0.48 + this.tint * 0.8 + this.heat * 0.025);
      const film = params.palette === "temper"
        ? constrain((181 + band * 17) * Math.sqrt(1 - params.iridescence * sinSq * 0.25), 164, 198)
        : Math.max(thickness + band * 6, 0);
      setOxideColor(threadColor, film);
      if (this instanceof Lip || this instanceof Post) threadColor.lerp(edgeColor, 0.65);
      this.color.lerp(threadColor, look.mass);
    }
    const warmth = this.glow * 0.18 + this.pulse * 0.015 + storm.heat * look.threads * 0.22;
    this.color.r += HOT_COLOR[0] * warmth;
    this.color.g += HOT_COLOR[1] * warmth;
    this.color.b += HOT_COLOR[2] * warmth;
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
