// APERTURE
//
// Twenty-four square frames are stacked in depth, each turned a little more
// than the one in front, so from the front they enclose a round opening.
// Each frame holds a thin pane of glass that behaves like a polarizing
// filter: while the frames keep their order the light passes, and when the
// order breaks the aperture closes. The wall behind is lit by what comes
// through.
//
// Drag to orbit. R returns to the front, B turns to the back, Space pauses.

const COUNT = 24;        // number of frames
const SIDE = 400;        // outer size of a frame
const RAIL = 9;          // width of the rails
const THICK = 3.2;       // thickness of the rails
const DISTANCE = 1000;   // distance of the front camera
const GAP_CLOSED = 8;    // spacing between frames when compact
const GAP_OPEN = 24;     // spacing between frames when unfolded
const PERIOD = 20;       // seconds in one cycle
const SHIFT = 0.12;      // largest dephase rotation, in radians
const RED = 6;           // the frame with the red rail
const GLASS = 0.05;      // opacity of a clear pane
const GAIN = 47;         // polarizer sensitivity, see updatePanes()

let sculpture;
let frames = [];         // one group per frame
let panes = [];          // the glass material of each frame
let gaps = [];           // spacing between neighbouring frames
let turns = [];          // dephase rotation of each frame
let unitBox;
let keyLight;
let darkMaterial, softMaterial, redMaterial;
let clearColor, blockColor;
let tints = [];          // the colour each pane shows on its way to dark
let clock = 0;           // seconds into the current cycle
let cycle = 0;           // cycles completed
let lastTime = 0;
let paused = false;
let dragging = false;
let flight = null;       // camera easing to the front or the back
let phaseLabel, timeLabel, progressBar, pauseLabel;

function setupThree() {
  renderer.setClearColor("#E6E2DC", 0);  // the page background shows through
  renderer.setPixelRatio(min(window.devicePixelRatio, 2));

  camera.position.set(0, 0, DISTANCE);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // ambient light, a warm key light that moves, and a cool fill light
  scene.add(new THREE.AmbientLight("#FFFFFF", 0.8));
  keyLight = new THREE.PointLight("#FFF7EB", 3.4, 0, 0);
  keyLight.position.set(-650, 850, 1100);
  scene.add(keyLight);
  const fillLight = new THREE.PointLight("#E6EBF0", 1.1, 0, 0);
  fillLight.position.set(700, -150, -550);
  scene.add(fillLight);

  unitBox = new THREE.BoxGeometry(1, 1, 1);
  darkMaterial = new THREE.MeshPhongMaterial({ color: "#383A37", specular: "#74766D", shininess: 65 });
  softMaterial = new THREE.MeshPhongMaterial({ color: "#42443F", specular: "#74766D", shininess: 65 });
  redMaterial = new THREE.MeshPhongMaterial({ color: "#84413A", specular: "#8F6558", shininess: 48 });
  clearColor = new THREE.Color("#C6CFC8");
  blockColor = new THREE.Color("#1A1E22");

  sculpture = new THREE.Group();
  scene.add(sculpture);
  for (let i = 0; i < COUNT; i++) {
    const frame = getFrame(i);
    frames.push(frame);
    sculpture.add(frame);
    gaps.push(GAP_CLOSED);
    turns.push(0);
    // amber near the front, through red and magenta to violet at the back
    tints.push(new THREE.Color().setHSL(map(i, 0, COUNT - 1, 0.09, -0.22), 0.38, 0.4, THREE.SRGBColorSpace));
  }

  phaseLabel = document.getElementById("phase");
  timeLabel = document.getElementById("time");
  progressBar = document.getElementById("progress");
  pauseLabel = document.getElementById("pause-label");
  document.getElementById("front").addEventListener("click", function () { flyTo(0); });
  document.getElementById("back").addEventListener("click", function () { flyTo(PI); });
  document.getElementById("pause").addEventListener("click", togglePause);
  renderer.domElement.addEventListener("pointerdown", function () { dragging = true; flight = null; });
  window.addEventListener("pointerup", function () { dragging = false; });
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", fitCamera);
  fitCamera();
  lastTime = performance.now();
}

