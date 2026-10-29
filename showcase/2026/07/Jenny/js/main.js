const ROOM = { width: 24, depth: 36, ceiling: 16, base: 0.02 };
const settings = {
  noiseMotion: true,
  motionAmount: 0.6,
  motionSpeed: 0.35,
  noiseScale: 0.22,
  fps: 0,
  bpm: 90,
  offset: 0,
  active: 3,
  fog: 0.026,
  brightness: 1,
  threadRadius: 0.016,
  ceilingBrightness: 0.7,
  reflection: 0.36,
  blackRadius: 0.012,
  blackDensity: 2,
};
const HAND_COUNT = 18,
  LIGHT_COUNT = 4;
const CHAIR_HEIGHT = 4.2;
const LIGHT_COLORS = [0x83948b, 0xc7c3af];
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function pointingGeometry(sourceMesh) {
  // Keep every original triangle, UV and vertex normal from the uploaded GLB.
  const g = sourceMesh.geometry.clone();
  g.applyMatrix4(sourceMesh.matrixWorld);
  g.computeBoundingBox();
  const size = g.boundingBox.getSize(new THREE.Vector3()),
    scale = 5.157 / size.y;
  g.scale(scale, scale, scale);
  g.center();
  g.rotateZ(Math.PI / 2);
  g.normalizeNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
// Use the cap of the extended index finger, rather than the mesh centre.
function fingerTip(geometry) {
  const p = geometry.attributes.position,
    cap = geometry.boundingBox.min.x + 0.035;
  const tip = new THREE.Vector3();
  let count = 0;
  for (let i = 0; i < p.count; i++)
    if (p.getX(i) <= cap) {
      tip.add(new THREE.Vector3().fromBufferAttribute(p, i));
      count++;
    }
  return tip.divideScalar(count || 1);
}
function fitChair(root) {
  const box = new THREE.Box3().setFromObject(root),
    size = box.getSize(new THREE.Vector3()),
    center = box.getCenter(new THREE.Vector3());
  const scale = CHAIR_HEIGHT / size.y;
  root.scale.multiplyScalar(scale);
  root.position.set(
    -center.x * scale,
    ROOM.base - box.min.y * scale,
    -center.z * scale,
  );
  root.updateMatrixWorld(true);
  const samples = [];
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (mesh.material) {
      mesh.material.metalness = 0;
      mesh.material.roughness = 0.87;
    }
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3()
        .fromBufferAttribute(p, i)
        .applyMatrix4(mesh.matrixWorld);
      if (v.y > 0.27 && v.y < 0.77) samples.push(v);
    }
  });
  const legs = [];
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      const pts = samples.filter((p) => p.x * x > 0 && p.z * z > 0);
      if (!pts.length)
        throw new Error("Could not locate the chair leg anchors.");
      const anchor = pts
        .reduce((sum, p) => sum.add(p), new THREE.Vector3())
        .divideScalar(pts.length);
      const radius =
        Math.max(
          ...pts.map((p) => Math.hypot(p.x - anchor.x, p.z - anchor.z)),
        ) + 0.025;
      legs.push({ anchor, radius });
    }
  return legs;
}
function threadCurve(start, end) {
  return new THREE.LineCurve3(start, end);
}
function floorOutline(geometry) {
  const p = geometry.attributes.position,
    points = [];
  for (let i = 0; i < p.count; i++) points.push({ x: p.getX(i), z: p.getZ(i) });
  points.sort((a, b) => a.x - b.x || a.z - b.z);
  const cross = (a, b, c) =>
      (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x),
    lower = [],
    upper = [];
  for (const v of points) {
    while (lower.length > 1 && cross(lower.at(-2), lower.at(-1), v) <= 0)
      lower.pop();
    lower.push(v);
  }
  for (let i = points.length - 1; i >= 0; i--) {
    const v = points[i];
    while (upper.length > 1 && cross(upper.at(-2), upper.at(-1), v) <= 0)
      upper.pop();
    upper.push(v);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
function footprintsOverlap(a, b, gap = 0.12) {
  // Broad phase first; test the actual projected outline only for nearby hands.
  if (
    a.maxX + gap < b.minX ||
    b.maxX + gap < a.minX ||
    a.maxZ + gap < b.minZ ||
    b.maxZ + gap < a.minZ
  )
    return false;
  for (const poly of [a.points, b.points])
    for (let i = 0; i < poly.length; i++) {
      const v = poly[i],
        w = poly[(i + 1) % poly.length],
        dx = w.x - v.x,
        dz = w.z - v.z,
        len = Math.hypot(dx, dz);
      if (len < 1e-8) continue;
      const nx = -dz / len,
        nz = dx / len;
      let alo = Infinity,
        ahi = -Infinity,
        blo = Infinity,
        bhi = -Infinity;
      for (const p of a.points) {
        const d = p.x * nx + p.z * nz;
        alo = Math.min(alo, d);
        ahi = Math.max(ahi, d);
      }
      for (const p of b.points) {
        const d = p.x * nx + p.z * nz;
        blo = Math.min(blo, d);
        bhi = Math.max(bhi, d);
      }
      if (ahi + gap < blo || bhi + gap < alo) return false;
    }
  return true;
}
function rectangleFootprint(x, z, hx, hz) {
  return {
    minX: x - hx,
    maxX: x + hx,
    minZ: z - hz,
    maxZ: z + hz,
    points: [
      { x: x - hx, z: z - hz },
      { x: x + hx, z: z - hz },
      { x: x + hx, z: z + hz },
      { x: x - hx, z: z + hz },
    ],
  };
}
function makeLayout(geometry, seed, count = HAND_COUNT) {
  const rand = seededRandom(seed),
    size = geometry.boundingBox.getSize(new THREE.Vector3()),
    outline = floorOutline(geometry),
    walkways = walkwayFootprints();
  const chairSpace = rectangleFootprint(0, 0, 1.6, 1.8),
    entranceSpace = rectangleFootprint(0, 13.5, 1.0, 1.0);
  let best = [];
  for (let restart = 0; restart < 4; restart++) {
    const poses = [];
    for (let attempt = 0; attempt < 6000 && poses.length < count; attempt++) {
      // Enlarge the original hand sizes uniformly by 1.5.
      const yaw = rand() * Math.PI * 2,
        scale = (0.66 + rand() * 0.38) * 1.5,
        co = Math.cos(yaw),
        si = Math.sin(yaw);
      const hx = ((Math.abs(co) * size.x + Math.abs(si) * size.z) * scale) / 2,
        hz = ((Math.abs(si) * size.x + Math.abs(co) * size.z) * scale) / 2;
      const x = (rand() - 0.5) * (ROOM.width - 2 * hx - 0.7),
        z = (rand() - 0.5) * (ROOM.depth - 2 * hz - 0.7);
      const points = outline.map((p) => ({
        x: x + (p.x * co + p.z * si) * scale,
        z: z + (-p.x * si + p.z * co) * scale,
      }));
      const footprint = {
        points,
        minX: x - hx,
        maxX: x + hx,
        minZ: z - hz,
        maxZ: z + hz,
      };
      if (
        footprintsOverlap(footprint, chairSpace, 0.25) ||
        footprintsOverlap(footprint, entranceSpace, 0.25) ||
        walkways.some((path) => footprintsOverlap(footprint, path, 0.12))
      )
        continue;
      const radius = size.z * scale * 0.48;
      if (
        poses.some(
          (p) => Math.hypot(p.x - x, p.z - z) < p.radius + radius + 0.15,
        )
      )
        continue;
      poses.push({
        x,
        z,
        y: ROOM.base + (size.y * scale) / 2,
        yaw,
        scale,
        hx,
        hz,
        radius,
        top: ROOM.base + size.y * scale,
        footprint,
      });
    }
    if (poses.length > best.length) best = poses;
    if (best.length === count) break;
  }
  return best;
}
function beatCue(beat, count, limit, seed) {
  if (beat < 0 || beat % 8 === 7) return [];
  const rand = seededRandom((seed ^ Math.imul(beat + 1, 2654435761)) >>> 0),
    available = Array.from({ length: count }, (_, i) => i);
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(
    0,
    Math.min(limit, beat % 4 === 0 ? 3 : beat % 2 === 0 ? 2 : 1, count),
  );
}
function pulseAt(phase, period) {
  const seconds = phase * period,
    attack = Math.min(1, seconds / 0.025);
  return attack * (seconds < 0.17 ? 1 : Math.exp(-(seconds - 0.17) / 0.16));
}
function avoidHands(camera, poses) {
  const chairDistance = Math.hypot(
    camera.position.x / 1.35,
    camera.position.z / 1.5,
  );
  if (chairDistance < 1) {
    if (chairDistance < 1e-6) camera.position.z = 1.5;
    else {
      camera.position.x /= chairDistance;
      camera.position.z /= chairDistance;
    }
  }
  // Collision follows the projected outline instead of a large empty bounding ellipse.
  for (let pass = 0; pass < 3; pass++)
    for (const pose of poses) {
      const poly = pose.footprint.points,
        p = camera.position;
      let inside = true,
        closest = null,
        distance = Infinity;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i],
          b = poly[(i + 1) % poly.length],
          dx = b.x - a.x,
          dz = b.z - a.z,
          len2 = dx * dx + dz * dz;
        if (len2 < 1e-10) continue;
        if (dx * (p.z - a.z) - dz * (p.x - a.x) < 0) inside = false;
        const t = THREE.MathUtils.clamp(
            ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2,
            0,
            1,
          ),
          x = a.x + t * dx,
          z = a.z + t * dz,
          d = Math.hypot(p.x - x, p.z - z);
        if (d < distance) {
          distance = d;
          closest = {
            x,
            z,
            nx: dz / Math.sqrt(len2),
            nz: -dx / Math.sqrt(len2),
          };
        }
      }
      if (closest && (inside || distance < 0.3)) {
        const nx =
            inside || distance < 1e-8
              ? closest.nx
              : (p.x - closest.x) / distance,
          nz =
            inside || distance < 1e-8
              ? closest.nz
              : (p.z - closest.z) / distance;
        p.x = closest.x + nx * 0.31;
        p.z = closest.z + nz * 0.31;
      }
    }

  camera.position.x = THREE.MathUtils.clamp(
    camera.position.x,
    -ROOM.width / 2 + 0.42,
    ROOM.width / 2 - 0.42,
  );
  camera.position.z = THREE.MathUtils.clamp(
    camera.position.z,
    -ROOM.depth / 2 + 0.42,
    ROOM.depth / 2 - 0.42,
  );
}
function addRoom(scene) {
  const floor = createMirrorFloor(ROOM, settings.reflection);
  scene.add(floor);
  const shadows = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    new THREE.ShadowMaterial({ opacity: 0.45 }),
  );
  shadows.rotation.x = -Math.PI / 2;
  shadows.position.y = ROOM.base + 0.004;
  shadows.receiveShadow = true;
  scene.add(shadows);
  const material = new THREE.MeshStandardMaterial({
    color: 0x15181c,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  for (const d of [
    { size: [24, 16], p: [0, 8, -18], r: [0, 0, 0] },
    { size: [24, 16], p: [0, 8, 18], r: [0, Math.PI, 0] },
    { size: [36, 16], p: [-12, 8, 0], r: [0, Math.PI / 2, 0] },
    { size: [36, 16], p: [12, 8, 0], r: [0, -Math.PI / 2, 0] },
    { size: [24, 36], p: [0, 16, 0], r: [Math.PI / 2, 0, 0] },
  ]) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...d.size), material);
    mesh.position.set(...d.p);
    mesh.rotation.set(...d.r);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  return floor;
}
async function init() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080b);
  scene.fog = new THREE.FogExp2(0x06080b, settings.fog);
  const camera = new THREE.PerspectiveCamera(
    66,
    innerWidth / innerHeight,
    0.06,
    120,
  );
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (error) {
    const message = document.getElementById("scene-error");
    message.hidden = false;
    message.textContent =
      "WebGL is unavailable. Open this page in a browser with hardware acceleration enabled.";
    throw error;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.35));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  document.getElementById("scene").appendChild(renderer.domElement);
  const floor = addRoom(scene);
  scene.add(new THREE.AmbientLight(0xcbd2df, 0.045));
  const loader = new GLTFLoader();
  const [chairAsset, handAsset, ceilingAsset] = await Promise.all([
    loader.loadAsync("./assets/chair/scene.gltf"),
    loader.loadAsync("./assets/white-hand.glb"),
    loader.loadAsync("./assets/ceiling-hand.glb"),
  ]);
  const chair = chairAsset.scene;
  handAsset.scene.updateMatrixWorld(true);
  let handSource;
  handAsset.scene.traverse((object) => {
    if (object.isMesh && !handSource) handSource = object;
  });
  if (!handSource)
    throw new Error("The floor hand model contains no usable mesh.");
  ceilingAsset.scene.updateMatrixWorld(true);
  let ceilingSource;
  ceilingAsset.scene.traverse((object) => {
    if (object.isMesh && !ceilingSource) ceilingSource = object;
  });
  if (!ceilingSource)
    throw new Error("The ceiling hand model contains no usable mesh.");
  const ceiling = new CeilingField(ceilingSource, ROOM);
  ceiling.addTo(scene);
  const curtains = new BlackThreadCurtains(
    ceiling,
    ROOM,
    settings.blackRadius,
    settings.blackDensity,
  );
  scene.add(curtains.mesh);
  const legs = fitChair(chair);
  scene.add(chair);
  const chairLights = LIGHT_COLORS.map((color, i) => {
    const light = new THREE.SpotLight(
      color,
      i === 0 ? 290 : 150,
      18,
      0.6,
      0.65,
      2,
    );
    light.position.set(i === 0 ? -3.5 : 3.2, 6.8, i === 0 ? 2.5 : -1.8);
    light.target.position.set(0, 1.7, 0);
    scene.add(light, light.target);
    return light;
  });
  const threads = new THREE.Group();
  scene.add(threads);
  const threadMaterial = new THREE.MeshStandardMaterial({
    color: 0x9c1010,
    roughness: 0.82,
    metalness: 0,
    emissive: 0x550606,
    emissiveIntensity: 0.55,
  });
  const geometry = pointingGeometry(handSource),
    tip = fingerTip(geometry),
    material = handSource.material.clone();
  const housingGeometry = new THREE.CylinderGeometry(0.14, 0.18, 0.3, 12),
    housingMaterial = new THREE.MeshStandardMaterial({
      color: 0x15171a,
      roughness: 0.6,
      metalness: 0.35,
    }),
    diskGeometry = new THREE.CircleGeometry(0.13, 16),
    cableGeometry = new THREE.CylinderGeometry(0.008, 0.008, 1, 5);
  let seed = (Math.random() * 0xffffffff) >>> 0,
    poses = [],
    objects = [],
    preview = false,
    startTime = 0,
    lastBeat = -1,
    cue = [],
    audioURL = null;
  const audio = document.getElementById("audio"),
    status = document.getElementById("status"),
    previewButton = document.getElementById("preview");
  const lights = Array.from({ length: LIGHT_COUNT }, (_, i) => {
    const light = new THREE.SpotLight(
      LIGHT_COLORS[i % 2],
      0,
      24,
      0.55,
      0.32,
      2,
    );
    light.position.set(0, 10, 0);
    light.target.position.set(0, 0, 0);
    light.castShadow = i < 2;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 24;
    light.shadow.bias = -0.00015;
    light.shadow.normalBias = 0.025;
    scene.add(light, light.target);
    return light;
  });
  function lightCue(indices) {
    cue = indices;
    objects.forEach((o) => o.disk.material.color.setHex(0x11151b));
    lights.forEach((light, slot) => {
      const index = indices[slot];
      if (index === undefined) {
        light.intensity = 0;
        return;
      }
      const object = objects[index];
      light.color.copy(object.color);
      light.position.copy(object.lamp);
      light.target.position.copy(object.target);
      light.intensity = 520 * settings.brightness;
      object.disk.material.color.copy(object.color);
      if (light.castShadow) light.shadow.needsUpdate = true;
    });
    renderer.shadowMap.needsUpdate = true;
  }
  function staticCue() {
    const ranked = poses
      .map((p, i) => ({
        i,
        d: Math.hypot(p.x - camera.position.x, p.z - camera.position.z),
      }))
      .sort((a, b) => a.d - b.d);
    const ids = ranked.slice(0, Math.min(settings.active, 2)).map((o) => o.i);
    if (settings.active > 2 && ranked.length > 5)
      ids.push(ranked[Math.floor(ranked.length * 0.65)].i);
    if (settings.active > 3 && ranked.length > 8)
      ids.push(ranked[ranked.length - 2].i);
    lightCue(ids);
  }
  function rebuildThreads() {
    threads.children.forEach((mesh) => mesh.geometry.dispose());
    threads.clear();
    for (let i = 0; i < objects.length; i++) {
      const hand = objects[i].hand;
      hand.updateMatrixWorld(true);
      const start = hand.localToWorld(tip.clone());
      const leg = legs.reduce(
        (best, l) =>
          start.distanceToSquared(l.anchor) <
          start.distanceToSquared(best.anchor)
            ? l
            : best,
        legs[0],
      );
      const y = leg.anchor.y + (i % 4) * 0.035,
        angle = Math.atan2(start.z - leg.anchor.z, start.x - leg.anchor.x);
      const end = new THREE.Vector3(
        leg.anchor.x + Math.cos(angle) * leg.radius,
        y,
        leg.anchor.z + Math.sin(angle) * leg.radius,
      );
      const line = new THREE.Mesh(
        new THREE.TubeGeometry(
          threadCurve(start, end),
          1,
          settings.threadRadius,
          6,
          false,
        ),
        threadMaterial,
      );
      line.userData = { finger: start.clone(), leg: end.clone() };
      threads.add(line);
      const points = [];
      for (let k = 0; k <= 48; k++) {
        const a = angle + (k / 48) * Math.PI * 4;
        points.push(
          new THREE.Vector3(
            leg.anchor.x + Math.cos(a) * leg.radius,
            y + (0.085 * k) / 48,
            leg.anchor.z + Math.sin(a) * leg.radius,
          ),
        );
      }
      threads.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points),
            48,
            settings.threadRadius,
            6,
            false,
          ),
          threadMaterial,
        ),
      );
    }
  }
  function rebuild() {
    for (const object of objects) {
      scene.remove(object.group);
      object.disk.material.dispose();
    }
    objects = [];
    poses = makeLayout(geometry, seed);
    for (const pose of poses) {
      const group = new THREE.Group(),
        hand = new THREE.Mesh(geometry, material);
      hand.position.set(pose.x, pose.y, pose.z);
      hand.rotation.y = pose.yaw;
      hand.scale.setScalar(pose.scale);
      hand.castShadow = true;
      hand.receiveShadow = true;
      group.add(hand);
      const lamp = new THREE.Vector3(
          pose.x + 0.35,
          pose.top + 4.2,
          pose.z + 0.4,
        ),
        target = new THREE.Vector3(pose.x, pose.top * 0.45, pose.z);
      const fixture = new THREE.Mesh(housingGeometry, housingMaterial);
      fixture.position.copy(lamp);
      group.add(fixture);
      const disk = new THREE.Mesh(
        diskGeometry,
        new THREE.MeshBasicMaterial({ color: 0x11151b }),
      );
      disk.rotation.x = Math.PI / 2;
      disk.position.copy(lamp).add(new THREE.Vector3(0, -0.151, 0));
      group.add(disk);
      const cable = new THREE.Mesh(cableGeometry, housingMaterial),
        length = ROOM.ceiling - lamp.y - 0.15;
      cable.scale.y = length;
      cable.position.set(lamp.x, lamp.y + 0.15 + length / 2, lamp.z);
      group.add(cable);
      scene.add(group);
      objects.push({
        group,
        hand,
        disk,
        lamp,
        target,
        color: new THREE.Color(LIGHT_COLORS[objects.length % 2]),
      });
    }
    rebuildThreads();
    curtains.rebuild(poses, camera.position);
    lastBeat = -1;
    if (!preview && audio.paused) staticCue();
    renderer.shadowMap.needsUpdate = true;
  }
  const controls = new RoomLookControls(camera, renderer.domElement, ROOM);
  controls.speed = 3;
  controls.setGroundSampler(() => ROOM.base);
  function entrance() {
    controls.setPose([0, 3.6, 13.5], [0, 0.2, 0], 3.6);
    if (curtains.basePlan)
      curtains.setDensity(settings.blackDensity, camera.position);
  }
  entrance();
  rebuild();
  previewButton.onclick = () => {
    preview = !preview;
    startTime = performance.now();
    lastBeat = -1;
    previewButton.textContent = preview
      ? "Stop Light Preview"
      : "Start Light Preview";
    if (preview) {
      audio.pause();
      status.textContent = "BPM light preview · No audio";
    } else {
      status.textContent = audio.src
        ? "Audio loaded · Press play"
        : "Static view · No audio loaded";
      staticCue();
    }
  };
  audio.onplay = () => {
    preview = false;
    previewButton.textContent = "Start Light Preview";
    lastBeat = -1;
    status.textContent = "Playing audio · BPM controls the lights";
  };
  audio.onpause = () => {
    if (!preview) {
      status.textContent = "Audio paused · Static view";
      staticCue();
    }
  };
  audio.onended = () => {
    status.textContent = "Audio ended · Static view";
    staticCue();
  };
  audio.onseeked = () => {
    lastBeat = -1;
  };
  document.getElementById("file").onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    audio.pause();
    if (audioURL) URL.revokeObjectURL(audioURL);
    audioURL = URL.createObjectURL(file);
    audio.src = audioURL;
    audio.load();
    preview = false;
    previewButton.textContent = "Start Light Preview";
    status.textContent = "Loaded " + file.name + " · Set BPM, then play";
    lastBeat = -1;
    staticCue();
  };
  audio.onerror = () =>
    (status.textContent =
      "Cannot play this audio. Please choose a supported audio file.");
  const pane = new Pane({ container: document.getElementById("pane") });
  pane.addBinding(settings, "fps", { label: "FPS", readonly: true });
  pane.addBinding(settings, "fps", {
    label: "FPS Graph",
    readonly: true,
    view: "graph",
    min: 0,
    max: 120,
  });
  pane.addBlade({ view: "separator" });
  pane.addBinding(settings, "noiseMotion", { label: "Noise Motion" });
  pane.addBinding(settings, "motionAmount", {
    label: "Motion Amount",
    min: 0,
    max: 0.6,
    step: 0.01,
  });
  pane.addBinding(settings, "motionSpeed", {
    label: "Motion Speed",
    min: 0,
    max: 1.5,
    step: 0.01,
  });
  pane.addBinding(settings, "noiseScale", {
    label: "Noise Scale",
    min: 0.04,
    max: 1,
    step: 0.01,
  });
  pane.addBlade({ view: "separator" });
  pane
    .addButton({ title: "Load Audio" })
    .on("click", () => document.getElementById("file").click());
  const previewControl = pane.addButton({ title: "Start Light Preview" });
  previewControl.on("click", () => previewButton.click());
  const previewObserver = new MutationObserver(() => {
    previewControl.title = previewButton.textContent;
  });
  previewObserver.observe(previewButton, { childList: true });
  pane.addBlade({ view: "separator" });
  pane
    .addBinding(settings, "bpm", { label: "BPM", min: 40, max: 180, step: 1 })
    .on("change", () => (lastBeat = -1));
  pane
    .addBinding(settings, "offset", {
      label: "Beat Offset (s)",
      min: 0,
      max: 3,
      step: 0.01,
    })
    .on("change", () => (lastBeat = -1));
  pane
    .addBinding(settings, "active", {
      label: "Active Lights",
      min: 1,
      max: 4,
      step: 1,
    })
    .on("change", () => {
      lastBeat = -1;
      if (!preview && audio.paused) staticCue();
    });
  pane.addBlade({ view: "separator" });
  pane
    .addBinding(settings, "fog", {
      label: "Fog",
      min: 0.005,
      max: 0.06,
      step: 0.001,
    })
    .on("change", () => (scene.fog.density = settings.fog));
  pane.addBinding(settings, "brightness", {
    label: "Light Intensity",
    min: 0.3,
    max: 2,
    step: 0.05,
  });
  pane.addBlade({ view: "separator" });
  pane
    .addBinding(settings, "threadRadius", {
      label: "Red Thread Radius",
      min: 0.008,
      max: 0.035,
      step: 0.001,
    })
    .on("change", rebuildThreads);
  pane.addBlade({ view: "separator" });
  pane
    .addBinding(settings, "blackDensity", {
      label: "Black Thread Density",
      min: 1,
      max: 12,
      step: 1,
    })
    .on("change", () =>
      curtains.setDensity(settings.blackDensity, camera.position),
    );
  pane
    .addBinding(settings, "blackRadius", {
      label: "Black Thread Radius",
      min: 0.006,
      max: 0.024,
      step: 0.001,
    })
    .on("change", () => curtains.setRadius(settings.blackRadius));
  pane.addBlade({ view: "separator" });
  pane.addBinding(settings, "ceilingBrightness", {
    label: "Ceiling Light",
    min: 0.1,
    max: 1.8,
    step: 0.05,
  });
  pane
    .addBinding(settings, "reflection", {
      label: "Reflection",
      min: 0.1,
      max: 0.65,
      step: 0.01,
    })
    .on("change", () => floor.userData.setReflection(settings.reflection));
  pane.addBlade({ view: "separator" });
  pane.addButton({ title: "Randomize Layout" }).on("click", () => {
    seed = (Math.random() * 0xffffffff) >>> 0;
    rebuild();
    avoidHands(camera, poses);
  });
  pane.addButton({ title: "Return to Entrance" }).on("click", () => {
    entrance();
    if (!preview && audio.paused) staticCue();
  });
  previewButton.textContent = "Start Light Preview";
  status.textContent = "Ceiling noise study · Floor hands remain still";
  const previousWalk = new THREE.Vector3();
  let last = 0,
    lastGUI = 0,
    frames = 0,
    elapsed = 0;
  let noiseTime = 0,
    motionTick = -1;
  renderer.setAnimationLoop((now) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    if (settings.noiseMotion) noiseTime += dt * settings.motionSpeed;
    // Share one motion update between the main view, reflection and collision system.
    const tick = Math.floor(now * 0.03);
    if (tick !== motionTick) {
      ceiling.updateNoise(
        noiseTime,
        settings.motionAmount,
        settings.noiseScale,
      );
      curtains.followCeiling();
      motionTick = tick;
    }
    previousWalk.copy(camera.position);
    controls.update(dt);
    avoidHands(camera, poses);
    curtains.constrain(camera.position, previousWalk);
    const rhythmic = preview || (!audio.paused && !audio.ended);
    let envelope = 1;
    if (rhythmic) {
      const t =
          (preview ? (now - startTime) / 1000 : audio.currentTime) -
          settings.offset,
        beatTime = (t * settings.bpm) / 60,
        beat = Math.floor(beatTime);
      if (beat !== lastBeat) {
        lastBeat = beat;
        lightCue(beatCue(beat, poses.length, settings.active, seed));
      }
      envelope = t < 0 ? 0 : pulseAt(beatTime - beat, 60 / settings.bpm);
    }
    lights.forEach(
      (light, i) =>
        (light.intensity =
          cue[i] === undefined ? 0 : 520 * settings.brightness * envelope),
    );
    chairLights.forEach(
      (light, i) =>
        (light.intensity =
          (i === 0 ? 290 : 150) *
          settings.brightness *
          (rhythmic ? 0.25 + 0.75 * envelope : 1)),
    );
    objects.forEach((object, i) => {
      const value = cue.includes(i) ? 0.035 + 0.8 * envelope : 0.025;
      object.disk.material.color.copy(object.color).multiplyScalar(value);
    });
    ceiling.setBrightness(settings.ceilingBrightness * settings.brightness);
    if (controls.pitch > 0.1) camera.layers.enable(CEILING_LAYER);
    else camera.layers.disable(CEILING_LAYER);
    renderer.render(scene, camera);
    frames++;
    elapsed += dt;
    if (now - lastGUI > 300) {
      settings.fps = elapsed ? Math.round(frames / elapsed) : 0;
      pane.refresh();
      lastGUI = now;
      frames = 0;
      elapsed = 0;
    }
  });
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}
// Wait for the CDN module in index.html before starting the scene.
function startScene() {
  init().catch((error) => {
    const message = document.getElementById("scene-error");
    message.hidden = false;
    message.textContent =
      "Scene failed to load. Please reload: " + error.message;
    console.error(error);
  });
}

if (window.THREE_LIBRARIES_READY) {
  startScene();
} else {
  window.addEventListener("three-libraries-ready", startScene, { once: true });
}
