let params = {
    numberOfCubes: 0,
    speed: 0.008,     
    friction: 1,  
    deform: true    
};

const WORLD_SIZE = 2000;
const PLANE_SIZE = 20; // 20x20
const CUBE_SIZE = 100; 
const STEVE_SIZE = CUBE_SIZE * 0.8;

let cubes = [];


function setupThree() {
    
    //render
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    //add ambient light
    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    // scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); 
    directionalLight.position.set(400, 900, 100); 
    directionalLight.castShadow = true;

    //camera bounds
    directionalLight.shadow.camera.left = -1000;
    directionalLight.shadow.camera.right = 1000;
    directionalLight.shadow.camera.top = 1000;
    directionalLight.shadow.camera.bottom = -1000;

    //map size for shadow
    directionalLight.shadow.mapSize.width = 512;  
    directionalLight.shadow.mapSize.height = 512; 
    directionalLight.shadow.camera.near = 0.5;   
    directionalLight.shadow.camera.far = 1000;  

    scene.add(directionalLight);

    //helpers
    // const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
    // const shadowCameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
    // scene.add(lightHelper);
    // scene.add(shadowCameraHelper);



    // //add spotlight
    // let spotLight = new THREE.SpotLight( 0xffffff, 10, 100, PI / 4, 0.6, 0.1 );
    // spotLight.position.set( 100, 600, 100 );
    // spotLight.castShadow = true;
    // scene.add(spotLight);

    // spotLight.shadow.mapSize.width = 512; // Default is 512
    // spotLight.shadow.mapSize.height = 512; // Default is 512
    // spotLight.shadow.camera.near = 0.5; // Default is 0.5
    // spotLight.shadow.camera.far = 1000; // Default is 1000
    // spotLight.shadow.focus = 1; // default
    // //spotLight.shadow.bias = -0.0001;

    // //directional light
    // const directionalLight = new THREE.DirectionalLight(0x6488EA, 1);
    // directionalLight.position.set(100, 500, 100);
    // directionalLight.castShadow = true;
    // scene.add(directionalLight);

    // // add a mesh for the light source
    // let sphere = getSphere();
    // sphere.scale.set(30, 30, 30);
    // sphere.castShadow = true;
    //directionalLight.add(sphere); /// add the sphere to the light!!
    //scene.add(directionalLight);

    //spotLight.shadow.debug = true; 
    // const helper = new THREE.CameraHelper( directionalLight.shadow.camera );
    // scene.add( helper );


    //add pointLight
    // pointLight = new THREE.PointLight(0xFFFFFF, 1, 500, 0.01);
    // pointLight.position.set(0, 200, 0);
    // pointLight.castShadow = true; // default false
    // scene.add(pointLight);

    //add fog
    scene.background = new THREE.Color(0xa6bbf3);
    scene.fog = new THREE.Fog(0x9EA3B1, 100, 4000);

    //GUI
    gui.add(params, "numberOfCubes").listen();
    gui.add(params, "speed", 0.01, 0.04).step(0.001).name("speed");
    gui.add(params, "friction", 0.9, 1).step(0.01).name("friction");
    gui.add(params, "deform").name("toggle to start animation");

    //add ground
    for (let i = 0; i < PLANE_SIZE * PLANE_SIZE; i++) { // 20x20 grid=400 cubes
        let tCube = new Cube();
        cubes.push(tCube);
    }

    params.numberOfCubes = cubes.length;
    addSteve();
}

function getBox() {
    const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

    //loading pngs
    const loader = new THREE.TextureLoader();
    const grassTopTexture = loader.load('imgs/grass-top.webp');
    const dirtBottomTexture = loader.load('imgs/dirt.jpeg');
    const grassSideTexture = loader.load('imgs/grass-side.png');


    const materials = [
        new THREE.MeshPhongMaterial({ 
            map: grassSideTexture, 
            // shininess: 100 
            }), // right
        new THREE.MeshPhongMaterial({ 
            map: grassSideTexture, 
            // shininess: 100 
            }), // left
        new THREE.MeshPhongMaterial({ map: 
            grassTopTexture, 
            //shininess: 100 
            }),  // top
        new THREE.MeshPhongMaterial({ 
            map: dirtBottomTexture, 
            //shininess: 100 
            }), // bottom
        new THREE.MeshPhongMaterial({ 
            map: grassSideTexture, 
            //shininess: 100 
            }), // front
        new THREE.MeshPhongMaterial({ 
            map: grassSideTexture, 
            //shininess: 100 
            })  // back
    ];

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function getSphere() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    sphere.castShadow = true;
    return mesh;
}

