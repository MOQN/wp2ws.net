const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;
const MAX_PARTICLE_NUMBER = 20000;

const PETAL_NUMBER = 6;
const STAMEN_NUMBER = 6;
const CURVE_STEPS = 48;


let particles = [];
let pointCloud;
let drawCount = 0;

let bloom = 0;
let flowerSize = 1;
let petalCurves = [];
let petalColor, centerColor, antherColor, calmColor;
let breathAmount = 0;
let breathPhase = 0;
let shakeTime = 0;
let flowerParticleNumber = 0;


function setupThree() {
  camera.position.set(0, 1000, 1);
  controls.target.set(0, 140, 0);
  controls.update();

  for (let i = 0; i < PETAL_NUMBER; i++) {
    petalCurves.push({ r: [], h: [], angle: [] });
  }
  updateFlower();

  for (let j = 0; j < 400; j++) {
    let p = new Particle();
    p.setType("pistil", 0);
    p.u = j / 400;
    particles.push(p);
  }
  for (let j = 0; j < 200; j++) {
    for (let i = 0; i < STAMEN_NUMBER; i++) {
      let p = new Particle();
      p.setType("stamen", i);
      p.u = j / 200;
      particles.push(p);
    }
  }
  for (let j = 0; j < 150; j++) {
    for (let i = 0; i < STAMEN_NUMBER; i++) {
      let p = new Particle();
      p.setType("anther", i);
      particles.push(p);
    }
  }
  for (let j = 0; j < 2400; j++) {
    for (let i = 0; i < PETAL_NUMBER; i++) {
      let p = new Particle();
      p.setType("petal", i);
      p.u = j / 2400;
      p.v = random(-1, 1);
      particles.push(p);
    }
  }
  flowerParticleNumber = particles.length;

  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    p.pos.x = random(-WORLD_HALF, WORLD_HALF);
    p.pos.y = random(-WORLD_HALF, WORLD_HALF);
    p.pos.z = random(-WORLD_HALF, WORLD_HALF);
  }

  pointCloud = getPoints();
  scene.add(pointCloud);
}


function updateThree() {
  updateFlower();

  let flowerIsGrown = params.particleNumber >= flowerParticleNumber;
  for (let i = 0; i < 3; i++) {
    if (particles.length < MAX_PARTICLE_NUMBER && bloom > 0.3 && flowerIsGrown) {
      let p = new Particle();
      p.setType("pollen", floor(random(0, STAMEN_NUMBER)));
      p.pos = getAntherPosition(p.index, p.offset);

      let spread = breathAmount * breathAmount * 500 * flowerSize;
      p.pos.x += p.scatter.x * spread;
      p.pos.y += p.scatter.y * spread;
      p.pos.z += p.scatter.z * spread;
      let drift = 1 + breathAmount * 4;
      p.setVelocity(random(-0.3, 0.3) * drift, random(0.2, 0.8), random(-0.3, 0.3) * drift);
      particles.push(p);
    }
  }

  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];

    if (p.type === "pollen") {
      p.shake(params.intensity * params.intensity * 3, shakeTime);
      p.adjustVelocity(-0.1 * params.intensity);
      p.flow();
      p.applyForce(new THREE.Vector3(0, 0.003, 0));
      p.updatePosition();
      p.updateLifespan();
    } else {
      let target = getTargetPosition(p);

      let spread = breathAmount * breathAmount * 500 * flowerSize;
      spread *= 0.85 + 0.15 * sin(frame * 0.02 + p.u * 3);
      target.x += p.scatter.x * spread;
      target.y += p.scatter.y * spread;
      target.z += p.scatter.z * spread;

      p.moveToward(target.x, target.y, target.z);
      p.shake(params.intensity * params.intensity * 25, shakeTime);
      p.flow();
      p.updatePosition();
    }
    updateParticleColor(p);

    if (p.isDone) {
      particles.splice(i, 1);
      i--;
    }
  }

  drawCount = min(particles.length, params.particleNumber);

  let positionArray = pointCloud.geometry.attributes.position.array;
  let colorArray = pointCloud.geometry.attributes.color.array;
  for (let i = 0; i < drawCount; i++) {
    let p = particles[i];
    let ptIndex = i * 3;

    positionArray[ptIndex + 0] = p.pos.x;
    positionArray[ptIndex + 1] = p.pos.y;
    positionArray[ptIndex + 2] = p.pos.z;

    colorArray[ptIndex + 0] = p.color.r;
    colorArray[ptIndex + 1] = p.color.g;
    colorArray[ptIndex + 2] = p.color.b;
  }
  pointCloud.geometry.setDrawRange(0, drawCount);
  pointCloud.geometry.attributes.position.needsUpdate = true;
  pointCloud.geometry.attributes.color.needsUpdate = true;
  pointCloud.material.size = params.pointSize;
}


