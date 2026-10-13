const params = {
  fps: 0,

  // environment
  numParticles: 400,
  particleSize: 12,
  particleCount: 0,
  speed: 2.5,
  interactionDistance: 100,
  repulsionStrength: 0.05,
  randomness: 0.20,

  //drawing
  showConnections: true,
  connectionDistance: 120,
  lineOpacity: 0.5,
  lineWidth: 1,

  //world
  worldSizeX: 500,
  worldSizeY: 500,
  worldSizeZ: 500,

  //other
  color: "#FFFFFF",
  maxLines: 15000,
  drawEveryNFrames: 1,
  lineCount: 0
};


//global variables
let particles = [];

let connectionGeometry;
let connectionMaterial;
let connectionLines;
let connectionColors;
let connectionPositions;

let connectionVertexCount = 0;


// temporary vectors
const direction = new THREE.Vector3();

// FPS tracking
let lastTime = performance.now();
let frameCount = 0;
let frameNumber = 0;

function setupThree() {

  // gui
  const particleFolder = pane.addFolder({
    title: "PARTICLES"
  });

  particleFolder.addBinding(params, "numParticles", {
    min: 50,
    max: 500,
    step: 1
  });

  particleFolder.addBinding(params, "speed", {
    min: 0,
    max: 5,
    step: 0.1
  });

  particleFolder.addBinding(params, "interactionDistance", {
    min: 20,
    max: 200,
    step: 5
  });

  particleFolder.addBinding(params, "repulsionStrength", {
    min: 0,
    max: 0.2,
    step: 0.005
  });

  particleFolder.addBinding(params, "randomness", {
    min: 0,
    max: 2,
    step: 0.05
  });


  //connection
  const connectionFolder = pane.addFolder({
    title: "CONNECTIONS"
  });

  connectionFolder.addBinding(params, "showConnections");

  connectionFolder.addBinding(params, "connectionDistance", {
    min: 20,
    max: 200,
    step: 5
  });

  connectionFolder.addBinding(params, "lineOpacity", {
    min: 0,
    max: 1,
    step: 0.05
  });

  connectionFolder.addBinding(params, "maxLines", {
    min: 500,
    max: 20000,
    step: 500
  });

  //world gui
  const worldFolder = pane.addFolder({
    title: "WORLD"
  });

  worldFolder.addBinding(params, "worldSizeX", {
    min: 200,
    max: 1200,
    step: 50
  });

  worldFolder.addBinding(params, "worldSizeY", {
    min: 200,
    max: 800,
    step: 50
  });

  worldFolder.addBinding(params, "worldSizeZ", {
    min: 200,
    max: 800,
    step: 50
  });


  //performance gui
  const performanceFolder = pane.addFolder({
    title: "PERFORMANCE"
  });

  performanceFolder.addBinding(params, "fps", {
    readonly: true
  });

  performanceFolder.addBinding(params, "particleCount", {
    readonly: true
  });

  performanceFolder.addBinding(params, "lineCount", {
    readonly: true
  });


  //create particles with for loop
  for (let i = 0; i < params.numParticles; i++) {
    const particle = new Particle();
    particles.push(particle);
  }

  setupConnections();

  params.particleCount = particles.length;
}


//connection
function setupConnections() {

  connectionPositions = new Float32Array(params.maxLines * 6);

  connectionColors = new Float32Array(params.maxLines * 6);

  connectionGeometry = new THREE.BufferGeometry();

  const positionAttribute = new THREE.BufferAttribute(
    connectionPositions,
    3
  );

  connectionGeometry.setAttribute(
    "position",
    positionAttribute
  );

  const colorAttribute = new THREE.BufferAttribute(
    connectionColors,
    3
  );

  connectionGeometry.setAttribute(
    "color",
    colorAttribute
  );

  connectionGeometry.setDrawRange(
    0,
    0
  );

  // material
  connectionMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: params.lineOpacity
  });

  connectionLines = new THREE.LineSegments(
    connectionGeometry,
    connectionMaterial
  );

  scene.add(connectionLines);
}