class Cube {
    constructor() {
        this.mesh = getBox();
        
        // randomize starting pos
        this.initialPosition = new THREE.Vector3(
            Math.random() * WORLD_SIZE - WORLD_SIZE/2,
            Math.random() * WORLD_SIZE - WORLD_SIZE/2,
            Math.random() * WORLD_SIZE - WORLD_SIZE/2
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

function addSteve() {
    const loader = new THREE.TextureLoader();
    
    //load pngs for steve
    const headTexture = loader.load('imgs/steve-head-front.png');
    const bodyTexture = loader.load('imgs/Minecraft Steve body.png');
    const armTexture = loader.load('imgs/Steve Arm.png');
    const legTexture = loader.load('imgs/Minecraft Steve Leg.png');

    //create steve
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(STEVE_SIZE, STEVE_SIZE, STEVE_SIZE ), 
        new THREE.MeshPhongMaterial({ 
            map: headTexture 
        })
    );
    head.castShadow = true;
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(STEVE_SIZE, STEVE_SIZE * 1.2, STEVE_SIZE * 0.6),
        //new THREE.BoxGeometry(STEVE_SIZE * 0.4, STEVE_SIZE * 1.2, STEVE_SIZE * 0.4), 
 
        new THREE.MeshPhongMaterial({ 
            map: bodyTexture 
        })
    );
    body.castShadow = true;
    const leftArm = new THREE.Mesh(
        new THREE.BoxGeometry(STEVE_SIZE * 0.4, STEVE_SIZE * 1.2, STEVE_SIZE * 0.4), 
        new THREE.MeshPhongMaterial({ 
            map: armTexture 
        })
    );
    leftArm.castShadow = true;
    const rightArm = new THREE.Mesh(
        new THREE.BoxGeometry(STEVE_SIZE * 0.4, STEVE_SIZE * 1.2, STEVE_SIZE * 0.4), 
        new THREE.MeshPhongMaterial({ 
            map: armTexture 
        })
    );
    rightArm.castShadow = true;
    const leftLeg = new THREE.Mesh(
        new THREE.BoxGeometry(STEVE_SIZE * 0.4, STEVE_SIZE * 2 , STEVE_SIZE * 0.4), 
        new THREE.MeshPhongMaterial({ 
            map: legTexture 
        })
    );
    leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(
        new THREE.BoxGeometry(STEVE_SIZE * 0.4, STEVE_SIZE * 2, STEVE_SIZE * 0.4), 
        new THREE.MeshPhongMaterial({ 
            map: legTexture 
        })
    );
    rightLeg.castShadow = true;

    //position set
    head.position.set(0, STEVE_SIZE + 50, 0);
    body.position.set(0, STEVE_SIZE * 0.6, 0);
    leftArm.position.set(-STEVE_SIZE * 0.7, STEVE_SIZE * 0.6, 0);
    rightArm.position.set(STEVE_SIZE * 0.7, STEVE_SIZE * 0.6, 0);
    leftLeg.position.set(-STEVE_SIZE * 0.2, 0, 0);
    rightLeg.position.set(STEVE_SIZE * 0.2, 0, 0);

    //grouped
    const steve = new THREE.Group();
    steve.add(head);
    steve.add(body);
    steve.add(leftArm);
    steve.add(rightArm);
    steve.add(leftLeg);
    steve.add(rightLeg);

    steve.castShadow = true;

    //pos steve in the middle + top of the ucbes
    steve.position.set(0, CUBE_SIZE + STEVE_SIZE * 0.2, 0);
    // steve.receiveShadow = false;
    scene.add(steve);
}

function animate() {
    requestAnimationFrame(animate);
    
    cubes.forEach(cube => {
        cube.move(params.speed, params.friction, params.deform);
    });

    renderer.render(scene, camera);
}
animate();