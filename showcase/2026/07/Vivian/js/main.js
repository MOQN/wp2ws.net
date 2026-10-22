const params = {
  fps: 0,
  near: 38,
  far: 80,
  background: 0xd8e4c6,
  sway: 0.03,
  lightIntensity: 6.6,
  ambient: 0.66,
  hills: 1,
  mistOpacity: 0.2,
  mistSize: 6.4,
  fireflyCount: 36,
  fireflySize: 0.42,
  fireflySpeed: 0.6,
};

const MODEL_FILES = {
  hero: "assets/models/hero_tree/hero_tree.glb",
  tree: "assets/models/side_tree/side_tree.glb",
  bush: "assets/models/bush/bush.glb",
  flower: "assets/models/flower/flower.glb",
};

let ground;
let stream;
let mist;
let sun;
let ambientLight;
let hillApplied = 1;
let fireflyPoints;
let fireflyMaterial;
let fireflies = [];
const FIREFLY_MAX = 60;
let river;
let plants = [];

const WATER_Y = 0.72;
const POOL = { x: 0, z: -31, rx: 15.4, rz: 12.1 };
const ISLAND = { x: 0, z: -31, rx: 6.5, rz: 5.35 };
const BACK = { x: -1, z: -46, rx: 4.2, rz: 7.6 };
const BRANCH = { x: 18, z: -30, rx: 7.4, rz: 3.6 };
let linearFog;

