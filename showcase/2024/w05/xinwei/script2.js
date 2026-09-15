export class Bellwether {
  constructor() {
    const geometry = new THREE.CylinderGeometry(1, 30, 50, 12);
    geometry.rotateX(THREE.Math.degToRad(90));
    const color = new THREE.Color(0x228b22);
    const material = new THREE.MeshLambertMaterial({
      color: color,
      visible: false });

    this.mesh = new THREE.Mesh(geometry, material);
    const radius = getRandomNum(1000, 200);
    const theta = THREE.Math.degToRad(getRandomNum(180));
    const phi = THREE.Math.degToRad(getRandomNum(360));
    this.mesh.position.x = Math.sin(theta) * Math.cos(phi) * radius;
    this.mesh.position.y = Math.sin(theta) * Math.sin(phi) * radius;
    this.mesh.position.z = Math.cos(theta) * radius;
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.timeX = getRandomNum(10, 0) * 0.1;
    this.timeY = getRandomNum(10, 0) * 0.1;
    this.timeZ = getRandomNum(10, 0) * 0.1;
    this.maxSpeed = 45;
    this.separateMaxSpeed = 30;
    this.separateMaxForce = 30;
  }

  applyForce(f) {
    this.acceleration.add(f.clone());
  }

  update() {
    const maxSpeed = this.maxSpeed;

    // update velocity
    this.velocity.add(this.acceleration);

    // limit velocity
    if (this.velocity.length() > maxSpeed) {
      this.velocity.clampLength(0, maxSpeed);
    }

    // update position
    this.mesh.position.add(this.velocity);

    // reset acc
    this.acceleration.multiplyScalar(0);

    // head
    const head = this.velocity.clone();
    head.multiplyScalar(10);
    head.add(this.mesh.position);
    this.mesh.lookAt(head);

  }

  randomWalk() {
    const acc = new THREE.Vector3();
    this.timeX += this.getRandAddTime();
    this.timeY += this.getRandAddTime();
    this.timeZ += this.getRandAddTime();
    acc.x = Math.cos(this.timeX) * 10;
    acc.y = Math.sin(this.timeY) * 10;
    acc.z = Math.sin(this.timeZ) * 10;
    acc.normalize();
    acc.multiplyScalar(2);
    this.applyForce(acc);
  }

  spiralWalk() {
    this.timeX += 0.12;
    this.timeY += 0.012;
    this.timeZ += 0.0135;
    let baseRadius = 200;

    let acc = new THREE.Vector3();
    let theta1 = Math.cos(this.timeY);
    let theta2 = Math.sin(this.timeY);

    let radius1 = baseRadius * theta1;
    let radius2 = baseRadius * theta2;
    acc.x = Math.cos(this.timeX) * radius1 + Math.cos(this.timeZ) * baseRadius;
    acc.y = Math.cos(this.timeX) * radius2 + Math.sin(this.timeZ) * baseRadius;
    acc.z = Math.sin(this.timeX) * baseRadius;
    this.applyForce(acc);
  }

  getRandAddTime() {
    let randNum = getRandomNum(100, 0);
    let time = 0;
    if (randNum > 90) {
      time = getRandomNum(100, 0) * 0.01;
      if (getRandomNum(10) > 5) {
        time *= -1;
      }
    }
    return time;
  }

  getAvoidVector(wall = new THREE.Vector3()) {
    this.mesh.geometry.computeBoundingSphere();
    const boundingSphere = this.mesh.geometry.boundingSphere;

    const toMeVector = new THREE.Vector3();
    toMeVector.subVectors(this.mesh.position, wall);

    const distance = toMeVector.length() - boundingSphere.radius * 2;
    const steerVector = toMeVector.clone();
    steerVector.normalize();
    steerVector.multiplyScalar(1 / Math.pow(distance, 2));
    return steerVector;
  }

  avoidBoxContainer(rangeWidth = 80, rangeHeight = 80, rangeDepth = 80) {
    const sumVector = new THREE.Vector3();
    sumVector.add(this.getAvoidVector(new THREE.Vector3(rangeWidth, this.mesh.position.y, this.mesh.position.z)));
    sumVector.add(this.getAvoidVector(new THREE.Vector3(-rangeWidth, this.mesh.position.y, this.mesh.position.z)));
    // sumVector.add(this.getAvoidVector(new THREE.Vector3(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z)));
    sumVector.add(this.getAvoidVector(new THREE.Vector3(this.mesh.position.x, rangeHeight, this.mesh.position.z)));
    sumVector.add(this.getAvoidVector(new THREE.Vector3(this.mesh.position.x, -rangeHeight, this.mesh.position.z)));
    sumVector.add(this.getAvoidVector(new THREE.Vector3(this.mesh.position.x, this.mesh.position.y, rangeDepth)));
    sumVector.add(this.getAvoidVector(new THREE.Vector3(this.mesh.position.x, this.mesh.position.y, -rangeDepth)));
    sumVector.multiplyScalar(Math.pow(this.velocity.length(), 4));
    return sumVector;
  }

  avoidDust(dusts) {

    const sumVector = new THREE.Vector3();
    let cnt = 0;
    const maxSpeed = this.separateMaxSpeed;
    const maxForce = this.separateMaxForce;
    const steerVector = new THREE.Vector3();

    dusts.forEach(dust => {
      const effectiveRange = dust.geometry.boundingSphere.radius + 600;
      const dist = this.mesh.position.distanceTo(dust.position);
      if (dist > 0 && dist < effectiveRange) {
        let toMeVector = new THREE.Vector3();
        toMeVector.subVectors(this.mesh.position, dust.position);
        toMeVector.normalize();
        toMeVector.divideScalar(Math.pow(dist, 4));
        sumVector.add(toMeVector);
        cnt++;
      }
    });

    if (cnt > 0) {
      sumVector.divideScalar(cnt);
      sumVector.normalize();
      sumVector.multiplyScalar(maxSpeed);

      steerVector.subVectors(sumVector, this.velocity);
      // limit force
      if (steerVector.length() > maxForce) {
        steerVector.clampLength(0, maxForce);
      }
    }

    return steerVector;

  }}



