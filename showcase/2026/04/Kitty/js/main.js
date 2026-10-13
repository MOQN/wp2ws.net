let params = {
  fps: 0,
  number: 7,
  segments: 6,
  radius: 200,
  rotationSpeed: 0.025,
  lightAndShadow: true,
  fogNear: 1000,
  fogFar: 3000,
  centerLightIntensity: 35,
  orbitSpotLight1Speed: 0.0005,
  orbitSpotLight2Speed: 0.0005,
  flicker: false
};

let units = [];
let particles = [];

let previousNumber = -1;
let previousSegments = -1;
let previousLightAndShadow = true;

let previousParticleTime = 0;

let ambiLight;
let hemiLight;

let centerLight;
let centerLightMesh;

let leftSpotLight;
let rightSpotLight;
let leftTarget;
let rightTarget;

let orbitSpotLight1;
let orbitTarget1;

let orbitSpotLight2;
let orbitTarget2;

function setupThree() {
  scene.background = new THREE.Color(0x010119);
  scene.fog = new THREE.Fog(0x010119, params.fogNear, params.fogFar);

  pane.addBinding(params, "number", {min: 1, max: 20, step: 1});
  pane.addBinding(params, "segments", {min: 1, max: 12, step: 1});
  pane.addBinding(params, "radius", {min: 100, max: 1000, step: 10});
  pane.addBinding(params, "rotationSpeed", {min: 0, max: 0.08, step: 0.001});
  pane.addBinding(params, "lightAndShadow", {label: "lightAndShadow"});
  pane.addBinding(params, "fogNear", {min: 0, max: 1750, step: 10});
  pane.addBinding(params, "fogFar", {min: 2000, max: 5000, step: 10});
  pane.addBinding(params, "centerLightIntensity", {min: 0, max: 100, step: 1});
  pane.addBinding(params, "orbitSpotLight1Speed", {min: 0, max: 0.003, step: 0.0001});
  pane.addBinding(params, "orbitSpotLight2Speed", {min: 0, max: 0.003, step: 0.0001});
  pane.addBinding(params, "flicker");

  ambiLight = new THREE.AmbientLight(0x333333);
  scene.add(ambiLight);

  hemiLight = new THREE.HemisphereLight(0x001f99, 0x000000, 1);
  scene.add(hemiLight);

  leftTarget = new THREE.Object3D();
  leftTarget.position.set(0, 0, 0);
  scene.add(leftTarget);

  leftSpotLight = getSpotLight();
  leftSpotLight.color.set(0x1ae0dc);
  leftSpotLight.intensity = 6;
  leftSpotLight.distance = 2500;
  leftSpotLight.angle = 0.5;
  leftSpotLight.penumbra = 0.8;
  leftSpotLight.decay = 0.01;
  leftSpotLight.position.set(300, 300, params.radius * 4);
  leftSpotLight.target = leftTarget;
  leftSpotLight.castShadow = false;
  scene.add(leftSpotLight);

  rightTarget = new THREE.Object3D();
  rightTarget.position.set(0, 0, 0);
  scene.add(rightTarget);

  rightSpotLight = getSpotLight();
  rightSpotLight.color.set(0x1ae0dc);
  rightSpotLight.intensity = 4;
  rightSpotLight.distance = 2500;
  rightSpotLight.angle = 1;
  rightSpotLight.penumbra = 0.8;
  rightSpotLight.decay = 0.01;
  rightSpotLight.position.set(300, 300, -params.radius * 4);
  rightSpotLight.target = rightTarget;
  rightSpotLight.castShadow = false;
  scene.add(rightSpotLight);

  orbitTarget1 = new THREE.Object3D();
  orbitTarget1.position.set(0, 0, 0);
  scene.add(orbitTarget1);

  orbitSpotLight1 = getSpotLight();
  orbitSpotLight1.color.set(0xd7a8ff);
  orbitSpotLight1.intensity = 12;
  orbitSpotLight1.distance = 5000;
  orbitSpotLight1.angle = 0.5;
  orbitSpotLight1.penumbra = 0.8;
  orbitSpotLight1.decay = 0.01;
  orbitSpotLight1.position.set(params.radius * 6, 0, 0);
  orbitSpotLight1.target = orbitTarget1;
  orbitSpotLight1.castShadow = true;
  scene.add(orbitSpotLight1);

  orbitTarget2 = new THREE.Object3D();
  orbitTarget2.position.set(0, 0, 0);
  scene.add(orbitTarget2);

  orbitSpotLight2 = getSpotLight();
  orbitSpotLight2.color.set(0xd7a8ff);
  orbitSpotLight2.intensity = 12;
  orbitSpotLight2.distance = 5000;
  orbitSpotLight2.angle = 0.5;
  orbitSpotLight2.penumbra = 0.8;
  orbitSpotLight2.decay = 0.1;
  orbitSpotLight2.position.set(0, 0, params.radius * 6);
  orbitSpotLight2.target = orbitTarget2;
  orbitSpotLight2.castShadow = true;
  scene.add(orbitSpotLight2);

  centerLight = getPointLight();
  centerLight.color.set(0xe13884);
  centerLight.intensity = 10;
  centerLight.distance = 500;
  centerLight.decay = 0.2;
  centerLight.position.set(0, 0, 0);
  centerLight.castShadow = true;
  scene.add(centerLight);

  centerLightMesh = getSphere();
  centerLightMesh.material.color.set(0xe13884);
  centerLightMesh.material.opacity = 0.5;
  centerLightMesh.scale.set(45, 45, 45);
  centerLight.add(centerLightMesh);
}