function getFrame(index) {
  const frame = new THREE.Group();
  const material = index % 4 == 0 ? softMaterial : darkMaterial;
  const c = (SIDE - RAIL) / 2;
  // top and bottom rails span the full width, the sides fit between them
  frame.add(getBar(SIDE, RAIL, 0, c, index == RED ? redMaterial : material));
  frame.add(getBar(SIDE, RAIL, 0, -c, material));
  frame.add(getBar(RAIL, SIDE - 2 * RAIL, -c, 0, material));
  frame.add(getBar(RAIL, SIDE - 2 * RAIL, c, 0, material));

  // a thin pane of glass fills the opening
  const glass = new THREE.MeshPhongMaterial({
    color: clearColor, specular: "#FFFFFF", shininess: 140,
    transparent: true, opacity: GLASS, depthWrite: false
  });
  const pane = new THREE.Mesh(unitBox, glass);
  pane.scale.set(SIDE - 2 * RAIL, SIDE - 2 * RAIL, 1.2);
  frame.add(pane);
  panes.push(glass);
  return frame;
}

function getBar(w, h, x, y, material) {
  const bar = new THREE.Mesh(unitBox, material);
  bar.scale.set(w, h, THICK);
  bar.position.set(x, y, 0);
  return bar;
}

function updateThree() {
  const dt = min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  if (!paused) {
    clock += dt;
    if (clock >= PERIOD) {
      clock -= PERIOD;
      cycle++;
    }
  }
  updateSculpture(clock);
  flyCamera(dt);
  // the back is seen from further away, because the nearest frame is the largest
  const gaze = camera.position.angleTo(new THREE.Vector3(0, 0, 1));
  camera.position.setLength(lerp(DISTANCE, DISTANCE * 1.5, ease(2.1, PI, gaze)));
  updatePanes();
  controls.update();
  updateCaption();
}

// One cycle: 0-3 still, 3-8 unfold, 8-12 shift, 12-17 return, 17-20 rest.
function updateSculpture(t, shift = SHIFT) {
  // the unfolding travels from the first gap to the last
  let depth = 0;
  for (let j = 0; j < COUNT - 1; j++) {
    const delay = 2 * j / (COUNT - 2);
    const open = ease(3 + delay, 6 + delay, t) - ease(12 + delay, 15 + delay, t);
    gaps[j] = GAP_CLOSED + (GAP_OPEN - GAP_CLOSED) * open;
    depth += gaps[j];
  }

  // The dephase is a wave that starts at the red frame and runs into the
  // depth, so the frames in front keep the circle. It slows down for a beat
  // while the aperture is closed and enters at a different phase every
  // cycle. Every fourth cycle the frames zigzag instead, so every pane
  // behind the red one crosses at once and the shutter closes fully.
  const amount = ease(8, 9, t) * (1 - ease(11, 12, t));
  const waveTime = t - 0.6 * ease(9.2, 10.6, t);
  const full = cycle % 4 == 3;

  let z = depth / 2;
  for (let i = 0; i < COUNT; i++) {
    const reach = ease(RED, RED + (full ? 1 : 8), i);
    const wave = full ? (i % 2 == 0 ? 0.14 : -0.14) : sin(0.9 * waveTime - 0.28 * (i - RED) + 2.4 * cycle);
    turns[i] = shift * amount * reach * wave;
    // frames further back are scaled up so the front view does not change
    const s = (DISTANCE - z) / DISTANCE;
    frames[i].position.set(0, 0, z);
    frames[i].scale.set(s, s, s);
    frames[i].rotation.z = i * HALF_PI / COUNT + turns[i];
    if (i < COUNT - 1) z -= gaps[i];
  }

  // the key light circles the sculpture once while it unfolds and returns,
  // and its glow on the wall behind circles with it
  const angle = -0.53 + TWO_PI * ease(3, 17, t);
  keyLight.position.set(1280 * sin(angle), 850, 1280 * cos(angle));
  document.body.style.setProperty("--lx", nf(50 + 34 * sin(angle), 1, 1) + "%");
  document.body.style.setProperty("--ly", nf(50 - 34 * cos(angle), 1, 1) + "%");
}

