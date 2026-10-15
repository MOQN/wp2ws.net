const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;
const MAX_PARTICLE_NUMBER = 25000;

const CHAR_FILL = 0.62;
const WORD_HOLD_TIME = 1000;
const INTENSE_UP = 0.08;
const INTENSE_DOWN = 0.0015;
const DARK_START = 0.5;

const POSITIVE_WORDS = [
  "思念", "陪伴", "心动", "温柔", "拥抱", "守护", "牵挂", "想你", "珍惜", "喜欢",
  "心跳", "承诺", "永远", "在乎", "依恋", "浪漫", "甜蜜", "温暖", "信任", "理解",
  "包容", "默契", "相守", "相知", "相伴", "亲吻", "微笑", "心安", "心疼", "偏爱",
  "宠爱", "告白", "约定", "余生", "眷恋", "期待", "惦记", "安心", "幸福", "美好",
  "柔软", "欢喜", "牵手", "晚安", "早安", "想念", "守候", "倾心", "钟情", "久伴",
  "怦然心动", "一见钟情", "白头偕老", "细水长流", "朝朝暮暮", "心有灵犀", "两情相悦",
  "天长地久", "一生一世", "情投意合",
];
const NEGATIVE_WORDS = [
  "控制", "窒息", "约束", "占有", "束缚", "嫉妒", "怀疑", "压迫", "沉重", "不安",
  "质问", "逃离", "猜忌", "冷漠", "争吵", "背叛", "谎言", "委屈", "疲惫", "失望",
  "孤独", "心碎", "伤害", "逃避", "忽视", "敷衍", "疏远", "沉默", "焦虑", "执念",
  "纠缠", "囚禁", "隔阂", "埋怨", "指责", "冷战", "失控", "妥协", "枷锁", "牢笼",
  "撕裂", "监视", "索取", "内耗", "煎熬", "遗憾", "破碎", "卑微", "讨好", "惶恐",
  "患得患失", "形同陌路", "身心俱疲", "貌合神离", "不欢而散",
];

const pinkColor = new THREE.Color(1.0, 0.6, 0.7);
const redColor = new THREE.Color(0.85, 0.0, 0.1);
const blackColor = new THREE.Color(0.05, 0.0, 0.0);
const loveColor = new THREE.Color();

let particles = [];
let pointCloud;
let drawCount = 0;
let intense = 0;
let textCanvas;
let charBox;
let charScale = 1;

function setupThree() {
  scene.background = new THREE.Color(0xffffff);

  textCanvas = createGraphics(300, 300);
  textCanvas.pixelDensity(1);

  let points = getTextPoints("爱", 270, 2);
  charBox = getBox(points, 1);
  let shift = charBox.getCenter(new THREE.Vector3()).negate();
  charBox.translate(shift);
  for (let pt of points) {
    let p = new Particle()
      .setType("heart")
      .setHome(pt.x + shift.x, pt.y + shift.y, random(-20, 20))
      .setPosition(random(-WORLD_HALF, WORLD_HALF), random(-WORLD_HALF, WORLD_HALF), random(-WORLD_HALF, WORLD_HALF));
    particles.push(p);
  }

  pointCloud = getPoints();
  scene.add(pointCloud);

  let downX, downY;
  renderer.domElement.addEventListener("pointerdown", (e) => {
    downX = e.clientX;
    downY = e.clientY;
  });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (dist(downX, downY, e.clientX, e.clientY) < 5) onClick();
  });
}

function updateThree() {
  intense = max(intense - INTENSE_DOWN, 0);
  if (intense < DARK_START) {
    loveColor.lerpColors(pinkColor, redColor, intense / DARK_START);
  } else {
    loveColor.lerpColors(redColor, blackColor, (intense - DARK_START) / (1 - DARK_START));
  }

  let screen = getScreenSize();
  let charSize = charBox.getSize(new THREE.Vector3());
  charScale = min(screen.w * CHAR_FILL / charSize.x, screen.h * CHAR_FILL / charSize.y);

  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];

    if (p.type === "heart") {
      let nx = p.home.x * 0.02;
      let ny = p.home.y * 0.02;
      let t = frame * 0.01;
      p.target.set(
        p.home.x * charScale + (noise(nx, ny, t) - 0.5) * 40,
        p.home.y * charScale + (noise(nx + 100, ny, t) - 0.5) * 40,
        p.home.z + (noise(nx, ny + 100, t) - 0.5) * 40
      );
      p.seek(0.01);
      p.adjustVelocity(-0.08);
      p.color.copy(loveColor);
    }
    else if (p.type === "word") {
      p.seek(0.2);
      p.adjustVelocity(-0.4);
      if (millis() - p.bornTime > WORD_HOLD_TIME) {
        p.type = "scatter";
        p.setVelocity(random(-4, 4), random(-4, 4), random(-4, 4));
      }
    }
    else if (p.type === "scatter") {
      p.adjustVelocity(-0.02);
      p.updateLifespan();
    }

    p.updatePosition();
  }

  particles = particles.filter((p) => !p.isDone);

  const positionAttribute = pointCloud.geometry.attributes.position;
  const colorAttribute = pointCloud.geometry.attributes.color;
  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    positionAttribute.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
    colorAttribute.setXYZW(i, p.color.r, p.color.g, p.color.b, min(p.lifespan * 3, 1));
  }
  positionAttribute.needsUpdate = true;
  colorAttribute.needsUpdate = true;

  drawCount = particles.length;
  pointCloud.geometry.setDrawRange(0, drawCount);
}

