let params = {
 fps: 0,
 near: 1,
 far: 2600,
 rainCount: 900,
 masterVolume: 0.7,
 pianoVolume: 0.45,
 rainVolume: 0.65,
 cityVolume: 0.3,
};


const WORLD_SIZE = 5000;
const WORLD_HALF = WORLD_SIZE / 2;
const FLOOR_POSITION = -200;
const COLOR_BG = 0x70757a;
const BUILDING_COLOR = 0x010203;
const MAX_RAINDROPS = 10000;
const RAIN_AREA = 5000;
const RAIN_HEIGHT = 1100;
const RAIN_SPEED = 8;


let plane;
let cubes = [];
const sideWindowPositions = [];
let rainMesh;
const raindrops = [];
let rainTransform;
let buildingMaterial;
let soundTracks = {};


function setupThree() {
 scene.background = new THREE.Color(COLOR_BG);
 buildingMaterial = new THREE.MeshPhongMaterial({
   color: BUILDING_COLOR
 });

 // FLOOR
 plane = getPlane(WORLD_HALF * 2 + 200, WORLD_HALF * 2 + 200);
 plane.position.y = FLOOR_POSITION;
 plane.rotation.x = PI / 2;
 scene.add(plane);


 // CUBES
 const distance = 220;
 for (let z = -WORLD_HALF; z <= WORLD_HALF; z += distance) {
   for (let x = -WORLD_HALF; x <= WORLD_HALF; x += distance) {
     const buildingWidth = random(90, 130);
     const buildingDepth = random(150, 210);
     const buildingHeight = random(0, 1500);
     let tCube = new Cube()
       .setPosition(x, FLOOR_POSITION, z)
       .setScale(buildingWidth, buildingHeight, buildingDepth)
       .setTranslation(0, 0.5, 0);
     cubes.push(tCube);
     addSideWindows(x, FLOOR_POSITION, z, buildingWidth, buildingDepth, buildingHeight);
   }
 }
 addSideWindowsMesh();
 scene.add(createViewRoom());
 const setViewMode = setupRoomView(scene, camera, controls, renderer.domElement);


 // LIGHTS
 const ambiLight = new THREE.AmbientLight(0x33333);
 scene.add(ambiLight);


 const hemiLight = new THREE.HemisphereLight(0xe0e0e0, 0x777777, 1);
 scene.add(hemiLight);

 createRain();
 setupSoundControls();


 // GUI
 const viewFolder = pane.addFolder({ title: "View", expanded: true });
 viewFolder.addButton({ title: "Cityview" }).on("click", () => setViewMode("city"));
 viewFolder.addButton({ title: "Roomview" }).on("click", () => setViewMode("room"));

 let folderFog = pane.addFolder({ title: "Fog", expanded: true });
 folderFog.addBinding(params, "near", { min: 1, max: 5000, step: 1 });
 folderFog.addBinding(params, "far", { min: 1, max: 5000, step: 1 });
 pane.addBinding(params, "rainCount", {
   label: "Raindrops",
   min: 0,
   max: MAX_RAINDROPS,
   step: 100
 });
}

function setupSoundControls() {
 soundTracks = {
   piano: createAudioTrack("audio/saturn-3-music-clair-de-lune-debussy-soft-piano-411227.mp3"),
   rain: createAudioTrack("audio/liecio-calming-rain-257596.mp3"),
   city: createAudioTrack("audio/cliffordjohnson-city-above-far-ambience-car-479129.mp3")
 };

 const soundFolder = pane.addFolder({ title: "Sound", expanded: true });
 soundFolder.addButton({ title: "Play all sounds" }).on("click", () => {
   Object.values(soundTracks).forEach((audio) => {
     audio.play().catch((error) => console.warn("Audio could not start:", error));
   });
 });
 soundFolder.addButton({ title: "Pause all sounds" }).on("click", () => {
   Object.values(soundTracks).forEach((audio) => audio.pause());
 });
 soundFolder.addBinding(params, "masterVolume", { label: "Master", min: 0, max: 1, step: 0.01 });
 soundFolder.addBinding(params, "pianoVolume", { label: "Piano", min: 0, max: 1, step: 0.01 });
 soundFolder.addBinding(params, "rainVolume", { label: "Rain", min: 0, max: 1, step: 0.01 });
 soundFolder.addBinding(params, "cityVolume", { label: "City ambience", min: 0, max: 1, step: 0.01 });
}

function createAudioTrack(source) {
 const audio = new Audio(source);
 audio.loop = true;
 audio.preload = "auto";
 return audio;
}

function updateSoundVolumes() {
 soundTracks.piano.volume = params.masterVolume * params.pianoVolume;
 soundTracks.rain.volume = params.masterVolume * params.rainVolume;
 soundTracks.city.volume = params.masterVolume * params.cityVolume;
}

function createRain() {
 rainTransform = new THREE.Object3D();
 const geometry = new THREE.SphereGeometry(1, 8, 6);
 const material = new THREE.MeshBasicMaterial({
   color: 0x8bbde8,
   transparent: true,
   opacity: 0.75,
   depthWrite: false
 });
 rainMesh = new THREE.InstancedMesh(geometry, material, MAX_RAINDROPS);
 rainMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 for (let i = 0; i < MAX_RAINDROPS; i++) {
   const drop = {
     x: (Math.random() - 0.5) * RAIN_AREA,
     y: FLOOR_POSITION + Math.random() * (RAIN_HEIGHT - FLOOR_POSITION),
     z: (Math.random() - 0.5) * RAIN_AREA
   };
   raindrops.push(drop);
   rainTransform.position.set(drop.x, drop.y, drop.z);
   rainTransform.scale.set(2, 18, 2);
   rainTransform.updateMatrix();
   rainMesh.setMatrixAt(i, rainTransform.matrix);
 }

 rainMesh.count = params.rainCount;
 rainMesh.instanceMatrix.needsUpdate = true;
 scene.add(rainMesh);
}

