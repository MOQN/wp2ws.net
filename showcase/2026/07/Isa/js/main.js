
// 3 different color palettes that viewer can toggle between
const palette1 = [0xff4fa3, 0xffe14d, 0x3fd0ff, 0xff8a3d, 0x4dde7a, 0x3d5bff, 0xb36bff];
const palette2 = [0x2E0219, 0x4A001F, 0x5A0834, 0x6A0F49, 0xA7C4C2, 0x9FDAD6, 0x97EFE9];
const palette3 = [0xEEF4D4, 0xDAEFB3, 0xEA9E8D, 0xE0726F, 0xD64550, 0x1C2826, 0x313C3A];
const palettes = [palette1, palette2, palette3];

// matching environment elments to each palette
const themes = [
  { top: "#a9bdf2", mid: "#e9edfb", hor: "#ffffff", bot: "#8fa3c9", fog: "#e6eaf8", ground: 0xb9c6dc, grid: [0x6fa8e8, 0x8fb4e0], ring: 0x2f7fd8 },
  { top: "#2E0219", mid: "#6A0F49", hor: "#9FDAD6", bot: "#4A001F", fog: "#7fa9a6", ground: 0x3a0a28, grid: [0x97EFE9, 0xA7C4C2], ring: 0x97EFE9 },
  { top: "#EEF4D4", mid: "#DAEFB3", hor: "#f6f8e4", bot: "#313C3A", fog: "#e3ecc4", ground: 0x4a5855, grid: [0xE0726F, 0xEA9E8D], ring: 0xD64550 },
];
const ring_idx = [null, null, 0, 3, 2]; 

let params = {
  fps: 0,
  speed: 1,
  autoRotate: true,
  palette: 0,
  
  quality: 1,
  adaptive: true,
  buildings: 1,
  drifters: 160,
  streaks: 50,
  sparkles: 900,
  jellies: 9,
  
  fogFar: 5500,
  fogColor: "#e6eaf8",
  sun: 2.2,
  sunColor: "#ffffff",
  ambient: 1,
  reflections: 1,
  ringColor: "#2f7fd8",
  lineOpacity: 1,
};

const world_size = 3200;
const world_half = world_size / 2;

let city, cityMat, sparkles, sparkleIdx, sun, hemi, ground, gridObj, datGui;
let skyTex, envRT, pmrem;
let drifters = [], streaks = [], rings = [], jellies = []
let stdMats, ribbonMats, lineMats, chromeBall;
let simT = 0, lastT = 0;
let fpsAcc = 0, fpsFrames = 0, goodSeconds = 0;
const basePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
const SEG = 12; // tentacle segments


const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickIdx = () => Math.floor(Math.random() * 7);
const wrap = (v) => (v > world_half ? -world_half : v < -world_half ? world_half : v);

function applyResolution() {
  renderer.setPixelRatio(basePixelRatio * params.quality);
  renderer.setSize(window.innerWidth, window.innerHeight);
}


function setupThree() {
  camera.position.set(900, 650, 1300);
  controls.target.set(0, 350, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotateSpeed = 0.35;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.maxDistance = 3500;
  controls.update();

  setupMaterials();
  setupLights();
  setupSky();
  setupGround();
  setupCity();
  setupSpire();
  setupDrifters();
  setupStreaks();
  setupSparkles();
  for (let i = 0; i < 14; i++) jellies.push(makeJelly());
  setupTweakpane();
  setupDatGui();

  // Press space to switch palettes
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    e.preventDefault();
    if (document.activeElement) document.activeElement.blur();
    params.palette = (params.palette + 1) % palettes.length;
    applyPalette(params.palette);
  });

  applyResolution();
  lastT = performance.now() * 0.001;
}


function setupMaterials() {
  const pal = palettes[0];
  stdMats = pal.map((c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.25, roughness: 0.4 }));
  chromeBall = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08 });
  ribbonMats = pal.map(
    (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
  );
  lineMats = pal.concat([0x333344, 0xffffff]).map(
    (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true })
  );
}

function setupLights() {
  hemi = new THREE.HemisphereLight(0xdfe8ff, 0x8090b0, params.ambient);
  sun = new THREE.DirectionalLight(0xffffff, params.sun);
  sun.position.set(800, 1500, 600);
  scene.add(hemi, sun);
}

// sky gradient 
function setupSky() {
  pmrem = new THREE.PMREMGenerator(renderer);
  scene.fog = new THREE.Fog(themes[0].fog, 1200, params.fogFar);
  buildSky(0);
}

