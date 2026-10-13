const axesHelper = new THREE.AxesHelper(1000)

let params = {
  fps: 0,
  maxRings: 25,
  speed: 0.05,
  maxSize: 25,
  minSize: 10,

  maxHeight: 50,
};

const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;

// let ring;
let rings = [];
let ringPositions = [];
let ringThetaStarts = [];
let ringInnerRadiuses = [];
let ringThetaLengths = [];
let ringSizes = [];

let cylinders = [];
let cylinderHeights = [];


function setupThree() {
  // scene.add(axesHelper);
  scene.background = new THREE.Color('#1d0303');

  // GUI
  let folderRing = pane.addFolder({ title: "Ring", expanded: true });
  folderRing.addBinding(params, "maxRings", { min: 1, max: 50, step: 1, });
  folderRing.addBinding(params, "speed", { min: 0.02, max: 0.09, step: 0.001, });
  folderRing.addBinding(params, "maxSize", { min: 15, max: 25, step: 1, });
  folderRing.addBinding(params, "minSize", { min: 5, max: 15, step: 1, });
  let folderCylinder = pane.addFolder({ title: "Cylinder", expanded: true });
  folderCylinder.addBinding(params, "maxHeight", { min: 1, max: 50, step: 1 })


}

function updateThree() {


  if (frame % Math.floor(100 / params.maxRings) == 0) {
    if (ringThetaLengths.length < params.maxRings) {
      ringThetaStarts.push(random(0, 2 * PI));
      ringInnerRadiuses.push(3);
      ringThetaLengths.push(0);
      ringSizes.push(random(params.minSize, params.maxSize))
      ringPositions.push(new THREE.Vector3(random(-WORLD_HALF, WORLD_HALF), random(-WORLD_HALF, WORLD_HALF), random(-WORLD_HALF, WORLD_HALF)));
      rings.push([]);

      cylinderHeights.push(0);
      cylinders.push([]);
    }
  }


  // splice 所以用j
  for (let j = ringThetaLengths.length - 1; j >= 0; j--) {
    if (ringThetaLengths[j] >= PI * 1.99) {
      // rings[j].geometry.dispose();
      // rings[j].material.dispose();
      scene.remove(rings[j][0].mesh);
      if (rings[j][0].geometry) {
        rings[j][0].geometry.dispose();
      }
      if (rings[j][0].material) {
        rings[j][0].material.dispose();
      }
      ringThetaStarts.splice(j, 1);
      ringInnerRadiuses.splice(j, 1);
      ringThetaLengths.splice(j, 1);
      ringSizes.splice(j, 1);
      ringPositions.splice(j, 1);
      rings.splice(j, 1);

      scene.remove(cylinders[j][0].mesh);
      if (cylinders[j][0].geometry) {
        cylinders[j][0].geometry.dispose();
      }
      if (cylinders[j][0].material) {
        cylinders[j][0].material.dispose();
      }
      cylinderHeights.splice(j, 1);
      cylinders.splice(j, 1);
    }
  }

  // push/create
  for (let i = 0; i < ringThetaLengths.length; i++) {

    if (ringThetaLengths.length > 0 && ringThetaLengths[i] < PI * 2) {

      let ring = new Ring(ringInnerRadiuses[i], ringThetaStarts[i], ringThetaLengths[i], ringSizes[i]);
      rings[i].push(ring);
      ring.pos.x = ringPositions[i].x;
      ring.pos.y = ringPositions[i].y;
      ring.pos.z = ringPositions[i].z;

      ringInnerRadiuses[i] -= 3 / (2 * PI / params.speed);
      ringThetaLengths[i] += params.speed;

      if (rings[i].length > 1) {
        scene.remove(rings[i][0].mesh);
        if (rings[i][0].geometry) {
          rings[i][0].geometry.dispose();
        }
        if (rings[i][0].material) {
          rings[i][0].material.dispose();
        }
        rings[i].splice(0, 1)
      }


      let cylinder = new Cylinder(cylinderHeights[i], ringSizes[i]);
      cylinders[i].push(cylinder);
      cylinder.pos.x = ringPositions[i].x;
      cylinder.pos.y = ringPositions[i].y;
      cylinder.pos.z = ringPositions[i].z;

      cylinderHeights[i] += params.maxHeight / (2 * PI / params.speed);

      if (cylinders[i].length > 1) {
        scene.remove(cylinders[i][0].mesh);
        if (cylinders[i][0].geometry) {
          cylinders[i][0].geometry.dispose();
        }
        if (cylinders[i][0].material) {
          cylinders[i][0].material.dispose();
        }
        cylinders[i].splice(0, 1)
      }

    }
  }



}

