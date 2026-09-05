let container;
let scene, camera, renderer;
let controls;

let cube, torus, torus2, torus3, torus4;
let floor, spotLight;

function initThree() {
    // 1st: setup
    scene = new THREE.Scene();

    //scene.background = new THREE.Color(0x333333); // Dark grey
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);

    container = document.getElementById("container-three");
    container.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    setupThree();
}

function setupThree() {
    spotLight = new THREE.SpotLight( 0xffffff, 100000);
    spotLight.position.set( 0, 17, 0 );
    spotLight.castShadow = true;
    spotLight.angle = Math.PI / 2; // 45 degrees
    
    scene.add( spotLight );
    // 2nd: add cube
    camera.position.z = 20;

    torus = getTorus(9, 0.3, 16, 100);
    scene.add(torus);
    torus2 = getTorus(8, 0.3, 16, 100);
    scene.add(torus2);
    torus3 = getTorus(7, 0.3, 16, 100);
    scene.add(torus3)
    torus4 = getTorus(10, 0.3, 16, 100);
    scene.add(torus4)
    renderer.setAnimationLoop(animate);



}

function updateThree() {
    // like a draw in p5.js
}

// 3rd: Let's draw!
function animate() {
    updateThree();
    // Rotate the toruses 
    torus4.rotation.y += 0.001;
    torus4.rotation.x -= 0.001;
    torus.rotation.y += 0.005;
    torus.rotation.x += 0.005;
    torus2.rotation.x += 0.02;
    torus3.rotation.y += 0.03;

    renderer.render(scene, camera);
}
function getTorus(radius, tube, radialSegments, tubularSegments) {
    const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
    const material = new THREE.MeshPhysicalMaterial({
        color: 0x000000,
        roughness: 0.0
    });
    material.reflectivity = 0.0
    const torus = new THREE.Mesh(geometry, material);
    return torus;

}

function getCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1); // skeleton
    const material = new THREE.MeshNormalMaterial({  // skin, MeshBasicMaterial isnot effected by light
        color: 0x00ff00,
        // wireframe:true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

function getSphere() {
    const geometry = new THREE.SphereGeometry(15, 32, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}