function getPoints() {
  const vertices = new Float32Array(MAX_PARTICLE_NUMBER * 3);
  const colors = new Float32Array(MAX_PARTICLE_NUMBER * 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const texture = new THREE.TextureLoader().load('assets/particle-texture.jpg');
  const material = new THREE.PointsMaterial({
    vertexColors: true,
    size: params.pointSize,
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);

  return points;
}


function updateFlower() {
  bloom = params.bloom;
  bloom += sin(frame * 0.01) * 0.07;
  bloom = constrain(bloom, 0, 1.1);
  flowerSize = params.size;

  petalColor = hexToRGB(params.petalColor);
  centerColor = hexToRGB(params.centerColor);
  antherColor = hexToRGB(params.antherColor);
  calmColor = hexToRGB(params.calmColor);

  let low = 0.25 + params.breathing * 0.5;
  let high = low + 0.2;
  breathPhase += 0.004 * (1 + params.intensity * 3);
  breathAmount = lerp(low, high, 0.5 - 0.5 * cos(breathPhase));

  shakeTime += lerp(0.005, 0.12, params.intensity);

  for (let i = 0; i < PETAL_NUMBER; i++) {
    updatePetalCurve(i);
  }
}


function updatePetalCurve(i) {
  let curve = petalCurves[i];
  let b = bloom;
  if (i % 2 == 1) b = min(bloom * 1.08, 1.1);

  let length = 420 * flowerSize;
  let startAngle = lerp(0.55, 0.9, b);
  let bendIn = lerp(-1.25, 0, map(b, 0, 0.6, 0, 1, true));
  let curlOut = lerp(0, 2.5, pow(b, 1.3));

  let r = 12 * flowerSize;
  let h = 0;
  let stepLength = length / (CURVE_STEPS - 1);
  for (let k = 0; k < CURVE_STEPS; k++) {
    let u = k / (CURVE_STEPS - 1);
    let angle = startAngle + bendIn * u + curlOut * u * u;
    curve.r[k] = r;
    curve.h[k] = h;
    curve.angle[k] = angle;
    r = max(r + sin(angle) * stepLength, 2 * flowerSize);
    h = h + cos(angle) * stepLength;
  }
}


function getTargetPosition(p) {
  if (p.type === "petal") return getPetalPosition(p.index, p.u, p.v, p.offset);
  if (p.type === "stamen") return getStamenPosition(p.index, p.u, p.offset);
  if (p.type === "anther") return getAntherPosition(p.index, p.offset);
  return getPistilPosition(p.u, p.offset);
}


function getPetalPosition(i, u, v, offset) {
  let curve = petalCurves[i];

  let k = min(floor(u * (CURVE_STEPS - 1)), CURVE_STEPS - 2);
  let amt = u * (CURVE_STEPS - 1) - k;
  let r = lerp(curve.r[k], curve.r[k + 1], amt);
  let h = lerp(curve.h[k], curve.h[k + 1], amt);
  let angle = lerp(curve.angle[k], curve.angle[k + 1], amt);

  let maxWidth = 110 * flowerSize;
  if (i % 2 == 1) maxWidth = 80 * flowerSize;
  let width = pow(sin(PI * u), 0.7) * (1 - 0.3 * u) * maxWidth;

  let lift = v * v * width * 0.35;
  lift += sin(u * 28 + v * 3) * pow(abs(v), 4) * 10 * flowerSize;
  r = r - cos(angle) * lift;
  h = h + sin(angle) * lift;
  let side = v * width;

  let dir = (i / PETAL_NUMBER) * TWO_PI;
  let x = r * cos(dir) - side * sin(dir);
  let z = r * sin(dir) + side * cos(dir);

  return new THREE.Vector3(x + offset.x * 2, h + offset.y * 2, z + offset.z * 2);
}


function getInnerScale() {
  return lerp(0.62, 1, map(bloom, 0, 0.5, 0, 1, true));
}


function getStamenPosition(i, u, offset) {
  let dir = (i / STAMEN_NUMBER) * TWO_PI + PI / 6;
  let height = 300 * flowerSize * getInnerScale();
  let reach = lerp(15, 140, min(bloom, 1)) * flowerSize;
  let r = pow(u, 1.6) * reach;
  let h = u * height - pow(u, 3) * 30 * bloom * flowerSize;
  return new THREE.Vector3(r * cos(dir) + offset.x * 2, h + offset.y * 2, r * sin(dir) + offset.z * 2);
}


function getAntherPosition(i, offset) {
  let pos = getStamenPosition(i, 1, new THREE.Vector3());
  pos.x += offset.x * 14 * flowerSize;
  pos.y += offset.y * 6 * flowerSize;
  pos.z += offset.z * 14 * flowerSize;
  return pos;
}


function getPistilPosition(u, offset) {
  let height = 340 * flowerSize * getInnerScale();
  let lean = u * u * lerp(5, 45, min(bloom, 1)) * flowerSize;
  if (u > 0.94) {
    return new THREE.Vector3(lean + offset.x * 12, height + offset.y * 12, offset.z * 12);
  }
  return new THREE.Vector3(lean + offset.x * 3, u * height + offset.y * 3, offset.z * 3);
}


function updateParticleColor(p) {
  let c;
  let b = p.brightness;
  if (p.type === "petal") {
    let amt = map(p.u, 0.08, 0.5, 0, 1, true);
    c = mixColor(centerColor, petalColor, amt);
    b = b * 0.45;
    if (abs(p.v) < 0.12) b = b * 1.3;
  } else if (p.type === "anther") {
    c = antherColor;
  } else if (p.type === "pollen") {
    p.setColor(antherColor.r * p.lifespan, antherColor.g * p.lifespan, antherColor.b * p.lifespan);
    return;
  } else {
    c = mixColor(centerColor, petalColor, 0.3);
    b = b * 0.7;
  }

  let speed = p.vel.length();
  let target = map(speed, 0, 1.2, 0, 1, true);
  p.glow = lerp(p.glow, target, 0.08);
  c = mixColor(calmColor, c, p.glow);
  b = b * lerp(1.0, 1.7, p.glow);

  p.setColor(c.r * b, c.g * b, c.b * b);
}


function mixColor(c1, c2, amt) {
  return {
    r: lerp(c1.r, c2.r, amt),
    g: lerp(c1.g, c2.g, amt),
    b: lerp(c1.b, c2.b, amt)
  };
}


function hexToRGB(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255
  };
}
