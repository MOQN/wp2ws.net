// import { Bellwether, Chaser, Escaper } from './script2.js';

let scene, renderer,render,composer;
let boxContainer, bellwether,escaper;
let dustParticles,chaseCameralet,ambientLight,directionalLight,chaserLight;
let chaser;
let renderTarget, quadScene, quadCamera, quadMesh;

const colorPalette = {
  screenBg: 0x00bfff,  // Semi-transparent water color
  ambientLight: 0x777777,
  directionalLight: 0xffffff
};





function initThree(){
  scene = new THREE.Scene();
  // scene.fog = new THREE.Fog(colorPalette.screenBg, 1200, 20000);
  scene.fog = new THREE.Fog(0x00bfff, 1200, 20000); 
  // /* box for border
  // -------------------------------------------------------------*/
  boxContainer = new BoxContainer(20000, 20000, 20000);
  scene.add(boxContainer.mesh);
  
  
  /* bellwether
  -------------------------------------------------------------*/
  bellwether = new Bellwether();
  scene.add(bellwether.mesh);
  
  /* escaper
  -------------------------------------------------------------*/
  escaper = new Escaper();
  escaper.mesh.geometry.computeBoundingSphere();
  scene.add(escaper.mesh);
  
  dustParticles = new DustParticles(150);
  
  /* camera
  -------------------------------------------------------------*/
  chaseCamera = new ChaseCamera();
  scene.add(chaseCamera.camera);
  /* chaser
  -------------------------------------------------------------*/
chaserGroup = new THREE.Group();
for (let i = 0; i < 300; i++) {
  chaser = new Chaser();
  chaser.mesh.geometry.computeBoundingSphere();
  chasers.push(chaser);
  chaserGroup.add(chaser.mesh);
}
scene.add(chaserGroup);
/* Point Light for Chasers
-------------------------------------------------------------*/
chaserLight = new THREE.PointLight(0xffffff, 2, 5000); // White light, high intensity, limited range
// chaserLight.position.set(500, 1000, 500); // Initial position (it will be updated)
scene.add(chaserLight);

/* dustParticles
-------------------------------------------------------------*/
dustParticles.wrap.children.forEach(dust => {
  dust.geometry.computeBoundingSphere();
});
scene.add(dustParticles.wrap);


// oceanMaterial = new THREE.ShaderMaterial({
//   vertexShader: oceanVertexShader,
//   fragmentShader: oceanFragmentShader,
//   transparent: true,
//   uniforms: {
//     uTime: { value: 0 },
//     uColor: { value: new THREE.Color(0x00bfff) } // Water color
//   }
// });

// oceanGeometry = new THREE.PlaneGeometry(40000, 40000, 200, 200); // Large plane for the ocean
// oceanMesh = new THREE.Mesh(oceanGeometry, oceanMaterial);
// oceanMesh.rotation.x = -Math.PI / 2; // Rotate to lay flat
// // oceanMesh.position.y = 200;
// scene.add(oceanMesh);

/* renderer
-------------------------------------------------------------*/
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
// renderer.setClearColor(new THREE.Color(colorPalette.screenBg));
renderer.setClearColor(new THREE.Color(0x00bfff), 0.75); 
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
/* AmbientLight
-------------------------------------------------------------*/
ambientLight = new THREE.AmbientLight(colorPalette.ambientLight);
ambientLight.intensity = 1.0;
scene.add(ambientLight);

/* DirectionalLight
-------------------------------------------------------------*/
directionalLight = new THREE.DirectionalLight(colorPalette.directionalLight, 1.0);
directionalLight.position.set(20000, 20000, 2000);
scene.add(directionalLight);
}



