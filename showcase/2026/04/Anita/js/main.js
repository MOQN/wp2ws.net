const params = {
  fps: 0,

  // environment
  numParticles: 500,
  particleSize: 3,
  particleCount: 0,
  speed: 2.4,
  interactionDistance: 155,
  repulsionStrength: 0.140,
  randomness: 1.00,

  //drawing
  showConnections: true,
  connectionDistance: 100,
  lineOpacity: 1.00,
  lineWidth: 1,

  //world
  worldSizeX: 400,
  worldSizeY: 350,
  worldSizeZ: 350,

  //other
  color: "#FFFFFF",
  maxLines: 5000,
  drawEveryNFrames: 1,
  lineCount: 0
};


//global variables
let particles = [];

let connectionGroup;
let connectionMaterial;

//lighting
let movingLight;
let movingLight2;
let movingLight3;
let movingLight4;
let ambientLight;
let hemisphereLight;


// temporary vectors
const direction = new THREE.Vector3();
const midpoint = new THREE.Vector3();
const connectionDirection = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);


// FPS tracking
let lastTime = performance.now();
let frameCount = 0;
let frameNumber = 0;


// optimization
let interactionFrame = 0;
let connectionFrame = 0;
let meshUpdateFrame = 0;

let nextParticleID = 0;

// internal connection limit
const optimizedMaxLines = 2500;


function setupThree() {

  //fog
  scene.fog = new THREE.Fog(0x10141c, 250, 900);


  //lighting

  // broad environmental light
  ambientLight = new THREE.AmbientLight(0xcdd8ff, 0.45);
  scene.add(ambientLight);


  // broad top and bottom illumination
  hemisphereLight = new THREE.HemisphereLight(0xbfd8ff, 0x25202f, 1.2);
  scene.add(hemisphereLight);


  //connection material
  connectionMaterial = new THREE.MeshStandardMaterial({
    color: 0x66748f,
    roughness: 0.18,
    metalness: 0.85,
    transparent: true,
    opacity: params.lineOpacity
  });


  //moving light 1
  movingLight = new THREE.SpotLight(0xffffff, 1800, 1000, 1.25, 0.8, 1);
  movingLight.position.set(250, 150, 200);
  movingLight.castShadow = true;

  movingLight.shadow.mapSize.width = 512;
  movingLight.shadow.mapSize.height = 512;

  movingLight.shadow.camera.near = 10;
  movingLight.shadow.camera.far = 1000;

  scene.add(movingLight);
  scene.add(movingLight.target);


  //moving light 2
  movingLight2 = new THREE.SpotLight(0x9bbcff, 1400, 1000, 1.35, 0.9, 1);
  movingLight2.position.set(-250, 100, 200);

  scene.add(movingLight2);
  scene.add(movingLight2.target);


  //moving light 3
  movingLight3 = new THREE.SpotLight(0xffc4a3, 1200, 900, 1.35, 0.9, 1);
  movingLight3.position.set(0, -200, -250);

  scene.add(movingLight3);
  scene.add(movingLight3.target);


  //moving light 4
  movingLight4 = new THREE.SpotLight(0xc9b7ff, 900, 900, 1.4, 0.9, 1);
  movingLight4.position.set(0, 250, 0);

  scene.add(movingLight4);
  scene.add(movingLight4.target);


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
    max: 5000,
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


  //connection group
  connectionGroup = new THREE.Group();
  scene.add(connectionGroup);


  params.particleCount = particles.length;
}


function updateThree() {

  frameNumber++;


  //move lights
  const time = performance.now() * 0.001;


  //light 1
  movingLight.position.x = Math.sin(time * 0.35) * 330;
  movingLight.position.y = Math.cos(time * 0.28) * 240;
  movingLight.position.z = Math.cos(time * 0.35) * 330;

  movingLight.target.position.set(0, 0, 0);


  //light 2
  movingLight2.position.x = Math.cos(time * 0.42 + 1.5) * 320;
  movingLight2.position.y = Math.sin(time * 0.32 + 0.8) * 210;
  movingLight2.position.z = Math.sin(time * 0.42 + 2.0) * 300;

  movingLight2.target.position.set(0, 0, 0);


  //light 3
  movingLight3.position.x = Math.sin(time * 0.28 + 2.5) * 300;
  movingLight3.position.y = Math.cos(time * 0.38 + 1.0) * 260;
  movingLight3.position.z = Math.sin(time * 0.30 + 3.0) * 320;

  movingLight3.target.position.set(0, 0, 0);


  //light 4
  movingLight4.position.x = Math.cos(time * 0.22) * 230;
  movingLight4.position.y = Math.sin(time * 0.30) * 300;
  movingLight4.position.z = Math.cos(time * 0.26 + 2.0) * 230;

  movingLight4.target.position.set(0, 0, 0);


  updateFPS();
  updateParticleCount();


  //connections
  connectionGroup.visible = params.showConnections;
  connectionMaterial.opacity = params.lineOpacity;


  //particle interactions
  //only calculate every 2 frames
  interactionFrame++;

  if (interactionFrame >= 2) {
    applyParticleInteractions();
    interactionFrame = 0;
  }


  //update particles
  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
  }


  //connections
  //only rebuild connections every 2 frames
  connectionFrame++;

  if (params.showConnections && connectionFrame >= 2) {
    updateConnections();
    connectionFrame = 0;
  }


  //update cylinder positions
  //only update every 2 frames
  meshUpdateFrame++;

  if (meshUpdateFrame >= 2) {
    updateConnectionMeshes();
    meshUpdateFrame = 0;
  }


  params.particleCount = particles.length;
  params.lineCount = connectionGroup.children.length;
}