function updateRain() {
 const activeCount = Math.min(params.rainCount, MAX_RAINDROPS);
 rainMesh.count = activeCount;

 for (let i = 0; i < activeCount; i++) {
   const drop = raindrops[i];
   drop.y -= RAIN_SPEED;
   if (drop.y <= FLOOR_POSITION) {
     drop.x = (Math.random() - 0.5) * RAIN_AREA;
     drop.y = RAIN_HEIGHT;
     drop.z = (Math.random() - 0.5) * RAIN_AREA;
   }
   rainTransform.position.set(drop.x, drop.y, drop.z);
   rainTransform.scale.set(2, 18, 2);
   rainTransform.updateMatrix();
   rainMesh.setMatrixAt(i, rainTransform.matrix);
 }
 rainMesh.instanceMatrix.needsUpdate = true;
}

function addSideWindows(x, floorY, z, width, depth, height) {
 const windowWidth = Math.min(14, width * 0.16);
 const windowHeight = Math.min(18, height * 0.08);
 const columns = Math.max(3, Math.floor(width / 30));
 const rows = Math.max(2, Math.floor(height / 70));
 const sideOffset = depth / 2 + 0.6;

 for (const side of [-1, 1]) {
   for (let row = 0; row < rows; row++) {
     const windowY = floorY + (row + 0.5) * (height / rows) + windowHeight / 2;
     for (let column = 0; column < columns; column++) {
       const windowX = x - width / 2 + (column + 0.5) * (width / columns);
       sideWindowPositions.push({
         x: windowX,
         y: windowY,
         z: z + side * sideOffset,
         width: windowWidth,
         height: windowHeight,
         rotationY: side < 0 ? Math.PI : 0
       });
     }
   }
 }
}

function addSideWindowsMesh() {
 const material = new THREE.MeshBasicMaterial({ color: 0xFFA500 });
 const geometry = new THREE.PlaneGeometry(1, 1);
 const windows = new THREE.InstancedMesh(geometry, material, sideWindowPositions.length);
 const transform = new THREE.Object3D();

 sideWindowPositions.forEach((window, index) => {
   transform.position.set(window.x, window.y, window.z);
   transform.rotation.set(0, window.rotationY, 0);
   transform.scale.set(window.width, window.height, 1);
   transform.updateMatrix();
   windows.setMatrixAt(index, transform.matrix);
 });
 windows.instanceMatrix.needsUpdate = true;
 scene.add(windows);
}


function updateThree() {
 updateRain();
 updateSoundVolumes();

 // update fog
 scene.fog = new THREE.Fog(COLOR_BG, params.near, params.far);


 // update the objects
 for (let c of cubes) {
   //c.update();
 }


}


function getPlane(w, h) {
 const geometry = new THREE.PlaneGeometry(w, h, 32);
 const material = new THREE.MeshPhongMaterial({
   side: THREE.DoubleSide
 });
 const mesh = new THREE.Mesh(geometry, material);
 return mesh;
}


function getBox() {
 const geometry = new THREE.BoxGeometry(1, 1, 1);
 const mesh = new THREE.Mesh(geometry, buildingMaterial);
 return mesh;
}


class Cube {
 constructor() {
   this.mesh = getBox();
   scene.add(this.mesh);


   this.pos = this.mesh.position;
   this.vel = new THREE.Vector3();
   this.acc = new THREE.Vector3();


   this.rot = this.mesh.rotation;
   this.rotVel = new THREE.Vector3();
   this.rotAcc = new THREE.Vector3();


   this.scale = this.mesh.scale;
   this.baseScale = new THREE.Vector3(1, 1, 1);
   this.mass = 1;
 }
 setPosition(x, y, z) {
   this.pos.set(x, y, z);
   return this;
 }
 setTranslation(x, y, z) {
   this.mesh.geometry.translate(x, y, z);
   return this;
 }
 setVelocity(x, y, z) {
   this.vel.set(x, y, z);
   return this;
 }
 setRotationAngle(x, y, z) {
   this.rot.set(x, y, z);
   return this;
 }
 setRotationVelocity(x, y, z) {
   this.rotVel.set(x, y, z);
   return this;
 }
 setScale(w, h = w, d = w) {
   const minScale = 0.01;
   w = Math.max(w, minScale);
   h = Math.max(h, minScale);
   d = Math.max(d, minScale);
   this.baseScale.set(w, h, d);
   this.scale.set(w, h, d);
   return this;
 }
 setMass(mass) {
   if (mass !== undefined) {
     this.mass = mass;
   }
   else {
     this.mass = 1 + this.baseScale.x * this.baseScale.y * this.baseScale.z * 0.000001;
   }
   return this;
 }
 applyForce(f) {
   if (this.mass <= 0) return;
   const force = f.clone();
   force.divideScalar(this.mass);
   this.acc.add(force);
 }
 update() {
   this.updatePosition();
   this.updateRotation();
 }
 updatePosition() {
   this.vel.add(this.acc);
   this.pos.add(this.vel);
   this.acc.set(0, 0, 0);
 }
 updateRotation() {
   this.rotVel.add(this.rotAcc);
   this.rot.x += this.rotVel.x;
   this.rot.y += this.rotVel.y;
   this.rot.z += this.rotVel.z;
   this.rotAcc.set(0, 0, 0);
 }
}