function updateThree() {
  scene.fog.near = params.fogNear;
  scene.fog.far = params.fogFar;

  if (params.lightAndShadow !== previousLightAndShadow) {
    if (params.lightAndShadow) {
      scene.background = new THREE.Color(0x010119);
      scene.fog.color.set(0x010119);
      ambiLight.visible = true;
      hemiLight.visible = true;
      leftSpotLight.visible = true;
      rightSpotLight.visible = true;
      orbitSpotLight1.visible = true;
      orbitSpotLight2.visible = true;
      centerLight.visible = true;
    } else {
      scene.background = new THREE.Color(0xffffff);
      scene.fog.color.set(0xffffff);
      ambiLight.visible = false;
      hemiLight.visible = false;
      leftSpotLight.visible = false;
      rightSpotLight.visible = false;
      orbitSpotLight1.visible = false;
      orbitSpotLight2.visible = false;
      centerLight.visible = false;
    }

    for (let i = units.length - 1; i >= 0; i--) {
      scene.remove(units[i].mesh);
    }
    units = [];
    previousNumber = -1;
    previousSegments = -1;
    previousLightAndShadow = params.lightAndShadow;
  }

  if (params.number !== previousNumber || params.segments !== previousSegments ) {
    for (let i = units.length - 1; i >= 0; i--) {
      scene.remove(units[i].mesh);
    }
    units = [];
    for (let segment = 0; segment < params.segments; segment++) {
      for (let i = 0; i < params.number; i++) {
        const unit = new Unit();
        unit.segmentIndex = segment;
        unit.unitIndex = i;
        units.push(unit);
      }
    }
    previousNumber = params.number;
    previousSegments = params.segments;
  }

  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    unit.setPosition();
    unit.rotate();
    unit.update();
  }

  if (params.lightAndShadow) {
    if (time - previousParticleTime > 350) {
      emitParticles();
      previousParticleTime = time;
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    if (particles[i].isDead()) {
      particles[i].remove();
      particles.splice(i, 1);
    }
  }

  if (params.lightAndShadow) {
    const baseCoreSize = params.radius * 0.1;
    const coreSize = baseCoreSize * (1 + Math.sin(time * 0.003 + Math.PI / 2) * 0.2);
    centerLightMesh.scale.set(coreSize, coreSize, coreSize);
    centerLight.intensity = params.centerLightIntensity + Math.sin(time * 0.0015) * 20;
    centerLight.position.y = Math.sin(time * 0.0015) * params.radius * 0.4;

    if (params.flicker) {
      const leftFlicker = Math.sin(time * 0.01) * 0.5 + Math.cos(time * 0.03) * 0.3;
      const rightFlicker = Math.sin(time * 0.01 + Math.PI) * 0.5 + Math.cos(time * 0.03) * 0.3;
      leftSpotLight.intensity = 4 + leftFlicker * 5;
      rightSpotLight.intensity = 2 + rightFlicker * 5;
    } 

    leftTarget.position.x = Math.sin(time * 0.0005) * 150;
    leftTarget.position.y = Math.cos(time * 0.0005) * 150;
    leftTarget.position.z = Math.sin(time * 0.0005) * 150;

    rightTarget.position.x = Math.sin(time * 0.0005 + Math.PI) * 150;
    rightTarget.position.y = Math.cos(time * 0.0005 + Math.PI) * 150;
    rightTarget.position.z = Math.sin(time * 0.0005 + Math.PI) * 150;

    const orbitRadius = params.radius * 6;
    orbitSpotLight1.position.x = Math.cos(time * params.orbitSpotLight1Speed) * orbitRadius;
    orbitSpotLight1.position.y = Math.sin(time * params.orbitSpotLight1Speed) * orbitRadius;
    orbitSpotLight1.position.z = 0;
    orbitTarget1.position.set(0, 0, 0);

    orbitSpotLight2.position.x = 0;
    orbitSpotLight2.position.y = Math.sin(time * params.orbitSpotLight2Speed) * orbitRadius;
    orbitSpotLight2.position.z = Math.cos(time * params.orbitSpotLight2Speed) * orbitRadius;
    orbitTarget2.position.set(0, 0, 0);

    const spotAngle = THREE.MathUtils.mapLinear(params.radius, 100, 1000, 0.3, 1.1);
    leftSpotLight.angle = THREE.MathUtils.clamp(spotAngle, 0.3, 1.1);
    rightSpotLight.angle = THREE.MathUtils.clamp(spotAngle, 0.3, 1.1);
    orbitSpotLight1.angle = THREE.MathUtils.clamp(spotAngle, 0.3, 1.1);
    orbitSpotLight2.angle = THREE.MathUtils.clamp(spotAngle, 0.3, 1.1);
  }
}

