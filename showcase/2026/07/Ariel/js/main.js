let params = {
  fps: 0,
  cameraMode: "fixed",
  autoRotate: true,
  rotateSpeed: 0.25,
  skyBrightness: 0.9,
  fogDensity: 0.00012,
  sway: 5.0,
  showSky: true,
  mirror: true,
  clarity: 0.6,
  mirrorClarityNow: 0.6,
  river: true,
  riverSpeed: 1.0,
  riverBrightness: 0.45,
  riverTint: 0x9a8fb8,
  riverLight: 3.0,
  reflectRiver: true,
};

let emotion = {
  intensity: 0.3,
  autoIntensity: true,
  chargeSpeed: 1.0,
  glitchChance: 1.0,
  butterflySize: 1.0,
  releaseButterfly: function () {
    releaseButterfly(true);
  },
  triggerGlitch: function () {
    startGlitch(24);
  },
};

const GLASS = [
  { kind: 2, size: 1750, x: -3300, z: -2700 },
  { kind: 3, size: 1900, x: 300, z: -3500 },
  { kind: 0, size: 1700, x: 3300, z: -2500 },
  { kind: 1, size: 1450, x: -2500, z: -300 },
  { kind: 1, size: 1000, x: -400, z: 1200 },
  { kind: 3, size: 1800, x: 800, z: -200 },
  { kind: 0, size: 1400, x: 2100, z: 1300 },
];
const CRYSTAL_RADIUS = [0.24, 0.62, 0.19, 0.38];
const CRYSTAL_FILES = ["crystal_1.glb", "crystal_2.glb", "crystal_3.glb", "crystal_4.glb"];
const CRYSTAL_SIZES = [110, 70, 120, 75];
const BUTTERFLY_COLOR = 0xd9ccff;
const MAX_BUTTERFLIES = 25;
const FAR_LIGHT_POS = [0, 2600, -5200];
const TOP_Y = 3200;
const MIRROR_Y = -800;
const SWAY_ANGLE = 0.0078;

let gui;
let hdrTexture;
let skyDome, mirror;
let mirrorScale = -1;
let calmFog, restlessFog;
let glassPieces = [];
let strands = [];
let threadMaterial;
let beadSlots = [];
let smallCrystals = [null, null, null, null];
let reflectiveMaterials = [];
let butterflyModel;
let butterflies = [];
let birthTimer = 0;
let glitchFrames = 0;
let rivers = [];
let riverVideo, riverTexture, riverFade, riverSampler;
let riverLights = [];
let riverColor = { r: 0, g: 0, b: 0 };
let riverEnvGraphics, riverEnvTexture;

