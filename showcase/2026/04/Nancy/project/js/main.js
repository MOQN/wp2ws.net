const axesHelper = new THREE.AxesHelper(1000)

let params = {
  fps: 0,
  // Ring
  maxRings: 30,
  speed: 0.05,
  maxSize: 25,
  minSize: 10,
  // Cylinder
  maxHeight: 50,
  // Light
  x: 0,
  y: 3500,
  z: 0,
  intensity: 1,
  distance: 5000,
  angle: 0.390,
  penumbra: 0.34,
  decay: 0,
  // Fog
  fogDensity: 0.00015,
};

const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;
const FLOOR_POSITION = -WORLD_HALF / 2;


let plane;

let rings = [];
let lineRings = [];
let ringPositions = [];
let ringThetaStarts = [];
let ringInnerRadiuses = [];
let ringThetaLengths = [];
let ringSizes = [];

let cylinders = [];
let cylinderHeights = [];

let light;


function setupThree() {
  // scene.add(axesHelper);
  scene.background = new THREE.Color('#a2f3e8');

  // FLOOR
  plane = getPlane(WORLD_HALF * 2 + 1000, WORLD_HALF * 2 + 1000);
  plane.position.y = FLOOR_POSITION;
  plane.rotation.x = PI / 2;
  scene.add(plane);

  // LIGHTS
  // 大全环境光
  const ambiLight = new THREE.AmbientLight("#00eeff");
  scene.add(ambiLight);
  // 柔和环境光
  const hemiLight = new THREE.HemisphereLight("#ffffff", "#c8ffb1", 0.5); //skyColor, groundColor, intensity
  scene.add(hemiLight);

  light = getSpotLight();
  light.position.x = params.x;
  light.position.y = params.y;
  light.position.z = params.z;
  light.rotation.y = PI / 2;

  light.distance = params.distance;
  light.decay = params.decay;
  scene.add(light);

  let lightMesh = getSphere();
  lightMesh.scale.set(20, 20, 20);
  // light.add(lightMesh); // !!!

  spotLightHelper = new THREE.SpotLightHelper(light);
  // scene.add(spotLightHelper);

  // FOG
  scene.fog = new THREE.FogExp2("#00eeff", params.fogDensity);

  // GUI
  let folderRing = pane.addFolder({ title: "Ring", expanded: true });
  folderRing.addBinding(params, "maxRings", { min: 1, max: 50, step: 1, });
  folderRing.addBinding(params, "speed", { min: 0.02, max: 0.09, step: 0.001, });
  folderRing.addBinding(params, "maxSize", { min: 15, max: 25, step: 1, });
  folderRing.addBinding(params, "minSize", { min: 5, max: 15, step: 1, });

  let folderCylinder = pane.addFolder({ title: "Cylinder", expanded: true });
  folderCylinder.addBinding(params, "maxHeight", { min: 1, max: 50, step: 1 });

  let folderLight = pane.addFolder({ title: "Light", expanded: true });
  folderLight.addBinding(params, "intensity", {
    min: 0,
    max: 1,
    step: 0.01
  }).on("change", () => {
    light.intensity = params.intensity;
  });
  folderLight.addBinding(params, "angle", {
    min: 0, max: PI / 6, step: 0.001
  }).on("change", () => {
    light.angle = params.angle;
  });
  folderLight.addBinding(params, "penumbra", {
    min: 0, max: 1, step: 0.01
  }).on("change", () => {
    light.penumbra = params.penumbra;
  });

  let folderFog = pane.addFolder({ title: "Fog", expanded: true });
  folderFog.addBinding(params, "fogDensity", {
    min: 0,
    max: 0.001,
    step: 0.00001,
  }).on("change", () => {
    scene.fog.density = params.fogDensity;
  });

}

