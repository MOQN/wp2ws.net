let station, reflectionCamera;
let deckBody, deckSurface, deckMirror, deckEdge, deckBack, deckRim, deckRidges, mirrorShadow;
let deckShape = { dome: 0, cone: 0, shine: 0 };
let deckGeometryState = [];
let deckMatte, deckMineral;
let shadowScreen, screenSurface;
const DECK_RADIUS = 1400;
const DECK_THICKNESS = 10;
let deckSize = 620;
let deckBottom = -450;
let deckClock = 0;
let deckPresence = 0;
let deckClosing = false;
let deckGoneTime = 0;

function stationBox(parent, material, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(boxGeometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function setupStation() {
  station = new THREE.Group();
  scene.add(station);
  setupDeck();

  const frame = new THREE.Group();
  frame.rotation.y = 0.6;
  station.add(frame);
  const metal = new THREE.MeshPhongMaterial({ color: 0x505b63, specular: 0x424a50, shininess: 20 });
  for (const side of [-1, 1]) {
    stationBox(frame, metal, side * 3100, 1000, -5600, 70, 4400, 100);
    stationBox(frame, metal, 0, 1000 + side * 2200, -5600, 6200, 70, 100);
  }

  const sun = new THREE.DirectionalLight(0xa7c8ed, 0.8);
  sun.position.set(-8000, 10000, 8000);
  scene.add(sun);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(4800, 64, 40),
    new THREE.MeshPhongMaterial({ color: 0x9dabb3, map: getMoonSurface(), shininess: 2, fog: false })
  );
  moon.position.set(-9000, 0, -16000);
  moon.rotation.z = 0.35;
  scene.add(moon);
  setupStars();
}

function setupDeck() {
  deckGroup = new THREE.Group();
  deckGroup.position.y = -450;
  scene.add(deckGroup);
  deckBody = new THREE.Group();
  deckGroup.add(deckBody);

  const geometry = new THREE.SphereGeometry(DECK_RADIUS, 96, 32, 0, Math.PI * 2, 0, Math.PI / 2);
  const grain = getDeckGrain();
  deckMatte = new THREE.MeshPhongMaterial({ color: 0x637685, specular: 0x222e39, shininess: 25,
    bumpMap: grain, bumpScale: 0.28, side: THREE.DoubleSide, flatShading: true });
  deckMineral = new THREE.MeshPhongMaterial({ color: 0x35434e, specular: 0x0e171e, shininess: 12,
    bumpMap: grain, bumpScale: 0.24, side: THREE.DoubleSide, flatShading: true });
  const uv = geometry.attributes.uv;
  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    uv.setXY(i, (vertices.getX(i) / DECK_RADIUS + 1) / 2, (vertices.getZ(i) / DECK_RADIUS + 1) / 2);
  }
  geometry.userData.rest = new Float32Array(vertices.array);
  deckSurface = new THREE.Mesh(geometry, deckMatte);
  deckSurface.receiveShadow = true;
  deckSurface.userData.matteColor = new THREE.Color(0x637685);
  deckSurface.userData.mineralColor = new THREE.Color(0x35434e);
  deckBody.add(deckSurface);

  const edgeMaterial = new THREE.MeshPhysicalMaterial({ color: 0x899aa5, metalness: 0.9,
    roughness: 0.24, bumpMap: grain, bumpScale: 0.12, side: THREE.DoubleSide });
  deckEdge = new THREE.Mesh(new THREE.CylinderGeometry(DECK_RADIUS, DECK_RADIUS, DECK_THICKNESS, 96, 1, true), edgeMaterial);
  deckBack = new THREE.Mesh(geometry.clone(), edgeMaterial);
  deckRim = new THREE.Mesh(new THREE.RingGeometry(DECK_RADIUS * 0.992, DECK_RADIUS, 96), edgeMaterial);
  for (const mesh of [deckEdge, deckRim]) {
    mesh.geometry.userData.rest = new Float32Array(mesh.geometry.attributes.position.array);
  }
  deckRim.rotation.x = -Math.PI / 2;
  deckBody.add(deckEdge, deckBack, deckRim);
  const ridges = new THREE.BufferGeometry();
  ridges.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(72), 3));
  deckRidges = new THREE.Mesh(ridges, edgeMaterial);
  deckRidges.receiveShadow = true;
  deckRidges.visible = false;
  deckBody.add(deckRidges);

  deckMirror = new Reflector(new THREE.CircleGeometry(DECK_RADIUS * 0.992, 96), {
    color: 0xc3cdd4, textureWidth: 768, textureHeight: 768, clipBias: 0.003, multisample: 0
  });
  deckMirror.rotation.x = -Math.PI / 2;
  deckMirror.position.y = 1;
  deckMirror.material.blending = THREE.CustomBlending;
  deckMirror.material.blendSrc = THREE.ConstantAlphaFactor;
  deckMirror.material.blendDst = THREE.OneMinusConstantAlphaFactor;
  deckMirror.material.depthWrite = false;
  deckMirror.renderOrder = 1;
  const renderMirror = deckMirror.onBeforeRender;
  deckMirror.onBeforeRender = function (renderer, scene, camera) {
    deckSurface.visible = deckBack.visible = mirrorShadow.visible = false;
    renderMirror.call(this, renderer, scene, camera);
    deckSurface.visible = deckBack.visible = true;
    mirrorShadow.visible = true;
  };
  mirrorShadow = new THREE.Mesh(new THREE.CircleGeometry(DECK_RADIUS * 0.992, 96),
    new THREE.ShadowMaterial({ opacity: 0.24, depthWrite: false }));
  mirrorShadow.rotation.x = -Math.PI / 2;
  mirrorShadow.position.y = 1.5;
  mirrorShadow.receiveShadow = true;
  mirrorShadow.renderOrder = -1;
  deckBody.add(deckMirror, mirrorShadow);
  shadowScreen = new THREE.Group();
  const screenGeometry = new THREE.CircleGeometry(1, 80);
  screenSurface = new THREE.Mesh(screenGeometry, new THREE.MeshPhongMaterial({
    color: 0xcbdce5, specular: 0x364752, shininess: 18,
    transparent: true, opacity: 0,
    depthWrite: false, side: THREE.DoubleSide
  }));
  screenSurface.receiveShadow = true;
  shadowScreen.add(screenSurface);
  scene.add(shadowScreen);
  updateDeck(0);
}

