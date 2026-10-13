function getBox() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  let r = random(0, 3);
  if (r < 1) {
    cubeMaterial = glassMaterial
  } else if (r < 2) {
    cubeMaterial = clearGlassMaterial
  } else {
    cubeMaterial = laserMaterial
  }
  const cube = new THREE.Mesh(geometry, cubeMaterial);
  return cube;
}

function createCubes() {
  cubes.forEach((cube) => {
    cube.destroy();
  });
  cubes = [];

  const totalCount = Math.round(params.WORLD_SIZE / params.GRID_SIZE);
  const offset = ((totalCount - 1) * params.GRID_SIZE) / 2;

  for (let iz = 0; iz < totalCount; iz++) {
    let z = iz * params.GRID_SIZE - offset;
    for (let iy = 0; iy < totalCount; iy++) {
      let y = iy * params.GRID_SIZE - offset;
      for (let ix = 0; ix < totalCount; ix++) {
        let x = ix * params.GRID_SIZE - offset;
        
        if (
          (ix < 1 || ix >= totalCount - 1) ||
          (iy < 1 || iy >= totalCount - 1) ||
          (iz < 1 || iz >= totalCount - 1)
        ) {
          let cube = new Cube();
          cube.setPosition(x, y, z);
          cube.setScale(cube.breathe * params.GRID_SIZE / 2);
          cubes.push(cube);
        }
      }
    }
  }
  console.log(cubes.length);
}

class Cube {
  constructor() {
    // mesh
    this.mesh = getBox();
    scene.add(this.mesh);
    // position
    this.pos = this.mesh.position; // reference to the mesh position
    this.basePos = new THREE.Vector3(); // initial base position for the cube
    this.pos.copy(this.basePos);
    // rotation
    this.rot = this.mesh.rotation; // reference to the mesh rotation
    this.rotVel = new THREE.Vector3();
    this.rotAcc = new THREE.Vector3();
    // scale
    this.scale = this.mesh.scale; // reference to the mesh scale
    this.baseScale = new THREE.Vector3(10, 10, 10); // initial base scale for the cube
    this.scale.copy(this.baseScale);
    // breathe
    this.breathe = 1;
    this.breathePhase = random(0, Math.PI * 2);
  }
  setPosition(x, y, z) {
    this.basePos.set(x, y, z); // do the same with setScale
    this.pos.copy(this.basePos);
    return this;
  }
  setScale(w, h = w, d = w) {
    const minScale = 0.01;
    w = Math.max(w, minScale);
    h = Math.max(h, minScale);
    d = Math.max(d, minScale);
    this.baseScale.set(w, h, d);
    this.scale.copy(this.baseScale);
    return this;
  }
  update() {
    this.updatePosition();
    this.updateRotation();
    this.updateBreathe();
    this.updateScale();
  }
  updatePosition() {
    this.pos.copy(this.basePos).multiplyScalar(this.breathePos);
  }
  updateRotation() {
    this.rotVel.add(this.rotAcc);
    this.rot.x += this.rotVel.x;
    this.rot.y += this.rotVel.y;
    this.rot.z += this.rotVel.z;
    this.rotAcc.set(0, 0, 0);
  }
  updateScale() {
    this.scale.set(
      this.baseScale.x * this.breatheScl,
      this.baseScale.y * this.breatheScl,
      this.baseScale.z * this.breatheScl
    );
  }
  updateBreathe() {
    this.breathePhase += params.breatheSpeed * random(1, 1 * params.breatheRandomLevel);
    if (this.breathePhase > Math.PI * 2) {
      this.breathePhase = 0
    }
    let f = Math.sin(this.breathePhase * 5 / 8) * 1.2
    let g = 1.2
    let e = Math.sin(this.breathePhase - Math.PI) * 1.7
    let t
    if (this.breathePhase < Math.PI * 4 / 5) {
      t = Math.min(f, g);
    } else if (this.breathePhase < Math.PI * 3 / 2) {
      t = Math.max(g, e)
    } else {
      t = e
    }
    this.breathePos = map(t, 0, 1.7, 0.5, 1.2);
    this.breatheScl = map(t, 0, 1.7, 0.1, 1.2);
  }
  destroy() {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
  }
}