const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;
const MAX_RAINDROPS = 1000;
const RAIN_HEIGHT = 1000;
const RAIN_SPEED = 8;
const RAINDROP_WIDTH = 2;
const RAINDROP_LENGTH = 18;
const FLOOR_Y = -300;

let raindrops = [];
let rainGroup;
let groundPlane;

function setupThree() {
  rainGroup = new THREE.Group();
  scene.add(rainGroup);

  for (let i = 0; i < params.particleNumber; i++) {
    addRaindrop();
  }

  const groundGeometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x263746,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });

  groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = FLOOR_Y;
  scene.add(groundPlane);
}

function addRaindrop() {
  const drop = new Raindrop();

  drop
    .setPosition(
      random(-WORLD_HALF, WORLD_HALF),
      random(FLOOR_Y, RAIN_HEIGHT),
      random(-WORLD_HALF, WORLD_HALF)
    )
    .setVelocity(0, -RAIN_SPEED, 0)
    .setScale(RAINDROP_WIDTH, RAINDROP_LENGTH, RAINDROP_WIDTH);

  raindrops.push(drop);
  rainGroup.add(drop.mesh);
}

function updateThree() {
  while (raindrops.length < params.particleNumber) {
    addRaindrop();
  }

  while (raindrops.length > params.particleNumber) {
    const drop = raindrops.pop();
    rainGroup.remove(drop.mesh);
    drop.mesh.geometry.dispose();
    drop.mesh.material.dispose();
  }

  for (const drop of raindrops) {
    drop.update();

    if (drop.pos.y <= FLOOR_Y) {
      drop.setPosition(
        random(-WORLD_HALF, WORLD_HALF),
        RAIN_HEIGHT,
        random(-WORLD_HALF, WORLD_HALF)
      );
      drop.setVelocity(0, -RAIN_SPEED, 0);
      drop.lifespan = 1;
      drop.isDone = false;
      drop.updateScale();
      drop.syncMesh();
    }
  }
}
