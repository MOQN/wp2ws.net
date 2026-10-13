let params = {
  fps: 0,
  num_of_Torus_in_a_row: 0,
  num_of_row: 0,
  rotateSpeed: 0.003,
  velocity: 1,
  color: "#ffffff",
  opacity: 0.8,
  movingLightSpeed: 10,
  movingLightColor: "#5858ff",
  environmentLightColor1: "#ffcd9c",
  environmentLightColor2: "#ff9b82"
};
let torusGroup;

const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;
const Torus_NUM = 80
const Torus_ROW = 4


let toruses = []
let lights = [];
let dirLight, dirLight2

function setupThree() {
  // light = getPointLight();
  // scene.add(light);

  // let lightMesh = getSphere();
  // lightMesh.scale.set(20, 20, 20);
  // light.add(lightMesh);

  torusGroup = new THREE.Group();
  scene.add(torusGroup);

  const folderGeneration = pane.addFolder({ title: "GENERATION", expanded: true });
  folderGeneration.addBinding(params, "velocity", { min: 0.1, max: 8, step: 0.1 });
  folderGeneration.addBinding(params, "rotateSpeed", { min: 0, max: 0.05, step: 0.001 });
  const folderControl = pane.addFolder({ title: "CONTROL", expanded: true });
  folderControl.addBinding(params, "color", { picker: "inline" });
  folderControl.addBinding(params, "opacity", { min: 0.0, max: 1.0, step: 0.01 });
  const folderLight = pane.addFolder({ title: "LIGHT", expanded: true });
  folderLight.addBinding(params, "movingLightSpeed", { min: 1, max: 20, step: 0.1 });
  folderLight.addBinding(params, "movingLightColor", { picker: "inline" });
  folderLight.addBinding(params, "environmentLightColor1", { picker: "inline" })
  folderLight.addBinding(params, "environmentLightColor2", { picker: "inline" })


  const ambiLight = new THREE.AmbientLight(0xB0C4DE, 100);
  scene.add(ambiLight);

  dirLight = new THREE.DirectionalLight(0xffcd9c, 0.2);
  dirLight.position.set(500, 1000, 500);
  scene.add(dirLight);

  dirLight2 = new THREE.DirectionalLight(0xff9b82, 0.2);
  dirLight2.position.set(0, -1000, -500);
  scene.add(dirLight2);

  for (let q = 0; q < Torus_ROW; q++) {
    for (let j = 0; j < Torus_ROW; j++) {
      let lightY = -WORLD_HALF + j * WORLD_SIZE / Torus_ROW - 250; // -250 匹配 noise 的平均 Y 偏移
      let lightZ = -WORLD_HALF + q * WORLD_SIZE / Torus_ROW;

      // 让每个光源初始 X 位置随机错开，视觉效果更丰富
      let lightX = -WORLD_HALF + Math.random() * WORLD_SIZE;

      // 👈 为当前行实例化一个移动发光球+光源
      let movingLight = new MovingLight(lightX, lightY, lightZ);
      lights.push(movingLight);
      for (let i = 0; i < Torus_NUM; i++) {
        let torus = new Torus()
          .setPosition(
            -WORLD_HALF + i * WORLD_SIZE / Torus_NUM,
            -WORLD_HALF + j * WORLD_SIZE / Torus_ROW + noise(i * 0.1) * 500 - 500,
            -WORLD_HALF + q * WORLD_SIZE / Torus_ROW)
          .setScale(20, 20, 20)
          .setRotationAngle(-sin(i * 0.01) * 10, Math.PI / 4, 0)
          .setRotationVelocity(0.01, 0, 0)
          .setVelocity(params.velocity, 0, 0);

        toruses.push(torus);
      }
    }
  }
}