function setupThree() {
  controls.minDistance = 300;
  controls.maxDistance = 5000;
  setCameraMode(params.cameraMode);

  renderer.setClearColor(0x000000);
  skyDome = getSkyDome("assets/sky/night_sky.jpg");
  scene.add(skyDome);

  calmFog = new THREE.Color(0x000000);
  restlessFog = new THREE.Color(0x0c0208);
  scene.fog = new THREE.FogExp2(calmFog.getHex(), params.fogDensity);

  loadHDR("assets/test_2k.hdr");

  const ambientLight = new THREE.AmbientLight(0x8877cc, 1.7);
  scene.add(ambientLight);
  const moonLight = new THREE.DirectionalLight(0xb8c4ff, 1.6);
  moonLight.position.set(0, 2000, -3000);
  scene.add(moonLight);

  mirror = getMirror();
  mirror.rotateX(-Math.PI / 2);
  mirror.position.y = MIRROR_Y;
  scene.add(mirror);
  window.addEventListener("resize", function () {
    mirrorScale = -1;
  });

  setupRivers("assets/silk.mp4");
  setupRiverReflection();

  threadMaterial = new THREE.MeshBasicMaterial({ color: 0xcfc4ff, transparent: true, opacity: 0.35 });
  const taken = GLASS.map((g) => ({ x: g.x, z: g.z, r: g.size * CRYSTAL_RADIUS[g.kind] + 400 }));
  let tries = 0;
  while (strands.length < 16 && tries < 2000) {
    tries++;
    const a = random(TWO_PI);
    const r = random(400, 2600);
    const x = cos(a) * r;
    const z = sin(a) * r;
    const tooClose = taken.some((t) => dist(x, z, t.x, t.z) < t.r);
    if (tooClose) continue;
    taken.push({ x: x, z: z, r: 380 });
    strands.push(new HangingStrand(x, random(80, 900), z));
  }

  loadGLTF("assets/models/butterfly.glb", function (gltfScene) {
    butterflyModel = gltfScene;
    for (let i = 0; i < 6; i++) {
      releaseButterfly(false);
    }
  });
  for (let k = 0; k < CRYSTAL_FILES.length; k++) {
    loadGLTF("assets/models/" + CRYSTAL_FILES[k], function (gltfScene) {
      const model = gltfScene.getObjectByName("crystal");
      const material = getCrystalMaterial(model.material.map);
      for (let i = k; i < strands.length; i += CRYSTAL_FILES.length) {
        strands[i].setCrystal(model.geometry, material, CRYSTAL_SIZES[k]);
      }
    });
    loadGLTF("assets/models/" + CRYSTAL_FILES[k].replace(".glb", "_glass.glb"), function (gltfScene) {
      const model = gltfScene.getObjectByName("crystal");
      for (const g of GLASS.filter((g) => g.kind === k)) {
        addGlassPiece(model.geometry, g);
      }
    });
    loadGLTF("assets/models/" + CRYSTAL_FILES[k].replace(".glb", "_small.glb"), function (gltfScene) {
      const model = gltfScene.getObjectByName("crystal");
      smallCrystals[k] = { geometry: model.geometry, material: getCrystalMaterial(model.material.map, 0) };
      for (const slot of beadSlots) {
        if (slot.kind === k) fillBeadSlot(slot);
      }
    });
  }

  setupTweakpane();
  setupDatGui();
}

function updateThree() {
  controls.autoRotate = params.cameraMode === "free" && params.autoRotate;
  controls.autoRotateSpeed = params.rotateSpeed;
  controls.update();

  if (emotion.autoIntensity) {
    emotion.intensity = constrain(map(noise(frame * 0.0015), 0.3, 0.7, 0, 1), 0, 1);
  }
  const m = emotion.intensity;

  updateGlitch(m);
  const glitching = glitchFrames > 0;

  birthTimer += 0.004 * emotion.chargeSpeed * (0.5 + m * 1.5);
  if (birthTimer >= 1) {
    birthTimer = 0;
    releaseButterfly(true);
  }

  for (let s of strands) {
    s.update(m, glitching);
  }
  for (let r of rivers) {
    r.mesh.visible = params.river;
    if (params.river) r.update(m, glitching);
  }
  updateRiverLights();
  if (params.reflectRiver && frame % 6 === 3) drawRiverEnv();

  mirror.visible = params.mirror;
  updateMirrorClarity(m, glitching);

  for (let g of glassPieces) {
    g.rotation.y += g.userData.spin * (1 + m);
  }

  for (let i = butterflies.length - 1; i >= 0; i--) {
    const b = butterflies[i];
    b.update(m, glitching);
    if (b.isGone()) {
      b.remove();
      butterflies.splice(i, 1);
    }
  }

  skyDome.rotation.y += 0.0002;
  skyDome.material.color.setScalar(params.skyBrightness);
}

