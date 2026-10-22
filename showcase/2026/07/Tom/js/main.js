let params = {
  fps: 0,
  flowSpeed: 3.2,
  distortion: 40,
  waveFreq: 0.002,
  slideSpeed: 1.2,
  particleNumber: 6500,
  particleSize: 1.5,
  turbulence: 0.015,
  fogDensity: 0.00075,
  lightIntensity: 2.5,
  lightDistance: 2000,
  glowOpacity: 0.24
};

const WORLD_SIZE = 2400;
const WORLD_HALF = WORLD_SIZE / 2;
const MAX_PARTICLE_NUMBER = 10000;
const COLOR_BG = 0x020204;

let cubes = [];
let planes = [];
let particles = [];
let pointCloud;

//lights control 灯光
let nearLight;
let coreLight;
let midLight;
let deepLight;

function setupThree() {
  scene.background = new THREE.Color(COLOR_BG);
  scene.fog = new THREE.FogExp2(COLOR_BG, params.fogDensity);

  camera.position.z = 480;

  const ambiLight = new THREE.AmbientLight(0x221a12);
  scene.add(ambiLight);
  const hemiLight = new THREE.HemisphereLight(0xffc266, 0x10223d, 0.85);
  scene.add(hemiLight);

  //brighten close elements, pure white
  nearLight = getPointLight(0xffffff);
  nearLight.position.set(0, 0, 500);
  scene.add(nearLight);

  //lights for the core area, warm light
  coreLight = getPointLight(0xff9933);
  coreLight.position.set(0, 0, -50);
  scene.add(coreLight);

  //in the middle, as transition
  midLight = getPointLight(0xd96b1b);
  midLight.position.set(0, 0, -550);
  scene.add(midLight);

  //for bg, cold light
  deepLight = getPointLight(0x4480c4);
  deepLight.position.set(0, 0, -1050);
  scene.add(deepLight);


  //to the 
  let gap = 220;
  for (let z = -WORLD_HALF; z <= WORLD_HALF; z += gap) {
    for (let x = -770; x <= 770; x += gap) {
      for (let y = -770; y <= 770; y += gap) {
        if (x > -200 && x < 200 && y > -200 && y < 200) {
          continue;
        }

        //for X axis X轴线条
        if (random(1) < 0.5) {
          let hBeam = new Cube()
            .setPosition(x, y, z)
            .setScale(random(300, 1200), random(1, 2.5), random(1, 2.5));
          hBeam.mesh.material.color.r = 1.0;
          hBeam.mesh.material.color.g = random(0.5, 0.8);
          hBeam.mesh.material.color.b = random(0.2, 0.4);
          cubes.push(hBeam);
        }

        //for Y axis Y轴线条
        if (random(1) < 0.5) {
          let vPillar = new Cube()
            .setPosition(x, y, z)
            .setScale(random(1, 2.5), random(300, 1200), random(1, 2.5));
          vPillar.mesh.material.color.r = 1.0;
          vPillar.mesh.material.color.g = random(0.5, 0.8);
          vPillar.mesh.material.color.b = random(0.2, 0.4);
          cubes.push(vPillar);
        }

        //for Z axis Z轴线条
        if (random(1) < 0.5) {
          let zRail = new Cube()
            .setPosition(x, y, z)
            .setScale(random(1, 2.5), random(1, 2.5), random(180, 480));
          zRail.mesh.material.color.r = random(0.5, 1.0);
          zRail.mesh.material.color.g = random(0.5, 0.8);
          zRail.mesh.material.color.b = random(0.2, 0.4);
          cubes.push(zRail);
        }
      }
    }
  }

  //for big block pieces 方块记忆碎片
  for (let i = 0; i < 700; i++) {
    let bx = random(-800, 800);
    let by = random(-800, 800);
    let bz = random(-WORLD_HALF, WORLD_HALF);

    if (bx > -200 && bx < 200 && by > -200 && by < 200) {
      if (random(1) < 0.5) {
        bx = random(200, 650);
      } else {
        by = random(-650, -200);
      }
    }

    let box = new Cube().setPosition(bx, by, bz);

    let rType = random(1);
    if (rType < 0.4) {
      box.setScale(random(90, 380), random(1, 3), random(3, 12));
    } else if (rType < 0.8) {
      box.setScale(random(3, 6), random(90, 300), random(3, 12));
    } else {
      box.setScale(random(3, 6), random(30, 100), random(30, 100));
    }

    //random colors
    box.mesh.material.color.r = 1.0;
    box.mesh.material.color.g = random(0.4, 0.8);
    box.mesh.material.color.b = random(0.1, 0.5);
    cubes.push(box);
  }

  //for waves 波动
  for (let i = 0; i < 10; i++) {
    let plane = getPlane();
    plane.position.x = random(-550, 550);
    plane.position.y = random(-550, 550);
    if (plane.position.x > -200 && plane.position.x < 200) {
      plane.position.x = 240;
    }
    plane.rotation.x = PI / 2;
    scene.add(plane);
    planes.push(plane);
  }
//to set up particles 粒子
  for (let i = 0; i < MAX_PARTICLE_NUMBER; i++) {
    let p = new Particle();
    p.pos.x = random(-WORLD_HALF, WORLD_HALF);
    p.pos.y = random(-WORLD_HALF, WORLD_HALF);
    p.pos.z = random(-WORLD_HALF, WORLD_HALF);
    particles.push(p);
  }
  pointCloud = getPoints();
  scene.add(pointCloud);

//for Tweakpane
  let folderTime = pane.addFolder({ title: "Space&Time 空间&时间", expanded: true });
  folderTime.addBinding(params, "flowSpeed", { min: 0, max: 14, step: 0.1, label: "Time Speed" });
  folderTime.addBinding(params, "distortion", { min: 0, max: 100, step: 1, label: "Gravity Distortion" });
  folderTime.addBinding(params, "waveFreq", { min: 0.0005, max: 0.006, step: 0.0001, label: "String Frequency" });
  folderTime.addBinding(params, "slideSpeed", { min: 0, max: 4.0, step: 0.05, label: "Dimension Shift" });

  let folderParticles = pane.addFolder({ title: "Dusts 尘埃", expanded: true });
  folderParticles.addBinding(params, "particleNumber", { min: 0, max: MAX_PARTICLE_NUMBER, step: 100, label: "Density" });
  folderParticles.addBinding(params, "particleSize", { min: 0.5, max: 4, step: 0.1, label: "Size" });
  folderParticles.addBinding(params, "turbulence", { min: 0.001, max: 0.05, step: 0.001, label: "Turbulence" });

  let folderAtmosphere = pane.addFolder({ title: "Light 灯光", expanded: true });
  folderAtmosphere.addBinding(params, "fogDensity", { min: 0.0001, max: 0.002, step: 0.00005, label: "Fog" });
  folderAtmosphere.addBinding(params, "lightIntensity", { min: 1, max: 10, step: 0.05, label: "Intensity" });
  folderAtmosphere.addBinding(params, "lightDistance", { min: 500, max: 5000, step: 20, label: "Light Reach" });
  folderAtmosphere.addBinding(params, "glowOpacity", { min: 0.05, max: 0.6, step: 0.01, label: "String Glow" });
}