function setupThree() {
  camera.fov = 54;
  camera.updateProjectionMatrix();
  camera.position.set(0.4, 3.3, 12);
  controls.target.set(0, 6, -31);

  scene.background = new THREE.Color(params.background);
  scene.environment = null;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  linearFog = new THREE.Fog(params.background, params.near, params.far);
  scene.fog = linearFog;

  ambientLight = new THREE.AmbientLight(0xfff4dc, params.ambient);
  scene.add(ambientLight);

  const hemi = new THREE.HemisphereLight(0xfff6d4, 0x6a8458, 0.48);
  scene.add(hemi);

  sun = new THREE.DirectionalLight(0xfff3c2, params.lightIntensity);
  sun.position.set(-26, 32, -48);
  sun.target.position.set(4, 2, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -46;
  sun.shadow.camera.right = 46;
  sun.shadow.camera.top = 46;
  sun.shadow.camera.bottom = -46;
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.012;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  scene.add(sun.target);

  const heroLight = new THREE.PointLight(0xffe3a0, 36, 34, 2);
  heroLight.position.set(1.5, 18, -22);
  scene.add(heroLight);

  const fill = new THREE.DirectionalLight(0xfff3c4, 2.6);
  fill.position.set(-10, 14, 22);
  fill.target.position.set(0, 3, -12);
  scene.add(fill);
  scene.add(fill.target);

  buildRiver();
  ground = getGround();
  stream = getStream();
  getPads();
  getMist();
  getFireflies();
  getHorizon();
  loadGarden();

  pane.title = "Synthetic Eden";

  const flyFolder = pane.addFolder({ title: "FIREFLIES" });
  flyFolder.addBinding(params, "fireflyCount", { min: 0, max: 60, step: 1, label: "count" });
  flyFolder.addBinding(params, "fireflySize", { min: 0.2, max: 0.8, label: "size" });
  flyFolder.addBinding(params, "fireflySpeed", { min: 0.15, max: 1.1, label: "speed" });

  const mistFolder = pane.addFolder({ title: "MIST" });
  mistFolder.addBinding(params, "mistOpacity", { min: 0, max: 0.4, label: "opacity" });
  mistFolder.addBinding(params, "mistSize", { min: 3, max: 9, label: "size" });

  const lightFolder = pane.addFolder({ title: "LIGHT" });
  lightFolder.addBinding(params, "lightIntensity", { min: 3.5, max: 8.5, label: "sun" });
  lightFolder.addBinding(params, "ambient", { min: 0.4, max: 0.95 });

  pane.addBinding(params, "background", { view: "color" });

  const gui = new dat.GUI();
  gui.add(params, "near", 22, 52).step(1);
  gui.add(params, "far", 64, 110).step(1);
  gui.add(params, "hills", 0.75, 1.25).step(0.01);
  const placed = gui.domElement.parentElement;
  placed.style.right = "auto";
  placed.style.left = "0px";
}

function updateThree() {
  scene.background.set(params.background);
  scene.fog.color.set(params.background);
  linearFog.near = params.near;
  linearFog.far = Math.max(params.far, params.near + 12);
  sun.intensity = params.lightIntensity;
  ambientLight.intensity = params.ambient;
  if (mist) {
    mist.material.opacity = params.mistOpacity;
    mist.material.size = params.mistSize;
  }
  if (ground && params.hills !== hillApplied) {
    reshapeGround();
    hillApplied = params.hills;
  }

  for (const plant of plants) {
    plant.update();
  }
  updateMist();
  updateFireflies();
}

function terrainHeight(x, z) {
  const broad = noise((x + 180) * 0.0052, (z + 180) * 0.0052);
  const wider = noise((x - 40) * 0.0026, (z + 90) * 0.0026);
  const n = broad * 0.65 + wider * 0.35;
  const t = Math.min(1, Math.max(0, (n - 0.2) / 0.5));
  const smooth = t * t * (3 - 2 * t);
  const hills = 1.35 + smooth * 6.2 * params.hills;

  if (onIsland(x, z)) {
    const e = ellipseDist(x, z, ISLAND.x, ISLAND.z, ISLAND.rx, ISLAND.rz);
    return 0.92 + (1 - e) * 0.16;
  }
  if (river && inWater(x, z)) return 0.18;

  let shore = 8;
  if (river) {
    shore = 99;
    river.center.forEach(function (c) {
      shore = Math.min(shore, Math.max(0, Math.hypot(x - c.x, z - c.z) - c.w));
    });
    shore = Math.min(shore, Math.max(0, (ellipseDist(x, z, POOL.x, POOL.z, POOL.rx, POOL.rz) - 1) * 12));
    shore = Math.min(shore, Math.max(0, (ellipseDist(x, z, BACK.x, BACK.z, BACK.rx, BACK.rz) - 1) * 5));
    shore = Math.min(shore, Math.max(0, (ellipseDist(x, z, BRANCH.x, BRANCH.z, BRANCH.rx, BRANCH.rz) - 1) * 4));
  }
  const u = Math.min(1, shore / 26);
  const fade = u * u * (3 - 2 * u);
  return 0.58 + (hills - 0.58) * fade;
}

function softenTurf(image) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.filter = "contrast(0.46) saturate(0.72) brightness(1.18) blur(2.8px)";
  ctx.drawImage(image, 0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.MirroredRepeatWrapping;
  texture.wrapT = THREE.MirroredRepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getGround() {
  const geometry = new THREE.PlaneGeometry(240, 240, 80, 80);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    positions.setZ(i, terrainHeight(x, -y));
  }
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x6f7c40,
    roughness: 1,
    metalness: 0,
  });
  new THREE.TextureLoader().load("assets/textures/turf.jpg", function (source) {
    material.map = softenTurf(source.image);
    material.color.set(0xffffff);
    material.needsUpdate = true;
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function reshapeGround() {
  const positions = ground.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    positions.setZ(i, terrainHeight(positions.getX(i), -positions.getY(i)));
  }
  positions.needsUpdate = true;
  ground.geometry.computeVertexNormals();
}

function ellipseDist(x, z, cx, cz, rx, rz) {
  return Math.hypot((x - cx) / rx, (z - cz) / rz);
}

function onIsland(x, z) {
  return ellipseDist(x, z, ISLAND.x, ISLAND.z, ISLAND.rx, ISLAND.rz) < 1;
}

function inWater(x, z) {
  if (!river || onIsland(x, z)) return false;
  if (ellipseDist(x, z, POOL.x, POOL.z, POOL.rx + 0.8, POOL.rz + 0.6) < 1) return true;
  if (ellipseDist(x, z, BACK.x, BACK.z, BACK.rx + 0.4, BACK.rz + 0.4) < 1) return true;
  if (ellipseDist(x, z, BRANCH.x, BRANCH.z, BRANCH.rx + 0.4, BRANCH.rz + 0.4) < 1) return true;
  for (let i = 0; i < river.center.length; i++) {
    const c = river.center[i];
    if (Math.hypot(x - c.x, z - c.z) < c.w + 0.35) return true;
  }
  return false;
}

function radialLoop(cx, cz, rx, rz, count, wobble, seed) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const k = 1 + (noise(Math.cos(a) * 2 + seed, Math.sin(a) * 2) - 0.5) * wobble;
    const x = cx + Math.cos(a) * rx * k;
    const z = cz + Math.sin(a) * rz * k;
    const ox = Math.cos(a);
    const oz = Math.sin(a);
    pts.push({ x: x, z: z, ox: ox, oz: oz });
  }
  return pts;
}