function setupTweakpane() {
  const folderEnv = pane.addFolder({ title: "ENVIRONMENT", expanded: true });
  folderEnv.addBinding(params, "cameraMode", {
    label: "camera",
    options: { "fixed (top-down)": "fixed", "free": "free" },
  }).on("change", function (ev) {
    setCameraMode(ev.value);
  });
  folderEnv.addBinding(params, "autoRotate");
  folderEnv.addBinding(params, "rotateSpeed", { min: 0, max: 2, step: 0.01 });
  folderEnv.addBinding(params, "skyBrightness", { min: 0, max: 2, step: 0.01 });
  folderEnv.addBinding(params, "fogDensity", { min: 0, max: 0.002, step: 0.00001 });
  folderEnv.addBinding(params, "sway", { min: 0, max: 10, step: 0.01, label: "thread sway" });
  folderEnv.addBinding(params, "showSky", { label: "sky" }).on("change", function (ev) {
    skyDome.visible = ev.value;
  });

  const folderMirror = pane.addFolder({ title: "MIRROR", expanded: true });
  folderMirror.addBinding(params, "mirror", { label: "show" });
  folderMirror.addBinding(params, "clarity", { min: 0.1, max: 1, step: 0.05 });
  folderMirror.addBinding(params, "mirrorClarityNow", { readonly: true, label: "clarity now" });

  const folderRiver = pane.addFolder({ title: "RIVER", expanded: true });
  folderRiver.addBinding(params, "river", { label: "show" });
  folderRiver.addBinding(params, "riverSpeed", { min: 0, max: 4, step: 0.01, label: "speed" });
  folderRiver.addBinding(params, "riverBrightness", { min: 0, max: 2, step: 0.01, label: "brightness" });
  folderRiver.addBinding(params, "riverTint", { view: "color", label: "tint" });
  folderRiver.addBinding(params, "reflectRiver", { label: "reflect on crystals" }).on("change", function () {
    for (let mat of reflectiveMaterials) {
      mat.envMap = getEnvMap();
      mat.needsUpdate = true;
    }
  });
}

function setupDatGui() {
  gui = new dat.GUI();
  const folder = gui.addFolder("EMOTION");
  folder.add(emotion, "intensity", 0, 1, 0.01).listen();
  folder.add(emotion, "autoIntensity");
  folder.add(emotion, "chargeSpeed", 0, 5, 0.01);
  folder.add(emotion, "glitchChance", 0, 5, 0.01);
  folder.add(emotion, "butterflySize", 0.3, 3, 0.01);
  folder.add(emotion, "releaseButterfly");
  folder.add(emotion, "triggerGlitch");
  folder.open();
}

function setCameraMode(mode) {
  if (mode === "fixed") {
    camera.position.set(500, 2400, 2300);
    controls.target.set(500, -400, -300);
    controls.enabled = false;
  } else {
    controls.enabled = true;
  }
  controls.update();
}

function startGlitch(frames) {
  glitchFrames = Math.max(glitchFrames, frames);
}

function updateGlitch(m) {
  if (glitchFrames > 0) {
    glitchFrames--;
    scene.position.set(random(-1, 1) * 14, random(-1, 1) * 6, 0);
    skyDome.rotation.y += random(-0.04, 0.04);
    scene.fog.color.setHSL(random(), 0.7, 0.12);
    scene.fog.density = params.fogDensity * random(0.5, 3);
  } else {
    scene.position.set(0, 0, 0);
    scene.fog.color.lerpColors(calmFog, restlessFog, m);
    scene.fog.density = params.fogDensity;
    const chance = (0.0004 + Math.pow(m, 3) * 0.012) * emotion.glitchChance;
    if (random() < chance) startGlitch(floor(random(4, 12)));
  }
}

function releaseButterfly(canGlitch) {
  if (!butterflyModel || strands.length === 0) return;
  const p = random(strands).crystal.getWorldPosition(new THREE.Vector3());
  butterflies.push(new Butterfly(BUTTERFLY_COLOR, p.x, p.y, p.z));
  if (butterflies.length > MAX_BUTTERFLIES) {
    butterflies.shift().remove();
  }
  if (canGlitch && random() < 0.3 + emotion.intensity * 0.6) {
    startGlitch(floor(random(8, 20)));
  }
}

