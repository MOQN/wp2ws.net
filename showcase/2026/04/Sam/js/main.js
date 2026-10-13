let params = {
  fps: 0,
  near: 1,
  far: 2600,
  lightColor: 0xffffff,
  lightIntensity: 3,
  lightDistance: 1000,
  lightAngle: Math.PI / 6,
  lightPenumbra: 0.2,
  lightDecay: 1,
};

let house, floor, whiteRoom;
let insideRoom = false;
let roomWalls = [];
let spotLight;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function makeBumpTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 5000; i++) {
    const shade = Math.random() < 0.5 ? "#555555" : "#aaaaaa";
    ctx.fillStyle = shade;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function setupThree() {
  scene.background = new THREE.Color(0x87ceeb);

  // House walls: StandardMaterial responds to lights.
const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 1,
  bumpMap: makeBumpTexture(),
  bumpScale: 1.5,
  side: THREE.DoubleSide,
});

  house = new THREE.Group();

  const wall = (width, height, depth, x, y, z) => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      wallMaterial
    );
    panel.position.set(x, y, z);
    panel.castShadow = true;
    panel.receiveShadow = true;
    house.add(panel);
  };

  wall(40, 100, 2, -30, 50, 50);
  wall(40, 100, 2, 30, 50, 50);
  wall(20, 65, 2, 0, 67.5, 50);
  wall(100, 100, 2, 0, 50, -50);
  wall(2, 100, 100, -50, 50, 0);
  wall(2, 100, 100, 50, 50, 0);
  wall(100, 2, 100, 0, 100, 0);

  scene.add(house);

  // Ground
  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Interior
  whiteRoom = new THREE.Group();
  roomWalls = [];

  const makeRoomPart = (width, height, depth, color, x, y, z, canExit = false) => {
    const part = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
        side: THREE.DoubleSide,
      })
    );
    part.position.set(x, y, z);
    part.castShadow = true;
    part.receiveShadow = true;
    whiteRoom.add(part);
    if (canExit) roomWalls.push(part);
  };

  makeRoomPart(100, 2, 100, 0xd0d0d0, 0, -1, 0);
  makeRoomPart(100, 2, 100, 0xf8f8f8, 0, 101, 0);
  makeRoomPart(100, 100, 2, 0xe8e8e8, 0, 50, -50, true);
  makeRoomPart(100, 100, 2, 0xf4f4f4, 0, 50, 50, true);
  makeRoomPart(2, 100, 100, 0xffffff, -50, 50, 0, true);
  makeRoomPart(2, 100, 100, 0xf0f0f0, 50, 50, 0, true);

  whiteRoom.visible = false;
  scene.add(whiteRoom);

  const pointLight = new THREE.PointLight(0xffffff, 5000, 300, 2);
pointLight.position.set(0, 70, 0);
pointLight.castShadow = true;
scene.add(pointLight);

  // General fill light keeps surfaces from going completely dark.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x555566, 1.2));

  // Spotlight uses the values from params.
  spotLight = new THREE.SpotLight(
    params.lightColor,
    params.lightIntensity,
    params.lightDistance,
    params.lightAngle,
    params.lightPenumbra,
    params.lightDecay
  );
  spotLight.position.set(0, 180, 100);
  spotLight.target.position.set(0, 0, 0);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.set(2048, 2048);
  scene.add(spotLight);
  scene.add(spotLight.target);

  camera.position.set(0, 35, 180);
  camera.lookAt(0, 35, 0);

  window.addEventListener("pointerdown", event => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (!insideRoom && raycaster.intersectObject(floor).length > 0) {
      house.visible = false;
      floor.visible = false;
      whiteRoom.visible = true;
      insideRoom = true;
      camera.position.set(0, 15, 35);
      camera.lookAt(0, 15, -30);
    } else if (insideRoom) {
      const clickedWall = raycaster.intersectObjects(roomWalls, false)[0];
      if (clickedWall) {
        whiteRoom.visible = false;
        house.visible = true;
        floor.visible = true;
        insideRoom = false;
        camera.position.set(0, 35, 180);
        camera.lookAt(0, 35, 0);
      }
    }
  });
}

function updateThree() {}