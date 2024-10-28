// https://threejs.org/docs/index.html?q=light#api/en/lights/PointLight
// https://threejs.org/docs/index.html?q=phong#api/en/materials/MeshPhongMaterial
let light, lightMesh, helper, light2;
let sculpture;
let plane, positionAttribute;
let sea, boat;
let boxes = []
let keys = {};
let boatInitialYAngle = 0;
const woodTexture = new THREE.TextureLoader().load('../wood-free-copyright.jpg');

let params = {
  mode: "Box",
  frame: 0,
  time: 0,
  degreex: 0,
  degreey: 171,
  degreez: 180,
  wireframe: false,
  boatanglex: 0,
  boatangley: 90,
  boatanglez: 0,
  color: "#FFFFFF",
};
function setupThree() {
  // change the background color
  renderer.setClearColor("#111111");


  /*light = new THREE.DirectionalLight( 0xffffff, 3);
light.position.set( 80, 0, 50 ); //default; light shining from top
light.castShadow = true; // default false
scene.add( light );
helper = new THREE.DirectionalLightHelper( light, 5 );
scene.add( helper ); */
  // add point light
  light = getPointLight("#FB9062");
  scene.add(light);

  // add a small sphere for the light
  lightMesh = getBasicSphere();
  light.add(lightMesh);
  lightMesh.scale.set(10, 10, 10);
  light.position.set(0, 0, 300);
  

  light2 = new THREE.HemisphereLight(0xffcc99, 0xffcc99, 2);
  light2.castShadow = true;
  scene.add(light2);

  //helper = new THREE.HemisphereLightHelper(light, 10);
  //scene.add(helper);


  sea = new Sea();
  sea.mesh.scale.set(10, 10, 2);
  boat = new Box()
  boat.boat.scale.set(2, 2, 2)
  boxes.push(boat)
  // Add event listeners for keydown and keyup
  window.addEventListener('keydown', (event) => {
    keys[event.code] = true; // Mark the key as pressed
  });

  window.addEventListener('keyup', (event) => {
    keys[event.code] = false; // Mark the key as released
  });

  gui.add(params, "degreex").min(0).max(360).step(0.5);
  gui.add(params, "degreey").min(0).max(360).step(0.5);
  gui.add(params, "degreez").min(0).max(360).step(0.5);
  gui.add(params, "boatangley").min(0).max(360).step(0.5);
}


function updateThree() {
  sea.updateSea();

  for (let i = boxes.length - 1; i >= 0; i--) {
    const box = boxes[i];
    updateBox(box);

    // Define sea boundaries (-25 to 25 in both x and y directions)
    const seaBoundary = 250;

    // Check if the boat is out of bounds
    if (box.pos.x < -seaBoundary || box.pos.x > seaBoundary ||
      box.pos.y < -seaBoundary || box.pos.y > seaBoundary) {

      // If the boat is out of bounds, remove it from the array
      boxes.splice(i, 1);
      scene.remove(box.boat);  // Remove from scene as well
    }
  }
}

function getBasicSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff"
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getBasicPlane() {

  const geometry = new THREE.PlaneGeometry(50, 50, 100, 100);
  const material = new THREE.MeshPhongMaterial({
    color: "#1E90FF",  // Deep sky blue
    shininess: 100,    
    specular: "#A9A9A9", 
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getCone() {
  const radius = 3;
  const height = 5;
  const radialSegments = 3;
  const heightSegments = 1;
  const openEnded = true;
  const thetaStart = 0;
  const thetaLength = 3;
  const coneGeometry = new THREE.ConeGeometry(radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength);
  const material = new THREE.MeshBasicMaterial({
    map: woodTexture,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(coneGeometry, material);

}

function getCylinder() {
  const geometry = new THREE.CylinderGeometry(3, 3, 5, 3, 1, true, 0, 3);
  const material = new THREE.MeshBasicMaterial({
    map: woodTexture,
    side: THREE.DoubleSide,
  });
  const cylinder = new THREE.Mesh(geometry, material);
  return cylinder;

}

function getPointLight(color) {
  const light = new THREE.PointLight(color, 2, 0, 0.1); // ( color , intensity, distance (0=infinite), decay )
  return light;
}

function getBasicBox() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  return cube
}

class Sea {
  constructor() {
    this.mesh = getBasicPlane();
    scene.add(this.mesh);
  }
  updateSea() {
    let time = frame * 0.05 // can control frame with this
    positionAttribute = this.mesh.geometry.attributes.position;
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      //const z = Math.sin(noise((time+x) * 0.05) * 10) * Math.cos(noise((time+y) * 0.05) * 10) * 2
      const z = Math.sin((time + x) * 0.2) * Math.cos((time + y) * 0.2); // not done yet
      positionAttribute.setZ(i, z);
    }
    positionAttribute.needsUpdate = true;
  }
}


function updateBox(box) {
  //KEY!!!
  box.boat.rotation.order = 'YXZ'; // Apply Y first, then X, then Z
  const rotationSpeed = 0.001;

  // Update rotations
  if (keys['ArrowLeft'] || keys['KeyA']) {
    box.boat.rotation.x -= rotationSpeed;
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    box.boat.rotation.x += rotationSpeed;
  }

  // Move the boat forward and backward based on its orientation
  const accMagnitude = 0.0005; // Adjust for desired speed
  const acc = createVector(Math.sin(box.boat.rotation.x) * accMagnitude, Math.cos(box.boat.rotation.x) * accMagnitude, 0);
  // Calculate movement based on the boat's current rotation
  if (keys['ArrowUp'] || keys['KeyW']) {
    box.vel.add(acc)
  }
  if (keys['ArrowDown'] || keys['KeyS']) {
    box.vel.sub(acc)
  }
  if (box.vel.mag() < 0) {
    box.vel = createVector(0, 0, 0);
  }
  if (box.vel.mag() < 2) { // maximum speed
    box.vel.add(box.acc);
  }

  box.pos.add(box.vel);

  // I want to move the boat up and down according to the wave. I need to get the z-index of the wave at the point where xy point equals the xypoint of the boat.
  // Actually I will just move the boat up and down slowly.
  const Amplitude = 0.005
  box.pos.add(0, 0, Math.sin(frame * 0.005) * Amplitude);

  const swingzAmplitude = 0.05;
  const swingzSpeed = 0.01;
  const swingzRotation = Math.sin(frame * swingzSpeed) * swingzAmplitude;

  box.boat.rotation.z = swingzRotation;

  const swingyAmplitude = 0.2; 
  const swingySpeed = 0.01; 
  const swingyRotation = Math.sin(frame * swingySpeed) * swingyAmplitude + (90 * Math.PI / 180);

  box.boat.rotation.y = swingyRotation;
  box.setPosition();
}
class Box {
  constructor() {

    this.vel = createVector(0, 0, 0);
    this.acc = createVector(0, 0, 0);
    this.boat = new THREE.Group();
    this.boat.castShadow = true;
    scene.add(this.boat);
    this.boatHead = getCone();
    this.boatBody = getCylinder();
    this.boatTail = getCone();


    this.boatHead.position.set(0, 5, 0);

    this.boatTail.position.set(0, -5, 0);
    this.boatTail.rotation.set(0, 171 * Math.PI / 180, Math.PI)



    this.boat.add(this.boatHead);

    this.boat.add(this.boatBody);

    this.boat.add(this.boatTail);

    this.boat.rotation.y = Math.PI / 2;
    this.boat.position.set(0, 0, 3)
    this.pos = createVector(0, 0, 3); // Set x, y, z coordinates;
  }

  setPosition() {
    this.boat.position.set(this.pos.x, this.pos.y, this.pos.z)
    return this;
  }

}