function getSkyDome(filepath) {
  const texture = new THREE.TextureLoader().load(filepath);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  const geometry = new THREE.SphereGeometry(7000, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    fog: true,
  });
  material.color.setScalar(params.skyBrightness);
  return new THREE.Mesh(geometry, material);
}

function getMirror() {
  const geometry = new THREE.CircleGeometry(6000, 128);
  const reflector = new Reflector(geometry, {
    clipBias: 0.003,
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
    color: 0x5a5a70,
  });
  return reflector;
}

function updateMirrorClarity(m, glitching) {
  let scale;
  if (glitching) {
    scale = random([0.06, 0.1, 0.15]);
  } else {
    scale = lerp(params.clarity, params.clarity * 0.33, m);
  }
  scale = Math.round(scale * 20) / 20;
  params.mirrorClarityNow = scale;
  if (scale !== mirrorScale) {
    mirrorScale = scale;
    const width = ceil(window.innerWidth * scale);
    const height = ceil(window.innerHeight * scale);
    mirror.getRenderTarget().setSize(width, height);
  }
}

function addGlassPiece(geometry, g) {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xeee8ff,
    metalness: 0,
    roughness: 0.04,
    transmission: 1,
    thickness: 1.5,
    ior: 1.5,
    iridescence: 0.6,
    envMap: hdrTexture,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(g.size);
  mesh.rotation.x = Math.PI;
  mesh.rotation.y = random(TWO_PI);
  mesh.position.set(g.x, MIRROR_Y - g.size * 0.08, g.z);
  mesh.userData.spin = random(0.003, 0.008) * random([-1, 1]);
  scene.add(mesh);
  glassPieces.push(mesh);
}

function getCrystalMaterial(map, transmission = 0.5) {
  const material = new THREE.MeshPhysicalMaterial({
    map: map,
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.1,
    iridescence: 1,
    iridescenceIOR: 1.4,
    transmission: transmission,
    thickness: 0.5,
    envMap: getEnvMap(),
    envMapIntensity: 1.6,
    emissive: 0xd9ccff,
    emissiveMap: map,
    emissiveIntensity: 0.35,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  reflectiveMaterials.push(material);
  return material;
}

function addThread(parent, length, beads) {
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, length, 6), threadMaterial);
  thread.position.y = -length / 2;
  parent.add(thread);

  let y = length * random(0.35, 0.5);
  for (let i = 0; i < beads; i++) {
    const size = random(18, 40);
    if (y + size > length - 30) break;
    const group = new THREE.Group();
    group.position.y = -y;
    parent.add(group);
    const slot = { group: group, kind: floor(random(4)), size: size };
    beadSlots.push(slot);
    if (smallCrystals[slot.kind]) fillBeadSlot(slot);
    y += size + random(25, 140);
  }
}

function fillBeadSlot(slot) {
  const c = smallCrystals[slot.kind];
  const bead = new THREE.Mesh(c.geometry, c.material);
  bead.scale.setScalar(slot.size);
  bead.rotation.y = random(TWO_PI);
  slot.group.add(bead);
}

function loadHDR(filepath) {
  hdrTexture = new HDRLoader().load(filepath, function () {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
  });
}

function loadGLTF(filepath, onLoaded) {
  const loader = new GLTFLoader();
  loader.load(
    filepath,
    function (gltfData) {
      onLoaded(gltfData.scene);
    },
    function (xhr) {
      if (xhr.total > 0) {
        console.log(`${(xhr.loaded / xhr.total * 100).toFixed(0)}% loaded`);
      } else {
        console.log(`${(xhr.loaded / 1024).toFixed(0)} KB downloaded (total unknown)`);
      }
    },
    function (err) {
      console.error("Failed to load GLTF:", filepath, err);
    }
  );
}

