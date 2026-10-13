const miniBallSpacing = 8;     
const miniBallCount = 8001;      
const miniWaveLength = 160;      
const miniWaveSpeed = 100;       
const miniWaveMaxScale = 3;      
const ballPulseDuration = 0.12;  
const centerPulseDuration = 0.24; 
const centerBallMinScale = 0.8;
const centerBallMaxScale = 2.5;
const cameraPause = 1.4;        
const cameraTurnTime = 0.35;    
const cameraDistance = 350;
const particleCount = 60;     
const particles = [];

let ball, topBall, centerBall, bottomBall;
let leftBall, rightBall;
let directionalLight;
let miniBallColumn, miniBallRow;
let miniBall;
let startTime;
let nextRedFlash = 1;
let redFlashStart = -1;

function setupThree() {
  startTime = performance.now();
  scene.background = new THREE.Color(0x000000);
  controls.enabled = false; 
  addLights();


  const geometry = new THREE.SphereGeometry(100, 32, 16);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
  });
  ball = new THREE.Mesh(geometry, material);
  scene.add(ball);


  topBall = createBall(130);
  centerBall = createBall(0);
  bottomBall = createBall(-130);

  leftBall = createBall(0);
  leftBall.position.x = -130;
  rightBall = createBall(0);
  rightBall.position.x = 130;


  centerBall.material.color.set(0x181818);
  centerBall.scale.setScalar(centerBallMinScale);

  miniBall = new THREE.Object3D();
  miniBallColumn = createMiniBalls();
  miniBallRow = createMiniBalls();
  moveMiniBalls(0, miniBallColumn, "y");
  moveMiniBalls(0, miniBallRow, "x");
  createParticles();
  moveParticles(0);
}

function addLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  directionalLight.position.set(200, 300, 400);
  scene.add(directionalLight);


  const centerLight = new THREE.PointLight(0xffffff, 3000, 400, 2);
  scene.add(centerLight);
}

function createBall(y) {
  const geometry = new THREE.SphereGeometry(25, 32, 16);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4,
    metalness: 1,
  });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.y = y;
  scene.add(sphere);
  return sphere;
}


function updateThree() {
  const seconds = (time - startTime) / 1000;
  flashBackground(seconds);
  moveCamera(seconds);
  ball.rotation.y += 0.01;
  moveLight(seconds);
  resizeBalls(seconds);
  moveParticles(seconds);
  moveMiniBalls(seconds, miniBallColumn, "y");
  moveMiniBalls(seconds, miniBallRow, "x");
}

function flashBackground(seconds) {
  if (seconds >= nextRedFlash) {
    redFlashStart = seconds;
    nextRedFlash = seconds + 1 + Math.random(); // 每隔 1–2 秒闪一次
  }

  const progress = (seconds - redFlashStart) / 0.25;
  if (redFlashStart >= 0 && progress < 1) {
    scene.background.setRGB(0.6 * (1 - progress), 0, 0); // 红色逐渐退回黑色
  } else {
    scene.background.setRGB(0, 0, 0);
  }
}

function createParticles() {
  
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "white");
  glow.addColorStop(0.15, "white");
  glow.addColorStop(0.4, "rgba(180, 220, 255, 0.5)");
  glow.addColorStop(1, "rgba(180, 220, 255, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);

  
  const material = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Sprite(material);
    const size = 5 + Math.random() * 5;
    particle.scale.set(size, size, 1);
    particle.userData.radius = 110 + Math.random() * 45;
    particle.userData.tilt = Math.random() * Math.PI;
    particle.userData.angle = Math.random() * Math.PI * 2;
    particle.userData.speed = 0.4 + Math.random() * 0.6;
    particles.push(particle);
    scene.add(particle);
  }
}

function moveParticles(seconds) {
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    const orbit = particle.userData;
    const angle = orbit.angle + seconds * orbit.speed;
    particle.position.set(
      Math.cos(angle) * orbit.radius,
      Math.sin(angle) * orbit.radius * Math.sin(orbit.tilt),
      Math.sin(angle) * orbit.radius * Math.cos(orbit.tilt)
    );
  }
}