function shapeFromLoop(loop, holeLoop) {
  const shape = new THREE.Shape();
  shape.moveTo(loop[0].x, -loop[0].z);
  for (let i = 1; i < loop.length; i++) shape.lineTo(loop[i].x, -loop[i].z);
  shape.lineTo(loop[0].x, -loop[0].z);
  if (holeLoop) {
    const hole = new THREE.Path();
    const last = holeLoop.length - 1;
    hole.moveTo(holeLoop[last].x, -holeLoop[last].z);
    for (let i = last - 1; i >= 0; i--) hole.lineTo(holeLoop[i].x, -holeLoop[i].z);
    shape.holes.push(hole);
  }
  return new THREE.ShapeGeometry(shape);
}

function mergeShapes(geometries) {
  let count = 0;
  geometries.forEach(function (geometry) {
    count += geometry.attributes.position.count;
  });
  const positions = new Float32Array(count * 3);
  const indices = [];
  let base = 0;
  geometries.forEach(function (geometry) {
    const src = geometry.attributes.position;
    for (let i = 0; i < src.count; i++) {
      positions[(base + i) * 3] = src.getX(i);
      positions[(base + i) * 3 + 1] = src.getY(i);
      positions[(base + i) * 3 + 2] = src.getZ(i);
    }
    const index = geometry.index;
    for (let i = 0; i < index.count; i++) indices.push(index.getX(i) + base);
    base += src.count;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

function buildRiver() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.4, 0, 22),
    new THREE.Vector3(-2.6, 0, 12),
    new THREE.Vector3(2.3, 0, 2),
    new THREE.Vector3(-1.2, 0, -10),
    new THREE.Vector3(0.3, 0, -22),
  ]);
  const left = [];
  const right = [];
  const center = [];
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const len = Math.hypot(tan.x, tan.z) || 1;
    const ox = -tan.z / len;
    const oz = tan.x / len;
    const w = 3.3 + (noise(t * 3.1, 1.4) - 0.5) * 1.5 + t * 0.9;
    left.push({ x: p.x + ox * w, z: p.z + oz * w, ox: ox, oz: oz });
    right.push({ x: p.x - ox * w, z: p.z - oz * w, ox: -ox, oz: -oz });
    center.push({ x: p.x, z: p.z, w: w });
  }

  const pool = radialLoop(POOL.x, POOL.z, POOL.rx, POOL.rz, 48, 0.16, 2);
  const hole = radialLoop(ISLAND.x, ISLAND.z, ISLAND.rx, ISLAND.rz, 28, 0.1, 5);
  const back = radialLoop(BACK.x, BACK.z, BACK.rx, BACK.rz, 24, 0.2, 8);
  const branch = radialLoop(BRANCH.x, BRANCH.z, BRANCH.rx, BRANCH.rz, 22, 0.22, 11);
  const ribbon = left.concat(right.slice().reverse());

  river = {
    center: center,
    hole: hole,
    edges: [left, right, pool, back, branch],
    parts: [ribbon, pool, back, branch],
  };
}

function getStream() {
  const geometries = [
    shapeFromLoop(river.parts[0]),
    shapeFromLoop(river.parts[1], river.hole),
    shapeFromLoop(river.parts[2]),
    shapeFromLoop(river.parts[3]),
  ];
  const mesh = new Reflector(mergeShapes(geometries), {
    clipBias: 0.003,
    textureWidth: 512,
    textureHeight: 512,
    color: 0xa9cfc0,
  });
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = WATER_Y;
  scene.add(mesh);
  return mesh;
}

function getPads() {
  const geometry = new THREE.CircleGeometry(0.55, 12);
  const material = new THREE.MeshStandardMaterial({
    color: 0x6a8a3a,
    roughness: 0.85,
  });
  river.center.forEach(function (spot, i) {
    if (i % 5 !== 0 || spot.z < -8) return;
    const pad = new THREE.Mesh(geometry, material);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(spot.x + random(-0.5, 0.5), WATER_Y + 0.06, spot.z + random(-0.4, 0.4));
    pad.scale.setScalar(random(0.7, 1.35));
    scene.add(pad);
  });
}

