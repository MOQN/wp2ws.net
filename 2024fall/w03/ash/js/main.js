// https://threejs.org/docs/index.html?q=light#api/en/lights/PointLight
// https://threejs.org/docs/index.html?q=phong#api/en/materials/MeshPhongMaterial

let light, lightMesh;
let sculpture;
let ring;
let ring2;
let ring3;

let pillars=[];
let stacks=[];

function setupThree() {
  // It is not recommended to explore materials and lights this week!

  // change the background color
  renderer.setClearColor("#261502");

  // add ambient light
  ambiLight = new THREE.AmbientLight("#faa702");
  scene.add(ambiLight);

  // add point light
  light = getPointLight("#ffe18f");
  scene.add(light);

  // add a small sphere for the light
  lightMesh = getBasicSphere();
  light.add(lightMesh);
  lightMesh.scale.set(12, 12, 12);

  // add meshes

  ring = getRing(0.5,Math.PI*5/4)
  ring.position.set(0, 0, 0);
  ring.rotation.x = Math.PI/2;
  ring.scale.set(60,60,60);
  scene.add(ring);

  ring2 = getRing(0.5,Math.PI/2)
  ring2.position.set(0, 50, 0);
  ring2.rotation.x = Math.PI/2;
  ring2.scale.set(50,50,50);
  scene.add(ring2);

  ring3 = getRing(0.5,Math.PI*5/4)
  ring3.position.set(0, 50, 0);
  ring3.rotation.x = Math.PI/2;
  ring3.rotation.z = Math.PI/2+Math.PI/8;
  ring3.scale.set(50,50,50);
  scene.add(ring3);

  
  sculpture = new THREE.Group();
  scene.add(sculpture);
  
  
 for (var i=0;i<10; i++){
  for (var n=0;n<10; n++){
    pillars.push(new BasaltColums((-5+n)*15,0,(-5+i)*15));
  }
  
 }
  
 for (var n=0; n<100;n++) {

  stacks.push(pillars[n].display());
  stacks[n].scale.set(5,10,5);
  scene.add(stacks[n]);

 }
 
  
  
  //scene.add(stack);
}

function updateThree() {

  let angle = frame * 0.01;
  
  let radDist = 500;
  //let x = cos(angle) * radDist;
  let y = 0;
  //let z = sin(angle) * radDist;
  light.position.set(0, y, 0);
  ring.rotation.z +=0.01;
  ring2.rotation.z +=0.02;
  ring3.rotation.z +=0.02;
  
  for (var i=0;i<stacks.length; i++){

    stacks[i].position.y += sin(angle*5+i)+sin(i)
     
    //Hi!Whoever is viewing this code I hope you have a great day!(^v^)

    //stacks[i].position.x += sin(angle*5+i)+cos(i)
    //stacks[i].position.z += sin(angle*5+i)+sin(i)/2+cos(i)/2

  }


}

function getPhongBox() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhongMaterial({
    color: "#999999",
    shininess: 100
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getPhongSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshPhongMaterial({
    color: "#999999",
    shininess: 100
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getBasicSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff"
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getPointLight(color) {
  const light = new THREE.PointLight(color, 2, 0, 0.1); // ( color , intensity, distance (0=infinite), decay )
  return light;
}

function getRing(w,d) {
  const geometry = new THREE.TorusGeometry( 12, w, 4, 100, d ); 
  const material = new THREE.MeshPhongMaterial( { 
    color: "#7d7d7d", 
    flatShading: true
  } ); 
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}


class BasaltColums{
constructor(x,y,z){
  this.x=x;
  this.y=y;
  this.z=z;

  this.group = new THREE.Group();
  this.time=frame*0.01;

  this.hex1;
  this.hex2;
  this.hex3;
  this.hex4;
}

display(){

   this.hex1=getHexPillar();
   this.group.add(this.hex1);
   this.hex2=getHexPillar();
   this.group.add(this.hex2);
   this.hex3=getHexPillar();
   this.group.add(this.hex3);
   this.hex4=getHexPillar();
   this.group.add(this.hex4);
   
   this.hex1.position.set(this.x,this.y,this.z);
   this.hex2.position.set(this.x,this.y+random(-3,3),this.z-2.5*Math.sqrt(3)*2);
   this.hex3.position.set(this.x-15/2,this.y+random(-3,3),this.z-2.5*Math.sqrt(3)/2*2);
   this.hex4.position.set(this.x+15/2,this.y+random(-3,3),this.z-2.5*Math.sqrt(3)/2*2);
   
  return this.group;
  
}



}




function getHexPillar(){
  const geometry = new THREE.CylinderGeometry( 5, 5, 50, 6); 
  const material = new THREE.MeshPhongMaterial( {
    color: "#7d7d7d", 
    flatShading: true
  } ); 
  const mesh = new THREE.Mesh( geometry, material ); 
 
  return mesh;
}