function updateThree() {

  frameNumber++;
  updateFPS();
  updateParticleCount();

  connectionLines.visible = params.showConnections;

  connectionMaterial.opacity =
  params.lineOpacity;

  applyParticleInteractions();

  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    particle.update();
  }

  if (
    params.showConnections &&
    frameNumber % params.drawEveryNFrames === 0
  ) {
    updateConnections();
  }

  params.particleCount = particles.length;

  params.lineCount = connectionVertexCount / 2;
}

function updateParticleCount() {

  while (
    particles.length <
    params.numParticles
  ) {
    particles.push(new Particle());
  }

  while (
    particles.length >
    params.numParticles
  ) {
    const particle =
    particles.pop();
    particle.remove();
    }
}

function applyParticleInteractions() {

  const interactionDistance =
    params.interactionDistance;

  const interactionDistanceSquared =
    interactionDistance *
    interactionDistance;


  //particle pairs
  for (
      let i = 0;
      i < particles.length;
      i++
    ) {

    const p1 = particles[i];


    for (
      let j = i + 1;
      j < particles.length;
      j++
    ) {
      const p2 = particles[j];
      const distanceSquared =
      p1.pos.distanceToSquared(p2.pos);
      //repulsion
      if (distanceSquared < interactionDistanceSquared) {

        // prevent division by zero if particles overlap.
        if (distanceSquared > 0.0001) {
          const distance = Math.sqrt(distanceSquared);

          // p1 away from p2
          direction.subVectors(p1.pos,p2.pos);
          direction.normalize();

          // stronger force when particles are closer.
          const strength = (1 - distance / interactionDistance) * params.repulsionStrength;
          direction.multiplyScalar(strength);

          // apply equal and opposite forces.
          p1.applyForce(direction);

          direction.multiplyScalar(-1);

          p2.applyForce(direction);
        }
      }
    }
  }
}

function updateConnections() {

  if (!params.showConnections) {

    connectionGeometry.setDrawRange(
    0,
    0
    );

        connectionVertexCount = 0;

        return;
  }

  const connectionDistance =
    params.connectionDistance;


  const connectionDistanceSquared =
    connectionDistance *
    connectionDistance;

  for (
    let i = 0;
    i < particles.length;
    i++
  ) {

    const p1 = particles[i];

    for (
      let j = i + 1;
      j < particles.length;
      j++
      ) {

      const p2 = particles[j];

      const distanceSquared =
        p1.pos.distanceToSquared(
        p2.pos
      );

      if (distanceSquared < connectionDistanceSquared) {

        if (!p1.isConnectedTo(p2)) {
          addConnection(p1, p2);
          p1.addConnection(p2);
          p2.addConnection(p1);
        }

      }else {
        p1.removeConnection(p2);
        p2.removeConnection(p1);
      }
    }
  }
}

function addConnection(p1, p2) {

  const currentLineCount = connectionVertexCount / 2;

  if (currentLineCount >= params.maxLines) {
    return;
  }

  const distance = p1.pos.distanceTo(p2.pos);

  let brightness = distance / params.connectionDistance;

  brightness = Math.max(0,Math.min(1,brightness));

  const index = connectionVertexCount * 3;


  //POINT A
  connectionPositions[index] =
    p1.pos.x;

  connectionPositions[index + 1] =
    p1.pos.y;

  connectionPositions[index + 2] =
    p1.pos.z;

  //POINT B
  connectionPositions[index + 3] =
    p2.pos.x;

  connectionPositions[index + 4] =
    p2.pos.y;

  connectionPositions[index + 5] =
    p2.pos.z;

  connectionColors[index] = brightness;

  connectionColors[index + 1] = brightness;

  connectionColors[index + 2] = brightness;

  connectionColors[index + 3] = brightness;

  connectionColors[index + 4] = brightness;

  connectionColors[index + 5] = brightness;


  connectionVertexCount += 2;


  connectionGeometry
    .attributes
    .position
    .needsUpdate = true;


  connectionGeometry
    .attributes
    .color
    .needsUpdate = true;

  connectionGeometry.setDrawRange(
    0,
    connectionVertexCount
  );
}