const MOSS = [0x8ea67c, 0x738a64, 0x9aaf88, 0x627856, 0xa4b496, 0x7d9470];

function mossMaterial(index) {
  return new THREE.MeshStandardMaterial({ color: MOSS[index % MOSS.length], roughness: 1 });
}

function getFireflies() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  const spot = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
  spot.addColorStop(0, "rgba(255,236,170,1)");
  spot.addColorStop(0.35, "rgba(255,210,90,0.7)");
  spot.addColorStop(1, "rgba(255,200,80,0)");
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, 32, 32);
  const map = new THREE.CanvasTexture(canvas);

  const positions = [];
  for (let i = 0; i < FIREFLY_MAX; i++) {
    const fly = new Firefly()
      .setPosition(random(-16, 16), random(1.6, 5.4), random(-36, 4))
      .setVelocity(random(-0.015, 0.015), random(-0.006, 0.008), random(-0.015, 0.015));
    fireflies.push(fly);
    positions.push(fly.pos.x, fly.pos.y, fly.pos.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setDrawRange(0, params.fireflyCount);
  fireflyMaterial = new THREE.PointsMaterial({
    map: map,
    color: 0xffe3a0,
    size: params.fireflySize,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  fireflyPoints = new THREE.Points(geometry, fireflyMaterial);
  scene.add(fireflyPoints);
}

function updateFireflies() {
  if (!fireflyPoints) return;
  const pos = fireflyPoints.geometry.attributes.position;
  const count = Math.max(0, Math.min(FIREFLY_MAX, Math.round(params.fireflyCount)));
  for (let i = 0; i < count; i++) {
    const fly = fireflies[i];
    fly.flow(params.fireflySpeed);
    fly.updatePosition();
    if (fly.pos.x < -18 || fly.pos.x > 18) fly.vel.x *= -1;
    if (fly.pos.z < -40 || fly.pos.z > 6) fly.vel.z *= -1;
    if (fly.pos.y < 1 || fly.pos.y > 6.5) fly.vel.y *= -1;
    pos.setXYZ(i, fly.pos.x, fly.pos.y, fly.pos.z);
  }
  pos.needsUpdate = true;
  fireflyPoints.geometry.setDrawRange(0, count);
  fireflyMaterial.size = params.fireflySize;
}

function getMist() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const spot = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  spot.addColorStop(0, "rgba(255,255,255,0.7)");
  spot.addColorStop(0.4, "rgba(232,240,220,0.28)");
  spot.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(canvas);

  const positions = [];
  const baseY = [];
  let guard = 0;
  while (positions.length < 660 && guard < 1200) {
    guard++;
    const angle = random(0, Math.PI * 2);
    const reach = random(0.48, 1);
    const x = Math.cos(angle) * POOL.rx * reach;
    const z = POOL.z + Math.sin(angle) * POOL.rz * reach;
    if (onIsland(x, z) || !inWater(x, z)) continue;
    const y = WATER_Y + random(0.2, 1.6);
    positions.push(x, y, z);
    baseY.push(y);
  }
  river.center.forEach(function (c) {
    if (c.z < -8 || c.z > 16) return;
    for (let k = 0; k < 4; k++) {
      const y = WATER_Y + random(0.25, 1.3);
      positions.push(c.x + random(-c.w * 0.7, c.w * 0.7), y, c.z + random(-1.4, 1.4));
      baseY.push(y);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  mist = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: map,
      color: 0xe7f0dc,
      size: 6.4,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      alphaTest: 0.02,
      sizeAttenuation: true,
    })
  );
  mist.userData.baseY = baseY;
  scene.add(mist);
}

function updateMist() {
  if (!mist) return;
  const pos = mist.geometry.attributes.position;
  const baseY = mist.userData.baseY;
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i) + 0.004;
    if (y > baseY[i] + 0.7) y = baseY[i];
    pos.setY(i, y);
    pos.setX(i, pos.getX(i) + sin(frame * 0.01 + i) * 0.003);
  }
  pos.needsUpdate = true;
}

