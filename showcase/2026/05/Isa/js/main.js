// ---------------------------------------------------------------
//  ATOMS OF MISREGISTRATION  (after Casey Reas, Atomism)
//
//  A dense grid of tiny marks, two interleaved layers: red and blue.
//  ORDER:      every mark sits on its grid cell -> a calm lavender field.
//  DISRUPTION: angular regions appear. Inside a region the red layer
//              slides one way and the blue layer the opposite way, so
//              colored fringes open at the edges. Some regions also
//              clear their marks to white.
//  Marks follow with a spring, so edges smear into streaks before
//  settling. Regions drift and rotate, then suddenly re-aim (new
//  angle / displacement), then dissolve and the grid heals.
// ---------------------------------------------------------------

const GRID = 150;                         // 150 x 150 cells
const SPACING = 10;
const MAX_PARTICLE_NUMBER = GRID * GRID * 2; // red + blue per cell (45000)
const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;
const SHAPE_COUNT = 4;

// timeline (seconds of sim time)
const CYCLE = 24;
const T_RISE = 4;     // 0-4 pure order, 4-5 regions appear
const T_JUMP = 10.5;  // sudden re-aim of every region
const T_FALL = 16;    // 16-22 regions dissolve, 22-24 order

let particles = [];
let shapes = [];
let pointCloud;
let colorArray;

let simTime = 0;
let lastC = 0;
let drawCount = 0;

const _red = new THREE.Color(0xe8283c);
const _blue = new THREE.Color(0x1a1aff);
const _paper = new THREE.Color(0xf4f4f6);

function smoothstep(a, b, x) {
  let t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// 0 = no regions (order), 1 = full disruption
function getEnvelope(c) {
  if (c < T_RISE) return 0;
  if (c < T_RISE + 1) return smoothstep(T_RISE, T_RISE + 1, c);
  if (c < T_FALL) return 1;
  if (c < T_FALL + 6) return 1 - smoothstep(T_FALL, T_FALL + 6, c);
  return 0;
}

function randomizeShape(s, full) {
  if (full) {
    s.cx = random(-450, 450);
    s.cy = random(-450, 450);
    s.hw = random(120, 420);
    s.hh = random(60, 320);
    s.vx = random(-10, 10);
    s.vy = random(-10, 10);
    s.va = random(-0.12, 0.12);
    s.hole = random() < 0.5;
  }
  s.ang = random(0, Math.PI);
  const mag = random(25, 80);
  const dir = random(0, Math.PI * 2);
  s.ox = Math.cos(dir) * mag;
  s.oy = Math.sin(dir) * mag;
}

function setupThree() {
  scene.background = _paper.clone();

  camera.position.z = 1000;

  for (let i = 0; i < SHAPE_COUNT; i++) {
    const s = { c: 1, s: 0 };
    randomizeShape(s, true);
    shapes.push(s);
  }

  // build one red + one blue mark per cell; blue is offset half a cell
  // diagonally -> the diagonal dash texture of the reference
  const list = [];
  const half = (GRID * SPACING) / 2;
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const x = i * SPACING - half;
      const y = j * SPACING - half;
      list.push([x, y, 1]);
      list.push([x + SPACING * 0.5, y + SPACING * 0.5, -1]);
    }
  }
  // shuffle so the intro (drawCount ramp) sparkles in instead of wiping row by row
  for (let i = list.length - 1; i > 0; i--) {
    const k = Math.floor(random(i + 1));
    const t = list[i]; list[i] = list[k]; list[k] = t;
  }
  for (let i = 0; i < list.length; i++) {
    const p = new Particle();
    p.setHome(list[i][0], list[i][1], list[i][2]);
    // start scattered, then the grid assembles itself
    p.setPosition(random(-WORLD_HALF, WORLD_HALF), random(-WORLD_HALF, WORLD_HALF), list[i][2] * 0.5);
    particles.push(p);
  }

  pointCloud = getPoints();
  scene.add(pointCloud);
}

function updateThree() {
  simTime += (1 / 60) * params.speed;
  const c = simTime % CYCLE;

  // cycle restart: regions are invisible now, so re-roll their layout
  if (c < lastC) {
    for (let i = 0; i < shapes.length; i++) randomizeShape(shapes[i], true);
  }
  // sudden disruption mid-cycle
  if (lastC < T_JUMP && c >= T_JUMP) disrupt();
  lastC = c;

  const env = getEnvelope(c);
  const grow = smoothstep(0, 1, env);
  // BREATHING: displacement swells and relaxes
  const amp = env * (0.8 + 0.2 * Math.sin(simTime * 1.3));
  params.order = 1 - env;

  // intro: marks appear gradually
  drawCount = Math.floor(params.drawCount * smoothstep(0, 6, simTime));

  // regions drift and rotate
  const dt = (1 / 60) * params.speed;
  for (let i = 0; i < shapes.length; i++) {
    const s = shapes[i];
    s.cx += s.vx * dt;
    s.cy += s.vy * dt;
    s.ang += s.va * dt;
    s.c = Math.cos(s.ang);
    s.s = Math.sin(s.ang);
  }

  const positionArray = pointCloud.geometry.attributes.position.array;

  for (let i = 0; i < drawCount; i++) {
    const p = particles[i];

    let tx = p.gx;
    let ty = p.gy;
    let clear = 0;

    if (env > 0.001) {
      for (let k = 0; k < shapes.length; k++) {
        const s = shapes[k];
        const dx = p.gx - s.cx;
        const dy = p.gy - s.cy;
        const lx = dx * s.c + dy * s.s;
        const ly = -dx * s.s + dy * s.c;
        if (Math.abs(lx) < s.hw * grow && Math.abs(ly) < s.hh * grow) {
          // red slides one way, blue the other
          tx += s.ox * amp * p.layer;
          ty += s.oy * amp * p.layer;
          if (s.hole) clear = 1;
        }
      }
    }

    // spring -> edges smear into streaks, then settle
    p.seek(tx, ty, 0.07);
    p.damp(0.82);
    p.updatePosition();

    p.tint += (clear - p.tint) * 0.06;

    // cleared zones keep a few stray marks
    const hidden = p.tint * 0.93 > p.rnd;
    const col = hidden ? _paper : (p.layer > 0 ? _red : _blue);

    const idx = i * 3;
    positionArray[idx] = p.pos.x;
    positionArray[idx + 1] = p.pos.y;
    positionArray[idx + 2] = p.layer * 0.5;
    colorArray[idx] = col.r;
    colorArray[idx + 1] = col.g;
    colorArray[idx + 2] = col.b;
  }

  const geo = pointCloud.geometry;
  geo.attributes.position.needsUpdate = true;
  geo.attributes.color.needsUpdate = true;
  geo.setDrawRange(0, drawCount);

  pointCloud.material.size = params.size;
}

// sudden break: every region re-aims instantly (new angle + displacement)
function disrupt() {
  for (let i = 0; i < shapes.length; i++) randomizeShape(shapes[i], false);
}

function getPoints() {
  const vertices = new Float32Array(MAX_PARTICLE_NUMBER * 3);
  const colors = new Float32Array(MAX_PARTICLE_NUMBER * 3);

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.Float32BufferAttribute(vertices, 3);
  const colAttr = new THREE.Float32BufferAttribute(colors, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  colAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", posAttr);
  geometry.setAttribute("color", colAttr);
  colorArray = colAttr.array;
  geometry.setDrawRange(0, 0);

  // no texture: PointsMaterial draws crisp square marks, like printed dashes
  const material = new THREE.PointsMaterial({
    size: params.size,
    vertexColors: true,
    sizeAttenuation: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
