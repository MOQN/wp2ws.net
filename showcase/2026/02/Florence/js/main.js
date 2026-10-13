let objects = [];

function setupThree() {

  // black background
  scene.background = new THREE.Color(0x000000);

  // camera
  camera.position.set(0, 100, 1200);
  camera.lookAt(0, 100, 0);


  // light
  const ambientLight =
    new THREE.AmbientLight(
      0xffffff,
      1.8
    );

  scene.add(ambientLight);


  const directionalLight =
    new THREE.DirectionalLight(
      0xffffff,
      3
    );

  directionalLight.position.set(
    -300,
    500,
    500
  );

  scene.add(directionalLight);


  // materials
  const whiteMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.1
    });


  const grayMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.6,
      metalness: 0.15
    });


  const darkMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.7,
      metalness: 0.1
    });


  // -----------------------------
  // sculpture
  // -----------------------------

  addBox(
    30, 110, 45,
    0, -300, 0,
    whiteMaterial
  );


  addBox(
    500, 25, 70,
    0, -220, 0,
    grayMaterial
  );


  addBox(
    70, 70, 70,
    15, -145, 0,
    whiteMaterial
  );


  addBox(
    180, 90, 75,
    -120, -50, 0,
    whiteMaterial
  );


  addBox(
    150, 75, 75,
    120, -40, 0,
    grayMaterial
  );


  addBox(
    40, 70, 50,
    0, 40, 0,
    darkMaterial
  );


  addBox(
    600, 25, 70,
    0, 105, 0,
    whiteMaterial
  );


  addBox(
    30, 105, 45,
    -10, 180, 0,
    grayMaterial
  );


  addBox(
    135, 95, 75,
    -130, 285, 0,
    whiteMaterial
  );


  addBox(
    65, 120, 70,
    0, 290, 0,
    darkMaterial
  );


  addBox(
    120, 95, 75,
    130, 285, 0,
    whiteMaterial
  );


  addBox(
    35, 85, 40,
    10, 390, 0,
    grayMaterial
  );


  addBox(
    430, 25, 70,
    0, 460, 0,
    grayMaterial
  );


  addBox(
    90, 75, 70,
    -70, 535, 0,
    whiteMaterial
  );


  addBox(
    160, 60, 70,
    85, 545, 0,
    grayMaterial
  );


  addBox(
    110, 130, 80,
    10, 655, 0,
    whiteMaterial
  );

}


// ------------------------------------
// animation
// ------------------------------------

function updateThree() {

  let t = time * 0.001;

  for (let i = 0; i < objects.length; i++) {

    let obj = objects[i];

    let phase = i * 0.65;

    let heightFactor = 1 + i * 0.035;


    // 左右摇晃
    obj.position.x =
      obj.userData.startX
      + Math.sin(t * 0.9 + phase) * 14 * heightFactor;


    // 上下轻微起伏
    obj.position.y =
      obj.userData.startY
      + Math.sin(t * 0.75 + phase) * 6;


    // 明显左右倾斜
    obj.rotation.z =
      obj.userData.startRotationZ
      + Math.sin(t * 0.85 + phase) * 0.11 * heightFactor;


    // 前后轻微摆动
    obj.position.z =
      obj.userData.startZ
      + Math.sin(t * 0.55 + phase) * 6;
      
    obj.rotation.y =
      Math.sin(t * 0.5 + phase) * 0.04;

  }

}


// ------------------------------------
// create box
// ------------------------------------

function addBox(
  width,
  height,
  depth,
  x,
  y,
  z,
  material
) {

  const geometry =
    new THREE.BoxGeometry(
      width,
      height,
      depth
    );


  const mesh =
    new THREE.Mesh(
      geometry,
      material
    );


  mesh.position.set(
    x,
    y,
    z
  );


  // save original values
  mesh.userData.startX = x;
  mesh.userData.startY = y;
  mesh.userData.startZ = z;
  mesh.userData.startRotationZ = 0;


  scene.add(mesh);


  objects.push(mesh);


  return mesh;

}