function buildSky(pi) {
  const th = themes[pi], pal = palettes[pi];
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  [[0, th.top], [0.45, th.mid], [0.5, th.hor], [0.55, th.mid], [1, th.bot]].forEach((s) =>
    g.addColorStop(s[0], s[1])
  );
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * 512, y = rand(30, 165), r = rand(20, 65);
    const hex = "#" + pick(pal).toString(16).padStart(6, "0");
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, hex + "88");
    rg.addColorStop(1, hex + "00");
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const rt = pmrem.fromEquirectangular(tex);
  scene.environment = rt.texture;
  scene.background = tex;

  // remove previous sky
  if (skyTex) skyTex.dispose();
  if (envRT) envRT.dispose();
  skyTex = tex;
  envRT = rt;

  hemi.color.set(th.mid);
}

function setupGround() {
  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(world_size * 3, world_size * 3),
    new THREE.MeshStandardMaterial({ color: themes[0].ground, metalness: 0.3, roughness: 0.7 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  setGrid(themes[0].grid);
}

function setGrid(colors) {
  if (gridObj) {
    scene.remove(gridObj);
    gridObj.geometry.dispose();
    gridObj.material.dispose();
  }
  gridObj = new THREE.GridHelper(world_size, 64, colors[0], colors[1]);
  gridObj.position.y = 0.5;
  gridObj.material.transparent = true;
  gridObj.material.opacity = 0.35;
  scene.add(gridObj);
}

function setupCity() {
  const cell = 70, n = Math.floor(world_size / cell), list = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i % 6 === 0 || j % 6 === 0) continue;
      const x = (i - n / 2) * cell + rand(-6, 6);
      const z = (j - n / 2) * cell + rand(-6, 6);
      const d = Math.hypot(x, z);
      if (d < 130) continue;
      const h = 30 + Math.pow(Math.random(), 2.5) * 900 * Math.max(0.15, 1 - (d / world_half) * 0.9);
      const w = cell * rand(0.45, 0.85), dp = cell * rand(0.45, 0.85);
      list.push([x, 0, z, w, h, dp]);
      if (h > 250 && Math.random() < 0.35) {
        const t = rand(0.5, 0.75);
        list.push([x, h, z, w * t, h * rand(0.2, 0.4), dp * t]);
      }
    }
  }
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  cityMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.85, roughness: 0.28 });
  city = new THREE.InstancedMesh(geo, cityMat, list.length);
  city.frustumCulled = false;
  city.userData.total = list.length;

  const o = new THREE.Object3D(), col = new THREE.Color();
  list.forEach((b, k) => {
    o.position.set(b[0], b[1], b[2]);
    o.scale.set(b[3], b[4], b[5]);
    o.updateMatrix();
    city.setMatrixAt(k, o.matrix);
    // buildings stay gray / metallic in every palette
    city.setColorAt(k, col.setHSL(0.6, rand(0, 0.12), rand(0.35, 0.85)));
  });
  scene.add(city);
}

function setupSpire() {
  const chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12 });
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(10, 45, 1500, 4), chrome);
  spire.rotation.y = Math.PI / 4;
  spire.position.y = 750;
  const orb = new THREE.Mesh(new THREE.SphereGeometry(55, 24, 16), chrome);
  orb.position.y = 1540;
  scene.add(spire, orb);

  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(160 + i * 90, 1.6 + (i % 2), 6, 128),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    r.position.y = 1000 + i * 90;
    r.rotation.set(rand(0, 3), rand(0, 3), 0);
    r.userData.s = [rand(-0.4, 0.4), rand(-0.4, 0.4), rand(-0.2, 0.2)];
    scene.add(r);
    rings.push(r);
  }
  recolorRings(0);
}

function recolorRings(pi) {
  rings.forEach((r, i) => {
    if (ring_idx[i] === null) r.material.color.setHex(themes[pi].ring);
    else r.material.color.setHex(palettes[pi][ring_idx[i]]);
  });
  params.ringColor = "#" + themes[pi].ring.toString(16).padStart(6, "0");
}

function setupDrifters() {
  const geos = [
    new THREE.SphereGeometry(1, 14, 10),
    new THREE.OctahedronGeometry(1),
    new THREE.TetrahedronGeometry(1),
    new THREE.ConeGeometry(0.7, 1.6, 6),
    new THREE.TorusGeometry(1, 0.12, 6, 24),
    new THREE.BoxGeometry(1, 1, 1),
  ];
  const plane = new THREE.PlaneGeometry(1, 1);

  for (let i = 0; i < 300; i++) {
    const rib = Math.random() < 0.3;
    const m = rib
      ? new THREE.Mesh(plane, pick(ribbonMats))
      : new THREE.Mesh(pick(geos), Math.random() < 0.4 ? chromeBall : pick(stdMats));
    if (rib) m.scale.set(rand(200, 520), rand(6, 28), 1);
    else m.scale.setScalar(rand(8, 45));
    m.position.set(rand(-world_half, world_half), rand(150, 1300), rand(-world_half, world_half));
    m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
    const k = rib ? 0.3 : 1;
    m.userData = {
      v: [rand(-30, 30), rand(-8, 8), rand(-30, 30)],
      s: [rand(-k, k), rand(-k, k), rand(-k, k)],
      ph: rand(0, 6.28),
    };
    scene.add(m);
    drifters.push(m);
  }
}

