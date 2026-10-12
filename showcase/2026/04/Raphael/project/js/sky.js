const stars = [];
const STAR_COUNT = 900;
let starPosition, starColor, trailPosition, trailColor, starTrails, impactLight;
let stormTarget, stormAnchor;
let skyClock = 0, skyFade = 0, previewTime = 0;
let storm = { time: -1, hits: 0, heat: 0 };

function setupStars() {
  starPosition = new THREE.Float32BufferAttribute(new Float32Array(STAR_COUNT * 3), 3);
  starColor = new THREE.Float32BufferAttribute(new Float32Array(STAR_COUNT * 3), 3);
  const sizes = [0.9, 1.5, 2.3];
  const groups = [[], [], []];
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext("2d");
  const soft = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  soft.addColorStop(0, "white");
  soft.addColorStop(0.3, "rgba(255,255,255,0.8)");
  soft.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = soft;
  ctx.fillRect(0, 0, 16, 16);
  const sprite = new THREE.CanvasTexture(canvas);

  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({ origin: new THREE.Vector3(), color: new THREE.Color(), delay: 0, flight: 4 });
    const size = Math.random();
    groups[size < 0.65 ? 0 : size < 0.93 ? 1 : 2].push(i);
  }
  for (let i = 0; i < sizes.length; i++) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", starPosition);
    geometry.setAttribute("color", starColor);
    geometry.setIndex(groups[i]);
    const material = new THREE.PointsMaterial({ map: sprite, size: sizes[i], sizeAttenuation: false,
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
  }

  const geometry = new THREE.BufferGeometry();
  trailPosition = new THREE.Float32BufferAttribute(new Float32Array(STAR_COUNT * 6), 3);
  trailColor = new THREE.Float32BufferAttribute(new Float32Array(STAR_COUNT * 6), 3);
  geometry.setAttribute("position", trailPosition);
  geometry.setAttribute("color", trailColor);
  starTrails = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true,
    transparent: true, opacity: 0.65, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  starTrails.frustumCulled = false;
  scene.add(starTrails);
  stormTarget = new THREE.Vector3();
  impactLight = new THREE.PointLight(0xffce9c, 0, 0, 2);
  scene.add(impactLight);
  resetStars();
}

function resetStars() {
  storm.time = -1;
  storm.hits = 0;
  storm.heat = 0;
  skyFade = 0;
  previewTime = 0;
  stormAnchor = null;
  // separate from p5's seed, so the sky does not change the sculpture
  for (const star of stars) {
    let y = Math.random() * 2 - 1;
    let angle = Math.random() * Math.PI * 2;
    if (Math.random() < 0.28) {
      y = (Math.random() + Math.random() - 1) * 0.35;
      angle = Math.floor(Math.random() * 3) * 2.1 + (Math.random() - 0.5) * 1.1;
    }
    const radius = 18000 + Math.random() * 10000;
    const r = Math.sqrt(1 - y * y);
    star.origin.set(Math.cos(angle) * r, y, Math.sin(angle) * r).multiplyScalar(radius);
    star.origin.applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.42);
    star.color.setHSL(Math.random() < 0.2 ? 0.1 : 0.58, 0.1 + Math.random() * 0.25, 0.28 + Math.random() * 0.62);
    star.delay = Math.random() * 3.5;
    star.flight = 3.2 + Math.random() * 1.4;
  }
}

function beginStorm() {
  if (storm.time >= 0) return;
  storm.time = 0;
  storm.hits = 0;
  pickStormAnchor();
}

function pickStormAnchor() {
  const visible = bars.filter((bar) => !(bar instanceof Spire) && !bar.isDone && bar.lifespan > 0.15);
  stormAnchor = null;
  if (!visible.length) return;
  const low = new THREE.Vector3(Infinity, Infinity, Infinity);
  const high = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  const center = new THREE.Vector3();
  for (const bar of visible) {
    low.min(bar.pos);
    high.max(bar.pos);
    center.add(bar.pos);
  }
  center.divideScalar(visible.length);
  center.y = low.y + (high.y - low.y) * 0.65;
  let distance = Infinity;
  for (const bar of visible) {
    const d = bar.pos.distanceToSquared(center);
    if (d < distance) {
      distance = d;
      stormAnchor = bar;
    }
  }
  stormTarget.copy(stormAnchor.pos);
}

function updateStars(delta) {
  const seconds = delta / 60;
  if (!params.pause) {
    skyClock += seconds;
    if (storm.time >= 0) storm.time += seconds;
  }
  const preview = params.study === "melt";
  if (preview) {
    if (previewTime === 0 || previewTime + seconds >= 13) pickStormAnchor();
    previewTime = (previewTime + seconds) % 13;
  } else previewTime = 0;
  const elapsed = preview ? previewTime : params.study === "cycle" ? storm.time : -1;
  if (elapsed >= 0) {
    if (!stormAnchor || stormAnchor.isDone || !bars.includes(stormAnchor)) pickStormAnchor();
    if (stormAnchor) stormTarget.copy(stormAnchor.pos);
  }
  skyFade += (1 - skyFade) * (1 - Math.pow(0.98, delta));
  const angle = skyClock * 0.0015;
  const c = Math.cos(angle), s = Math.sin(angle);
  let hits = 0, warmth = 0;

  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];
    const x = star.origin.x * c - star.origin.z * s;
    const y = star.origin.y;
    const z = star.origin.x * s + star.origin.z * c;
    const t = elapsed < 0 ? 0 : Math.max(0, Math.min(1, (elapsed - star.delay) / star.flight));
    const travel = t * t;
    const tail = Math.max(0, t - 0.018 - i % 7 * 0.004);
    const back = tail * tail;
    const px = x + (stormTarget.x - x) * travel;
    const py = y + (stormTarget.y - y) * travel;
    const pz = z + (stormTarget.z - z) * travel;
    starPosition.setXYZ(i, px, py, pz);
    const bright = t >= 1 ? 0 : skyFade * (0.45 + t * 1.6);
    const color = star.color;
    starColor.setXYZ(i, color.r * bright, color.g * bright, color.b * bright);
    trailPosition.setXYZ(i * 2, x + (stormTarget.x - x) * back, y + (stormTarget.y - y) * back, z + (stormTarget.z - z) * back);
    trailPosition.setXYZ(i * 2 + 1, px, py, pz);
    const streak = t > 0 && t < 1 ? Math.sin(t * Math.PI) * 0.9 : 0;
    trailColor.setXYZ(i * 2, 0, 0, 0);
    trailColor.setXYZ(i * 2 + 1, color.r * streak, color.g * streak, color.b * streak);
    if (t >= 1) {
      hits++;
      warmth += Math.max(0, 1 - (elapsed - star.delay - star.flight) / 0.8);
    }
  }
  if (!preview && params.study === "cycle") storm.hits = hits;
  const heat = 1 - Math.exp(-warmth * 0.05);
  storm.heat += (heat - storm.heat) * (1 - Math.pow(0.9, delta));
  impactLight.position.copy(stormTarget);
  impactLight.intensity = storm.heat * 35000;
  starTrails.visible = elapsed >= 0;
  starPosition.needsUpdate = starColor.needsUpdate = true;
  trailPosition.needsUpdate = trailColor.needsUpdate = true;
}
