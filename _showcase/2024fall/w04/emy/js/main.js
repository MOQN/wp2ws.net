
// let params = {
//     numberOfCubes: 0,
//     speed: 0.001
// };

// const WORLD_SIZE = 2000;
// let cubes = [];
// const PLANE_SIZE = 20; // 20x20 plane
// const CUBE_SIZE = 10;

// function setupThree() {
//     gui.add(params, "numberOfCubes").listen();
//     gui.add(params, "speed", 0.01, 0.1).step(0.01).name("speed");

//     // lighting
//     const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
//     scene.add(ambientLight);
//     const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
//     directionalLight.position.set(0, 1, 0);
//     scene.add(directionalLight);

//     // init cubes
//     for (let i = 0; i < PLANE_SIZE * PLANE_SIZE; i++) { // 20x20 grid = 400 cubes
//         let tCube = new Cube();
//         cubes.push(tCube);
//     }

//     params.numberOfCubes = cubes.length;
// }

// function getBox() {
//     const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

//     //texttures
//     const loader = new THREE.TextureLoader();
//     const grassTopTexture = loader.load('imgs/grass-top.webp');
//     const dirtBottomTexture = loader.load('imgs/dirt.jpeg');
//     const grassSideTexture = loader.load('imgs/grass-side.png');

//     // phong material
//     const materials = [
//         new THREE.MeshPhongMaterial({ map: grassSideTexture, shininess: 60 }), // right
//         new THREE.MeshPhongMaterial({ map: grassSideTexture, shininess: 100 }), // lrft
//         new THREE.MeshPhongMaterial({ map: grassTopTexture, shininess: 100 }),  // top
//         new THREE.MeshPhongMaterial({ map: dirtBottomTexture, shininess: 100 }), // bottom
//         new THREE.MeshPhongMaterial({ map: grassSideTexture, shininess: 100 }), // front
//         new THREE.MeshPhongMaterial({ map: grassSideTexture, shininess: 100 })  // back
//     ];

//     const mesh = new THREE.Mesh(geometry, materials);
//     return mesh;
// }

// class Cube {
//     constructor() {
//         this.mesh = getBox();
        
//         // Random starting position
//         this.mesh.position.set(
//             Math.random() * WORLD_SIZE - WORLD_SIZE / 3,
//             Math.random() * WORLD_SIZE - WORLD_SIZE / 3,
//             Math.random() * WORLD_SIZE - WORLD_SIZE / 3
//         );
        
//         // calc target pos relative to place
//         const gridX = Math.floor(cubes.length % PLANE_SIZE); // x axis i on the grid
//         const gridZ = Math.floor(cubes.length / PLANE_SIZE); // z i on the grid
        
//         this.targetPosition = new THREE.Vector3(
//             (gridX - PLANE_SIZE / 2) * CUBE_SIZE,  // center
//             0,  // flat y
//             (gridZ - PLANE_SIZE / 2) * CUBE_SIZE   
//         );

//         scene.add(this.mesh);
//     }

//     moveTowardTarget(speed) {
//         this.mesh.position.lerp(this.targetPosition, speed); 
//     }
// }

// function animate() {
//     requestAnimationFrame(animate);
    
//     // Move each cube toward the target position at the specified speed
//     cubes.forEach(cube => {
//         cube.moveTowardTarget(params.speed);
//     });
    
//     renderer.render(scene, camera);
// }
// animate(); 

let params = {
    numberOfCubes: 0,
    speed: 0.008,     
    friction: 0.9,  
    deform: false    
};

const WORLD_SIZE = 2000;
let cubes = [];
const PLANE_SIZE = 20; // 20x20
const CUBE_SIZE = 10; 

function setupThree() {
    gui.add(params, "numberOfCubes").listen();
    gui.add(params, "speed", 0.01, 0.1).step(0.01).name("speed");
    gui.add(params, "friction", 0.1, 1).step(0.01).name("friction");
    gui.add(params, "deform").name("deform");


    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 1, 0);
    scene.add(directionalLight);

    for (let i = 0; i < PLANE_SIZE * PLANE_SIZE; i++) { // 20x20 grid=400 cubes
        let tCube = new Cube();
        cubes.push(tCube);
    }

    params.numberOfCubes = cubes.length;
}

function getBox() {
    const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

    const loader = new THREE.TextureLoader();
    const grassTopTexture = loader.load('imgs/grass-top.webp');
    const dirtBottomTexture = loader.load('imgs/dirt.jpeg');
    const grassSideTexture = loader.load('imgs/grass-side.png');

    const materials = [
        new THREE.MeshPhongMaterial({ map: grassSideTexture, shininess: 60 }), // right
        new THREE.MeshPhongMaterial({ map: grassSideTexture, shininess: 100 }), // left
        new THREE.MeshPhongMaterial({ map: grassTopTexture, shininess: 100 }),  // top
        new THREE.MeshPhongMaterial({ map: dirtBottomTexture, shininess: 100 }), // bottom
        new THREE.MeshPhongMaterial({ map: grassSideTexture, shininess: 100 }), // front
        new THREE.MeshPhongMaterial({ map: grassSideTexture, shininess: 100 })  // back
    ];

    const mesh = new THREE.Mesh(geometry, materials);
    return mesh;
}

class Cube {
    constructor() {
        this.mesh = getBox();
        
        // randomize starting pos
        this.initialPosition = new THREE.Vector3(
            Math.random() * WORLD_SIZE - WORLD_SIZE / 3,
            Math.random() * WORLD_SIZE - WORLD_SIZE / 3,
            Math.random() * WORLD_SIZE - WORLD_SIZE / 3
        );
        this.mesh.position.copy(this.initialPosition);

        // calc pos relative to grid
        const gridX = Math.floor(cubes.length % PLANE_SIZE); // X index
        const gridZ = Math.floor(cubes.length / PLANE_SIZE); // Z 
        
        this.targetPosition = new THREE.Vector3(
            (gridX - PLANE_SIZE / 2) * CUBE_SIZE,  // x center
            0,  // flatness
            (gridZ - PLANE_SIZE / 2) * CUBE_SIZE   // z center
        );
        
        scene.add(this.mesh);
    }


    move(speed, friction, deform) {
        let destination = deform ? this.initialPosition : this.targetPosition;
        this.mesh.position.lerp(destination, speed);
        
        this.mesh.position.multiplyScalar(friction);
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    cubes.forEach(cube => {
        cube.move(params.speed, params.friction, params.deform);
    });

    renderer.render(scene, camera);
}
animate();