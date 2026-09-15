const WORLD_SIZE = 200;
const WORLD_HALF_SIZE = 100;
const FLOOR_POSITION = -10;

let params = {
  size: 2,
  speed: 0.1,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  r: 255,
  g: 255,
  b: 255
};



let tornado;
let raycaster;
let mouse = new THREE.Vector2();
let space, ground;
let particles = [];
let cubes = [];
let pointLight;

function setupThree() {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap


  // fog
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 1, 150);
  // Light
  let ambientLight = new THREE.AmbientLight("#333");
  scene.add(ambientLight);
  pointLight = new THREE.PointLight(0xFFFFFF, 10, 1000, 0.01);
  pointLight.position.set(0, 20, 0);
  pointLight.castShadow = true; // default false
  scene.add(pointLight);



  // space = getBox();
  // // console.log(space);
  // space.position.y = FLOOR_POSITION;
  // space.scale.set(WORLD_SIZE, WORLD_SIZE, 1);
  //scene.add(space);
  ground = getPlane();
  scene.add(ground);
  //ground.position.y = FLOOR_POSITION;


  // Create Tornado
  tornado = new Tornado(params);
  scene.add(tornado.mesh);
  // detect mouse
  raycaster = new THREE.Raycaster();

  // GUI
  const gui = new dat.GUI();
  gui.add(params, "size", 1, 5).onChange(() => tornado.setSize(params.size));
  gui.add(params, 'speed', 0, 2).onChange(() => tornado.setSpeed(params.speed));
  gui.add(params, 'positionX').listen();
  gui.add(params, 'positionY').listen();
  gui.add(params, 'positionZ').listen();
  gui.add(params, "r", 0, 255).step(1).onChange(updateColor);
  gui.add(params, "g", 0, 255).step(1).onChange(updateColor);
  gui.add(params, "b", 0, 255).step(1).onChange(updateColor);
  // generate random balls
  for (let i = 0; i < 20; i++) {
    const r = (i + 1) * 0.2
    const ball = new Particle(r)
      .setTranslation(0, r / 2, 0)
      .setPosition(random(-25, 25), 0, random(-25, 25))
    //.setTranslation(0, 1, 0);
    particles.push(ball);
    //console.log(ball.pos);
    scene.add(ball.mesh);
  }

  // Mouse movement event
  document.addEventListener('mousemove', onMouseMove, false);
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function updateColor() {
  //console.log('color changed:', params.r, params.b, params.g);
  for (let p of particles) {
    p.setColor(params);
  }
}

function updateThree() {
  tornado.update();
  raycaster.setFromCamera(mouse, camera);
  for (let p of particles) {
    p.move();
    p.ifCollide(tornado);
    p.bounce(ground);
    p.update();
  }
  //ty CHATGPT!
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
  const intersectPoint = new THREE.Vector3();

  if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
    intersectPoint.y = 0;
    // Slowly move
    const newPos = new THREE.Vector3();
    // console.log("intersect position", intersectPoint);
    // console.log("tornado", tornado.mesh.position);
    newPos.lerpVectors(tornado.mesh.position, intersectPoint, 0.01);

    tornado.setPosition(newPos);
    tornado.inPlane(ground);
    params.positionX = tornado.mesh.position.x;
    params.positionY = tornado.mesh.position.y;
    params.positionZ = tornado.mesh.position.z;
  }
}

function getPlane() {
  const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE);
  const material = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.castShadow = true; //default is false
  mesh.receiveShadow = true;
  return mesh;
}

function getBox() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true; //default is false
  mesh.receiveShadow = true;
  return mesh;
}

function getBall(r, param) {
  const color = new THREE.Color(`rgb(${param.r}, ${param.g}, ${param.b})`);
  const ballGeometry = new THREE.SphereGeometry(r, 32, 32); // Ball size
  const ballMaterial = new THREE.MeshStandardMaterial({ color: color });
  const mesh = new THREE.Mesh(ballGeometry, ballMaterial);
  return mesh;
}

function getCylinder(radiusTop, radiusBottom, height) {
  // Create a cylinder representing a tornado segment
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32);
  //const material = new THREE.MeshNormalMaterial({ wireframe: true });
  const material = new THREE.MeshStandardMaterial({
    wireframe: true,
    color: 0x666666,  // Gray color for a tornado look
    roughness: 0.7,   // Rough texture for diffuse appearance
    metalness: 0.1,   // Slight metallic reflection
    transparent: true,
    opacity: 0.8,     // Slight transparency to mimic tornado dust
  });
  const cylinder = new THREE.Mesh(geometry, material);
  cylinder.castShadow = true;
  cylinder.receiveShadow = true;
  return cylinder;
}