function getHorizon() {
  const trunkGeo = new THREE.CylinderGeometry(0.4, 0.62, 1, 6);
  const crownGeo = new THREE.SphereGeometry(1, 7, 5);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d624c, roughness: 1 });
  const placed = [];
  let guard = 0;
  while (placed.length < 16 && guard < 90) {
    guard++;
    const row = guard % 3;
    const n1 = noise(guard * 0.41, 2.4 + row);
    const n2 = noise(guard * 0.67, 9.1);
    const x = -108 + n1 * 216 + (row === 1 ? 13 : row === 2 ? -8 : 0);
    const z = -56 - row * 9 - n2 * 26;
    let clear = true;
    for (let k = 0; k < placed.length; k++) {
      if (Math.hypot(placed[k].x - x, placed[k].z - z) < 16) clear = false;
    }
    if (!clear) continue;
    placed.push({ x: x, z: z });
    const crownMat = mossMaterial(placed.length + row);
    const groundY = terrainHeight(x, z);
    const height = 8 + noise(x * 0.1, z * 0.1) * 11;
    const width = 4.6 + noise(z * 0.08, x * 0.05) * 4.2;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.scale.set(1, height * 0.34, 1);
    trunk.position.set(x, groundY + height * 0.12, z);
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.scale.set(width, height * 0.42, width * random(0.72, 0.95));
    crown.position.set(x + random(-1.2, 1.2), groundY + height * 0.46, z);
    const cap = new THREE.Mesh(crownGeo, mossMaterial(placed.length + 2));
    cap.scale.set(width * 0.55, height * 0.22, width * 0.48);
    cap.position.set(x + random(-1.6, 1.6), groundY + height * 0.68, z + random(-0.8, 0.8));
    scene.add(trunk);
    scene.add(crown);
    scene.add(cap);
  }
}

function loadGarden() {
  const loader = new GLTFLoader();
  const names = Object.keys(MODEL_FILES);
  const templates = {};
  let left = names.length;

  names.forEach(function (name) {
    loader.load(
      MODEL_FILES[name],
      function (gltf) {
        const list = templatesFrom(gltf);
        list.forEach(hardenAlpha);
        templates[name] = list;
        left--;
        if (left === 0) {
          layoutGarden(templates);
        }
      },
      undefined,
      function (error) {
        console.error(name, error);
      }
    );
  });
}

function templatesFrom(gltf) {
  const children = gltf.scene.children;
  const lod0 = children.filter(function (child) {
    return child.name.indexOf("LOD0") !== -1;
  });
  if (lod0.length > 0) return lod0;
  return children.filter(function (child) {
    return child.name.indexOf("LOD") === -1;
  });
}

function hardenAlpha(root) {
  root.traverse(function (child) {
    if (!child.isMesh) return;
    const materials = [].concat(child.material);
    materials.forEach(function (material) {
      if (material.transparent || material.alphaMap) {
        material.transparent = false;
        material.alphaTest = 0.45;
        material.depthWrite = true;
      }
    });
  });
}

function layoutGarden(templates) {
  const hero = templates.hero[0];
  const tree = templates.tree[0];
  const bush = templates.bush[0];
  const flower = templates.flower[0];

  addPlant(hero, 0, -31, 21.5, 0.002, 25, { yaw: 0.35, sink: 0.028 });
  addRootMoss();

  const saplings = [
    [-12, 2, 6.2],
    [14, -6, 7.4],
    [-17, -14, 8.5],
    [18, -18, 7.6],
    [-36, -58, 9],
    [-46, -52, 7.1],
    [46, -52, 6.4],
  ];
  saplings.forEach(function (spot) {
    if (inWater(spot[0], spot[1]) || onIsland(spot[0], spot[1])) return;
    const side = spot[0] < 0 ? -1 : 1;
    addPlant(tree, spot[0], spot[1], spot[2], 0.004, spot[2] + 1.5, {
      yaw: random(-0.8, 0.8),
      lean: side * random(-0.05, 0.04),
      castShadow: spot[1] > -30,
    });
  });

  layoutShore(flower, bush);
}