// Malus's law: the light through two polarizers falls with cos^2 of the
// angle between their axes. The axes are parallel while the frames keep
// their ordered step, so only a deviation from that step darkens a pane.
// Looking away from the front darkens the glass as well, so the light only
// comes through when you look straight on. The red frame's pane stays clear.
function updatePanes() {
  const gaze = camera.position.angleTo(new THREE.Vector3(0, 0, 1));
  const away = sq(sin(gaze / 2));
  let through = 1;
  for (let i = 0; i < COUNT; i++) {
    let crossed = 0;
    if (i != RED) {
      const deviation = i == 0 ? 0 : turns[i] - turns[i - 1];
      const malus = sq(sin(GAIN * deviation));
      crossed = 1 - (1 - malus) * (1 - away);
    }
    panes[i].opacity = GLASS + (1 - GLASS) * crossed;
    // on its way to dark a pane passes through its tint, like interference colours
    if (crossed < 0.35) panes[i].color.lerpColors(clearColor, tints[i], crossed / 0.35);
    else panes[i].color.lerpColors(tints[i], blockColor, (crossed - 0.35) / 0.65);
    through *= 1 - panes[i].opacity;
  }
  // the light that gets through the whole stack makes a halo on the wall
  const light = through / pow(1 - GLASS, COUNT);
  document.body.style.setProperty("--light", nf(light, 1, 2));
}

// Ease the camera over the orbit sphere to the front (theta 0) or the back
// (theta PI), taking the short way round without crossing the poles.
function flyTo(theta) {
  controls.enableDamping = false;  // settle any leftover drag first
  controls.update();
  controls.enableDamping = true;
  const from = new THREE.Spherical().setFromVector3(camera.position);
  let turn = theta - from.theta;
  turn = atan2(sin(turn), cos(turn));
  const travel = max(abs(turn), abs(HALF_PI - from.phi));
  flight = { from: from, turn: turn, duration: 0.6 + travel / PI, t: 0 };
}

function flyCamera(dt) {
  if (!flight) return;
  flight.t += dt;
  const e = ease(0, flight.duration, flight.t);
  const phi = lerp(flight.from.phi, HALF_PI, e);
  const theta = flight.from.theta + flight.turn * e;
  camera.position.setFromSphericalCoords(DISTANCE, phi, theta);
  camera.lookAt(controls.target);
  if (flight.t >= flight.duration) flight = null;
}

function onKey(event) {
  if (event.repeat) return;
  if (event.key == " " && event.target.tagName != "BUTTON") {
    event.preventDefault();
    togglePause();
  } else if (dragging) {
    return;  // the hand keeps the camera
  } else if (event.key == "r" || event.key == "R") {
    flyTo(0);
  } else if (event.key == "b" || event.key == "B") {
    flyTo(PI);
  }
}

function togglePause() {
  paused = !paused;
  pauseLabel.textContent = paused ? "Play" : "Pause";
}

function updateCaption() {
  const names = ["Still", "Unfold", "Shift", "Return", "Rest"];
  const ends = [3, 8, 12, 17, PERIOD];
  let phase = 0;
  while (phase < 4 && clock >= ends[phase]) phase++;
  phaseLabel.textContent = names[phase];
  timeLabel.textContent = nf(floor(clock), 2) + " / " + PERIOD + "s";
  progressBar.style.transform = "scaleX(" + clock / PERIOD + ")";
}

// quintic smoothstep: eases in and out with no jump in speed or acceleration
function ease(start, end, value) {
  const u = constrain((value - start) / (end - start), 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
}

// widen the lens on narrow screens so the sculpture stays in view
function fitCamera() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const fit = 2 * atan(max(450 * h / max(w - 48, 160), 340 * h / max(h - 230, 140)) / DISTANCE);
  camera.fov = max(45, degrees(fit));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
