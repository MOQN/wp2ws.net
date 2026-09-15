let fillLight;
let rimLight;
let bars = [];


function setupThree() {

  // lighting

  const ambiLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambiLight);

  // directional light for metallic reflections
  const mainLight = new THREE.DirectionalLight(
    0xffffff,
    3
  );

  mainLight.position.set(500, 300, 800);
  mainLight.target.position.set(0, 200, 0);

  scene.add(mainLight);
  scene.add(mainLight.target);

  // soft fill light
  fillLight = new THREE.PointLight(0xffffff, 0.5, 0, 0.1);

  fillLight.position.set(-500, 400, 300);
  scene.add(fillLight);

  // subtle rim light
  rimLight = new THREE.PointLight(0xffffff, 1.5, 0, 0.1);

  rimLight.position.set(300, 500, -500);
  scene.add(rimLight);

  //materials

  const metallicMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8c9b5,
    metalness: 0.9,
    roughness: 0.2
  });

  const blackMaterial = new THREE.MeshStandardMaterial({
    color: 0x050505,
    metalness: 0.9,
    roughness: 0.4
  });

  //generate barcode

  let barcode = [];

  for (let i = 0; i < 20; i++) {
    barcode.push(
      Math.floor(Math.random() * 31) + 5
    );
  }


  // calculate total width for recalibration
  let totalWidth = 0;

  for (let i = 0; i < barcode.length; i++) {

    totalWidth += barcode[i];

    if (i < barcode.length - 1) {
      totalWidth += 10;
    }
  }

  let x = -totalWidth / 2;

  for (let i = 0; i < barcode.length; i++) {

    let width = barcode[i];
    let height = 300 + Math.random() * 50;
    let depth = 60 + Math.random() * 60;

    const geometry = new THREE.BoxGeometry(
      width,
      height,
      depth
    );

    let material;

    if (i % 2 === 0) {
      material = metallicMaterial;
    } else {
      material = blackMaterial;
    }

    const bar = new THREE.Mesh(
      geometry,
      material
    );


    //position

    bar.position.x = x + width / 2;
    bar.position.y = height / 2 - 100;
    bar.position.z = 0;


    // Store original properties
    bar.userData.baseY = height / 2 - 100;
    bar.userData.baseScale = 1;
    bar.userData.index = i;


    //rotation
    bar.rotation.y =
      (Math.random() - 0.5) * 0.08;



    // shadows
    bar.castShadow = true;
    bar.receiveShadow = true;

    scene.add(bar);

    bars.push(bar);

    x += width + 10;
  }


  //wall

  const wallGeometry = new THREE.PlaneGeometry(
    2000,
    1000
  );

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8d9d6,
    roughness: 0.85,
    metalness: 0.0
  });

  const wall = new THREE.Mesh(
    wallGeometry,
    wallMaterial
  );

  wall.position.set(
    0,
    100,
    -350
  );

  wall.receiveShadow = true;

  scene.add(wall);


  // wall light
  const wallLight = new THREE.PointLight(
    0xffffff,
    0.7,
    0,
    0.1
  );

  wallLight.position.set(
    -200,
    700,
    -200
  );

  scene.add(wallLight);
}


//animation

function updateThree() {

  for (let i = 0; i < bars.length; i++) {
    let bar = bars[i];

    // wave motion
    let wave = Math.sin(frame * 0.02 + i * 0.5) * 10;

    // create a random jerk
    if (Math.random() < 0.01) {
      bar.userData.jerk = (Math.random() - 0.5) * 100;
    }

    // gradually reduce the jerk
    bar.userData.jerk *= 0.85;

    // combine the wave + random jerk
    bar.position.y =
      bar.userData.baseY +
      wave +
      bar.userData.jerk;
  }
}