function resetDeck() {
  deckPresence = 0;
  deckClosing = false;
  deckGoneTime = 0;
  deckShape.dome = deckShape.cone = deckShape.shine = 0;
  deckGeometryState = [];
  if (!deckBody) return;
  deckBody.visible = deckMirror.visible = mirrorShadow.visible = false;
  deckBody.scale.setScalar(0.0001);
  deckSurface.material = deckMatte;
  updateDeckGeometry();
  deckGeometryState = [0, 0, 0];
}

function closeDeck() {
  if (deckClosing) return;
  deckClosing = true;
  deckGoneTime = 0;
}

function isDeckGone() {
  return deckClosing && deckPresence === 0 && deckGoneTime >= 0.2;
}

function isDeckReady() {
  return deckPresence === 1 && !deckClosing;
}

function updateDeck(delta) {
  if (!params.pause || params.study !== "cycle") {
    const seconds = Math.max(0, delta) / 60;
    if (deckClosing) {
      if (deckPresence === 0) deckGoneTime += seconds;
      deckPresence = Math.max(0, deckPresence - seconds / 1.6);
    } else {
      deckPresence = Math.min(1, deckPresence + seconds / 1.3);
    }
  }
  deckClock = typeof visualTime === "number" ? visualTime : 0;
  const stage = params.study === "cycle" ? phase : params.study;
  const target = LOOKS[stage];
  // flatten before reflecting
  const flat = stage === "melt" || deckShape.shine > 0.005;
  const ease = 1 - Math.pow(flat ? 0.8 : 0.97, delta);
  const dome = flat ? 0 : target.dome;
  const cone = flat ? 0 : target.cone;
  deckShape.dome += (dome - deckShape.dome) * ease;
  deckShape.cone += (cone - deckShape.cone) * ease;
  if (Math.abs(deckShape.dome - dome) < (flat ? 0.001 : 0.0001)) deckShape.dome = dome;
  if (Math.abs(deckShape.cone - cone) < (flat ? 0.001 : 0.0001)) deckShape.cone = cone;
  const shine = stage === "melt" && deckShape.dome + deckShape.cone < 0.001 ? 1 : 0;
  deckShape.shine += (shine - deckShape.shine) * (1 - Math.pow(0.9, delta));
  if (Math.abs(deckShape.shine - shine) < 0.0001) deckShape.shine = shine;
  const shape = deckShape.shine > 0.005 ? [0, 0, 0] :
    [deckShape.dome, deckShape.cone, deckShape.cone > 0 ? deckClock : 0];
  if (shape.some((value, i) => value !== deckGeometryState[i])) {
    updateDeckGeometry();
    deckGeometryState = shape;
  }

  deckSize += (Math.max(540, Math.min(900, lightWidth * 1.02)) - deckSize) * (1 - Math.pow(0.992, delta));
  const presence = deckPresence * deckPresence * (3 - 2 * deckPresence);
  deckBody.visible = deckPresence > 0;
  deckBody.scale.setScalar(deckSize / DECK_RADIUS * Math.max(0.0001, presence));
  const sway = params.surfaceMotion;
  deckBody.rotation.x = Math.sin(deckClock * 0.09) * 0.018 * sway;
  deckBody.rotation.z = Math.cos(deckClock * 0.07) * 0.018 * sway;
  deckBody.position.x = Math.sin(deckClock * 0.08) * 45 * sway;
  deckBody.position.z = Math.cos(deckClock * 0.06) * 30 * sway;

  for (const bar of bars) {
    if (!bar.isMelting) deckBottom = Math.min(deckBottom, bar.pos.y - bar.scale.y * 0.5);
  }
  deckGroup.position.y += (deckBottom - 190 - deckGroup.position.y) * (1 - Math.pow(0.985, delta));
  if (lightCenter) {
    deckGroup.position.x += (lightCenter.x - deckGroup.position.x) * (1 - Math.pow(0.99, delta));
    deckGroup.position.z += (lightCenter.z - deckGroup.position.z) * (1 - Math.pow(0.99, delta));
  }
  station.position.y = deckGroup.position.y;

  const mineral = deckShape.cone;
  deckSurface.material = mineral > 0.01 ? deckMineral : deckMatte;
  deckMatte.shininess = 25 + deckShape.shine * 100;
  deckMatte.reflectivity = 0.08 + deckShape.shine * 0.25;
  deckMatte.bumpScale = 0.28 - deckShape.shine * 0.24;
  const material = deckMineral;
  material.color.copy(deckSurface.userData.matteColor).lerp(deckSurface.userData.mineralColor, mineral);
  material.shininess = 20 - mineral * 8;
  material.reflectivity = 0.06 - mineral * 0.035;
  material.bumpScale = 0.18 + mineral * 0.06;
  deckEdge.material.roughness = 0.24 + mineral * 0.42;
  deckEdge.material.metalness = 0.9 - mineral * 0.65;
  deckEdge.material.envMapIntensity = 1.8 - mineral * 1.5;
  deckMirror.material.blendAlpha = deckShape.shine * 0.88;
  deckMirror.visible = deckBody.visible && deckShape.shine > 0.005;
  mirrorShadow.visible = deckMirror.visible;
  mirrorShadow.material.opacity = deckShape.shine * 0.24;
  updateScreen(delta, stage);
}

