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
 let pointLight;
 let spotLight, spotLightHelper, spotLightTarget;
 
 
 function setupThree() {
   renderer.shadowMap.enabled = true;
   renderer.shadowMap.type = THREE.PCFSoftShadowMap;
   createCubes(params.numberOfCubes); 

    // 1. fog
   scene.background = new THREE.Color(0x000000);
   scene.fog = new THREE.Fog(0x7da8a8, 1, 4000);

   //lights 

   // set the decay value to 0.01 (very low) to make the light reach far away
  //  pointLight = new THREE.PointLight(0xd4d6d6, 7, 1000, 0.01);
  //  pointLight.position.set(0, -170, 0);
  //  pointLight.castShadow = true; // default false
  //  scene.add(pointLight);

   spotLight = new THREE.SpotLight(0xFFFFFF, 15, 1000, PI / 6, 1.0, 0.01);
   spotLight.position.set(0, 300, 0);
   spotLight.castShadow = true;
   scene.add(spotLight);

   // add a mesh for the light source
   let sphere = getSphere();
   sphere.scale.set(10, 10, 10);
   spotLight.add(sphere); /// add the sphere to the light!!

   spotLightTarget = getBox();
   scene.add(spotLightTarget);
   spotLightTarget.position.set(0, floor, 0);
   spotLightTarget.scale.set(30, 30, 30);
   spotLightTarget.material = new THREE.MeshBasicMaterial({
   color: 0xFF00FF
   });
   // let's make it invisible
   spotLightTarget.visible = false;

   spotLight.target = spotLightTarget;


   // ground
   scene.add(ground);
   ground.scale.set(WORLD_SIZE, WORLD_SIZE);
   ground.rotation.x = - PI / 2;
   ground.position.y = floor;

   // GUI
   gui.add(params, 'numberOfCubes', 1, 200).step(1).onChange(updateNumberOfCubes); 
   gui.add(params, 'buildingSize', 10, 100).onChange(updateBuildingSize);      
   gui.add(params, 'buildingHeight', 1, 20).onChange(updateBuildingSize);    
   gui.addColor(params, 'color').onChange(updateCubeColors);   
   

 }
 
 
 function updateThree() {
  let angle = frame * 0.01;
  let radDist = 500;
  spotLightTarget.position.x = sin(angle) * radDist;
  spotLightTarget.position.z = cos(angle) * radDist;
 

  cubes.forEach(cube => cube.update()); 
  for (let c of cubes) {
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

function getSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
 }
 
 function getBox() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x223147,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true; //default is false
  mesh.receiveShadow = true;
  return mesh;
 }

 function getGround(){
  // const geometry = new THREE.PlaneGeometry( 1, 1 );
  // const material = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
  // const mesh = new THREE.Mesh( geometry, material );
  // return mesh;
  const geometry = new THREE.CircleGeometry(5,55);
  const material = new THREE.MeshStandardMaterial ( { color: 0x242736 } ); 
  const mesh = new THREE.Mesh(geometry,material);
  mesh.receiveShadow = true;
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
