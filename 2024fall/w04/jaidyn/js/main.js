let params = {
  numberOfCubes: 1,
  buildingSize: 50, 
  buildingHeight: 10,
  color: "#FFFFFF",
 };
 
 const WORLD_SIZE = 180;
 const WORLD_HALF_SIZE = 600;
 const floor = -200;
 let cubes = [];
 let ground = getGround();
 
 
 function setupThree() {
   createCubes(params.numberOfCubes); 
  
   // ground
   scene.add(ground);
   ground.scale.set(WORLD_SIZE, WORLD_SIZE);
   ground.rotation.x = - PI / 2;
   ground.position.y = floor;

   //  for (let i = 0; i < 20; i++) {
   //     let randomPos = p5.Vector.random3D();
   //     randomPos.mult(WORLD_HALF_SIZE);
   //     let tCube = new Cube()
   //      .setPosition(randomPos.x, floor, randomPos.z)
   //      .setTranslation(0, 0.5, 0)
   //      .setScale(50, random(3, 18) ** 2, 50)
   //     cubes.push(tCube);
   //   }

  
   // GUI
   gui.add(params, 'numberOfCubes', 1, 200).step(1).onChange(updateNumberOfCubes); 
   gui.add(params, 'buildingSize', 10, 100).onChange(updateBuildingSize);      
   gui.add(params, 'buildingHeight', 1, 20).onChange(updateBuildingSize);    
   gui.addColor(params, 'color').onChange(updateCubeColors);   
   
 
 }
 
 
 function updateThree() {
  cubes.forEach(cube => cube.update()); 
  for (let c of cubes) {
    //let force = createVector(0,-0.5,0);
    //c.applyForce(force);
    c.move();
    c.update();
    
  }

 }

 function createCubes(count) {
  for (let i = 0; i < count; i++) {
      let randomPos = p5.Vector.random3D();
      randomPos.mult(WORLD_HALF_SIZE);
      let tCube = new Cube()
          .setPosition(randomPos.x, floor, randomPos.z)
          .setTranslation(0, 0.5, 0)
          .setScale(params.buildingSize, random(3, params.buildingHeight) ** 2, params.buildingSize);
      cubes.push(tCube);
  }
}

 function updateNumberOfCubes() {
  const diff = params.numberOfCubes - cubes.length;
  if (diff > 0) {
      createCubes(diff);  // add cubes
  } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i++) {
          const cube = cubes.pop();
          scene.remove(cube.mesh);  // remove cubes
      }
  }
}

 function updateBuildingSize() {
  cubes.forEach(cube => {
      cube.setScale(params.buildingSize, random(3, params.buildingHeight) ** 2, params.buildingSize);
  });
}

function updateCubeColors() {
  cubes.forEach(cube => {
      cube.mesh.material.color.set(params.color);
  });
}

 
 function getBox() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: 0x223147,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
 }

 function getGround(){
  // const geometry = new THREE.PlaneGeometry( 1, 1 );
  // const material = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
  // const mesh = new THREE.Mesh( geometry, material );
  // return mesh;
  const geometry = new THREE.CircleGeometry(5,55);
  const material = new THREE.MeshBasicMaterial ( { color: 0x565373 } ); 
  const mesh = new THREE.Mesh(geometry,material);
  return mesh;
 }
 
 
 class Cube {
  constructor() {
    this.pos = createVector();
    this.vel = createVector();
    this.acc = createVector();
 
 
    this.scl = createVector(1, 1, 1);
    this.mass = 1; //this.scl.x * this.scl.y * this.scl.z;
 
 
    this.rot = createVector();
    this.rotVel = createVector();
    this.rotAcc = createVector();
 
 
    this.lifespan = 1.0;
    this.lifeReduction = random(0.005, 0.010);
    this.isDone = false;
 
 
    this.mesh = getBox();
    scene.add(this.mesh); // don't forget to add to scene
  }
  setPosition(x, y, z) {
    this.pos = createVector(x, y, z);
    return this;
  }
  setTranslation(x, y, z) {
    this.mesh.geometry.translate(x, y, z);
    return this;
  }
  setVelocity(x, y, z) {
    this.vel = createVector(x, y, z);
    return this;
  }
  setRotationAngle(x, y, z) {
    this.rot = createVector(x, y, z);
    return this;
  }
  setRotationVelocity(x, y, z) {
    this.rotVel = createVector(x, y, z);
    return this;
  }
  setScale(w, h = w, d = w) {
    const minScale = 0.01;
    if (w < minScale) w = minScale;
    if (h < minScale) h = minScale;
    if (d < minScale) d = minScale;
    this.scl = createVector(w, h, d);
    this.mass = this.scl.x * this.scl.y * this.scl.z;
    return this;
  }
  move() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }
  rotate() {
    this.rotVel.add(this.rotAcc);
    this.rot.add(this.rotVel);
    this.rotAcc.mult(0);
  }
  applyForce(f) {
    let force = f.copy();
    force.div(this.mass);
    this.acc.add(force);
  }
  reappear() {
    if (this.pos.z > WORLD_SIZE / 2) {
      this.pos.z = -WORLD_SIZE / 2;
    }
  }
  disappear() {
    if (this.pos.z > WORLD_SIZE / 2) {
      this.isDone = true;
    }
  }
  age() {
    this.lifespan -= this.lifeReduction;
    if (this.lifespan <= 0) {
      this.lifespan = 0;
      this.isDone = true;
    }
  }
  update() {
    this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.mesh.rotation.set(this.rot.x, this.rot.y, this.rot.z);
    this.mesh.scale.set(this.scl.x, this.scl.y, this.scl.z);
  }
 }
 


setupThree();