function updateThree() {

  if (torusGroup) {
    torusGroup.rotation.y += params.rotateSpeed;
    torusGroup.rotation.x += params.rotateSpeed * 0.1;
  }
  dirLight.color.set(params.environmentLightColor1);
  dirLight2.color.set(params.environmentLightColor2);
  for (let l of lights) {
    l.light.color.set(params.movingLightColor)
    l.update();
    l.reappear();
  }
  for (let i = 0; i < toruses.length; i++) {
    let t = toruses[i]
    t.mesh.material.color.set(params.color);
    t.mesh.material.opacity = params.opacity;
    t.vel.x = params.velocity;
    t.updatePosition();
    // t.updateRotation();

    t.updateScale(i);
    t.reappear()
    // or, c.update();  // if you want to update all properties
  }

}
function getPointLight() {
  const light = new THREE.PointLight(0xFFB6C1, 5, 500, 0);
  return light;
}

function getSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getBox() {
  let geometry = new THREE.BoxGeometry(1, 1, 1);
  let material = new THREE.MeshNormalMaterial({
    // wireframe: true
  });
  let mesh = new THREE.Mesh(geometry, material);
  return mesh;
}
function getTorus() {
  let geometry = new THREE.TorusGeometry(10, 2, 30, 8);
  let material = new THREE.MeshStandardMaterial({
    metalness: 1,        // 金属度：接近 1.0 表现为纯金属
    roughness: 0,
    transparent: true,
    opacity: 0.3,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

class MovingLight {
  constructor(x, y, z) {
    this.light = getPointLight();
    this.mesh = getSphere();
    this.mesh.scale.set(2, 2, 2);
    this.light.add(this.mesh);

    this.pos = this.light.position;
    this.pos.set(x, y, z);

    torusGroup.add(this.light);
  }

  update() {
    this.pos.x += params.movingLightSpeed;
  }

  reappear() {
    if (this.pos.x > WORLD_HALF) {
      this.pos.x = -WORLD_HALF;
    } else if (this.pos.x < -WORLD_HALF) {
      this.pos.x = WORLD_HALF;
    }
  }
}

class Torus {
  constructor() {
    // mesh
    this.mesh = getTorus();
    // scene.add(this.mesh);
    torusGroup.add(this.mesh);
    // position
    this.pos = this.mesh.position; // reference to the mesh position
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();
    // rotation
    this.rot = this.mesh.rotation; // reference to the mesh rotation
    this.rotVel = new THREE.Vector3();
    this.rotAcc = new THREE.Vector3();
    // scale
    this.scale = this.mesh.scale; // reference to the mesh scale
    this.baseScale = new THREE.Vector3(1, 1, 1); // initial base scale for the torus
    this.scale.copy(this.baseScale);
    // mass
    this.mass = 1;
    // lifespan
    this.lifespan = 1;
    this.lifeReduction = random(0.001, 0.01);
    this.isDone = false;
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
    }
    else {
      this.mass =
        1 +
        this.baseScale.x *
        this.baseScale.y *
        this.baseScale.z *
        0.000001;
    }
    return this;
  }
  applyForce(f) {
    if (this.mass <= 0) return;
    const force = f.clone();
    force.divideScalar(this.mass);
    this.acc.add(force);
  }
  update(i) {
    this.updateLifespan();
    this.updatePosition();
    this.updateRotation();
    this.updateScale(i);
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
  updateScale(i = 0) {
    this.scale.set(
      this.baseScale.x * sin((frame) * 0.008 + i * 0.05),
      this.baseScale.y * sin((frame) * 0.008 + i * 0.05),
      this.baseScale.z * sin((frame) * 0.008 + i * 0.05)
    );
  }
  updateLifespan() {
    this.lifespan -= this.lifeReduction;
    if (this.lifespan <= 0) {
      this.lifespan = 0;
      this.isDone = true;
    }
  }
  reappear() {
    // x
    if (this.pos.x > WORLD_HALF) {
      this.pos.x = -WORLD_HALF;
    }
    else if (this.pos.x < -WORLD_HALF) {
      this.pos.x = WORLD_HALF;
    }
    // y
    // if (this.pos.y > WORLD_HALF) {
    //   this.pos.y = -WORLD_HALF;
    // }
    // else if (this.pos.y < -WORLD_HALF) {
    //   this.pos.y = WORLD_HALF;
    // }
    // z
    if (this.pos.z > WORLD_HALF) {
      this.pos.z = -WORLD_HALF;
    }
    else if (this.pos.z < -WORLD_HALF) {
      this.pos.z = WORLD_HALF;
    }
  }
}