function updateThree() {

  if (frame % Math.floor(100 / params.maxRings) == 0) {
    if (ringThetaLengths.length < params.maxRings) {
      ringThetaStarts.push(random(0, 2 * PI));
      ringInnerRadiuses.push(3);
      ringThetaLengths.push(0);
      ringSizes.push(random(params.minSize, params.maxSize));
      ringPositions.push(new THREE.Vector3(random(-WORLD_HALF, WORLD_HALF), random(0, WORLD_SIZE), random(-WORLD_HALF, WORLD_HALF)));
      rings.push([]);
      lineRings.push([]);

      cylinderHeights.push(0);
      cylinders.push([]);
    }
  }


  // splice 所以用j
  for (let j = ringThetaLengths.length - 1; j >= 0; j--) {
    if (ringThetaLengths[j] >= PI * 1.99) {

      scene.remove(rings[j][0].mesh);
      if (rings[j][0].geometry) {
        rings[j][0].geometry.dispose();
      }
      if (rings[j][0].material) {
        rings[j][0].material.dispose();
      }

      scene.remove(lineRings[j][0].mesh);
      if (lineRings[j][0].geometry) {
        lineRings[j][0].geometry.dispose();
      }
      if (lineRings[j][0].material) {
        lineRings[j][0].material.dispose();
      }

      ringThetaStarts.splice(j, 1);
      ringInnerRadiuses.splice(j, 1);
      ringThetaLengths.splice(j, 1);
      ringSizes.splice(j, 1);
      ringPositions.splice(j, 1);
      rings.splice(j, 1);
      lineRings.splice(j, 1);

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


      let lineRing = new LineRing(ringInnerRadiuses[i], ringThetaStarts[i], ringThetaLengths[i], ringSizes[i]);
      lineRings[i].push(lineRing);
      lineRing.pos.x = ringPositions[i].x;
      lineRing.pos.y = ringPositions[i].y;
      lineRing.pos.z = ringPositions[i].z;


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

        scene.remove(lineRings[i][0].mesh);
        if (lineRings[i][0].geometry) {
          lineRings[i][0].geometry.dispose();
        }
        if (lineRings[i][0].material) {
          lineRings[i][0].material.dispose();
        }


        rings[i].splice(0, 1);
        lineRings[i].splice(0, 1);
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

///// LIGHT /////
function getSpotLight() {
  const spotLight = new THREE.SpotLight("#ffff00");
  spotLight.castShadow = true;
  return spotLight;
}

function getPointLight() {
  const light = new THREE.PointLight("#ffffff", 1, 1000, 0); // color, intensity, distance, decay
  return light
}

function getPlane(w, h) {
  const geometry = new THREE.PlaneGeometry(w, h, 32);
  const material = new THREE.MeshPhongMaterial({
    side: THREE.DoubleSide,
    // opacity: 0.3,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function getSphere() {
  const geometry = new THREE.SphereGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

///// STRUCTURE /////
function getRing(innerRadius, thetaStart, thetaLength) {
  const geometry = new THREE.RingGeometry(innerRadius, 3, Math.floor(thetaLength / (2 * PI) * 8) + 1, 1, thetaStart, thetaLength); // innerRadius, outerRadius, thetaSegments, phiSegments, thetaStart, thetaLength
  // const material = new THREE.MeshBasicMaterial({
  //   color: "#ffffff",
  //   side: THREE.DoubleSide,
  //   // wireframe: true,
  // });
  // const lineMaterial = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  const material = new THREE.MeshPhongMaterial({
    color: "#ffffff",
    //wireframe: true,
    side: THREE.DoubleSide,
    // receiveShadow: true,
    opacity: 0.34,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  // mesh.receiveShadow = true;
  return mesh;
}

/* from Prof. Moon
function getRing(innerRadius, thetaStart, thetaLength) {
  const geometry = new THREE.RingGeometry(
    innerRadius,
    3,
    Math.floor(thetaLength / (2 * PI) * 8) + 1,
    1,
    thetaStart,
    thetaLength
  );

  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    side: THREE.DoubleSide,
    wireframe: false,
    transparent: true,
    opacity: 0.5,
  });
  const mesh = new THREE.Mesh(geometry, material);

  // create edges from the ring geometry!
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: "#00FF00",
  });
  const line = new THREE.LineSegments(edges, lineMaterial);

  // add the edges to the mesh so that it can be combined with the ring geometry!
  mesh.add(line);

  return mesh;
}
*/


function getLineRing(innerRadius, thetaStart, thetaLength) {
  const geometry = new THREE.RingGeometry(innerRadius, 3, Math.floor(thetaLength / (2 * PI) * 8) + 1, 1, thetaStart, thetaLength); // innerRadius, outerRadius, thetaSegments, phiSegments, thetaStart, thetaLength
  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    side: THREE.DoubleSide,
    opacity: 0.22,
    wireframe: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}


function getCylinder(height) {
  const geometry = new THREE.CylinderGeometry(0.1, 0.1, height, 8, Math.floor(height / params.maxHeight) * 4 + 1); // radiusTop, radiusBottom, height, radialSegments, heightSegments
  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    side: THREE.DoubleSide,
    // wireframe: true,
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

class LineRing {
  constructor(innerRadius, thetaStart, thetaLength, ringSize) {
    // mesh
    this.mesh = getLineRing(innerRadius, thetaStart, thetaLength);
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