let params = {
 numberOfCubes: 0,
 sceneChildren: 0,
 num: 50,
 mode1:true,
  mode2:false,
  friction: 0.99,
  g:4,
  a:0
};

const pointer = new THREE.Vector2();
//const raycaster=new THREE.Raycaster();


const WORLD_SIZE = 3000;
let cubes = [];

let cubes2=[];

let cubes3=[];

var sound=0



function getPlane(){
  const geometry = new THREE.PlaneGeometry( 1, 1 );
const material = new THREE.MeshStandardMaterial( {side: THREE.DoubleSide} );
const plane = new THREE.Mesh( geometry, material );
return plane
}

function setupThree() {
  light = getPointLight("#96ffbd",1000);
  light.distance=3000
  light.decay=0.5
  //light.target=
  b=getBox()
  b.scale.set(100,100,100)
  //light.add(b)
  light.position.set(3*200, 0, 100000*cos(0.02*200)/200)
  scene.add(light)
  
 
  light2=getPointLight("#a1faff",100)
  //light2.add(b)
  light3=getPointLight("#a1faff",100)
  //light2.add(b)
  light4=getPointLight("#a1faff",100)
  //light2.add(b)
  scene.add(light2)
  scene.add(light3)
  scene.add(light4)

  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog("#031833", 1, 7000);
  ambiLight = new THREE.AmbientLight("#999999");
  scene.add(ambiLight);

//failed audio attempt
  mic = new p5.AudioIn(); 
  mic.start(); // Load the library 

 // GUI
 gui = new dat.GUI()
 gui.add(params, "numberOfCubes").listen();
 gui.add(params, "sceneChildren").listen();
 gui.add(params, "num").min(0).max(3000);
 gui.add(params, "friction").min(0).max(1).step(0.002);
 gui.add(params, "g").min(0).max(10).step(1);
 gui.add(params, "a").min(0).max(3000).step(1)
 gui.add(params, "mode1");
  gui.add(params, "mode2");

plane=new getTerrian(7500,7500,100)
//plane.scale.set(7500,7500,1)
//plane.rotation.x=Math.PI/2
//plane.position.x=7500/2
scene.add(plane)


 //
//  for (let i = 0; i < params.num; i++) {
//    let randomPos = p5.Vector.random3D();
//    randomPos.mult(WORLD_SIZE);


//    let tCube = new Cube()
//      .setPosition(3*i, 10*noise(0.2*i), 100000*cos(0.02*i)/i)
//      .setVelocity(0, 0, 0)
//      .setScale(10)
//    cubes.push(tCube);
//  }
}


function updateThree() {
  
  params.a+=30
  if(params.a>2000){
    params.a=0
  }
  light2.intensity=abs(100*sin(params.a*0.01))
  light2.position.set(3*params.a, 0, 100000*cos(0.02*params.a)/params.a)

  light3.intensity=abs(100*sin(params.a*0.01))
  light3.position.set(3*params.a, 0,3*params.a+100000*sin(0.02*params.a)/params.a)

  light4.intensity=abs(100*sin(params.a*0.01))
  light4.position.set(3*params.a, 0, -2*params.a+100000*sin(-0.01*params.a)/params.a)

  for (let i = 0; i < params.num; i++) {
    
 //y=cosx/x
    n=random(0,3000)
    let tCube = new Cube()
      .setPosition(3*n, 0, 100000*cos(0.02*n)/n)
      .setVelocity(0, 0, 0)
      .setScale(10)
    cubes.push(tCube);
  }
  //

  //y=sinx/x+0.5x
  for (let i = 0; i < params.num; i++) {
    n=random(0,3000)
    let tCube = new Cube()
      .setPosition(3*n, 0, 3*n+100000*sin(0.03*n)/n)
      .setVelocity(0, 0, 0)
      .setScale(10)
    cubes2.push(tCube);
  }

  //y=sinx/x-0.5x
  for (let i = 0; i < params.num; i++) {
    n=random(0,3000)
    let tCube = new Cube()
      .setPosition(3*n, 0, -2*n+100000*sin(-0.01*n)/n)
      .setVelocity(0, 0, 0)
      .setScale(10)
    cubes3.push(tCube);
  }
  
 for (let c of cubes) {
   c.move();
   c.age();
   c.update();
 }
 
 for (let c of cubes2) {
  c.move();
  c.age();
  c.update();
}

for (let c of cubes3) {
  c.move();
  c.age();
  c.update();
}

 for (let i = 0; i < cubes.length; i++) {
   let c = cubes[i];

   if (c.isDone) {
     // remove!
     scene.remove(c.mesh); // remove the mesh from the scene first
     cubes.splice(i, 1); // then remove the object
  
     
   }
 }
 for (let i = 0; i < cubes2.length; i++) {
  let c = cubes2[i];

  if (c.isDone) {
    // remove!
    scene.remove(c.mesh); // remove the mesh from the scene first
    cubes2.splice(i, 1); // then remove the object
  }
}

for (let i = 0; i < cubes3.length; i++) {
  let c = cubes3[i];

  if (c.isDone) {
    // remove!
    scene.remove(c.mesh); // remove the mesh from the scene first
    cubes3.splice(i, 1); // then remove the object
  }
}


 params.numberOfCubes = cubes.length;
 params.sceneChildren = scene.children.length;
}

