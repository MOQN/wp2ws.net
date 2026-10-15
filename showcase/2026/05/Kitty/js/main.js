let params = {
  fps: 0,
  particleNumber: 10000,
  rotationSpeed: 0.01,
  shape: 0.5,
  wireframe: false,
  disperse: 0,
  sharpness: 0.5,
  breathing: 0.5,
  flyAway: 0.35,
};

const r = 300;
const MAX_PARTICLE_NUMBER = 10000;

let particles = [];
let pointCloud;
let cylinder;


function setupThree() {

  pane.addBinding(params, "particleNumber", {
    min: 0,
    max: MAX_PARTICLE_NUMBER,
    step: 100,
    label: "Particles"
  });

  pane.addBinding(params, "rotationSpeed", {
    min: 0,
    max: 0.1,
    step: 0.001,
    label: "Rotation Speed"
  });

  pane.addBinding(params, "shape", {
    min: 0,
    max: 1,
    step: 0.01,
    label: "Shape"
  });

  pane.addBinding(params, "wireframe", {
    label: "Wireframe"
  });

  pane.addBinding(params, "disperse", {
    min: 0,
    max: 0.25,
    step: 0.01,
    label: "Disperse"
  });

  pane.addBinding(params, "sharpness", {
    min: 0,
    max: 1,
    step: 0.01,
    label: "Sharpness"
  });

  pane.addBinding(params, "breathing", {
    min: 0,
    max: 1,
    step: 0.01,
    label: "Breathing"
  });

  pane.addBinding(params, "flyAway", {
    min: 0,
    max: 1,
    step: 0.01,
    label: "Fly Away"
  });

  cylinder = getCylinder();
  scene.add(cylinder);

  let positionAttribute = cylinder.geometry.attributes.position;
  let indexAttribute = cylinder.geometry.index;
  let triangleCount = indexAttribute.count / 3;

  for (let i = 0; i < MAX_PARTICLE_NUMBER; i++) {
    let p = new Particle();

    /***/
    let triangleIndex = Math.floor(random(triangleCount));

    let r1 = random();
    let r2 = random();

    p.w0 = 1 - Math.sqrt(r1);
    p.w1 = Math.sqrt(r1) * (1 - r2);
    p.w2 = Math.sqrt(r1) * r2;

    p.vertexA = indexAttribute.getX(triangleIndex * 3 + 0);
    p.vertexB = indexAttribute.getX(triangleIndex * 3 + 1);
    p.vertexC = indexAttribute.getX(triangleIndex * 3 + 2);

    p.followMesh(positionAttribute.array);
    p.pos.copy(p.target);
    p.originalZ = p.target.z;
    /***/

    p.setGradientColor();
    
    particles.push(p);
  }

  pointCloud = getPoints(particles);
  scene.add(pointCloud);
  pointCloud.geometry.setDrawRange(0, params.particleNumber);
}