function emitParticles() {
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    if (unit.mesh.scale.y > 1) {
      const position = new THREE.Vector3();
      unit.topPointLight.getWorldPosition(position);
      const particle = new Particle(position);
      particles.push(particle);
    }
  }
}

function getPointLight() {
  const light = new THREE.PointLight(0xffffff);
  light.castShadow = false;
  return light;
}

function getSpotLight() {
  const light = new THREE.SpotLight(0xffffff);
  light.castShadow = false;
  return light;
}

function getBox() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhongMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 16);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getCylinder() {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 32);
  const material = new THREE.MeshPhongMaterial();
  const mesh = new THREE.Mesh( geometry, material );
  return mesh;
}

function getTriangularPrism() {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 3);
  const material = new THREE.MeshPhongMaterial();
  const mesh = new THREE.Mesh( geometry, material );
  return mesh;
}

function getUnit() {
  const group = new THREE.Group();
  const bottomColor = new THREE.Color("#e13884");
  const topColor = new THREE.Color("#b8eaff");
  const totalHeight = 650;

  let material;
  if (params.lightAndShadow) {
    material =
      new THREE.MeshPhongMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        shininess: 80,
        specular: 0x444444,
        emissive: 0xa6e9f2,
        emissiveIntensity: 0.07,
      });
  } else {
    material =
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
  }

  const bottomSphere = getSphere();
  bottomSphere.material = material;
  bottomSphere.scale.set(30, 30, 30);
  group.add(bottomSphere);

  const square1 = getBox();
  square1.material = material;
  square1.geometry.rotateZ(Math.PI / 4);
  square1.scale.set(100, 130, 10);
  square1.position.y = 120;
  group.add(square1);

  const square2 = getBox();
  square2.material = material;
  square2.geometry.rotateZ(Math.PI / 4);
  square2.scale.set(100, 130, 10);
  square2.position.y = 120;
  square2.rotation.y = Math.PI / 3;
  group.add(square2);

  const square3 = getBox();
  square3.material = material;
  square3.geometry.rotateZ(Math.PI / 4);
  square3.scale.set(100, 130, 10);
  square3.position.y = 120;
  square3.rotation.y = Math.PI * 2 / 3;
  group.add(square3);

  const circle1 = getCylinder();
  circle1.material = material;
  circle1.geometry.rotateX(Math.PI / 2);
  circle1.scale.set(80, 80, 8);
  circle1.position.y = 260;
  circle1.rotation.y = Math.PI / 6;
  group.add(circle1);

  const circle2 = getCylinder();
  circle2.material = material;
  circle2.geometry.rotateX(Math.PI / 2);
  circle2.scale.set(80, 80, 8);
  circle2.position.y = 260;
  circle2.rotation.y = Math.PI / 2;
  group.add(circle2);

  const circle3 = getCylinder();
  circle3.material = material;
  circle3.geometry.rotateX(Math.PI / 2);
  circle3.scale.set(80, 80, 8);
  circle3.position.y = 260;
  circle3.rotation.y = Math.PI * 5 / 6;
  group.add(circle3);

  const triangle1 = getTriangularPrism();
  triangle1.material = material;
  triangle1.geometry.rotateX(Math.PI * 1.5);
  triangle1.scale.set(90, 245, 10);
  triangle1.position.y = 400;
  triangle1.rotation.y = 0;
  group.add(triangle1);

  const triangle2 = getTriangularPrism();
  triangle2.material = material;
  triangle2.geometry.rotateX(Math.PI * 1.5);
  triangle2.scale.set(90, 245, 10);
  triangle2.position.y = 400;
  triangle2.rotation.y = Math.PI / 3;
  group.add(triangle2);

  const triangle3 = getTriangularPrism();
  triangle3.material = material;
  triangle3.geometry.rotateX(Math.PI * 1.5);
  triangle3.scale.set(90, 245, 10);
  triangle3.position.y = 400;
  triangle3.rotation.y = Math.PI * 2 / 3;
  group.add(triangle3);

  if (params.lightAndShadow) {
    const topPointLight = getPointLight();
    topPointLight.color.set(0xb8eaff);
    topPointLight.intensity = 0.6;
    topPointLight.distance = 250;
    topPointLight.decay = 1.5;
    topPointLight.position.y = 640;

    const topPointLightMesh = getSphere();
    topPointLightMesh.material.color.set(0xb8eaff);
    topPointLightMesh.material.opacity = 0.5;
    topPointLightMesh.scale.set(14, 14, 14);
    topPointLight.add(topPointLightMesh);

    group.add(topPointLight);

    group.userData.topPointLight = topPointLight;
    group.userData.topPointLightMesh = topPointLightMesh;
  } else {
    const topSphere = getSphere();
    topSphere.material = material;
    topSphere.scale.set(20, 20, 20);
    topSphere.position.y = 640;
    group.add(topSphere);
  }

  /***/
  group.updateMatrixWorld(true);
  group.traverse(function(mesh) {
    if (mesh.isMesh) {
      if (params.lightAndShadow) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      } else {
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
      const positions = mesh.geometry.attributes.position;
      const colors = new THREE.Float32BufferAttribute( new Float32Array( positions.count * 3 ), 3 );
      const vertex = new THREE.Vector3();
      const tempColor = new THREE.Color();
      for ( let i = 0; i < positions.count; i++) {
        vertex.set(positions.getX(i), positions.getY(i), positions.getZ(i)
        );
        vertex.applyMatrix4(mesh.matrixWorld);
        const percentage = THREE.MathUtils.clamp(vertex.y / totalHeight, 0, 1 );
        tempColor.copy(bottomColor) .lerp(topColor, percentage);
        colors.setXYZ( i, tempColor.r, tempColor.g, tempColor.b );
      }
      mesh.geometry.setAttribute("color", colors);
    }
  });
  /***/

  return group;
}