function onClick() {
  intense = min(intense + INTENSE_UP, 1);

  for (let p of particles) {
    if (p.type === "heart") {
      let force = new THREE.Vector3().randomDirection();
      force.multiplyScalar(random(2, 6) * (1 + intense));
      p.applyForce(force);
    }
  }

  let word = intense > DARK_START ? random(NEGATIVE_WORDS) : random(POSITIVE_WORDS);
  popWord(word);
}

function popWord(word) {
  let points = getTextPoints(word, 60, 3);
  let baseBox = getBox(points, 1);
  let screen = getScreenSize();

  let charHeight = (charBox.max.y - charBox.min.y) * charScale;
  let scale = random(0.1, 0.5) * charHeight / (baseBox.max.y - baseBox.min.y);
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 200; tries++) {
    if (tries > 0 && tries % 20 === 0) scale *= 0.85;
    let box = getBox(points, scale);
    let minX = -screen.w * 0.45 - box.min.x;
    let maxX = screen.w * 0.45 - box.max.x;
    let minY = -screen.h * 0.45 - box.min.y;
    let maxY = screen.h * 0.37 - box.max.y;
    if (minX > maxX || minY > maxY) continue;
    x = random(minX, maxX);
    y = random(minY, maxY);
    box.translate(new THREE.Vector3(x, y, 0));
    if (countCharPointsIn(box) <= 10) break;
  }

  let bornTime = millis();
  for (let pt of points) {
    if (particles.length >= MAX_PARTICLE_NUMBER) break;
    let p = new Particle()
      .setType("word")
      .setPosition(x + pt.x * scale * 0.3, y + pt.y * scale * 0.3, 0)
      .setTarget(x + pt.x * scale, y + pt.y * scale, 0)
      .setColor(loveColor);
    p.bornTime = bornTime;
    particles.push(p);
  }
}

function getScreenSize() {
  let h = 2 * tan(radians(camera.fov / 2)) * 1000;
  return { w: h * camera.aspect, h: h };
}

function countCharPointsIn(box) {
  let count = 0;
  for (let p of particles) {
    if (p.type !== "heart") continue;
    let x = p.home.x * charScale;
    let y = p.home.y * charScale;
    if (x > box.min.x && x < box.max.x && y > box.min.y && y < box.max.y) {
      count++;
    }
  }
  return count;
}

function getBox(points, scale) {
  let box = new THREE.Box3();
  for (let pt of points) {
    box.expandByPoint(new THREE.Vector3(pt.x * scale, pt.y * scale, 0));
  }
  return box;
}

function getTextPoints(str, size, step) {
  let g = textCanvas;
  g.background(0);
  g.fill(255);
  g.noStroke();
  g.textAlign(CENTER, CENTER);
  g.textStyle(BOLD);
  g.textSize(size);
  g.text(str, g.width / 2, g.height / 2 + size * 0.05);
  g.loadPixels();

  let points = [];
  for (let y = 0; y < g.height; y += step) {
    for (let x = 0; x < g.width; x += step) {
      let index = (y * g.width + x) * 4;
      if (g.pixels[index] > 128) {
        points.push({ x: x - g.width / 2, y: g.height / 2 - y });
      }
    }
  }
  return points;
}

function getPoints() {
  const vertices = new Float32Array(MAX_PARTICLE_NUMBER * 3);
  const colors = new Float32Array(MAX_PARTICLE_NUMBER * 4);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  geometry.setDrawRange(0, drawCount);

  const material = new THREE.PointsMaterial({
    size: 12,
    map: getDotTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

function getDotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0.0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.5, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(1.0, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