function getRing(innerRadius, thetaStart, thetaLength) {
  const geometry = new THREE.RingGeometry(innerRadius, 3, Math.floor(thetaLength / (2 * PI) * 8) + 1, 1, thetaStart, thetaLength); // innerRadius, outerRadius, thetaSegments, phiSegments, thetaStart, thetaLength
  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getCylinder(height) {
  const geometry = new THREE.CylinderGeometry(0.1, 0.1, height, 8, Math.floor(height / params.maxHeight) * 4 + 1); // radiusTop, radiusBottom, height, radialSegments, heightSegments
  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

///// CLASS /////
class Ring {
  constructor(innerRadius, thetaStart, thetaLength, ringSize) {
    // mesh
    this.mesh = getRing(innerRadius, thetaStart, thetaLength);
    // console.log(thetaLength)
    scene.add(this.mesh);

    // this.mesh.geometry.parameters.thetaLength = 1;

    // position
    this.pos = this.mesh.position; // reference to the mesh position
    this.vel = new THREE.Vector3(random(-1, 1), random(-1, 1), random(-1, 1));
    this.acc = new THREE.Vector3();

    // rotation
    this.rot = this.mesh.rotation; // reference to the mesh rotation
    this.rot.set(PI / 2, 0, PI / 2); // x & z = PI / 2 保证处于平面，调整y以形成左右高低摆动效果
    this.rotVel = new THREE.Vector3(0, 0, 0);
    this.rotAcc = new THREE.Vector3();

    // scale
    this.scale = this.mesh.scale; // reference to the mesh scale
    let size = ringSize;
    this.baseScale = new THREE.Vector3(size, size, size);
    this.scale.copy(this.baseScale);

    // mass
    this.mass = 1;

    // color
    this.color = this.mesh.material.color; // reference to the mesh color
    this.mesh.material.transparent = true; // enable transparency for the material

    // lifespan
    this.lifespan = 1; // 100%
    this.lifeReduction = random(0.001, 0.01);
    this.isDone = false;
  }

}

class Cylinder {
  constructor(height, ringSize) {
    // mesh
    this.mesh = getCylinder(height);
    // console.log(thetaLength)
    scene.add(this.mesh);

    // this.mesh.geometry.parameters.thetaLength = 1;

    // position
    this.pos = this.mesh.position; // reference to the mesh position
    this.vel = new THREE.Vector3(random(-1, 1), random(-1, 1), random(-1, 1));
    this.acc = new THREE.Vector3();

    // rotation
    this.rot = this.mesh.rotation; // reference to the mesh rotation
    this.rotVel = new THREE.Vector3(0, 0, 0);
    this.rotAcc = new THREE.Vector3();

    // scale
    this.scale = this.mesh.scale; // reference to the mesh scale
    let size = ringSize;
    this.baseScale = new THREE.Vector3(size, size, size);
    this.scale.copy(this.baseScale);

    // mass
    this.mass = 1;

    // color
    this.color = this.mesh.material.color; // reference to the mesh color
    this.mesh.material.transparent = true; // enable transparency for the material

    // lifespan
    this.lifespan = 1; // 100%
    this.lifeReduction = random(0.001, 0.01);
    this.isDone = false;
  }

}