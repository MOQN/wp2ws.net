// https://threejs.org/docs/index.html?q=light#api/en/lights/PointLight
// https://threejs.org/docs/index.html?q=phong#api/en/materials/MeshPhongMaterial
let light, lightMesh;
let sculpture;
let plane, positionAttribute;
let sea;
let boxes = []

function setupThree() {
  // change the background color
  renderer.setClearColor("#111111");

  // add ambient light
  ambiLight = new THREE.AmbientLight("#000000");
  scene.add(ambiLight);

  // add point light
  light = getPointLight("#FFFFFF");
  scene.add(light);

  // add a small sphere for the light
  lightMesh = getBasicSphere();
  light.add(lightMesh);
  lightMesh.scale.set(10, 10, 10);
  light.position.set(0, 0, 50);

  sea = new Sea();
  boxes.push(new Box())
}


function updateThree() {
  sea.updateSea();
  for (let box of boxes) {
    updateBox(box);
  }
  

}


function getBasicSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff"
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getBasicPlane() {
  const geometry = new THREE.PlaneGeometry(50, 50, 100, 100);
  const material = new THREE.MeshPhongMaterial({
    color: "grey",
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getPointLight(color) {
  const light = new THREE.PointLight(color, 2, 0, 0.1); // ( color , intensity, distance (0=infinite), decay )
  return light;
}

function getBasicBox() {
  const geometry = new THREE.BoxGeometry( 1, 1, 1 ); 
  const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} ); 
  const cube = new THREE.Mesh( geometry, material ); 
  return cube
}
function getBasicCone() {
  const radius = 5;
  const height = 10;
  const radialSegments = 8;
  const heightSegments = 1;
  const openEnded = true;
  const thetaStart = 0;
  const thetaLength = 3;
  const geometry = new THREE.ConeGeometry(radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)

  const material = new THREE.MeshBasicMaterial( {color: 0xffff00,
    side: THREE.DoubleSide,
  } );
  const cone = new THREE.Mesh(geometry, material ); 
  return cone;
}

class Sea {
  constructor() {
    this.mesh = getBasicPlane();
    scene.add(this.mesh);
  }
  updateSea() {
    let time = frame * 0.05 // can control frame with this
    positionAttribute = this.mesh.geometry.attributes.position;
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      //const z = Math.sin(noise((time+x) * 0.05) * 10) * Math.cos(noise((time+y) * 0.05) * 10) * 2
      const z = Math.sin((time + x) * 0.2) * Math.cos((time + y) * 0.2); // not done yet
      positionAttribute.setZ(i, z);
    }
    positionAttribute.needsUpdate = true;
  }
}


function updateBox(box) {
  if (box.mesh.position.x >= 25) {
    scene.remove(box.mesh);
    boxes.pop();
  }
  box.angle += noise(frame) * 0.5
  box.mesh.rotation.y = box.angle * (Math.PI / 180);
  box.mesh.rotation.z = box.angle * (Math.PI / 180);
  box.mesh.rotation.x = box.angle * (Math.PI / 180);
  let x = box.mesh.position.x
  x += noise(frame) * 0.05
  //let z = map(noise(frame * 0.01), 0, 1, -0.002, 0.007); // Adjust range (-0.5, 0.5) for z movement
  box.vel.add(noise(frame) * 0.00001, 0, 0)
  box.pos.add(box.vel)
  box.setPosition();
  //box.updateDegreeByGui(ui);
  //box.updatePositionByGui(ui);


}
class Box {
  constructor() {
    
    this.vel = createVector();
    this.acc = createVector();

    this.angle = 0;
    this.scl = createVector(1, 1, 1);
    this.mass = 1; //this.scl.x * this.scl.y * this.scl.z;
    //this.mesh = getBasicCone();
    this.mesh = getBasicBox();
    scene.add(this.mesh);
    this.pos = createVector(); // Set x, y, z coordinates;
  }

  setPosition() {
    this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z)
    return this;
  }

  updateDegreeByGui(params) {
    this.mesh.rotation.x = params.degreex * (Math.PI / 180);
    this.mesh.rotation.y = params.degreey * (Math.PI / 180);
    this.mesh.rotation.z = params.degreez * (Math.PI / 180);
  }
  updatePositionByGui(params) {
    this.mesh.position.x = params.boatx;
    this.mesh.position.y = params.boaty;
    this.mesh.position.z = params.boatz;
  }
}