class DustParticles {
  constructor(num = 10) {
    this.num = num;
    this.wrap = new THREE.Object3D();
    for (let i = 0; i < this.num; i++) {
        const size = getRandomNum(800, 100);
        const geometry = new THREE.BoxGeometry(size, size, size);

        // Simple shader material for dust particles
        const material = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
    varying vec2 vUv;

    // Function to generate a pseudo-random float based on coordinates
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main() {
        // Generate a random value based on UV coordinates
        float randValue = random(vUv);

        // Define green and yellow colors
        vec3 green = vec3(0.0, 1.0, 0.0);
        vec3 yellow = vec3(1.0, 1.0, 0.0);
        vec3 color;

        // Separate into two groups based on random value
        if (randValue < 0.5) {
            color = green;
        } else {
            color = yellow;
        }

        // Create a simple blur effect based on the distance from the center
        float dist = length(vUv - 0.5);
        float alpha = smoothstep(0.9, 0.0, dist);

        // Output the final color with alpha for transparency
        gl_FragColor = vec4(color, alpha);
    }
`,

        
        transparent: true
    });
        const mesh = new THREE.Mesh(geometry, material);
        const radius = getRandomNum(13000, 7000);
        const theta = THREE.Math.degToRad(getRandomNum(180));
        const phi = THREE.Math.degToRad(getRandomNum(360));
        mesh.position.x = Math.sin(theta) * Math.cos(phi) * radius;
        mesh.position.y = Math.sin(theta) * Math.sin(phi) * radius;
        mesh.position.z = Math.cos(theta) * radius;
        mesh.rotation.x = getRandomNum(360);
        mesh.rotation.y = getRandomNum(360);
        mesh.rotation.z = getRandomNum(360);
        this.wrap.add(mesh);
    }

  }}


class BoxContainer {
  constructor(width = 100, height = 100, depth = 100, color = 0x228b22) {
    const geometry = new THREE.BoxGeometry(width, height, depth, 10, 10, 10);
    const material = new THREE.MeshLambertMaterial({
      color: color,
      opacity: 1.0,
      wireframe: true,
      depthWrite: false,
      visible: false });

    this.mesh = new THREE.Mesh(geometry, material);
  }}



class ChaseCamera {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 20000);
    const radius = getRandomNum(2000);
    const theta = THREE.Math.degToRad(getRandomNum(180));
    const phi = THREE.Math.degToRad(getRandomNum(360));
    this.camera.position.x = Math.sin(theta) * Math.cos(phi) * radius;
    this.camera.position.y = Math.sin(theta) * Math.sin(phi) * radius;
    this.camera.position.z = Math.cos(theta) * radius;
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.maxSpeed = 40;
    this.seekMaxSpeed = 40;
    this.seekMaxForce = 4.0;
    this.time = getRandomNum(50) * 0.1;
    this.cameraWorkType = null;
    this.cameraDistanceMax = 2500;
    this.cameraDistanceMin = 200;
    this.cameraDistance = getRandomNum(this.cameraDistanceMax);
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
    this.camera.position.add(this.velocity);

    // reset acc
    this.acceleration.multiplyScalar(0);

  }

  seek(target = new THREE.Vector3()) {
    const maxSpeed = this.seekMaxSpeed;
    const maxForce = this.seekMaxForce;
    const toGoalVector = new THREE.Vector3();
    toGoalVector.subVectors(target, this.camera.position);
    const distance = toGoalVector.length();
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

  lookingZoomInOut(target, type) {
    if (type !== this.cameraWorkType) this.cameraWorkType = 'zoomInOut';
    const targetPos = target.mesh.position.clone();
    this.time += 0.01;
    this.time -= this.cameraDistance * 0.0000023;
    this.cameraDistance = 2000;
    // this.cameraDistance = this.cameraDistanceMax * Math.abs(Math.pow(Math.sin(this.time), 10)) + this.cameraDistanceMin;
    this.camera.position.x = targetPos.x;
    this.camera.position.y = targetPos.y;
    this.camera.position.z = targetPos.z + this.cameraDistance;
  }

  lookingAsChase(target, type) {
    const cameraTarget = new THREE.Vector3();
    const offsetTargetPos = target.velocity.clone();
    const escaperPos = target.mesh.position.clone();


    if (type === 'front') {
      offsetTargetPos.multiplyScalar(15);
      cameraTarget.addVectors(target.mesh.position, offsetTargetPos);
      this.setChasePosition(type, cameraTarget);
    } else if (type === 'back') {
      offsetTargetPos.multiplyScalar(-20);
      cameraTarget.addVectors(target.mesh.position, offsetTargetPos);
      this.setChasePosition(type, cameraTarget);
    }

    const seek = this.seek(cameraTarget);
    this.applyForce(seek);
  }

  setChasePosition(type, cameraTarget) {
    if (type !== this.cameraWorkType) {
      this.cameraWorkType = type;
      this.camera.position.set(cameraTarget.x, cameraTarget.y, cameraTarget.z);
      this.velocity = new THREE.Vector3();
    }
  }}

class Bellwether {
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
        }ambientLight.intensity = 0.2; // Lower the ambient light to make the environment darker
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
  
  
  

    class Escaper {
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
  
  
  
  class Chaser {
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
  
  
  

const gui = new dat.GUI();
const guiControls = new function () {
  this.cameraWork = 'zoomInOut';
}();
gui.add(guiControls, 'cameraWork', ['zoomInOut', 'front', 'back']).onChange(e => {
  currentCameraWork = e;
});







const getRandomNum = (max = 0, min = 0) => Math.floor(Math.random() * (max + 1 - min)) + min;
const chasers = [];
let chaserGroup;
let offsetPhase = getRandomNum(100, 0);
currentCameraWork = 'zoomInOut';

function updateThree(){
render = () => {

  /* bellwether
  ------------------------------------ */
  bellwether.randomWalk();
  // avoid wall
  bellwether.applyForce(bellwether.avoidBoxContainer(
  boxContainer.mesh.geometry.parameters.width / 2,
  boxContainer.mesh.geometry.parameters.height / 2,
  boxContainer.mesh.geometry.parameters.depth / 2));

  // avoid dust
  bellwether.applyForce(bellwether.avoidDust(dustParticles.wrap.children));
  //bellwether.spiralWalk();
  bellwether.update();

    

  /* escaper
  ------------------------------------ */
  const steer = escaper.seek(bellwether.mesh.position);
  escaper.applyForce(steer);
  escaper.update();

  /* chasers
  ------------------------------------ */
  // Calculate the center of the chaser group
const centerPosition = new THREE.Vector3();
chasers.forEach(chaser => {
    centerPosition.add(chaser.mesh.position);
});
centerPosition.divideScalar(chasers.length); // Average position of chasers

// Set the chaser light position to follow the chasers
chaserLight.position.copy(centerPosition);

  const offsetTarget1 = escaper.velocity.clone();
  const target = new THREE.Vector3();
  offsetTarget1.normalize();
  offsetPhase += 0.01;
  const offsetDistance = 200 * Math.abs(Math.sin(offsetPhase)) + 100;
  //let offsetDistance = 200;
  offsetTarget1.multiplyScalar(offsetDistance);
  target.subVectors(escaper.mesh.position, offsetTarget1);

  chasers.forEach(chaser => {
    let seek = chaser.seek(target);
    chaser.applyForce(seek);
    let separate1 = chaser.separate(chasers);
    chaser.applyForce(separate1);
    chaser.update();
  });


  /* front light
  ------------------------------------ */
  // Calculate a point in front of the camera, a certain distance away
const cameraDirection = new THREE.Vector3();
chaseCamera.camera.getWorldDirection(cameraDirection);

const lightOffsetDistance = 500; // Adjust distance as needed
const lightPosition = chaseCamera.camera.position.clone().add(cameraDirection.multiplyScalar(lightOffsetDistance));

// Set the chaser light to this position
chaserLight.position.copy(lightPosition);


  /* camera
  ------------------------------------ */
  if (currentCameraWork === 'zoomInOut') {
    chaseCamera.lookingZoomInOut(escaper, currentCameraWork);
  } else {
    chaseCamera.lookingAsChase(escaper, currentCameraWork);
    chaseCamera.update();
  }
  chaseCamera.camera.lookAt(escaper.mesh.position);



  /* shader
  ------------------------------------ */
  // const delta = 0.01; // 控制时间的变化速度，可以调节
  // dustParticles.update(delta);

  // // Render the scene
  // renderer.render(scene, chaseCamera.camera);
  // requestAnimationFrame(render);
  /* renderer
  ------------------------------------ */
  renderer.render(scene, chaseCamera.camera);
  requestAnimationFrame(render);
};
}

updateThree()
initThree()
const onResize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  chaseCamera.camera.aspect = width / height;
  chaseCamera.camera.updateProjectionMatrix();
};

window.addEventListener('resize', onResize);

document.getElementById('WebGL-output').appendChild(renderer.domElement);
render();