// PARTICLE CLASS
class Particle {
  constructor() {

    //position
    this.pos =
    new THREE.Vector3();


    this.pos.x =
    (
    Math.random() - 0.5
    ) *
    params.worldSizeX;


    this.pos.y =
    (
    Math.random() - 0.5
    ) *
    params.worldSizeY;


    this.pos.z =
    (
    Math.random() - 0.5
    ) *
    params.worldSizeZ;


    //velocity
    this.vel = new THREE.Vector3(
    (Math.random() - 0.5) * params.speed,
    (Math.random() - 0.5) * params.speed,
    (Math.random() - 0.5) * params.speed
    );

    //acceleration
    this.acc = new THREE.Vector3();

    //rotation
    this.rotation = new THREE.Vector3();
    this.rotationVelocity = new THREE.Vector3(
    (Math.random() - 0.5) * 0.01,
    (Math.random() - 0.5) * 0.01,
    (Math.random() - 0.5) * 0.01
     );

     //mass
    this.mass = 1;

    this.connections = new Set();

    //invisible mesh
    this.mesh = getSphere();
    this.mesh.visible = false;
    scene.add(this.mesh);
  }


    //force
  applyForce(force) {

    this.acc.add(
    force.clone().divideScalar(
    this.mass
    )
    );
}

update() {

  //randome deviation
  if (
  params.randomness > 0
  ) {

    this.vel.x +=
    (
    Math.random() - 0.5
    ) *
    0.002 *
    params.randomness;


    this.vel.y +=
    (
    Math.random() - 0.5
    ) *
    0.002 *
    params.randomness;


   this.vel.z +=
    (
    Math.random() - 0.5
    ) *
    0.002 *
    params.randomness;
  }

  this.vel.add(this.acc);

  this.acc.set(0,0,0);

  this.limitSpeed(params.speed);

  this.pos.add(this.vel);

  this.bounce();

  this.rotation.x +=
    this.rotationVelocity.x;

  this.rotation.y +=
    this.rotationVelocity.y;

  this.rotation.z +=
    this.rotationVelocity.z;
}

limitSpeed(maxSpeed) {
  const speedSquared =
    this.vel.lengthSq();
  const maxSpeedSquared =
    maxSpeed * maxSpeed;

  if (
    speedSquared >
    maxSpeedSquared
    ) {
    this.vel.setLength(
      maxSpeed
      );
    }
  }

bounce() {
  const halfX =
    params.worldSizeX / 2;

  const halfY =
    params.worldSizeY / 2;

  const halfZ =
    params.worldSizeZ / 2;

  if (this.pos.x > halfX) {
    this.pos.x =halfX;
    this.vel.x *= -1;
  }else if (
    this.pos.x < -halfX
  ) {

    this.pos.x = -halfX;
    this.vel.x *= -1;
  }

  if (
      this.pos.y > halfY
  ) {
   this.pos.y = halfY;
   this.vel.y *= -1;

  }else if (
    this.pos.y < -halfY
  ) {
    this.pos.y = -halfY;
    this.vel.y *= -1;
  }

  if (
    this.pos.z > halfZ
  ) {
    this.pos.z = halfZ;
    this.vel.z *= -1;
  }else if (
    this.pos.z < -halfZ
  ) {
    this.pos.z = -halfZ;
    this.vel.z *= -1;
        }
}

isConnectedTo(
  particle
) {

  return this.connections.has(
  particle
  );
}


addConnection(
  particle
) {
  this.connections.add(
  particle
  );
}

removeConnection(
  particle
) {
  this.connections.delete(
    particle
    );
}

remove() {
    scene.remove(this.mesh);
}
}

function getSphere() {

  const geometry =
  new THREE.SphereGeometry(
    1,
    8,
    8
  );


  const material =
  new THREE.MeshBasicMaterial({
  color: 0xffffff
  });


  const mesh =
    new THREE.Mesh(
      geometry,
      material
    );


  mesh.scale.setScalar(
    params.particleSize
  );


  return mesh;
}

function updateFPS() {

  frameCount++;

  const currentTime = performance.now();


  if (
    currentTime -
    lastTime >=
    1000
  ) {

    params.fps = frameCount;
    frameCount = 0;
    lastTime = currentTime;
  }
}