function setupRivers(videoFile) {
  riverVideo = createVideo(videoFile);
  window.showcaseLoading.trackMedia(riverVideo.elt);
  riverVideo.hide();
  riverVideo.elt.muted = true;
  riverVideo.elt.playsInline = true;
  riverVideo.loop();
  riverTexture = new THREE.VideoTexture(riverVideo.elt);
  riverTexture.colorSpace = THREE.SRGBColorSpace;
  riverTexture.wrapS = THREE.MirroredRepeatWrapping;
  riverTexture.wrapT = THREE.MirroredRepeatWrapping;

  const g = createGraphics(64, 256);
  g.noStroke();
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 64; x++) {
      const across = Math.pow(Math.sin((x / 63) * Math.PI), 1.5);
      const along = constrain(map(Math.abs(y - 128), 80, 128, 1, 0), 0, 1);
      g.fill(255 * across * along);
      g.rect(x, y, 1, 1);
    }
  }
  riverFade = new THREE.CanvasTexture(g.elt);

  const Y = -350;
  const main = function (v) {
    const z = lerp(3200, -5200, v);
    return new THREE.Vector3(650 * sin(z * 0.0008) + 220 * sin(z * 0.0021), Y, z);
  };
  const mainElev = function (v) {
    const z = lerp(3200, -5200, v);
    return 250 * sin(z * 0.0012) + 120 * sin(z * 0.003);
  };
  rivers.push(new River(main, mainElev, 8400, 1400, 1.0));

  const branchData = [
    { from: 0.25, angle: 0.9, length: 3600, bend: 500, width: 1100 },
    { from: 0.40, angle: -1.1, length: 4200, bend: -600, width: 1000 },
    { from: 0.58, angle: 1.3, length: 3800, bend: 400, width: 950 },
    { from: 0.72, angle: -0.7, length: 3400, bend: -450, width: 1050 },
    { from: 0.15, angle: -1.6, length: 3000, bend: 350, width: 900 },
    { from: 0.85, angle: 1.8, length: 3200, bend: -400, width: 1000 },
    { from: 0.05, angle: 1.2, length: 3000, bend: 300, width: 950 },
  ];
  for (let d of branchData) {
    const start = main(d.from);
    const dir = new THREE.Vector3(sin(d.angle), 0, -cos(d.angle));
    const side = new THREE.Vector3(dir.z, 0, -dir.x);
    const path = function (v) {
      return start.clone()
        .addScaledVector(dir, d.length * v)
        .addScaledVector(side, sin(v * PI) * d.bend);
    };
    const startElev = mainElev(d.from);
    const ph = random(TWO_PI);
    const elev = function (v) {
      const away = Math.min(1, v * 3);
      return startElev + away * 260 * sin(v * PI * 1.5 + ph);
    };
    rivers.push(new River(path, elev, d.length, d.width, 0.7));
  }

  riverSampler = createGraphics(8, 8);
  riverSampler.pixelDensity(1);
  for (let v of [0.2, 0.45, 0.7]) {
    const light = new THREE.PointLight(0xc77fff, 0, 2200, 0);
    light.position.copy(main(v)).add(new THREE.Vector3(0, 150 + mainElev(v), 0));
    scene.add(light);
    riverLights.push(light);
  }
}

function updateRiverLights() {
  if (frame % 6 === 0 && riverVideo.elt.readyState >= 2) {
    riverSampler.image(riverVideo, 0, 0, 8, 8);
    riverSampler.loadPixels();
    const px = riverSampler.pixels;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < px.length; i += 4) {
      r += px[i];
      g += px[i + 1];
      b += px[i + 2];
    }
    const n = px.length / 4;
    riverColor.r = r / n / 255;
    riverColor.g = g / n / 255;
    riverColor.b = b / n / 255;
  }
  for (let light of riverLights) {
    const target = new THREE.Color(riverColor.r, riverColor.g, riverColor.b);
    const hsl = {};
    target.getHSL(hsl);
    target.setHSL(hsl.h, Math.min(1, hsl.s * 1.5), 0.6);
    light.color.lerp(target, 0.1);
    light.intensity = params.river ? params.riverLight : 0;
  }
}