function addRootMoss() {
  const geo = new THREE.SphereGeometry(1, 5, 4);
  const material = new THREE.MeshStandardMaterial({ color: 0x7c8656, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const angle = (i / 26) * Math.PI * 2 + random(-0.08, 0.08);
    const reach = random(1.02, 1.42);
    const x = ISLAND.x + Math.cos(angle) * ISLAND.rx * reach;
    const z = ISLAND.z + Math.sin(angle) * ISLAND.rz * reach;
    const mesh = new THREE.Mesh(geo, material);
    const s = random(1.8, 3.1);
    mesh.scale.set(s * random(1.5, 2.1), s * 0.12, s * random(1.1, 1.5));
    mesh.position.set(x, 0.8, z);
    mesh.rotation.y = angle;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}

function nearHero(x, z) {
  return Math.hypot(x - ISLAND.x, (z - ISLAND.z) * 1.15) < 9.5;
}

function tryPlant(template, x, z, height, sway, span, pose) {
  if (inWater(x, z) || nearHero(x, z)) return;
  addPlant(template, x, z, height, sway, span, pose);
}

function addGreenClump(x, z) {
  if (inWater(x, z) || nearHero(x, z)) return;
  const geo = new THREE.SphereGeometry(1, 6, 5);
  const count = random() > 0.45 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geo, mossMaterial(Math.floor(random(0, MOSS.length))));
    const s = random(1.1, 2.3);
    mesh.scale.set(s * random(1.1, 1.6), s * random(0.38, 0.58), s * random(0.9, 1.3));
    mesh.position.set(
      x + random(-0.8, 0.8),
      terrainHeight(x, z) + s * 0.16,
      z + random(-0.7, 0.7)
    );
    scene.add(mesh);
  }
}

function layoutShore(flower, bush) {
  river.edges.forEach(function (edge, edgeIndex) {
    if (edgeIndex > 1) return;
    edge.forEach(function (p, i) {
      if (p.z < -18) return;
      const front = p.z > -2;
      const open = noise(p.z * 0.2, p.x * 0.2 + edgeIndex) > 0.38;
      const pull = open ? random(4.6, 9) : 0;
      const along = open ? random(-1.7, 1.7) : random(-0.35, 0.35);
      const layers = front ? [1.15, 2.4 + pull * 0.4, 4.1 + pull] : [1.4, 3.1 + pull * 0.75];
      layers.forEach(function (dist, layer) {
        const x = p.x + p.ox * dist + random(-0.45, 0.45);
        const z = p.z + p.oz * dist * 0.15 + along;
        if (layer === 0 || i % 2 === 0) {
          tryPlant(flower, x, z, random(1.25, 1.75), params.sway, 2.5, { castShadow: false });
        }
        if (layer > 0) {
          let bx = x + p.ox * 0.45;
          let bz = z + random(-0.4, 0.4);
          if (bz > 8) {
            bz -= 3.4;
            bx += p.ox * 1.2;
          }
          tryPlant(bush, bx, bz, front ? random(2.8, 3.8) : random(2.4, 3.3), 0.01, 4.8);
        }
      });
      if (front && i % 5 === 0) {
        const rx = p.x + p.ox * 0.85;
        const rz = p.z + p.oz * 0.25;
        if (!inWater(rx, rz) && !nearHero(rx, rz)) addRock(rx, rz, random(0.35, 0.7));
      }
    });
  });

  river.edges[2].forEach(function (p, i) {
    if (i % 2 !== 0 || Math.abs(p.x) < 12 || p.z < -40) return;
    const open = noise(p.x * 0.25, p.z * 0.25) > 0.52;
    const x = p.x + p.ox * (open ? random(4.2, 8) : random(1.5, 3.2));
    const z = p.z + p.oz * (open ? random(1.2, 2.6) : random(0.5, 1.4));
    tryPlant(flower, x, z, random(1.25, 1.7), params.sway, 2.4, { castShadow: false });
    if (i % 4 === 0) {
      tryPlant(bush, x + p.ox * 1.6, z + random(-0.5, 0.5), random(2.5, 3.5), 0.01, 4.6);
    }
  });

  for (let i = 0; i < 26; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -16 - (i % 13) * 2.6;
    const x = side * (12 + (i % 4) * 4.5 + random(-1.2, 1.2));
    tryPlant(flower, x, z + random(-0.6, 0.6), random(1.2, 1.65), params.sway, 2.4, { castShadow: false });
    if (i % 2 === 0) {
      tryPlant(bush, x + side * random(1.2, 2.4), z + random(-0.8, 0.8), random(2.4, 3.4), 0.01, 4.5);
    }
    if (i % 3 === 0) addGreenClump(x + side * random(2, 5), z + random(-1.5, 1.5));
  }

  for (let i = 0; i < 20; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * random(11, 22);
    const z = random(-10, 16);
    tryPlant(flower, x, z, random(1.25, 1.7), params.sway, 2.4, { castShadow: false });
    if (i % 3 === 0) {
      let bz = z + random(-1, 1);
      let bx = x + side * random(1.2, 2.2);
      if (bz > 8) {
        bz -= 3.4;
        bx += side * 1.2;
      }
      tryPlant(bush, bx, bz, random(2.4, 3.2), 0.01, 4.4);
    }
  }

  for (let i = 0; i < 28; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * random(12, 28);
    const z = random(-52, -18);
    tryPlant(flower, x + random(-0.8, 0.8), z + random(-0.8, 0.8), random(1.2, 1.65), params.sway, 2.4, {
      castShadow: false,
    });
    if (i % 2 === 0) {
      tryPlant(bush, x + side * random(1.4, 2.6), z + random(-1, 1), random(2.3, 3.3), 0.01, 4.4);
    }
  }
}