function updateDeckGeometry() {
  const square = deckShape.cone * (0.5 - 0.5 * Math.cos(deckClock * 0.22));
  const offsetX = Math.sin(deckClock * 0.07) * DECK_RADIUS * 0.12 * deckShape.cone;
  const offsetZ = Math.cos(deckClock * 0.09) * DECK_RADIUS * 0.08 * deckShape.cone;
  const depth = DECK_RADIUS * (0.32 + Math.sin(deckClock * 0.16) * 0.02);
  const tiltX = Math.sin(deckClock * 0.13) * 0.028;
  const tiltZ = Math.cos(deckClock * 0.11) * 0.022;
  const point = (x, z) => {
    if (deckShape.shine > 0.005) return [x, 0, z];
    const length = Math.hypot(x, z);
    const r = Math.min(1, length / DECK_RADIUS);
    const corner = Math.max(Math.abs(x), Math.abs(z));
    const shape = corner < 0.001 ? 1 : 1 + (length / (Math.SQRT2 * corner) - 1) * square;
    const px = x * shape + offsetX * (1 - r);
    const pz = z * shape + offsetZ * (1 - r);
    const dish = -DECK_RADIUS * 0.12 * (1 - r * r);
    // keep the tip at zero as the rim falls away
    const facet = -depth * r + (px - offsetX) * tiltX + (pz - offsetZ) * tiltZ;
    return [px, dish * deckShape.dome + facet * deckShape.cone, pz];
  };

  const position = deckSurface.geometry.attributes.position;
  const rest = deckSurface.geometry.userData.rest;
  const back = deckBack.geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const [x, y, z] = point(rest[i * 3], rest[i * 3 + 2]);
    position.setXYZ(i, x, y, z);
    back.setXYZ(i, x, y - DECK_THICKNESS, z);
  }
  const edge = deckEdge.geometry.attributes.position;
  const edgeRest = deckEdge.geometry.userData.rest;
  for (let i = 0; i < edge.count; i++) {
    const [x, y, z] = point(edgeRest[i * 3], edgeRest[i * 3 + 2]);
    edge.setXYZ(i, x, y + edgeRest[i * 3 + 1] - DECK_THICKNESS / 2, z);
  }
  const rim = deckRim.geometry.attributes.position;
  const rimRest = deckRim.geometry.userData.rest;
  for (let i = 0; i < rim.count; i++) {
    const [x, y, z] = point(rimRest[i * 3], -rimRest[i * 3 + 1]);
    rim.setXYZ(i, x, -z, y + 0.5);
  }
  let ridge = Math.max(0, Math.min(1, (square - 0.62) / 0.32));
  ridge = ridge * ridge * (3 - 2 * ridge);
  deckRidges.visible = ridge > 0 && deckShape.shine <= 0.005;
  if (deckRidges.visible) {
    const vertices = deckRidges.geometry.attributes.position;
    const tip = point(0, 0);
    tip[1] += ridge * 0.9;
    let index = 0;
    for (let corner = 0; corner < 4; corner++) {
      const angle = Math.PI / 4 + corner * Math.PI / 2;
      const ends = [-1, 0, 1].map((side) => {
        const a = angle + side * 0.0035 * ridge;
        const p = point(Math.cos(a) * DECK_RADIUS * 0.994, Math.sin(a) * DECK_RADIUS * 0.994);
        p[1] += ridge * (side === 0 ? 0.9 : 0.2);
        return p;
      });
      for (const p of [tip, ends[1], ends[0], tip, ends[2], ends[1]]) vertices.setXYZ(index++, ...p);
    }
    vertices.needsUpdate = true;
    deckRidges.geometry.computeVertexNormals();
    deckRidges.geometry.computeBoundingSphere();
  }
  for (const mesh of [deckSurface, deckBack, deckEdge, deckRim]) {
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingSphere();
  }

}

