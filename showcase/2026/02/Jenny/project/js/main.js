let light;
let pyramids = [];

function setupThree() {
  // ambient light
  const ambiLight = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambiLight);

  // point light
  light = new THREE.PointLight(0xffffff, 12, 0, 0.1);
  light.position.set(0, 0, 0);
  scene.add(light);

  // room size
  const roomSize = 800;
  const half = roomSize / 2;

  // wall material
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x777777,
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide
  });

  // wall configs
  const wallConfigs = [
    // back
    {pos: [0, 0, -half], rot: [0, 0, 0]},
    // left
    {pos: [-half, 0, 0], rot: [0, Math.PI / 2, 0]},
    // right
    {pos: [half, 0, 0], rot: [0, Math.PI / 2, 0]},
    // floor
    {pos: [0, -half, 0], rot: [Math.PI / 2, 0, 0]},
    // ceiling
    {pos: [0, half, 0], rot: [Math.PI / 2, 0, 0]}
  ];

  // create walls
  for (let i = 0; i < wallConfigs.length; i++) {
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomSize, roomSize),
      wallMaterial
    );

    wall.position.set(
      wallConfigs[i].pos[0],
      wallConfigs[i].pos[1],
      wallConfigs[i].pos[2]
    );

    wall.rotation.set(
      wallConfigs[i].rot[0],
      wallConfigs[i].rot[1],
      wallConfigs[i].rot[2]
    );
    scene.add(wall);
  }

  // pyramid geometry
  const pyramidHeight = 200;
  const pyramidGeometry = new THREE.ConeGeometry(roomSize / Math.sqrt(2), pyramidHeight, 4);
  // rotate square base by 45 degrees
  pyramidGeometry.rotateY(Math.PI / 4);
  // move origin to the base
  pyramidGeometry.translate(0, pyramidHeight / 2, 0);
  // pyramid material
  const pyramidMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9d9d9,
    metalness: 0.7,
    roughness: 0.25
  });

  // pyramid configs
  const pyramidConfigs = [
    // back wall -> toward +Z
    {pos: [0, 0, -half], rot: [Math.PI / 2, 0, 0]},
    // ceiling -> downward
    {pos: [0, half, 0], rot: [0, 0, Math.PI]},
    // floor -> upward
    {pos: [0, -half, 0], rot: [0, 0, 0]},
    // left wall -> toward +X
    {pos: [-half, 0, 0], rot: [0, 0, -Math.PI / 2]},
    // right wall -> toward -X
    {pos: [half, 0, 0], rot: [0, 0, Math.PI / 2]}
  ];

  // create pyramids
  for (let i = 0; i < pyramidConfigs.length; i++) {
    const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial);

    pyramid.position.set(
      pyramidConfigs[i].pos[0],
      pyramidConfigs[i].pos[1],
      pyramidConfigs[i].pos[2]
    );

    pyramid.rotation.set(
      pyramidConfigs[i].rot[0],
      pyramidConfigs[i].rot[1],
      pyramidConfigs[i].rot[2]
    );

    scene.add(pyramid);
    pyramids.push(pyramid);
  }
}

function updateThree() {

  for (let i = 0; i < pyramids.length; i++) {

    let wave = sin(frame * 0.04 + i * 1.3);

    let scaleY = map(wave, -1, 1, 0.5, 1.5);

    pyramids[i].scale.y = scaleY;
  }

}