class Unit {
  constructor() {
    this.mesh = getUnit();
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.direction = new THREE.Vector3();
    this.spin = 0;
    this.topPointLight = this.mesh.userData.topPointLight;
    this.topPointLightMesh = this.mesh.userData.topPointLightMesh;
  }
  setPosition() {
    let percentage;
    if (params.number === 1) {
      percentage = 0.5;
    } else {
      percentage = this.unitIndex / (params.number - 1);}
    const arcAngle = percentage * Math.PI;
    const segmentAngle = (this.segmentIndex / params.segments) * Math.PI * 2;
    const circleRadius = Math.sin(arcAngle) * params.radius;
    const x = Math.cos(segmentAngle) * circleRadius;
    const y = Math.sin(segmentAngle) * circleRadius;
    const z = Math.cos(arcAngle) * params.radius;
    this.pos.set(x, y, z);
    this.setDirection(x, y, z);
  }
  setDirection(x, y, z) {
    this.direction.set(x, y, z).normalize();
  }
  rotate() {
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.direction);
    this.spin += params.rotationSpeed
    this.mesh.rotateY(this.spin);
  }
  update() {
    const wave = (Math.sin(this.pos.x * 0.01 - time * 0.0015) + Math.sin(this.pos.y * 0.01 - time * 0.0015) + Math.cos(this.pos.z * 0.01 - time * 0.0015)) / 3;
    this.mesh.scale.y = 1 + wave * 0.25
    if (params.lightAndShadow && this.topPointLight) {
      const tipLightIntensity = 0.6 + wave * 0.4;
      this.topPointLight.intensity = tipLightIntensity;
      const tipLightOpacity = 0.5 + wave * 0.3;
      this.topPointLightMesh.material.opacity = tipLightOpacity;
      const tipLightScale = 14 + wave * 6;
      this.topPointLightMesh.scale.set(tipLightScale, tipLightScale, tipLightScale);
    }
  }
}

class Particle {
  constructor(position) {
    this.mesh = getSphere();
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.pos.copy(position);
    this.vel = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    this.vel.normalize();
    const speed = 2 + Math.random() * 5;
    this.vel.multiplyScalar(speed);
    this.lifespan = 1;
    this.lifeReduction = 0.01 + Math.random() * 0.01;
    this.baseScale = 4 + Math.random() * 8;
    const colorMix = Math.random();
    const color1 = new THREE.Color(0xb8eaff);
    const color2 = new THREE.Color(0xd7a8ff);
    const particleColor = color1.lerp(color2, colorMix);
    this.mesh.material = new THREE.MeshBasicMaterial({
      color: particleColor,
      transparent: true,
      opacity: 0.8
    });
    this.mesh.scale.set(this.baseScale,this.baseScale,this.baseScale);
  }
  update() {
    this.pos.add(this.vel);
    this.vel.multiplyScalar(0.96);
    this.lifespan -= this.lifeReduction;
    this.scale = this.baseScale * this.lifespan;
    this.mesh.scale.set(this.scale, this.scale, this.scale);
    this.mesh.material.opacity = this.lifespan;
  }
  isDead() {
    return this.lifespan <= 0;
  }
  remove() {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}