function updateScreen(delta, stage) {
  if (!lightCenter || !fillLight) return;
  const active = stage === "temper" || stage === "hold";
  const opacity = active ? 0.28 : 0;
  screenSurface.material.opacity += (opacity - screenSurface.material.opacity) * (1 - Math.pow(0.98, delta));
  shadowScreen.visible = screenSurface.material.opacity > 0.001;
  screenSurface.receiveShadow = params.shadows;
  if (!shadowScreen.visible) return;

  // behind the crystal, opposite the blue lamp
  const direction = new THREE.Vector3().subVectors(lightCenter, fillLight.position).normalize();
  const distance = lightWidth * 0.7 + 180;
  const centre = lightCenter.clone().addScaledVector(direction, distance);
  const radius = Math.max(320, Math.min(720, lightWidth * 0.95));
  if (!shadowScreen.userData.placed) {
    shadowScreen.position.copy(centre);
    shadowScreen.scale.setScalar(radius);
    shadowScreen.userData.placed = true;
  }
  shadowScreen.position.lerp(centre, 1 - Math.pow(0.985, delta));
  shadowScreen.scale.lerp(new THREE.Vector3(radius, radius, radius), 1 - Math.pow(0.99, delta));
  shadowScreen.lookAt(lightCenter);
  shadowScreen.rotateX(Math.sin(deckClock * 0.17) * 0.05 * params.surfaceMotion);
  shadowScreen.rotateY(Math.cos(deckClock * 0.13) * 0.06 * params.surfaceMotion);
}

function getDeckGrain() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const pixels = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    const brush = Math.random() * 35;
    for (let x = 0; x < 256; x++) {
      const value = 155 + brush + Math.random() * 50;
      pixels.data.set([value, value, value, 255], (y * 256 + x) * 4);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

function getMoonSurface() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const pixels = ctx.createImageData(512, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 512; x++) {
      const wave = Math.sin(x * 0.045 + Math.sin(y * 0.08) * 3);
      const grain = Math.sin(x * 0.17 + y * 0.21) * Math.sin(y * 0.43 - x * 0.13);
      const value = 150 + 25 * wave + 15 * grain;
      pixels.data.set([value * 0.83, value * 0.92, value, 255], (y * 512 + x) * 4);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getReflection() {
  const target = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  reflectionCamera = new THREE.CubeCamera(20, 40000, target);
  deckMatte.envMap = deckMineral.envMap = target.texture;
  deckMatte.combine = deckMineral.combine = THREE.MixOperation;
  deckMatte.reflectivity = 0.08;
  deckMineral.reflectivity = 0.025;
  deckEdge.material.envMap = target.texture;
  deckEdge.material.envMapIntensity = 1.8;
  return target.texture;
}

function updateReflection() {
  // reflect the room, without capturing the crystal into itself
  const batch = barBatch;
  const showBars = batch.visible;
  const showMirror = deckMirror.visible;
  batch.visible = deckMirror.visible = false;
  try {
    reflectionCamera.position.copy(lightCenter);
    reflectionCamera.update(renderer, scene);
  } finally {
    batch.visible = showBars;
    deckMirror.visible = showMirror;
  }
}
