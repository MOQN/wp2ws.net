let params = {
  color: "#FFF"
};

let cube;
let light, lightMesh;
let sculpture;

function setupThree() {
  renderer.setClearColor("#0b070b");

  // ambiLight = new THREE.AmbientLight("#140a1c");
  // scene.add(ambiLight);
 // front wall
  wall = getPortion();
 // scene.add(wall);

  wall.position.set(1, 0, 0); //(x, y, z);
  wall.scale.x = 300;
  wall.scale.y = 900;
  wall.scale.z = 100;

 //back wall
 wall2 = getPortion();
 //scene.add(wall2);

 wall2.position.set(1, 0, 450); //(x, y, z);
 wall2.scale.x = 300;
 wall2.scale.y = 900;
 wall2.scale.z = 100;

 //side wall 1
 wall3 = getPortion();
 wall3.position.set(280, 0, 215); //(x, y, z);
 wall3.scale.x = 100;
 wall3.scale.y = 900;
 wall3.scale.z = 280;

 //side wall 2
 wall4 = getPortion();
 wall4.position.set(-280, 0, 215); //(x, y, z);
 wall4.scale.x = 100;
 wall4.scale.y = 900;
 wall4.scale.z = 280;

 //bottom middle
 bottom = getPortion();
 bottom.position.set(0, -450, 200); //(x, y, z);
 bottom.scale.x = 300;
 bottom.scale.y = 10;
 bottom.scale.z = 450;

 //bottom side
 bottom2 = getPortion();
 bottom2.position.set(0, -450, 200); //(x, y, z);
 bottom2.scale.x = 460;
 bottom2.scale.y = 10;
 bottom2.scale.z = 300;

 //corner1

 corner = getCorner();
 corner.position.set(-199,0,50);
 corner.scale.x = 100;
 corner.scale.y = 900;
 corner.scale.z = 100; 

 //corner 2

 corner2 = getCorner();
 corner2.position.set(200,0,50);
 corner2.scale.x = 100;
 corner2.scale.y = 900;
 corner2.scale.z = 100; 

 // corner 3
 corner3 = getCorner();
 corner3.position.set(200,0,400);
 corner3.scale.x = 100;
 corner3.scale.y = 900;
 corner3.scale.z = 100;

 //corner 4
 corner4 = getCorner();
 corner4.position.set(-199,0,400);
 corner4.scale.x = 100;
 corner4.scale.y = 900;
 corner4.scale.z = 100;

 //crystal 
 crystal = getCrystal();
 crystal.position.set(1,750,200);
 crystal.scale.set(10,10,10);
 crystal.material.color.set("a938c3");
 crystal.material.transparent = true;
 crystal.material.opacity = 0.75;

 //point light 
 light = getPointLight("FFFFF");
 light.position.set(1,300,200);
 scene.add(light);
 light2 = getPointLight("FFFFF");
 scene.add(light2);

 //light sphere 
 lightMesh = getBasicSphere();
 light.add(lightMesh);
 lightMesh.scale.set(15,15,15);
 

 lightMesh2 = getBasicSphere();
 light2.add(lightMesh2);
 lightMesh2.scale.set(30,30,30);
 lightMesh2.position.set(0,0,0);
 
 sculpture = new THREE.Group();
 scene.add(sculpture);
 sculpture.add(wall);
 sculpture.add(wall2);
 sculpture.add(wall3);
 sculpture.add(wall4);
 sculpture.add(bottom);
 sculpture.add(bottom2);
 sculpture.add(corner);
 sculpture.add(corner2);
 sculpture.add(corner3);
 sculpture.add(corner4);
 sculpture.add(crystal);
}

function updateThree() {
  crystal.rotation.x += 0.01;
  crystal.rotation.y += 0.01;
  let angle = frame * 0.01;
  let radDist = 900;
  let x = cos(angle) * radDist;
  let y = -400;
  let z = sin(angle) * radDist;
  light2.position.set(x, y, z);

}

function getPortion() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhongMaterial({
    color: "#2e202e",
    shininess: 100
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}


function getCorner(){
  const geometry = new THREE.BoxGeometry(1,1,1);
  const material = new THREE.MeshPhongMaterial({
    color: "#2e202e",
    shininess: 100
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getCrystal(){
  const geometry = new THREE.OctahedronGeometry(10,0);
  const material = new THREE.MeshPhongMaterial({
    color: "#a938c3",
    shininess: 100
  });
  const mesh = new THREE.Mesh(geometry,material);
  return mesh; 
}

function getPointLight(color){
  const light = new THREE.PointLight(color,2,0,0.1);
  return light;
}

function getBasicSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff"
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}



