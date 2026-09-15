let controls;
let cubes = [];
let time = 0;

function setupThree() {
  renderer.setClearColor("#ffffff");

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, -100);
  controls.update();

  const roomSize = 400;
  const half = roomSize / 2;
  const sizes = [40, 70, 120];

  for (let i = 0; i < 36; i++) {
    let cube = getBox();

    let size = sizes[Math.floor(Math.random() * sizes.length)];
    cube.scale.set(size, size, size);

    if (Math.random() < 0.3) {
      let axis = Math.floor(Math.random() * 3);

      if (axis == 0) cube.scale.x *= 2;
      if (axis == 1) cube.scale.y *= 2;
      if (axis == 2) cube.scale.z *= 2;
    }

    let wall = Math.floor(Math.random() * 6);

    if (wall == 0) {
      cube.position.x = -half;
      cube.position.y = THREE.MathUtils.randFloat(-half, half);
      cube.position.z = THREE.MathUtils.randFloat(-half, half);
    }

    if (wall == 1) {
      cube.position.x = half;
      cube.position.y = THREE.MathUtils.randFloat(-half, half);
      cube.position.z = THREE.MathUtils.randFloat(-half, half);
    }

    if (wall == 2) {
      cube.position.y = half;
      cube.position.x = THREE.MathUtils.randFloat(-half, half);
      cube.position.z = THREE.MathUtils.randFloat(-half, half);
    }

    if (wall == 3) {
      cube.position.y = -half;
      cube.position.x = THREE.MathUtils.randFloat(-half, half);
      cube.position.z = THREE.MathUtils.randFloat(-half, half);
    }

    if (wall == 4) {
      cube.position.z = -half;
      cube.position.x = THREE.MathUtils.randFloat(-half, half);
      cube.position.y = THREE.MathUtils.randFloat(-half, half);
    }

    if (wall == 5) {
      cube.position.z = half;
      cube.position.x = THREE.MathUtils.randFloat(-half, half);
      cube.position.y = THREE.MathUtils.randFloat(-half, half);
    }

    cube.userData.startPosition = cube.position.clone();
    cube.userData.axis = Math.floor(Math.random() * 3);
    cube.userData.speed = THREE.MathUtils.randFloat(0.5, 1);
    cube.userData.range = THREE.MathUtils.randFloat(10, 35);

    cubes.push(cube);
    scene.add(cube);
  }

  const ambientLight = new THREE.AmbientLight(0xffffff, 3);
  const light = new THREE.DirectionalLight(0xffffff, 1);
  scene.add(ambientLight);
  scene.add(light);
}

function updateThree() {
  time += 0.01;

  for (let i = 0; i < cubes.length; i++) {
    let cube = cubes[i];
    let offset = Math.sin(time * cube.userData.speed) * cube.userData.range;

    if (cube.userData.axis == 0) {
      cube.position.x = cube.userData.startPosition.x + offset;
    }

    if (cube.userData.axis == 1) {
      cube.position.y = cube.userData.startPosition.y + offset;
    }

    if (cube.userData.axis == 2) {
      cube.position.z = cube.userData.startPosition.z + offset;
    }
  }
}

function getBox() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  const colors = [
    0xE72F24, // red
    0xffcc00, // yellow
    0x004592, // blue
    0xF0F1EC, // off-white
    0x232629  // black
  ];

  let isWireframe = Math.random() < 0.2;

  const material = new THREE.MeshStandardMaterial({
    color: isWireframe
      ? 0x232629
      : colors[Math.floor(Math.random() * colors.length)],
    wireframe: isWireframe,
    transparent: true,
    opacity: isWireframe ? 0.6 : 0.8,
    metalness: 0.2,
    roughness: 1
  });

  return new THREE.Mesh(geometry, material);
}