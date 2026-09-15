let params = {
 numberOfCubes: 0,
 sceneChildren: 0,
 num: 2000,
 mode1:true,
  mode2:false,
  friction: 0.99
};

const pointer = new THREE.Vector2();
const raycaster=new THREE.Raycaster();


const WORLD_SIZE = 2000;
let cubes = [];

var sound=0

function setupThree() {
//failed audio attempt
  //mic = new p5.AudioIn(); 
  //mic.start(); // Load the library 

 // GUI
 gui = new dat.GUI()
 gui.add(params, "numberOfCubes").listen();
 gui.add(params, "sceneChildren").listen();
 gui.add(params, "num").min(0).max(3000);
 gui.add(params, "friction").min(0).max(1).step(0.002);
 gui.add(params, "mode1");
  gui.add(params, "mode2");


 //
 for (let i = 0; i < params.num; i++) {
   let randomPos = p5.Vector.random3D();
   randomPos.mult(WORLD_SIZE);


   let tCube = new Cube()
     .setPosition(randomPos.x, 1000*noise(i*0.2), randomPos.z)
     .setVelocity(0, 0, 0)
     .setScale(random(10, 50))
   cubes.push(tCube);
 }
}


function updateThree() {

  
  if(mouseIsPressed){

    sound+=1

  }else{

    sound=0

  }
  
  
 for (let c of cubes) {
  
  
  c.vel.add(createVector(0,sound/c.mass,0))
   c.move();
   if(params.mode1){
    if(mouseIsPressed){
    
      c.age();
  
     }
   }
   if(params.mode2){

    c.age();

   }
   
   
   c.update();
 }
if(cubes.length<params.num){
 for(i=0;i<params.num-cubes.length;i++){
   
  let randomPos = p5.Vector.random3D();
  randomPos.mult(WORLD_SIZE);


  let tCube = new Cube()
   .setPosition(randomPos.x, 0, randomPos.z)
   .setVelocity(0, 0, 0)
   .setScale(random(10, 50))
  cubes.push(tCube); 
 }
  

}
 

 for (let i = 0; i < cubes.length; i++) {
   let c = cubes[i];

    

   if (c.isDone) {
     // remove!
     scene.remove(c.mesh); // remove the mesh from the scene first
     cubes.splice(i, 1); // then remove the object


   }
 }


 params.numberOfCubes = cubes.length;
 params.sceneChildren = scene.children.length;
}

function mousePressed(){

f=p5.Vector.random3D();

for (let c of cubes) {
c.applyForce(f)

}

}

function getBox() {
 const geometry = new THREE.BoxGeometry(1, 1, 1);
 const material = new THREE.MeshBasicMaterial({
  transparent: true,
   opacity: 0.5
 });
 const mesh = new THREE.Mesh(geometry, material);
 return mesh;
}


class Cube {
 constructor() {
   this.pos = createVector();
   this.vel = createVector();
   this.acc = createVector(0,-1,0);
   this.g=createVector(0,-1,0);
   this.ag=createVector(0,2,0);
   
   this.scl = createVector(1, 1, 1);
   this.mass = random(0,5); //this.scl.x * this.scl.y * this.scl.z;


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
  if(this.pos.y<0){
    this.acc.add(this.ag)
  }
   this.acc.add(this.g)
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


   let newScale = p5.Vector.mult(this.scl, this.lifespan);
   this.mesh.scale.set(newScale.x, newScale.y, newScale.z);
 }
}
