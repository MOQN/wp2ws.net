let cube;
let cylinder_base;
let disk;
let ball;


function setupThree() {
    camera.position.z = 5;
    renderer.setClearColor("#CCCCCC");
    // cube on the base 
    cube = getCube();
    scene.add(cube);
    // cylinder on the base
    cylinder_base = getCylinder(Math.sqrt(2) / 1.5, Math.sqrt(2), 0.3, 4);
    const cylinderHeight = cylinder_base.geometry.parameters.height;
    const cubeHeight = cube.geometry.parameters.height;
    cylinder_base.position.y = cube.position.y + cubeHeight / 2 + cylinderHeight / 2;
    cylinder_base.rotation.set(0, Math.PI / 4, 0);

    scene.add(cylinder_base);
    // disk on the top
    disk = new THREE.CylinderGeometry(1.2, 1.2, 0.5, 64);
    // hole in the disk
    ball = new THREE.SphereGeometry(0.3,32,32);
    const brush1 = new Brush(ball, getStoneMaterial());
    brush1.position.y = cubeHeight / 2 + cylinderHeight + disk.parameters.radiusTop / 2 +  0.8;
    brush1.position.x = cube.position.x - 0.3;
    brush1.position.z = cube.position.z + 0.3;
    brush1.updateMatrixWorld();
    // convert disk to brush
    const brush2 = new Brush(disk, getStoneMaterial());
    brush2.position.y = cubeHeight / 2 + cylinderHeight + disk.parameters.radiusTop / 2 + 0.5;
    brush2.rotation.x = Math.PI / 2;
    brush2.updateMatrixWorld();

    const evaluator = new Evaluator();
    const result = evaluator.evaluate(brush2, brush1, window.SUBTRACTION);
    scene.add(result);

    // Add a light to the scene
    // Or else the material is invisible!!
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5); // Position the light
    scene.add(light);

    // Add an ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft white light
    scene.add(ambientLight);
}
function getStoneMaterial() {
    const textureLoader = new THREE.TextureLoader();
    const stoneTexture = textureLoader.load('stone-texture.jpg');
    const material = new THREE.MeshStandardMaterial({
        map: stoneTexture,
    });
    return material;
}

function getCube() {
    const geometry = new THREE.BoxGeometry(2, 0.5, 2);
    const material = getStoneMaterial();
    const cube = new THREE.Mesh(geometry, material);
    return cube;
}

function getSphere() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = getStoneMaterial();
    const sphere = new THREE.Mesh(geometry, material);
    return sphere;
}

function getCylinder(top, bottom, height, seg) {
    const geometry = new THREE.CylinderGeometry(top, bottom, height, seg);
    const material = getStoneMaterial();
    const cylinder = new THREE.Mesh(geometry, material);
    return cylinder;
}

function getDisk(top, bottom, height, seg){
    const geometry = new THREE.CylinderGeometry(top, bottom, height, seg);
    geometry.scale(1,1,1.2);
    const material = getStoneMaterial();
    const cylinder = new THREE.Mesh(geometry, material);
    return cylinder;
}