class Tornado {
  constructor(params) {
    this.size = params.size;
    this.speed = params.speed;
    this.mesh = this.getTornado();
  }

  // Generates the tornado with multiple stacked cylinders
  // ty CHATGPT!
  getTornado() {
    const tornadoGroup = new THREE.Group(); // Group to hold the tornado

    const segments = 10;
    for (let i = 0; i < segments; i++) {
      const height = 1;
      const radiusTop = (i + 1) * 0.3;
      const radiusBottom = i * 0.2;

      const cylinder = getCylinder(radiusTop, radiusBottom, height);

      // Position each cylinder above the previous one
      cylinder.position.y = i * height; // Stack the cylinders vertically
      tornadoGroup.add(cylinder); // Add to the tornado group
    }

    return tornadoGroup;
  }

  update() {
    for (let i = 0; i < this.mesh.children.length; i++) {
      const factor = 1 - (i / this.mesh.children.length); // Use 'i' instead of 'index'
      this.mesh.children[i].rotation.y += this.speed * factor; // Use 'this.speed' instead of 'speed'
    }
  }


  inPlane(space) {
    const halfWidth = space.geometry.parameters.width / 2;
    //console.log(halfWidth);
    if (this.mesh.position.x < ground.position.x - halfWidth) {
      this.mesh.position.x = ground.position.x - halfWidth;
    } else if (this.mesh.position.x > ground.position.x + halfWidth) {
      this.mesh.position.x = ground.position.x + halfWidth;
    }

    if (this.mesh.position.z < ground.position.z - halfWidth) {
      this.mesh.position.z = ground.position.z - halfWidth;
    } else if (this.mesh.position.z > ground.position.z + halfWidth) {
      this.mesh.position.z = ground.position.z + halfWidth;
    }
  }


  // Set the position of the tornado
  setPosition(newPosition) {
    this.mesh.position.copy(newPosition);
  }


  // Update tornado size
  setSize(newSize) {
    this.size = newSize;
    this.mesh.scale.set(newSize, newSize, newSize);
  }

  // Update tornado speed
  setSpeed(newSpeed) {
    this.speed = newSpeed;
  }
}

class Particle {
  constructor(r) {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();
    this.mass = r / 2;
    this.mesh = getBall(r, params);

  }
  ifCollide(tornado) {
    //console.log(this.pos, tornado.mesh.position);
    const d = this.pos.distanceTo(tornado.mesh.position);
    if (d < 5) {
      this.applyForce(tornado);
    }
  }
  move() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.set(0, 0, 0);
  }
  applyForce(tornado) {
    const force = new THREE.Vector3().subVectors(tornado.mesh.position, this.pos);
    force.multiplyScalar(tornado.speed / this.mass);
    force.y = 0;
    // const smoothedForce = new THREE.Vector3();
    // smoothedForce.lerpVectors(this.acc, force, 0.1); // Smoothly transition towards the target force

    // this.acc.add(smoothedForce); // Apply the smoothed force
    this.acc.add(force);

  }
  bounce(space) {
    const boundary = space.geometry.parameters.width / 2;
    if (this.pos.x < -boundary || this.pos.x > boundary) {
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, -boundary, boundary);
      this.vel.x *= -0.8; // Bounce back
    }

    if (this.pos.y < -boundary || this.pos.y > boundary) {
      this.pos.y = THREE.MathUtils.clamp(this.pos.y, -boundary, boundary);
      this.pos.y *= -0.8; // Bounce back
    }

    if (this.pos.z < -boundary || this.pos.z > boundary) {
      this.pos.z = THREE.MathUtils.clamp(this.pos.z, -boundary, boundary);
      this.vel.z *= -0.8; // Bounce back
    }
  }
  setTranslation(x, y, z) {
    this.mesh.geometry.translate(x, y, z);
    return this;
  }
  setPosition(x, y, z) {
    this.pos = new THREE.Vector3(x, y, z);
    return this;
  }
  setVelocity(x, y, z) {
    this.vel = new THREE.Vector3(x, y, z);
    return this;
  }
  setColor(param) {
    const color = new THREE.Color(`rgb(${param.r}, ${param.g}, ${param.b})`);
    this.mesh.material.color.set(color); // Apply color change to the material
  }
  update() {
    this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
  }

}

