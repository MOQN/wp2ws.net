let params = {
  fps: 0,
};
let house, floor, whiteRoom;
let insideRoom = false;
let roomWalls = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
function setupThree() {
  scene.background = new THREE.Color(0x87CEEB);
  // House
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  house = new THREE.Group();
  const wall = (width, height, depth, x, y, z) => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      white
    );
    panel.position.set(x, y, z);
    house.add(panel);
  };
  wall(40, 100, 2, -30, 50, 50);  // front left
  wall(40, 100, 2, 30, 50, 50);   // front right
  wall(20, 65, 2, 0, 67.5, 50);   // above doorway
  wall(100, 100, 2, 0, 50, -50);  // back
  wall(2, 100, 100, -50, 50, 0);  // left
  wall(2, 100, 100, 50, 50, 0);   // right
  wall(100, 2, 100, 0, 100, 0);   // roof
  scene.add(house);
  // Floor
  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  // White 3D room
  whiteRoom = new THREE.Group();
  roomWalls = [];
  const makeRoomPart = (
    width, height, depth, color, x, y, z, canExit = false
  ) => {
    const part = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
      })
    );
    part.position.set(x, y, z);
    whiteRoom.add(part);
    if (canExit) roomWalls.push(part);
  };
  // Floor and ceiling
  makeRoomPart(100, 2, 100, 0xd0d0d0, 0, -1, 0);
  makeRoomPart(100, 2, 100, 0xf8f8f8, 0, 101, 0);
  // Wallls
  makeRoomPart(100, 100, 2, 0xe8e8e8, 0, 50, -50, true);
  makeRoomPart(100, 100, 2, 0xf4f4f4, 0, 50, 50, true);
  makeRoomPart(2, 100, 100, 0xffffff, -50, 50, 0, true);
  makeRoomPart(2, 100, 100, 0xf0f0f0, 50, 50, 0, true);
  whiteRoom.visible = false;
  scene.add(whiteRoom);
  //Camera position
  camera.position.set(0, 35, 180);
  camera.lookAt(0, 35, 0);
//Checking if camera is inside the room or outside the house
  window.addEventListener("pointerdown", event => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    // ENTERENTERENTER
    if (!insideRoom && raycaster.intersectObject(floor).length > 0) {
      house.visible = false;
      floor.visible = false;
      whiteRoom.visible = true;
      insideRoom = true;
      camera.position.set(0, 15, 35);
      camera.lookAt(0, 15, -30);
    }
    // GETOUTGETOUTGETOUT
    else if (insideRoom) {
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
function updateThree() {
}