let cubes = [];

function setupThree() {
  const geometry = new THREE.BoxGeometry(200, 200, 200);
  const material = new THREE.MeshStandardMaterial({ color: "#00c3ff", metalness: 1, roughness: 0.2 });

  for (let i = 0; i < 3; i++) {
    let y = (i * 200) - 200;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, y, 0);
    scene.add(mesh);
    cubes.push(mesh);


    for (let side = 0; side < 4; side++) {
      const frame = getFaceFrame(material);
      frame.position.y = y;
      frame.rotation.y = side * (Math.PI / 2);
      scene.add(frame);
    }
  }



  function getFaceFrame(material) {
    const group = new THREE.Group();

    const ridge = new THREE.Mesh(new THREE.BoxGeometry(15, 200, 15), material);
    ridge.position.set(0, 0, 105);
    group.add(ridge);

    const hBar = new THREE.Mesh(new THREE.BoxGeometry(200, 15, 15), material);
    hBar.position.set(0, 0, 105);
    group.add(hBar);

    const topBar = new THREE.Mesh(new THREE.BoxGeometry(200, 15, 15), material);
    topBar.position.set(0, 95, 105);
    group.add(topBar);

    const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(200, 15, 15), material);
    bottomBar.position.set(0, -95, 105);
    group.add(bottomBar);

    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(15, 200, 15), material);
    leftBar.position.set(-95, 0, 105);
    group.add(leftBar);

    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(15, 200, 15), material);
    rightBar.position.set(95, 0, 105);
    group.add(rightBar);

    return group;
  }





  const light = new THREE.PointLight(0xffffff, 15, 0, 0.1)
  light.position.set(300, 300, 300);
  scene.add(light);
  const light2 = new THREE.PointLight(0xffffff, 5, 0, 0.1);
  light2.position.set(-300, 200, -300);
  scene.add(light2);


}

function updateThree() {
  {
    cubes[0].rotation.y += 0.01;
    cubes[1].rotation.y -= 0.01;
    cubes[2].rotation.y += 0.01;
  }
}