function updateThree() {

  cylinder.visible = params.wireframe;
  cylinder.rotation.z += params.rotationSpeed;

  let scaleY = map(params.shape, 0, 1, 2, 0.2);
  let scaleXZ = map(params.shape, 0, 1, 0.5, 2);

  let radiusScale = scaleXZ * (1 + Math.sin(frame * 0.1) * params.breathing * 0.25);
  cylinder.scale.set(radiusScale, radiusScale, scaleY);

  let positionAttributes = cylinder.geometry.attributes.position;
  let indexAttribute = cylinder.geometry.index;

  let noiseFrequency = map(params.sharpness, 0, 1, 0.003, 0.025);
  let noiseAmplitude = map(params.sharpness, 0, 1, 15, 120);

  for (let i = 0; i < positionAttributes.count; i++) {
    let ptIndex = i * 3;

    let x = positionAttributes.array[ptIndex + 0];
    let y = positionAttributes.array[ptIndex + 1];
    let z = positionAttributes.array[ptIndex + 2];

    let angle = Math.atan2(y, x);
    let baseX = Math.cos(angle) * r;
    let baseY = Math.sin(angle) * r;

    let xOffset = baseX * noiseFrequency + frame * 0.01;
    let yOffset = baseY * noiseFrequency + frame * 0.01;
    let zOffset = z * noiseFrequency + frame * 0.01;

    let displacement = map(noise(xOffset, yOffset, zOffset), 0, 1, -noiseAmplitude, noiseAmplitude);
    let wave = Math.sin(baseX * 0.015 + baseY * 0.015 + z * 0.015 + frame * 0.05) * 10;
    let newRadius = r + displacement + wave;

    positionAttributes.array[ptIndex + 0] = Math.cos(angle) * newRadius;
    positionAttributes.array[ptIndex + 1] = Math.sin(angle) * newRadius;
    positionAttributes.array[ptIndex + 2] = z;
  }

  positionAttributes.needsUpdate = true;


  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];

    if (p.isDone) {
      p.reappear(
        positionAttributes.array,
        indexAttribute
      );
    } else if (p.isFlying) {
      p.flow();
      p.updatePosition();
      p.updateLifespan();
    } else {
      p.followMesh(positionAttributes.array);
      p.target.applyMatrix4(cylinder.matrixWorld);
      p.disperse();
      p.attractedToTarget();
      p.flow();
      p.updatePosition();
      if (random() < params.flyAway * 0.001) {
        p.flyAway();
      }
    }
  }

  let positionArray = pointCloud.geometry.attributes.position.array;
  let colorArray = pointCloud.geometry.attributes.color.array;

  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    let ptIndex = i * 3;
    let colorIndex = i * 4;

    positionArray[ptIndex + 0] = p.pos.x;
    positionArray[ptIndex + 1] = p.pos.y;
    positionArray[ptIndex + 2] = p.pos.z;

    colorArray[colorIndex + 0] = p.color.r;
    colorArray[colorIndex + 1] = p.color.g;
    colorArray[colorIndex + 2] = p.color.b;
    colorArray[colorIndex + 3] = p.lifespan;
  }

  pointCloud.geometry.setDrawRange(0, params.particleNumber);
  pointCloud.geometry.attributes.position.needsUpdate = true;
  pointCloud.geometry.attributes.color.needsUpdate = true;
}

function getCylinder() {
  const geometry = new THREE.CylinderGeometry(300, 300, 600, 100, 30, true);
  geometry.rotateX(Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0xfffad1,
    wireframe: true,
    side: THREE.DoubleSide,
  });
  const cylinder = new THREE.Mesh(geometry, material);
  return cylinder;
}


function getPoints(objects) {
  const vertices = new Float32Array(MAX_PARTICLE_NUMBER * 3);
  const colors = new Float32Array(MAX_PARTICLE_NUMBER * 4);
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    vertexColors: true,
    size: 4,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  return points;
}



class Particle {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();

    this.target = new THREE.Vector3();
    this.force = new THREE.Vector3();

    this.baseScl = new THREE.Vector3(1, 1, 1);
    this.scl = this.baseScl.clone();
    this.mass = 1;

    this.rot = new THREE.Vector3();
    this.rotVel = new THREE.Vector3();
    this.rotAcc = new THREE.Vector3();

    this.lifespan = 1.0;
    this.lifeReduction = random(0.006, 0.014);
    this.isDone = false;
    this.isFlying = false;

    this.vertexA = 0;
    this.vertexB = 0;
    this.vertexC = 0;

    this.w0 = 0;
    this.w1 = 0;
    this.w2 = 0;

    this.originalZ = 0;

    this.disperseDirection = new THREE.Vector3(random(-1, 1), random(-1, 1), random(-1, 1));
    this.disperseDirection.normalize();
    this.disperseDistance = random(150, 650);

    this.flyDirection = new THREE.Vector3();