function getEnvMap() {
  return params.reflectRiver && riverEnvTexture ? riverEnvTexture : hdrTexture;
}

function setupRiverReflection() {
  riverEnvGraphics = createGraphics(512, 256);
  riverEnvGraphics.pixelDensity(1);
  riverEnvTexture = new THREE.CanvasTexture(riverEnvGraphics.elt);
  riverEnvTexture.mapping = THREE.EquirectangularReflectionMapping;
  riverEnvTexture.colorSpace = THREE.SRGBColorSpace;
  drawRiverEnv();
}

function drawRiverEnv() {
  const g = riverEnvGraphics;
  const tint = new THREE.Color(params.riverTint);
  g.noStroke();
  for (let y = 0; y < 128; y++) {
    const k = y / 127;
    g.fill(lerp(4, 30, k * k), lerp(3, 18, k * k), lerp(10, 50, k * k));
    g.rect(0, y, 512, 1);
  }
  g.fill(4, 3, 10);
  g.rect(0, 128, 512, 128);
  if (riverVideo && riverVideo.elt.readyState >= 2 && params.river) {
    const b = 255 * Math.min(1, params.riverBrightness * 1.6);
    g.tint(tint.r * b, tint.g * b, tint.b * b);
    for (let i = 0; i < 4; i++) {
      g.image(riverVideo, i * 128, 128, 128, 128);
    }
    g.noTint();
  }
  for (let y = 0; y < 24; y++) {
    const a = 70 * (1 - y / 24);
    g.fill(riverColor.r * 255, riverColor.g * 255, riverColor.b * 255, a);
    g.rect(0, 128 - y, 512, 1);
    g.rect(0, 128 + y, 512, 1);
  }
  riverEnvTexture.needsUpdate = true;
  riverEnvTexture.needsPMREMUpdate = true;
}


class River {
  constructor(pathFn, elevFn, length, width, brightness, segments = 200) {
    this.width = width;
    this.brightness = brightness;
    this.phase = random(TWO_PI);
    this.speed = random(0.8, 1.2);

    this.texture = riverTexture.clone();
    this.texture.repeat.set(1, length / (width / 0.35));

    this.centers = [];
    this.sides = [];
    this.elev = [];
    for (let r = 0; r <= segments; r++) {
      const v = r / segments;
      this.elev.push(elevFn(v));
      const a = pathFn(Math.max(v - 0.005, 0));
      const b = pathFn(Math.min(v + 0.005, 1));
      const forward = b.sub(a).normalize();
      this.centers.push(pathFn(v));
      this.sides.push(new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize());
    }

    this.geometry = new THREE.PlaneGeometry(1, 1, 4, segments);
    this.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    const pos = this.geometry.attributes.position;
    this.u = [];
    this.row = [];
    for (let i = 0; i < pos.count; i++) {
      this.u.push(pos.getX(i));
      this.row.push(round((0.5 - pos.getY(i)) * segments));
    }

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      alphaMap: riverFade,
      transparent: true,
      color: params.riverTint,
      opacity: params.riverBrightness * brightness,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.update(0, false);
  }
  update(m, glitching) {
    this.texture.offset.y -= 0.0015 * this.speed * params.riverSpeed * (1 + m * 2);
    this.texture.offset.x = glitching && random() < 0.3 ? random(-0.3, 0.3) : 0;
    this.material.opacity = params.riverBrightness * this.brightness;
    this.material.color.set(params.riverTint);

    const pos = this.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const r = this.row[i];
      const c = this.centers[r];
      const s = this.sides[r];
      const w = this.width * (1 + sin(r * 0.05 + frame * 0.01 + this.phase) * 0.3);
      const swell = sin(r * 0.15 - frame * 0.02 + this.phase) * 10 * (1 + m);
      const y = c.y + this.elev[r] + swell;
      pos.setXYZ(i, c.x + s.x * this.u[i] * w, y, c.z + s.z * this.u[i] * w);
    }
    pos.needsUpdate = true;
  }
}