function mousePressed(){
  f=createVector(0,5,0);

for (let c of cubes) {
c.applyForce(f)
}
}


function getBox() {
 const geometry = new THREE.BoxGeometry(1, 1, 1);
 const material = new THREE.MeshStandardMaterial({color: "#ffffff"});
 const mesh = new THREE.Mesh(geometry, material);
 return mesh;
}


class Cube {
 constructor() {
   this.pos = createVector();
   this.vel = createVector();
   this.acc = createVector(0,0,0);
   this.g=createVector(0,params.g,0);
   
   this.scl = createVector(1, 1, 1);
   this.mass = random(0,5); //this.scl.x * this.scl.y * this.scl.z;


   this.rot = createVector();
   this.rotVel = createVector();
   this.rotAcc = createVector();


   this.lifespan = 1.0;
   this.lifeReduction =0.01;
   this.isDone = false;

    this.c=getBox()
    
   this.mesh = new THREE.Group();
   this.light= getPointLight("#FFFFFF",0.01)
   //this.light.add(this.c)
   //this.mesh.add(this.light)
   //Crashed
   this.mesh.add(this.c)
   scene.add(this.mesh); // don't forget to add to scene
 }
 setPosition(x, y, z) {
   this.pos = createVector(x, y, z);
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
   //this.mass = this.scl.x * this.scl.y * this.scl.z;
   //this.mass = 1;
   return this;
 }
 move() {
   this.acc.add(this.g.div(this.mass))
   this.vel.add(this.acc)
   this.pos.add(this.vel);
   this.acc.mult(0);
   this.vel.mult(params.friction)

 }

 rotate() {
   this.rotVel.add(this.rotAcc);
   this.rot.add(this.rotVel);
   this.rotAcc.mult(0);
 }
 applyForce(f) {
   let force = f.copy();
   //force.div(this.mass);
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


   let newScale = p5.Vector.mult(this.scl, this.lifespan);
   this.mesh.scale.set(newScale.x, newScale.y, newScale.z);
 }
}

function getTerrian(x,y,size){
  terrian=new THREE.Group()
  rectLight = new THREE.RectAreaLight( "#805100", 0.5,  x, y );
  //helper = new RectAreaLightHelper( rectLight )
  rectLight.rotation.x=Math.PI/2
  rectLight.position.set(x/2,-x,0)
  //rectLight.add(helper)
  rectLight.intensity=5
  rectLight.distance=100
  rectLight.decay=0.5
  terrian.add(rectLight)
      //push();
     for(i=0;i<x/size;i++){
      for(n=0;n<y/size;n++){

        c=getBox();
        c.position.x=i*size;
        c.position.z=n*size-x/4;
        c.position.y=-x/4;
        c.scale.y=random(0,2000);
        c.scale.x=size;
        c.scale.z=size;
        c.reciveshadow=true
        c.castShadow = true
        terrian.add(c)
      }
      //terrian.add(c)
      
     }
      
      
      //pop();
    
    return terrian
  }
  function getPointLight(color,intensity) {
    const light = new THREE.PointLight(color, intensity, 1000, 0.1); // ( color , intensity, distance (0=infinite), decay )
    return light;
  }