    this.color = new THREE.Color();
  }
  setGradientColor() {
    let colorA = new THREE.Color(0x9F0000);
    let colorB = new THREE.Color(0xFFD9D1);
    let t = map(this.originalZ, -300, 300, 0, 1);
    t = Math.abs(t);
    this.color.lerpColors(colorA, colorB, t);
  }
  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    return this;
  }
  setVelocity(x, y, z) {
    this.vel.set(x, y, z);
    return this;
  }
  setRotationAngle(x, y, z) {
    this.rot.set(x, y, z);
    return this;
  }
  setRotationVelocity(x, y, z) {
    this.rotVel.set(x, y, z);
    return this;
  }
  setScale(w, h, d) {
    const minScale = 0.01;
    if (w < minScale) w = minScale;
    if (h < minScale) h = minScale;
    if (d < minScale) d = minScale;
    this.baseScl.set(w, h, d);
    this.scl.copy(this.baseScl);
    return this;
  }
  setMass(mass) {
    if (mass) {
      this.mass = mass;
    } else {
      this.mass = 1 + (this.baseScl.x * this.baseScl.y * this.baseScl.z) * 0.000001; // arbitrary
    }
    return this;
  }
  updatePosition() {
    this.adjustVelocity(-0.05);
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.set(0, 0, 0);
  }
  adjustVelocity(amount) {
    this.vel.multiplyScalar(1 + amount);
  }
  updateRotation() {
    this.rotVel.add(this.rotAcc);
    this.rot.add(this.rotVel);
    this.rotAcc.set(0, 0, 0);
  }
 applyForce(f) {
    let force = f.clone();
    if (this.mass > 0) {
      force.divideScalar(this.mass);
      this.acc.add(force);
    }
  }
  followMesh(vertices) {
    let a = this.vertexA * 3;
    let b = this.vertexB * 3;
    let c = this.vertexC * 3;
    this.target.x = vertices[a + 0] * this.w0 + vertices[b + 0] * this.w1 + vertices[c + 0] * this.w2;
    this.target.y = vertices[a + 1] * this.w0 + vertices[b + 1] * this.w1 + vertices[c + 1] * this.w2;
    this.target.z = vertices[a + 2] * this.w0 + vertices[b + 2] * this.w1 + vertices[c + 2] * this.w2;
  }
  attractedToTarget() {
    this.force.copy(this.target);
    this.force.sub(this.pos);
    this.force.multiplyScalar(0.04);
    this.applyForce(this.force);
  }
  disperse() {
    let distance = this.disperseDistance * params.disperse;
    this.target.addScaledVector(this.disperseDirection, distance);
  }
  flyAway() {
    this.isFlying = true;
    this.isDone = false;
    this.lifespan = 1.0;
    this.lifeReduction = random(0.005, 0.015);
    this.flyDirection.set(this.pos.x, this.pos.y, 0);
    this.flyDirection.normalize();
    this.flyDirection.x += random(-0.4, 0.4);
    this.flyDirection.y += random(-0.4, 0.4);
    this.flyDirection.z += random(-0.4, 0.4);
    this.flyDirection.normalize();
    let flySpeed = random(6, 12);
    this.vel.copy(this.flyDirection);
    this.vel.multiplyScalar(flySpeed);
    this.acc.set(0, 0, 0);
  }
  reappear(vertices, indexAttribute) {
    let triangleCount = indexAttribute.count / 3;
    let triangleIndex = Math.floor(random(triangleCount));
    this.vertexA = indexAttribute.getX(triangleIndex * 3 + 0);
    this.vertexB = indexAttribute.getX(triangleIndex * 3 + 1);
    this.vertexC = indexAttribute.getX(triangleIndex * 3 + 2);
    let r1 = random();
    let r2 = random();
    this.w0 = 1 - Math.sqrt(r1);
    this.w1 = Math.sqrt(r1) * (1 - r2);
    this.w2 = Math.sqrt(r1) * r2;
    this.followMesh(vertices);
    this.originalZ = this.target.z;
    this.setGradientColor();
    this.target.applyMatrix4(cylinder.matrixWorld);
    this.pos.copy(this.target);
    this.vel.set(0, 0, 0);
    this.acc.set(0, 0, 0);
    this.lifespan = 1.0;
    this.lifeReduction = random(0.005, 0.015);
    this.isFlying = false;
    this.isDone = false;
  }
  disappear() {
    if (this.pos.z > 1000) {
      this.isDone = true;
    }
  }
  updateLifespan() {
    if (this.isFlying) {
      this.lifespan -= this.lifeReduction;
      if (this.lifespan <= 0) {
        this.lifespan = 0;
        this.isDone = true;
      }
    }
  }
  updateScale() {
    this.scl.set(
      this.baseScl.x * this.lifespan,
      this.baseScl.y * this.lifespan,
      this.baseScl.z * this.lifespan
    );
  }
  flow() {
    let xFreq = this.pos.x * 0.005 + frame * 0.005;
    let yFreq = this.pos.y * 0.005 + frame * 0.005;
    let zFreq = this.pos.z * 0.005 + frame * 0.005;
    let noiseValue = map(noise(xFreq, yFreq, zFreq), 0, 1, -1, 1);
    this.force.set(Math.cos(frame * 0.01), Math.sin(frame * 0.008), Math.sin(frame * 0.012));
    this.force.normalize();
    this.force.multiplyScalar(noiseValue * 0.1);
    this.applyForce(this.force);
  }
}
