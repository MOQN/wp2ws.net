let scene, renderer, render;
let escaper, chaseCamera;
let ambientLight, directionalLight;

const colorPalette = {
  screenBg: 0x00bfff,  // Semi-transparent water color
  ambientLight: 0x777777,
  directionalLight: 0xffffff
};

function initThree() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x00bfff, 1200, 20000);  // Fog with water-like color

  /* escaper
  -------------------------------------------------------------*/
  escaper = new Escaper();
  escaper.mesh.geometry.computeBoundingSphere();
  scene.add(escaper.mesh);

  /* camera
  -------------------------------------------------------------*/
  chaseCamera = new ChaseCamera();
  scene.add(chaseCamera.camera);

  /* renderer
  -------------------------------------------------------------*/
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(new THREE.Color(0x00bfff), 0.75);  // Semi-transparent water background
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  /* AmbientLight
  -------------------------------------------------------------*/
  ambientLight = new THREE.AmbientLight(colorPalette.ambientLight);
  ambientLight.intensity = 1.0;
  scene.add(ambientLight);

  /* DirectionalLight
  -------------------------------------------------------------*/
  directionalLight = new THREE.DirectionalLight(colorPalette.directionalLight, 1.0);
  directionalLight.position.set(20000, 20000, 2000);
  scene.add(directionalLight);
}

class Escaper {
  constructor() {
    const geometry = new THREE.CylinderGeometry(1, 24, 60, 12);
    geometry.rotateX(THREE.Math.degToRad(90));
    const color = new THREE.Color(0x93deff);  // Light blue color
    const material = new THREE.MeshLambertMaterial({
      color: color,
      transparent: true,
      opacity: 0.3  // Make the Escaper semi-transparent
    });

    this.mesh = new THREE.Mesh(geometry, material);
    const radius = getRandomNum(100);
    const theta = THREE.Math.degToRad(getRandomNum(180));
    const phi = THREE.Math.degToRad(getRandomNum(360));
    this.mesh.position.x = Math.sin(theta) * Math.cos(phi) * radius;
    this.mesh.position.y = Math.sin(theta) * Math.sin(phi) * radius;
    this.mesh.position.z = Math.cos(theta) * radius;
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.maxSpeed = 40;
    this.seekMaxSpeed = 40;
    this.seekMaxForce = 1.0;
  }

  applyForce(f) {
    this.acceleration.add(f.clone());
  }

  update() {
    const maxSpeed = this.maxSpeed;

    // update velocity
    this.velocity.add(this.acceleration);

    // limit velocity
    if (this.velocity.length() > maxSpeed) {
      this.velocity.clampLength(0, maxSpeed);
    }

    // update position
    this.mesh.position.add(this.velocity);

    // reset acceleration
    this.acceleration.multiplyScalar(0);

    // head direction
    const head = this.velocity.clone();
    head.multiplyScalar(10);
    head.add(this.mesh.position);
    this.mesh.lookAt(head);
  }

  seek(target = new THREE.Vector3()) {
    const maxSpeed = this.seekMaxSpeed;
    const maxForce = this.seekMaxForce;
    const toGoalVector = new THREE.Vector3();
    toGoalVector.subVectors(target, this.mesh.position);
    toGoalVector.normalize();
    toGoalVector.multiplyScalar(maxSpeed);
    const steerVector = new THREE.Vector3();
    steerVector.subVectors(toGoalVector, this.velocity);
    // limit force
    if (steerVector.length() > maxForce) {
      steerVector.clampLength(0, maxForce);
    }
    return steerVector;
  }
}

class ChaseCamera {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 20000);
    this.camera.position.set(0, 0, 100);  // Initial camera position
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.maxSpeed = 40;
    this.seekMaxSpeed = 40;
    this.seekMaxForce = 4.0;
  }

  applyForce(f) {
    this.acceleration.add(f.clone());
  }

  update() {
    const maxSpeed = this.maxSpeed;

    // update velocity
    this.velocity.add(this.acceleration);

    // limit velocity
    if (this.velocity.length() > maxSpeed) {
      this.velocity.clampLength(0, maxSpeed);
    }

    // update position
    this.camera.position.add(this.velocity);

    // reset acceleration
    this.acceleration.multiplyScalar(0);
  }

  seek(target = new THREE.Vector3()) {
    const maxSpeed = this.seekMaxSpeed;
    const maxForce = this.seekMaxForce;
    const toGoalVector = new THREE.Vector3();
    toGoalVector.subVectors(target, this.camera.position);
    toGoalVector.normalize();
    toGoalVector.multiplyScalar(maxSpeed);
    const steerVector = new THREE.Vector3();
    steerVector.subVectors(toGoalVector, this.velocity);
    // limit force
    if (steerVector.length() > maxForce) {
      steerVector.clampLength(0, maxForce);
    }
    return steerVector;
  }

  followEscaper(escaper) {
    const targetPos = escaper.mesh.position.clone();
    this.seek(targetPos);
    this.update();
  }
}

const getRandomNum = (max = 1, min = 0) => Math.floor(Math.random() * (max - min + 1)) + min;

function updateThree() {
  render = () => {
    /* escaper
    ------------------------------------ */
    escaper.update();

    /* camera
    ------------------------------------ */
    chaseCamera.followEscaper(escaper);
    chaseCamera.camera.lookAt(escaper.mesh.position);

    /* renderer
    ------------------------------------ */
    renderer.render(scene, chaseCamera.camera);
    requestAnimationFrame(render);
  };
}

updateThree();
initThree();

const onResize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  chaseCamera.camera.aspect = width / height;
  chaseCamera.camera.updateProjectionMatrix();
};

window.addEventListener('resize', onResize);

document.getElementById('WebGL-output').appendChild(renderer.domElement);
render();
