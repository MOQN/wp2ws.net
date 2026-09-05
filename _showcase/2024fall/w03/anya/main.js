let light, lightMesh;
let sculpture;
let jumpingSphere;
let cylinders = [];
let bottomCircle;
let centerCylinder;
let yoff = 0;

let cone;
let cone2;

const numCylinders = 7;
const radius = 250;
const height = 600;
const angleStep = (2 * Math.PI) / numCylinders;

let currentCylinderIndex = 0;
let nextCylinderIndex = 1;
let transitionProgress = 0;
const transitionSpeed = 0.01;

function setupThree() {
  // change the background color
  renderer.setClearColor("#22223B");

  // add ambient light
  ambiLight = new THREE.AmbientLight("#FFFFFF");
  scene.add(ambiLight);

  // add point light
  light = getPointLight("#FFFFFF");
  scene.add(light);

  // add a small sphere for the light
  lightMesh = getBasicSphere();
  light.add(lightMesh);
  lightMesh.scale.set(10, 10, 10);

  sculpture = new THREE.Group();

  for (let i = 0; i < numCylinders; i++) {
    const cylinder = getCylinder(100, 100, height);

    const angle = i * angleStep;
    cylinder.position.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );
    sculpture.add(cylinder);
    cylinders.push(cylinder);
  }
  jumpingSphere = createJumpingSphere();
  sculpture.add(jumpingSphere);

  bottomCircle = getCircle();
  sculpture.add(bottomCircle);

  centerCylinder = getCenterCylinder(10, 10, height * 2);
  centerCylinder.position.y = height / 2;
  sculpture.add(centerCylinder);

  cone = getCone(300, 150, 0, 2 * PI);
  cone.position.y = height + 240;
  sculpture.add(cone);

  scene.add(sculpture);
}

function updateThree() {
  let angle = frame * 0.01;
  let radDist = 500;
  let x = cos(angle) * radDist;
  let y = 1000;
  let z = sin(angle) * radDist;
  light.position.set(x, y, z);

  updateCylinders();
  updateSphere();
  updateCenterCylinder();

  sculpture.rotation.y = frame * 0.01;
}

function updateCenterCylinder() {
  let newY = cos(yoff) * 30;
  yoff += 0.01;
  cone.position.y = height + 260 + newY;
}

function updateCylinders() {
  cylinders.forEach((cylinder, index) => {
    const phaseShift = (index * Math.PI * 2) / numCylinders;
    cylinder.position.y = Math.sin(frame * 0.05 + phaseShift) * 100;
  });
}

function updateSphere() {
  transitionProgress += transitionSpeed;

  if (transitionProgress >= 1) {
    transitionProgress = 0;
    currentCylinderIndex = nextCylinderIndex;
    nextCylinderIndex = (nextCylinderIndex + 1) % numCylinders;
  }

  // Interpolate between current and next cylinder
  const currentCylinder = cylinders[currentCylinderIndex];
  const nextCylinder = cylinders[nextCylinderIndex];

  //FIRST SPHERE
  let newPosition = new THREE.Vector3(
    THREE.MathUtils.lerp(
      currentCylinder.position.x,
      nextCylinder.position.x,
      transitionProgress
    ),
    THREE.MathUtils.lerp(
      currentCylinder.position.y + (height / 4) * 3,
      nextCylinder.position.y + (height / 4) * 3,
      transitionProgress
    ),
    THREE.MathUtils.lerp(
      currentCylinder.position.z,
      nextCylinder.position.z,
      transitionProgress
    )
  );

  // Calculate direction vector and apply rotation
  let direction = newPosition.clone().sub(jumpingSphere.position).normalize();

  let axis = new THREE.Vector3(0, -1, 0); // Rotate around Y-axis
  let angleToRotate = direction.length() * transitionSpeed; // Adjust rotation speed
  jumpingSphere.rotateOnWorldAxis(axis, angleToRotate);

  jumpingSphere.position.copy(newPosition);
}

function getCircle() {
  const geometry = new THREE.CircleGeometry(600, 100);
  const material = new THREE.MeshPhongMaterial({ color: 0x4A4E69 });
  const mesh = new THREE.Mesh(geometry, material);

  // Position the circle below all cylinders and spheres
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -height / 2 - 50;

  return mesh;
}

function getCylinder(radiusTop, radiusBottom, cylinderHeight) {
  const geometry = new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    cylinderHeight,
    32
  );
  const material = new THREE.MeshPhongMaterial({ color: 0x9A8C98 });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}


function createJumpingSphere() {
    const sphereGeometry = new THREE.SphereGeometry(70, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({ color: "#2292A4" });
    localJumpingSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    return localJumpingSphere;
  }

function getCenterCylinder(radiusTop, radiusBottom, cylinderHeight) {
  const geometry = new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    cylinderHeight,
    32
  );
  const material = new THREE.MeshPhongMaterial({ color: 0xC9ADA7}); 
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}


function getCone(radius, coneHeight, startPos, endPos) {
  const geometry = new THREE.ConeGeometry(
    radius,
    coneHeight,
    32,
    10,
    false,
    startPos,
    endPos
  );
  const material = new THREE.MeshPhongMaterial({ color: 0xF2E9E4 });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

//LIGHT

function getBasicSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: "#EFF6EE",
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getPointLight(color) {
  const light = new THREE.PointLight(color, 10, 0, 0.1); // ( color , intensity, distance (0=infinite), decay )
  return light;
}