function updateThree() {
  scene.fog.density = params.fogDensity; //for fog 迷雾

  //control on nearlight 近景灯
  nearLight.intensity = params.lightIntensity;
  nearLight.distance = params.lightDistance;
  nearLight.position.x = cos(frame * 0.01) * 200;
  nearLight.position.y = sin(frame * 0.01) * 200;

  //corelight 核心灯
  coreLight.intensity = params.lightIntensity;
  coreLight.distance = params.lightDistance;
  coreLight.position.x = sin(frame * 0.01) * 250;
  coreLight.position.y = cos(frame * 0.01) * 250;

  // middle deep light 中远景灯光
  midLight.intensity = params.lightIntensity;
  midLight.distance = params.lightDistance;
  deepLight.intensity = params.lightIntensity;
  deepLight.distance = params.lightDistance;



//
  let swayVelX = cos(frame * 0.02) * params.slideSpeed * 0.4;
  let swayVelY = sin(frame * 0.02) * params.slideSpeed * 0.4;

  //movement on block pieces 碎片运动
  for (let i = 0; i < cubes.length; i++) {
    let c = cubes[i];
    c.setVelocity(swayVelX, swayVelY, params.flowSpeed);
    c.update();
    c.reappear();
    c.mesh.material.opacity = params.glowOpacity;
  }

  //movement on waves
  for (let p = 0; p < planes.length; p++) {
    let plane = planes[p];
    let positionAttributes = plane.geometry.attributes.position;

    for (let i = 0; i < positionAttributes.count; i++) {
      let ptIndex = i * 3;
      let x = positionAttributes.array[ptIndex + 0];
      let y = positionAttributes.array[ptIndex + 1];

      let xOffset = x * params.waveFreq + frame * 0.01;
      let yOffset = y * params.waveFreq + frame * 0.01;
      positionAttributes.array[ptIndex + 2] = map(
        noise(xOffset, yOffset),
        0,
        1,
        -params.distortion,
        params.distortion
      );
    }
    positionAttributes.needsUpdate = true;
  }


  //control on particles 粒子 尘埃
  pointCloud.material.size = params.particleSize;

  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    p.flow();
    p.adjustVelocity(-0.05);
    p.pos.z += params.flowSpeed;
    p.updatePosition();
    p.updateLifespan();
    p.reappear();
  }

  let positionArray = pointCloud.geometry.attributes.position.array;
  let colorArray = pointCloud.geometry.attributes.color.array;

  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    let ptIndex = i * 3;

    positionArray[ptIndex + 0] = p.pos.x;
    positionArray[ptIndex + 1] = p.pos.y;
    positionArray[ptIndex + 2] = p.pos.z;

    colorArray[ptIndex + 0] = 1.2 * p.lifespan;
    colorArray[ptIndex + 1] = 0.6 * p.lifespan;
    colorArray[ptIndex + 2] = 0.2 * p.lifespan;
  }

  pointCloud.geometry.setDrawRange(0, params.particleNumber);
  pointCloud.geometry.attributes.position.needsUpdate = true;
  pointCloud.geometry.attributes.color.needsUpdate = true;
}