function addRock(x, z, size) {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const vx = positions.getX(i);
    const vy = positions.getY(i);
    const vz = positions.getZ(i);
    const n = noise(vx * 1.4 + x, vy * 1.4, vz * 1.4 + z);
    const s = 0.86 + n * 0.22;
    positions.setXYZ(i, vx * s, vy * s, vz * s);
  }
  geometry.computeVertexNormals();

  const moss = noise(x * 0.4, z * 0.4) > 0.42;
  const material = new THREE.MeshStandardMaterial({
    color: moss ? 0x6e7c48 : 0x8a8774,
    roughness: 0.96,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.scale.set(size * random(0.9, 1.35), size * random(0.7, 0.95), size * random(0.9, 1.3));
  mesh.rotation.set(random(-0.2, 0.2), random(0, Math.PI * 2), random(-0.2, 0.2));
  mesh.position.set(x, Math.max(terrainHeight(x, z), WATER_Y - 0.08) + size * 0.28, z);
  scene.add(mesh);
}

function addPlant(template, x, z, height, sway, maxSpan, pose) {
  const object = template.clone(true);
  object.position.set(0, 0, 0);
  object.rotation.set(0, 0, 0);
  object.scale.set(1, 1, 1);
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  let scale = height / Math.max(size.y, 0.001);
  const span = Math.max(size.x, size.z) * scale;
  if (maxSpan && span > maxSpan) {
    scale *= maxSpan / span;
  }
  object.scale.multiplyScalar(scale);

  if (pose && pose.yaw !== undefined) {
    object.rotation.y = pose.yaw;
  } else {
    object.rotation.y = random(0, Math.PI * 2);
  }
  if (pose) {
    object.rotation.z = pose.lean || 0;
    object.rotation.x = pose.tilt || 0;
  }
  object.updateMatrixWorld(true);

  const fitted = new THREE.Box3().setFromObject(object);
  const fittedSize = new THREE.Vector3();
  fitted.getSize(fittedSize);
  const sink = pose && pose.sink ? fittedSize.y * pose.sink : 0;
  object.position.set(x, terrainHeight(x, z) - fitted.min.y - sink, z);
  const cast = !pose || pose.castShadow !== false;
  object.traverse(function (child) {
    if (!child.isMesh) return;
    child.castShadow = cast;
    child.receiveShadow = true;
  });
  scene.add(object);
  plants.push(new GardenPlant(object, sway));
  return object;
}

class Firefly {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();
  }

  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    return this;
  }

  setVelocity(x, y, z) {
    this.vel.set(x, y, z);
    return this;
  }

  applyForce(force) {
    this.acc.add(force);
  }

  updatePosition() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.set(0, 0, 0);
  }

  flow(speed) {
    const drift = noise(this.pos.x * 0.08, this.pos.z * 0.08, frame * 0.004);
    const force = new THREE.Vector3(cos(frame * 0.01 + this.pos.z), sin(frame * 0.013 + this.pos.x) * 0.35, sin(drift * 6));
    force.normalize();
    force.multiplyScalar(0.0008 * speed);
    this.applyForce(force);
  }
}

class GardenPlant {
  constructor(object, amount) {
    this.object = object;
    this.amount = amount;
    this.phase = random(0, Math.PI * 2);
    this.baseZ = object.rotation.z;
  }

  update() {
    this.object.rotation.z = this.baseZ + sin(frame * 0.012 + this.phase) * this.amount;
  }
}