function updateParticleCount() {

  while (particles.length < params.numParticles) {
    particles.push(new Particle());
  }


  while (particles.length > params.numParticles) {
    const particle = particles.pop();
    particle.remove();
  }
}


function applyParticleInteractions() {

  const interactionDistance = params.interactionDistance;
  const interactionDistanceSquared = interactionDistance * interactionDistance;


  //particle pairs
  for (let i = 0; i < particles.length; i++) {

    const p1 = particles[i];


    for (let j = i + 1; j < particles.length; j++) {

      const p2 = particles[j];

      const distanceSquared = p1.pos.distanceToSquared(p2.pos);


      //repulsion
      if (distanceSquared < interactionDistanceSquared) {

        // prevent division by zero if particles overlap
        if (distanceSquared > 0.0001) {

          const distance = Math.sqrt(distanceSquared);


          // p1 away from p2
          direction.subVectors(p1.pos, p2.pos);
          direction.normalize();


          // stronger force when particles are closer
          const strength = (1 - distance / interactionDistance) * params.repulsionStrength;

          direction.multiplyScalar(strength);


          // apply equal and opposite forces
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
    return;
  }


  const connectionDistance = params.connectionDistance;
  const connectionDistanceSquared = connectionDistance * connectionDistance;


  for (let i = 0; i < particles.length; i++) {

    const p1 = particles[i];


    for (let j = i + 1; j < particles.length; j++) {

      const p2 = particles[j];

      const distanceSquared = p1.pos.distanceToSquared(p2.pos);


      if (distanceSquared < connectionDistanceSquared) {

        if (!p1.isConnectedTo(p2)) {

          const connected = addConnection(p1, p2);


          if (connected) {
            p1.addConnection(p2);
            p2.addConnection(p1);
          }
        }

      } else {

        if (p1.isConnectedTo(p2)) {

          p1.removeConnection(p2);
          p2.removeConnection(p1);
        }
      }
    }
  }
}


function addConnection(p1, p2) {

  //limit number of cylinder meshes
  const maxConnections = Math.min(params.maxLines, optimizedMaxLines);

  if (connectionGroup.children.length >= maxConnections) {
    return false;
  }


  // Distance between particles
  const distance = p1.pos.distanceTo(p2.pos);


  // Create a thin cylinder
  const geometry = new THREE.CylinderGeometry(0.18, 0.18, distance, 5);


  // Create connection mesh
  const cylinder = new THREE.Mesh(geometry, connectionMaterial);


  // Position between particles
  midpoint.addVectors(p1.pos, p2.pos).multiplyScalar(0.5);
  cylinder.position.copy(midpoint);


  // Point cylinder toward second particle
  connectionDirection.subVectors(p2.pos, p1.pos).normalize();
  cylinder.quaternion.setFromUnitVectors(up, connectionDirection);


  // Add to scene
  connectionGroup.add(cylinder);


  // Store the cylinder
  p1.connectionMeshes.set(p2, cylinder);
  p2.connectionMeshes.set(p1, cylinder);


  return true;
}


function updateConnectionMeshes() {

  for (const p1 of particles) {

    for (const [p2, cylinder] of p1.connectionMeshes) {

      // Prevent updating the same connection twice
      if (p1.id > p2.id) {
        continue;
      }


      // New distance
      const distance = p1.pos.distanceTo(p2.pos);


      // Scale the cylinder
      cylinder.scale.y = distance / cylinder.geometry.parameters.height;


      // New position
      midpoint.addVectors(p1.pos, p2.pos).multiplyScalar(0.5);
      cylinder.position.copy(midpoint);


      // New rotation
      connectionDirection.subVectors(p2.pos, p1.pos).normalize();
      cylinder.quaternion.setFromUnitVectors(up, connectionDirection);
    }
  }
}


// PARTICLE CLASS
class Particle {

  constructor() {

    //particle id
    this.id = nextParticleID;
    nextParticleID++;


    //position
    this.pos = new THREE.Vector3();


    this.pos.x = (Math.random() - 0.5) * params.worldSizeX;
    this.pos.y = (Math.random() - 0.5) * params.worldSizeY;
    this.pos.z = (Math.random() - 0.5) * params.worldSizeZ;


    //velocity
    this.vel = new THREE.Vector3((Math.random() - 0.5) * params.speed, (Math.random() - 0.5) * params.speed, (Math.random() - 0.5) * params.speed);


    //acceleration
    this.acc = new THREE.Vector3();


    //rotation
    this.rotation = new THREE.Vector3();

    this.rotationVelocity = new THREE.Vector3((Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01);


    //mass
    this.mass = 1;


    this.connections = new Set();
    this.connectionMeshes = new Map();


    //particle mesh
    this.mesh = getSphere();

    this.mesh.visible = false;

    scene.add(this.mesh);
  }


  //force
  applyForce(force) {

    this.acc.add(force.clone().divideScalar(this.mass));
  }


  update() {

    //random deviation
    if (params.randomness > 0) {

      this.vel.x += (Math.random() - 0.5) * 0.002 * params.randomness;
      this.vel.y += (Math.random() - 0.5) * 0.002 * params.randomness;
      this.vel.z += (Math.random() - 0.5) * 0.002 * params.randomness;
    }


    this.vel.add(this.acc);

    this.acc.set(0, 0, 0);


    this.limitSpeed(params.speed);


    this.pos.add(this.vel);


    this.bounce();


    this.mesh.position.copy(this.pos);


    this.rotation.x += this.rotationVelocity.x;
    this.rotation.y += this.rotationVelocity.y;
    this.rotation.z += this.rotationVelocity.z;
  }


  limitSpeed(maxSpeed) {

    const speedSquared = this.vel.lengthSq();
    const maxSpeedSquared = maxSpeed * maxSpeed;


    if (speedSquared > maxSpeedSquared) {
      this.vel.setLength(maxSpeed);
    }
  }


  bounce() {

    const halfX = params.worldSizeX / 2;
    const halfY = params.worldSizeY / 2;
    const halfZ = params.worldSizeZ / 2;


    if (this.pos.x > halfX) {

      this.pos.x = halfX;
      this.vel.x *= -1;

    } else if (this.pos.x < -halfX) {

      this.pos.x = -halfX;
      this.vel.x *= -1;
    }


    if (this.pos.y > halfY) {

      this.pos.y = halfY;
      this.vel.y *= -1;

    } else if (this.pos.y < -halfY) {

      this.pos.y = -halfY;
      this.vel.y *= -1;
    }


    if (this.pos.z > halfZ) {

      this.pos.z = halfZ;
      this.vel.z *= -1;

    } else if (this.pos.z < -halfZ) {

      this.pos.z = -halfZ;
      this.vel.z *= -1;
    }
  }


  isConnectedTo(particle) {

    return this.connections.has(particle);
  }


  addConnection(particle) {

    this.connections.add(particle);
  }


  removeConnection(particle) {

    this.connections.delete(particle);


    const mesh = this.connectionMeshes.get(particle);


    if (mesh) {

      connectionGroup.remove(mesh);

      mesh.geometry.dispose();

      this.connectionMeshes.delete(particle);
    }
  }


  remove() {

    //remove particle mesh
    scene.remove(this.mesh);

    this.mesh.geometry.dispose();
    this.mesh.material.dispose();


    //remove all connection cylinders
    for (const mesh of this.connectionMeshes.values()) {

      connectionGroup.remove(mesh);

      mesh.geometry.dispose();
    }


    this.connectionMeshes.clear();
    this.connections.clear();
  }
}


function getSphere() {

  const geometry = new THREE.SphereGeometry(1, 6, 6);


  const material = new THREE.MeshStandardMaterial({
    color: 0x66748f,
    roughness: 0.18,
    metalness: 0.85
  });


  const mesh = new THREE.Mesh(geometry, material);


  mesh.scale.setScalar(params.particleSize);


  return mesh;
}


function updateFPS() {

  frameCount++;


  const currentTime = performance.now();


  if (currentTime - lastTime >= 1000) {

    params.fps = frameCount;

    frameCount = 0;

    lastTime = currentTime;
  }
}