export class Escaper {
  constructor() {
    const geometry = new THREE.CylinderGeometry(1, 24, 60, 12);
    geometry.rotateX(THREE.Math.degToRad(90));
    //const color = new THREE.Color(`hsl(${getRandomNum(360)}, 100%, 50%)`);
    const color = new THREE.Color(0xff0000);
    const material = new THREE.MeshLambertMaterial({
      wireframe: false,
      color: color, 
      visible:false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    const radius = getRandomNum(100);
    const theta = THREE.Math.degToRad(getRandomNum(180));
    const phi = THREE.Math.degToRad(getRandomNum(360));
    this.mesh.position.x = Math.sin(theta) * Math.cos(phi) * radius;
    this.mesh.position.y = Math.sin(theta) * Math.sin(phi) * radius;
    this.mesh.position.z = Math.cos(theta) * radius;
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.maxSpeed = 40;
    this.seekMaxSpeed = 40;
    this.seekMaxForce = 1.0;
  }

  applyForce(f) {
    this.acceleration.add(f.clone());
  }

  update() {
    const maxSpeed = this.maxSpeed;

    // update velocity
    this.velocity.add(this.acceleration);

    // limit velocity
    if (this.velocity.length() > maxSpeed) {
      this.velocity.clampLength(0, maxSpeed);
    }

    // update position
    this.mesh.position.add(this.velocity);

    // reset acc
    this.acceleration.multiplyScalar(0);

    // head
    const head = this.velocity.clone();
    head.multiplyScalar(10);
    head.add(this.mesh.position);
    this.mesh.lookAt(head);

  }

  seek(target = new THREE.Vector3()) {
    const maxSpeed = this.seekMaxSpeed;
    const maxForce = this.seekMaxForce;
    const toGoalVector = new THREE.Vector3();
    toGoalVector.subVectors(target, this.mesh.position);
    // const distance = toGoalVector.length();
    toGoalVector.normalize();
    toGoalVector.multiplyScalar(maxSpeed);
    const steerVector = new THREE.Vector3();
    steerVector.subVectors(toGoalVector, this.velocity);
    // limit force
    if (steerVector.length() > maxForce) {
      steerVector.clampLength(0, maxForce);
    }
    return steerVector;
  }}



export class Chaser {
  constructor() {
    const geometry = new THREE.CylinderGeometry(1, 10, 50, 12);
    geometry.rotateX(THREE.Math.degToRad(90));
    
    // const color = new THREE.Color(`hsl(${getRandomNum(360)}, ${0}%, ${getRandomNum(100, 15)}%)`);
    const hue = getRandomNum(40, 0);  // Red to yellow
    const saturation = 100;  // Full saturation
    const lightness = getRandomNum(70, 50);  // Random lightness between 50% and 70%
    
    const color = new THREE.Color(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    
    const material = new THREE.MeshLambertMaterial({
      wireframe: false,
      color: color });

    this.mesh = new THREE.Mesh(geometry, material);
    const radius = 1000;
    const theta = THREE.Math.degToRad(getRandomNum(180));
    const phi = THREE.Math.degToRad(getRandomNum(360));
    this.mesh.position.x = Math.sin(theta) * Math.cos(phi) * radius;
    this.mesh.position.y = Math.sin(theta) * Math.sin(phi) * radius;
    this.mesh.position.z = Math.cos(theta) * radius;
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.maxSpeed = 50;
    this.seekMaxSpeed = getRandomNum(50, 35);
    this.seekMaxForce = getRandomNum(20, 10) * 0.1;
    this.separateMaxSpeed = getRandomNum(120, 100);
    this.separateMaxForce = getRandomNum(70, 30) * 0.1;
  }

  applyForce(f) {
    this.acceleration.add(f.clone());
  }

  update() {
    const maxSpeed = this.maxSpeed;

    // update velocity
    this.velocity.add(this.acceleration);

    // limit velocity
    if (this.velocity.length() > maxSpeed) {
      this.velocity.clampLength(40, maxSpeed);
    }

    // update position
    this.mesh.position.add(this.velocity);

    // reset acc
    this.acceleration.multiplyScalar(0);

    // head
    const head = this.velocity.clone();
    head.multiplyScalar(10);
    head.add(this.mesh.position);
    this.mesh.lookAt(head);

  }

  seek(target = new THREE.Vector3()) {
    const maxSpeed = this.seekMaxSpeed;
    const maxForce = this.seekMaxForce;
    const toGoalVector = new THREE.Vector3();
    toGoalVector.subVectors(target, this.mesh.position);
    toGoalVector.normalize();
    toGoalVector.multiplyScalar(maxSpeed);
    const steerVector = new THREE.Vector3();
    steerVector.subVectors(toGoalVector, this.velocity);
    // limit force
    if (steerVector.length() > maxForce) {
      steerVector.clampLength(0, maxForce);
    }
    return steerVector;
  }

  separate(creatures) {
    const sumVector = new THREE.Vector3();
    let cnt = 0;
    const maxSpeed = this.separateMaxSpeed;
    const maxForce = this.separateMaxForce;
    const effectiveRange = 30;
    const steerVector = new THREE.Vector3();
    
    creatures.forEach(creature => {
      const dist = this.mesh.position.distanceTo(creature.mesh.position);
      if (dist > 0 && dist < effectiveRange) {
        let toMeVector = new THREE.Vector3();
        toMeVector.subVectors(this.mesh.position, creature.mesh.position);
        toMeVector.normalize();
        toMeVector.divideScalar(Math.pow(dist, 2));
        sumVector.add(toMeVector);
        cnt++;
      }
    });

    if (cnt > 0) {
      sumVector.divideScalar(cnt);
      sumVector.normalize();
      sumVector.multiplyScalar(maxSpeed);

      steerVector.subVectors(sumVector, this.velocity);
      // limit force
      if (steerVector.length() > maxForce) {
        steerVector.clampLength(0, maxForce);
      }
    }

    return steerVector;
  }}