class HangingStrand {
  constructor(x, bottomY, z) {
    this.anchor = new THREE.Group();
    this.anchor.position.set(x, TOP_Y, z);
    scene.add(this.anchor);
    this.phase = random(TWO_PI);
    this.length = TOP_Y - bottomY;
    addThread(this.anchor, this.length, floor(random(6, 14)));

    this.crystal = new THREE.Group();
    this.crystal.position.y = -this.length;
    this.anchor.add(this.crystal);
  }
  setCrystal(geometry, material, size) {
    this.anchor.remove(this.crystal);
    this.crystal = new THREE.Mesh(geometry, material);
    this.crystal.scale.setScalar(size * random(0.8, 1.25));
    this.crystal.position.y = -this.length;
    this.crystal.rotation.y = random(TWO_PI);
    this.anchor.add(this.crystal);
  }
  update(m, glitching) {
    const t = frame * 0.009 + this.phase;
    const sw = params.sway * (1 + m);
    this.anchor.rotation.z = sin(t) * SWAY_ANGLE * sw + (glitching ? random(-0.03, 0.03) : 0);
    this.anchor.rotation.x = cos(t * 0.8) * SWAY_ANGLE * 0.75 * sw;
    this.crystal.rotation.y += 0.01;
  }
}


class Butterfly {
  constructor(color, x, y, z) {
    this.color = new THREE.Color(color);
    this.group = new THREE.Group();
    this.pos = this.group.position;
    this.pos.set(x, y, z);
    this.vel = new THREE.Vector3(random(-1, 1), random(1.5, 2.5), random(-1, 1));
    this.acc = new THREE.Vector3();
    this.target = new THREE.Vector3(...FAR_LIGHT_POS);
    this.seed = random(1000);
    this.flapPhase = random(TWO_PI);

    const body = butterflyModel.getObjectByName("body");
    this.material = body.material.clone();
    this.material.color.set(0xffffff).lerp(this.color, 0.5);
    this.material.emissive = this.color.clone();
    this.material.emissiveMap = this.material.map;
    this.material.emissiveIntensity = 0.7;
    this.material.transparent = true;
    this.material.side = THREE.DoubleSide;

    this.wingR = new THREE.Mesh(butterflyModel.getObjectByName("wingPosX").geometry, this.material);
    this.wingL = new THREE.Mesh(butterflyModel.getObjectByName("wingNegX").geometry, this.material);
    this.group.add(this.wingR, this.wingL, new THREE.Mesh(body.geometry, this.material));
    this.group.scale.setScalar(160 * emotion.butterflySize);
    scene.add(this.group);
  }
  update(m, glitching) {
    const t = frame * 0.01;
    this.acc.set(
      noise(this.seed, t) - 0.5,
      noise(this.seed + 10, t) - 0.4,
      noise(this.seed + 20, t) - 0.5
    ).multiplyScalar(0.2);
    const pull = this.target.clone().sub(this.pos).normalize().multiplyScalar(0.02);
    this.acc.add(pull);

    this.vel.add(this.acc);
    this.vel.clampLength(0, 3 * (1 + m));
    this.pos.add(this.vel);
    this.group.lookAt(this.pos.clone().add(this.vel));

    this.flapPhase += 0.25 * (1 + m);
    const a = sin(this.flapPhase) * 0.9;
    this.wingR.rotation.z = a;
    this.wingL.rotation.z = -a;

    this.material.opacity = constrain(map(this.pos.y, 1200, 2600, 1, 0), 0, 1);
    if (glitching && random() < 0.2) {
      this.material.color.setHSL(random(), 1, 0.7);
    } else {
      this.material.color.set(0xffffff).lerp(this.color, 0.5);
    }
  }
  isGone() {
    return this.material.opacity <= 0;
  }
  remove() {
    scene.remove(this.group);
    this.material.dispose();
  }
}