//to generate meshes 网格
function getBox() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.24,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}


//to generate attraction waves 引力波
function getPlane() {
  const geometry = new THREE.PlaneGeometry(45, WORLD_SIZE, 10, 60);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffbe55,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.06,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}
//to generate pointlight 点光源
function getPointLight(hexColor) {
  const light = new THREE.PointLight(hexColor, 2.0, 1800, 0.5);
  return light;
}

//to generate particles point dust 尘埃
function getPoints() {
  const vertices = new Float32Array(MAX_PARTICLE_NUMBER * 3);
  const colors = new Float32Array(MAX_PARTICLE_NUMBER * 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    vertexColors: true,
    size: 2,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  return points;
}

class Cube {
  constructor() {
    this.mesh = getBox();
    scene.add(this.mesh);

    this.pos = this.mesh.position;
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();

    this.rot = this.mesh.rotation;
    this.rotVel = new THREE.Vector3();
    this.rotAcc = new THREE.Vector3();

    this.scale = this.mesh.scale;
    this.baseScale = new THREE.Vector3(1, 1, 1);

    this.mass = 1;
  }

  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    return this;
  }

  setTranslation(x, y, z) {
    this.mesh.geometry.translate(x, y, z);
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

  setScale(w, h = w, d = w) {
    const minScale = 0.01;
    w = Math.max(w, minScale);
    h = Math.max(h, minScale);
    d = Math.max(d, minScale);
    this.baseScale.set(w, h, d);
    this.scale.set(w, h, d);
    return this;
  }

  setMass(mass) {
    if (mass !== undefined) {
      this.mass = mass;
    } else {
      this.mass = 1 + this.baseScale.x * this.baseScale.y * this.baseScale.z * 0.000001;
    }
    return this;
  }
//applyforce and update 受力
  applyForce(f) {
    if (this.mass <= 0) return;
    const force = f.clone();
    force.divideScalar(this.mass);
    this.acc.add(force);
  }

  update() {
    this.updatePosition();
    this.updateRotation();
  }

  updatePosition() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.set(0, 0, 0);
  }

  updateRotation() {
    this.rotVel.add(this.rotAcc);
    this.rot.x += this.rotVel.x;
    this.rot.y += this.rotVel.y;
    this.rot.z += this.rotVel.z;
    this.rotAcc.set(0, 0, 0);
  }
//reappear at the boundary 边界重置
  reappear() {
    if (this.pos.x > WORLD_HALF) {
      this.pos.x = -WORLD_HALF;
    } else if (this.pos.x < -WORLD_HALF) {
      this.pos.x = WORLD_HALF;
    }
    if (this.pos.y > WORLD_HALF) {
      this.pos.y = -WORLD_HALF;
    } else if (this.pos.y < -WORLD_HALF) {
      this.pos.y = WORLD_HALF;
    }
    if (this.pos.z > WORLD_HALF) {
      this.pos.z = -WORLD_HALF;
    } else if (this.pos.z < -WORLD_HALF) {
      this.pos.z = WORLD_HALF;
    }
  }
}