function setupStreaks() {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < 100; i++) {
    const m = new THREE.Mesh(geo, pick(lineMats));
    m.scale.set(rand(1.5, 4), rand(1.5, 4), rand(400, 1600));
    const d = new THREE.Vector3(rand(-1, 1), rand(-0.35, 0.35), rand(-1, 1)).normalize();
    m.quaternion.setFromUnitVectors(z, d);
    m.position.set(rand(-world_half, world_half), rand(100, 1200), rand(-world_half, world_half));
    m.userData = { d, sp: rand(60, 260) * (Math.random() < 0.5 ? -1 : 1) };
    scene.add(m);
    streaks.push(m);
  }
}

function setupSparkles() {
  const N = 1500, p = new Float32Array(N * 3);
  sparkleIdx = new Int8Array(N); // palette slot per point, -1 = white
  for (let i = 0; i < N; i++) {
    p.set([rand(-world_half, world_half), rand(20, 1500), rand(-world_half, world_half)], i * 3);
    sparkleIdx[i] = Math.random() < 0.3 ? -1 : pickIdx();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  sparkles = new THREE.Points(g, new THREE.PointsMaterial({ size: 8, vertexColors: true }));
  sparkles.frustumCulled = false;
  scene.add(sparkles);
  recolorSparkles(0);
}

function recolorSparkles(pi) {
  const attr = sparkles.geometry.attributes.color, col = new THREE.Color();
  for (let i = 0; i < sparkleIdx.length; i++) {
    col.setHex(sparkleIdx[i] < 0 ? 0xffffff : palettes[pi][sparkleIdx[i]]);
    attr.setXYZ(i, col.r, col.g, col.b);
  }
  attr.needsUpdate = true;
}


function makeJelly() {
  const g = new THREE.Group();
  const domeIdx = pickIdx();
  const domeMat = new THREE.MeshStandardMaterial({
    color: palettes[0][domeIdx], metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.75, side: THREE.DoubleSide,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  g.add(dome);

  const tents = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SEG * 3), 3));
    const idx = Math.random() < 0.5 ? domeIdx : pickIdx();
    const mat = new THREE.LineBasicMaterial({ color: palettes[0][idx] });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    g.add(line);
    tents.push({ line, mat, idx, arr: geo.attributes.position.array, bx: Math.cos(a) * 32, bz: Math.sin(a) * 32, k });
  }
  g.scale.setScalar(rand(1.2, 2.6));
  g.userData = {
    dome, domeMat, domeIdx, tents, ph: rand(0, 6.28), cx: rand(-1000, 1000), cz: rand(-1000, 1000),
    r: rand(100, 400), y: rand(300, 900), a: rand(0, 6.28), sp: rand(0.1, 0.3),
  };
  scene.add(g);
  return g;
}

// switching palettes
function applyPalette(pi) {
  const pal = palettes[pi], th = themes[pi];
  params.palette = pi;

  stdMats.forEach((m, k) => m.color.setHex(pal[k]));
  ribbonMats.forEach((m, k) => m.color.setHex(pal[k]));
  for (let k = 0; k < 7; k++) lineMats[k].color.setHex(pal[k]);

  jellies.forEach((j) => {
    const u = j.userData;
    u.domeMat.color.setHex(pal[u.domeIdx]);
    u.tents.forEach((t) => t.mat.color.setHex(pal[t.idx]));
  });

  recolorRings(pi);
  recolorSparkles(pi);
  buildSky(pi);
  ground.material.color.setHex(th.ground);
  setGrid(th.grid);

  params.fogColor = th.fog;
  scene.fog.color.set(th.fog);

  if (datGui) datGui.__controllers.forEach((c) => c.updateDisplay());
  pane.refresh();
}

