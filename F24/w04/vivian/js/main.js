let params = {
  size: 2,
  speed: 0.05,
  positionX: 0,
  positionY: 0,
  positionZ: 0
};
let tornado;
let raycaster;
let mouse = new THREE.Vector2();
let plane, ground;

function setupThree() {
  // Light
  let ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  let directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  scene.add(directionalLight);

  ground = getPlane();
  scene.add(ground);
  console.log(ground);

  // Create Tornado
  tornado = new Tornado(params);
  scene.add(tornado.mesh);
  // detect mouse
  raycaster = new THREE.Raycaster();

  // GUI
  const gui = new dat.GUI();
  gui.add(params, "size", 1, 5).onChange(() => tornado.setSize(params.size));
  gui.add(params, 'speed', 0, 0.1).onChange(() => tornado.setSpeed(params.speed));
  gui.add(params, 'positionX').listen();
  gui.add(params, 'positionY').listen();
  gui.add(params, 'positionZ').listen();

  // Mouse movement event
  document.addEventListener('mousemove', onMouseMove, false);
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}


function updateThree() {
  tornado.update();
  raycaster.setFromCamera(mouse, camera);
  //ty CHATGPT!
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
  const intersectPoint = new THREE.Vector3();

  if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
    intersectPoint.y = 0;
    // Slowly move
    const newPos = new THREE.Vector3();
    newPos.lerpVectors(tornado.mesh.position, intersectPoint, 0.01);

    tornado.setPosition(newPos);
    tornado.inPlane();
    params.positionX = tornado.mesh.position.x;
    params.positionY = tornado.mesh.position.y;
    params.positionZ = tornado.mesh.position.z;
  }
}

function getPlane() {
  const geometry = new THREE.PlaneGeometry(50, 50);
  const material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function getCylinder(radiusTop, radiusBottom, height){
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

      const cylinder = getCylinder(radiusTop,radiusBottom,height);

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
  

  inPlane() {
    const halfWidth = ground.geometry.parameters.width / 2;

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
