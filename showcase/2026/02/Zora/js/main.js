// https://threejs.org/docs/index.html?q=light#api/en/lights/PointLight
// https://threejs.org/docs/index.html?q=phong#api/en/materials/MeshPhongMaterial

let ball;
let light, lightMesh;
let ring
let cubes = [];
let toruses = []
let lights = []
function setupThree() {
    // It is not recommended to explore materials and lights this week!
    // This is just to show you how to add a light and a material to a sphere.

    // add ambient light
    ambiLight = new THREE.AmbientLight(0xffffff, 10);
    scene.add(ambiLight);

    // add point light
    // light = getPointLight();
    // light.position.set(0, 0, -200)
    // scene.add(light);

    for (let i = 0; i < 9; i++) {
        const light = getPointLight();


        light.position.x = -450 + i * 100;
        light.position.y = -sin(i * Math.PI / 4) * 100;
        // light.position.z = 0;
        // light.rotation.z = -i * Math.PI / 18

        // light.scale.set(40, 400, 400);

        scene.add(light);
        lights.push(light);
        // add a small sphere for the light
        lightMesh = getBasicSphere();
        light.add(lightMesh); // add the lightMesh to the light object so that it moves with the light
        lightMesh.scale.set(10, 10, 10);
    }

    // // add a small sphere for the light
    // lightMesh = getBasicSphere();
    // light.add(lightMesh); // add the lightMesh to the light object so that it moves with the light
    // lightMesh.scale.set(10, 10, 10);

    for (let i = 0; i < 8; i++) {
        const cube = getBox();


        cube.position.x = -400 + i * 100;
        cube.position.y = -200 + i * 100;
        cube.position.z = 0;
        cube.rotation.z = -i * Math.PI / 18

        cube.scale.set(40, 400, 400);

        scene.add(cube);
        cubes.push(cube);
    }

    for (let i = 0; i < 7; i++) {
        const torus = getTorus();
        const angles = [45, 22.5, 0, -22.5, -45, -22.5, 0];

        torus.position.x = -400 + i * 120;
        torus.position.y = sin(i * Math.PI / 4) * 100 + (Math.random() - 0.5) * 30;
        torus.position.z = 0;
        torus.rotation.x = THREE.MathUtils.degToRad(90 + (Math.random() - 0.5) * 50);
        torus.rotation.y = THREE.MathUtils.degToRad(angles[i]);
        torus.rotation.z = Math.PI / 4
        torus.scale.set(20, 20, 10);

        scene.add(torus);
        toruses.push(torus);
    }
}

function updateThree() {
    cubes.forEach((cube, index) => {
        cube.position.y = sin(frame * 0.01 + index) * 100;
        cube.rotation.z = sin(frame * 0.01 + index) * Math.PI / 8;
    });
    lights.forEach((light, index) => {

        light.intensity = (sin(frame * 0.02 + index) + 1);

    });
}
function getBox() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
        color: 0x99ffcc,
        metalness: 0.9,
        roughness: 0.5,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
        // wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}
function getPhongSphere() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    // let's use MeshPhongMaterial instead of MeshBasicMaterial.
    // Please focus on exploring diverse geometries rather than materials and lights this week.
    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 100
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

function getBasicSphere() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

function getPointLight() {
    const light = new THREE.PointLight(0xffffff, 2, 0, 0.1); // ( color , intensity, distance (0=infinite), decay )
    return light;
}
function getTorus() {
    const geometry = new THREE.TorusGeometry(10, 1, 30, 4);
    const material = new THREE.MeshStandardMaterial({
        color: 0x6699cc,
        metalness: 0.9,
        roughness: 0.2,
        // transparent: true,
        // opacity: 0.8,
        side: THREE.DoubleSide
        // wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}