// 
function setupTweakpane() {
  pane.addBinding(params, "palette", {
    label: "Palette (space)",
    options: { "Palette 1": 0, "Palette 2": 1, "Palette 3": 2 },
  }).on("change", (ev) => applyPalette(ev.value));
  pane.addBinding(params, "speed", { label: "Speed", min: 0, max: 3 });
  pane.addBinding(params, "autoRotate", { label: "Auto-rotate" });
  pane.addBinding(params, "adaptive", { label: "Auto quality" });
  pane.addBinding(params, "quality", { label: "Resolution", min: 0.4, max: 1, step: 0.05 })
    .on("change", applyResolution);

  const f = pane.addFolder({ title: "Counts" });
  f.addBinding(params, "buildings", { min: 0.05, max: 1 });
  f.addBinding(params, "drifters", { min: 0, max: 300, step: 1 });
  f.addBinding(params, "streaks", { min: 0, max: 100, step: 1 });
  f.addBinding(params, "sparkles", { min: 0, max: 1500, step: 1 });
  f.addBinding(params, "jellies", { min: 0, max: 14, step: 1 });
}

function setupDatGui() {
  if (typeof dat === "undefined") {
    console.warn("dat.GUI not loaded — add its <script> tag to index.html");
    return;
  }
  const gui = (datGui = new dat.GUI({ autoPlace: false, width: 260 }));
  Object.assign(gui.domElement.style, { position: "fixed", left: "8px", top: "8px", zIndex: 5 });
  document.body.appendChild(gui.domElement);

  gui.add(params, "fogFar", 1500, 9000).name("fog distance").onChange((v) => (scene.fog.far = v));
  gui.addColor(params, "fogColor").name("fog color").onChange((v) => scene.fog.color.set(v));
  gui.add(params, "sun", 0, 5).name("sun").onChange((v) => (sun.intensity = v));
  gui.addColor(params, "sunColor").name("sun color").onChange((v) => sun.color.set(v));
  gui.add(params, "ambient", 0, 3).name("ambient").onChange((v) => (hemi.intensity = v));
  gui.add(params, "reflections", 0, 3).onChange((v) => (cityMat.envMapIntensity = v));
  gui.addColor(params, "ringColor").name("ring color").onChange((v) => {
    rings[0].material.color.set(v);
    rings[1].material.color.set(v);
  });
  gui.add(params, "lineOpacity", 0, 1).name("line opacity").onChange((v) => lineMats.forEach((m) => (m.opacity = v)));
}



function updateThree() {
  const now = performance.now() * 0.001;
  const raw = Math.min(now - lastT, 0.05);
  lastT = now;
  const dt = raw * params.speed;
  simT += dt;


  controls.autoRotate = params.autoRotate;
  controls.update();

  city.count = Math.floor(city.userData.total * params.buildings);
  sparkles.geometry.setDrawRange(0, params.sparkles);
  sparkles.rotation.y += 0.01 * dt;

  rings.forEach((r) => {
    r.rotation.x += r.userData.s[0] * dt;
    r.rotation.y += r.userData.s[1] * dt;
    r.rotation.z += r.userData.s[2] * dt;
  });

  for (let i = 0; i < drifters.length; i++) {
    const m = drifters[i];
    m.visible = i < params.drifters;
    if (!m.visible) continue;
    const u = m.userData, p = m.position;
    p.x = wrap(p.x + u.v[0] * dt);
    p.z = wrap(p.z + u.v[2] * dt);
    p.y += (u.v[1] + Math.sin(simT * 0.8 + u.ph) * 12) * dt;
    if (p.y < 120 || p.y > 1400) u.v[1] *= -1;
    m.rotation.x += u.s[0] * dt;
    m.rotation.y += u.s[1] * dt;
    m.rotation.z += u.s[2] * dt;
  }

  for (let i = 0; i < streaks.length; i++) {
    const s = streaks[i];
    s.visible = i < params.streaks;
    if (!s.visible) continue;
    s.position.addScaledVector(s.userData.d, s.userData.sp * dt);
    if (s.position.length() > world_half * 1.3) s.position.multiplyScalar(-0.95);
  }


  for (let i = 0; i < jellies.length; i++) {
    const j = jellies[i];
    j.visible = i < params.jellies;
    if (!j.visible) continue;
    const u = j.userData;
    u.a += u.sp * dt * 0.3;
    j.position.set(
      u.cx + Math.cos(u.a) * u.r,
      u.y + Math.sin(simT * 0.7 + u.ph) * 60,
      u.cz + Math.sin(u.a) * u.r
    );
    const p = Math.sin(simT * 2.5 + u.ph);
    u.dome.scale.set(40 - 4 * p, 40 + 6 * p, 40 - 4 * p);
    for (const te of u.tents) {
      const a = te.arr;
      for (let s = 0; s < SEG; s++) {
        a[s * 3] = te.bx + Math.sin(simT * 2 - s * 0.55 + te.k + u.ph) * s * 2.4;
        a[s * 3 + 1] = -s * 9 + p * 3;
        a[s * 3 + 2] = te.bz + Math.cos(simT * 1.6 - s * 0.5 + te.k) * s * 2.4;
      }
      te.line.geometry.attributes.position.needsUpdate = true;
    }
  }
}