function moveCamera(seconds) {
  const halfCycle = cameraPause + cameraTurnTime;
  const roundTrip = halfCycle * 2;
  const cycleTime = seconds % roundTrip;
  const direction = Math.floor(seconds / roundTrip) % 2; // 0：左右，1：上下
  let angle = 0;

  if (cycleTime < cameraPause) {
    angle = 0; 
  } else if (cycleTime < halfCycle) {
    const progress = (cycleTime - cameraPause) / cameraTurnTime;
    angle = Math.PI * progress;
  } else if (cycleTime < halfCycle + cameraPause) {
    angle = Math.PI; 
  } else {
    const progress = (cycleTime - halfCycle - cameraPause) / cameraTurnTime;
    angle = Math.PI * (1 - progress); 
  }

  if (direction === 0) {
    camera.position.set(
      Math.sin(angle) * cameraDistance,
      0,
      Math.cos(angle) * cameraDistance
    );
    camera.up.set(0, 1, 0);
  } else {
    camera.position.set(
      0,
      Math.sin(angle) * cameraDistance,
      Math.cos(angle) * cameraDistance
    );
    camera.up.set(0, Math.cos(angle), -Math.sin(angle));
  }
  camera.lookAt(0, 0, 0); 
}

function moveLight(seconds) {
  const angle = seconds * 60;
  directionalLight.position.x = 200 * Math.cos(angle) - 400 * Math.sin(angle);
  directionalLight.position.z = 200 * Math.sin(angle) + 400 * Math.cos(angle);
}

function resizeBalls(seconds) {
  const cycleTime = seconds % (ballPulseDuration * 2 + centerPulseDuration);
  let activeBall;
  let progress;
  if (cycleTime < ballPulseDuration) {
    activeBall = 0;
    progress = cycleTime / ballPulseDuration;
  } else if (cycleTime < ballPulseDuration + centerPulseDuration) {
    activeBall = 1;
    progress = (cycleTime - ballPulseDuration) / centerPulseDuration;
  } else {
    activeBall = 2;
    progress = (cycleTime - ballPulseDuration - centerPulseDuration) / ballPulseDuration;
  }
  const wave = Math.sin(progress * Math.PI);
  const amount = wave * wave;       

  topBall.scale.setScalar(1);
  centerBall.scale.setScalar(centerBallMinScale);
  bottomBall.scale.setScalar(1);

  if (activeBall === 0) {
    topBall.scale.setScalar(1 + 0.6 * amount);
  } else if (activeBall === 1) {
    const size = centerBallMinScale + (centerBallMaxScale - centerBallMinScale) * amount;
    centerBall.scale.setScalar(size);
  } else {
    bottomBall.scale.setScalar(1 + 0.6 * amount);
  }
}

function createMiniBalls() {
  const geometry = new THREE.SphereGeometry(2.5, 12, 8);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4,
    metalness: 1,
  });
  const balls = new THREE.InstancedMesh(geometry, material, miniBallCount);
  balls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(balls);
  return balls;
}


function moveMiniBalls(seconds, balls, axis) {
  const offset = Math.round(camera.position[axis] / miniBallSpacing) * miniBallSpacing;
  balls.position[axis] = offset;

  for (let i = 0; i < miniBallCount; i++) {
    const position = (i - (miniBallCount - 1) / 2) * miniBallSpacing;
    const phase = (position + offset - seconds * miniWaveSpeed) / miniWaveLength;
    const wave = (1 + Math.cos(phase * Math.PI * 2)) / 2;
    const size = 0.65 + (miniWaveMaxScale - 0.65) * wave * wave * wave;

    miniBall.position.set(0, 0, 0);
    miniBall.position[axis] = position; 
    miniBall.scale.setScalar(size);
    miniBall.updateMatrix();
    balls.setMatrixAt(i, miniBall.matrix);
  }
  balls.instanceMatrix.needsUpdate = true;
}