//particles 粒子
class Particle {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();

    this.baseScl = new THREE.Vector3(1, 1, 1);
    this.scl = this.baseScl.clone();

    this.mass = 1;

    this.rot = new THREE.Vector3();
    this.rotVel = new THREE.Vector3();
    this.rotAcc = new THREE.Vector3();

    this.lifespan = random(0.2, 1.0);
    this.lifeReduction = random(0.001, 0.005);
    this.isDone = false;
  }

  setPosition(x, y, z) {
    this.pos = new THREE.Vector3(x, y, z);
    return this;
  }

  setVelocity(x, y, z) {
    this.vel = new THREE.Vector3(x, y, z);
    return this;
  }

  setRotationAngle(x, y, z) {
    this.rot = new THREE.Vector3(x, y, z);
    return this;
  }

  setRotationVelocity(x, y, z) {
    this.rotVel = new THREE.Vector3(x, y, z);
    return this;
  }

  setScale(w, h = w, d = w) {
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
      this.mass = 1 + (this.baseScl.x * this.baseScl.y * this.baseScl.z) * 0.000001;
    }
    return this;
  }

  updatePosition() {
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


  //粒子受力
  applyForce(f) {
    let force = f.clone();
    if (this.mass > 0) {
      force.divideScalar(this.mass);
    }
    this.acc.add(force);
  }
  // lifespan 周期 重置
  reappear() {
    if (this.pos.x > WORLD_HALF) {
      this.pos.x = -WORLD_HALF;
    } else if (this.pos.x < -WORLD_HALF) {
      this.pos.x = WORLD_HALF;
    }
    if (this.pos.y > WORLD_HALF) {
      this.pos.y = -WORLD_HALF;
    } else if (this.pos.y < -WORLD_HALF) {
      this.pos.y = WORLD_HALF;
    }
    if (this.pos.z > WORLD_HALF) {
      this.pos.z = -WORLD_HALF;
    } else if (this.pos.z < -WORLD_HALF) {
      this.pos.z = WORLD_HALF;
    }
  }

  disappear() {
    if (this.pos.z > WORLD_HALF) {
      this.isDone = true;
    }
  }

  updateLifespan() {
    this.lifespan -= this.lifeReduction;
    if (this.lifespan <= 0) {
      this.lifespan = 1.0;
    }
  }

  updateScale() {
    this.scl.set(
      this.baseScl.x * this.lifespan,
      this.baseScl.y * this.lifespan,
      this.baseScl.z * this.lifespan
    );
  }

  attractedTo(x, y, z) {
    let target = new THREE.Vector3(x, y, z);
    let force = target.clone().sub(this.pos);
    if (force.length() < 100) {
      force.multiplyScalar(-0.005);
    } else {
      force.multiplyScalar(0.0001);
    }
    this.applyForce(force);
  }

  flow() {
    let xFreq = this.pos.x * 0.05 + frame * 0.005;
    let yFreq = this.pos.y * 0.05 + frame * 0.005;
    let zFreq = this.pos.z * 0.05 + frame * 0.005;
    let noiseValue = map(noise(xFreq, yFreq, zFreq), 0.0, 1.0, -1.0, 1.0);
    let force = new THREE.Vector3(
      cos(frame * 0.005),
      sin(frame * 0.005),
      sin(frame * 0.002)
    );
    force.normalize();
    force.multiplyScalar(noiseValue * params.turbulence);
    this.applyForce(force);
  }
}