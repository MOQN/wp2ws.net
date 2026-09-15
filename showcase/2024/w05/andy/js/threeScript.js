let container;
let camera, renderer;
let controls;
let cube, sphere;
let light1;
let ambientLight;

let mousex = 0, mousey = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

const light = new THREE.DirectionalLight(0xffffff, 1);

const scene = new THREE.Scene(
    {
        background: null
    }
);
scene.fog = new THREE.FogExp2(0x000000, 0.2);
let speed = 1;
let lines = [];
let amount = 1000;

let glassMaterial = new THREE.MeshNormalMaterial({
    // color: 0xda70d6,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
});
let pointLightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
let centerObjMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
let particleMaterial =  new THREE.MeshPhysicalMaterial({  
    roughness: 0,  
    transmission: 0.99, // Add transparency
  });

class Particle {
    constructor(x, y, z) {
        // this.material = new THREE.LineBasicMaterial({
        //     color: 0xffffff,
        //     linewidth: 1,
        //     linecap: 'round', //ignored by WebGLRenderer
        //     linejoin: 'round' //ignored by WebGLRenderer
        // });
        // this.material = new THREE.PointsMaterial({
        //     color: 0x888888,
        //     size: 0.05
        // });
        // this.material = particleMaterial;
        // this.material.color = (new THREE.Color(Math.random() * 0xffffff));
        // this.material.color.setHSL(Math.random() * 0.4 + 0.5, 0.9, 0.5);
        this.position = new THREE.Vector3(x || randint(0, 0), y || randint(0, 0), z || randint(0, 0));
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.material = new THREE.MeshPhysicalMaterial({  
            roughness: 0,  
            transmission: 0.99, // Add transparency
          });
          this.material.color = (new THREE.Color(Math.random() * 0xffffff));
          this.material.color.setHSL(Math.random() * 0.4 + 0.5, 0.9, 0.5);
        // this.points = [];
        // this.points.push(new THREE.Vector3(this.position.x, this.position.y, this.position.z));
        // this.geometry = new THREE.BufferGeometry();
        // // geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        // this.geometry = new THREE.BufferGeometry().setFromPoints(this.points);
        // this.mesh = new THREE.Points(this.geometry, this.material);
        this.mesh = getSphere(0.03);
        this.mesh.material = this.material;
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);
        this.status = true;
        this.speedVar = randint(0.9, 1.1);
    }



    update() {
        const speedChange = new THREE.Vector3(
            randint(-0.01, 0.01),
            randint(-0.01, 0.01),
            randint(-0.01, 0.01)
        );
        this.velocity.add(speedChange);
        this.mesh.position.add(this.velocity.clone().multiplyScalar(speed * this.speedVar));
        if (this.mesh.position.x > 10 || this.mesh.position.x < -10 || this.mesh.position.y > 10 || this.mesh.position.y < -10 || this.mesh.position.z > 10 || this.mesh.position.z < -10) {
            this.status = false;
            // this.bufferGeometry.dispose();
        }
    }
}

initThree()

function initThree() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    nearClippingPlane = 0.1;
    farClippingPlane = 1000;

    renderer = new THREE.WebGLRenderer(
        {
            antialias: true,
            alpha: true
        }
    );
    renderer.setClearAlpha(0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);

    container = document.getElementById('threeContainer');
    container.appendChild(renderer.domElement);
    // control = new OrbitControls(camera, renderer.domElement);

    // Add event listener for mouse movement
    document.addEventListener('mousemove', onMouseMove, false);

    setupThree();
}

function setupThree() {
    scene.background = new THREE.Color(0x000);
    for (let i = 0; i < amount; i++) {
        lines.push(new Particle());
        // scene.add(lines[i].mesh);
    }

    ambientLight = getAmbientLight(0xffffff);
    scene.add(ambientLight);

    light1 = getPointLight(0, 0, 0, 0xff0000);
    light1.castShadow = true;
    light1.distance = 5;
    scene.add(light1);

    // cube1 = getCube(1.5, 1.5, 1.5);
    // scene.add(cube1);
    // cube1.castShadow = true;
    // cube1.receiveShadow = true;
    // cube1.position.x = 3;

    // cube2 = getCube(1.5, 1.5, 1.5);
    // scene.add(cube2);
    // cube2.castShadow = true;
    // cube2.receiveShadow = true;
    // cube2.position.x = 10;
    // cube2.position.y = 3;

    camera.position.z = 5;

    // sphere = getSphere();
    // scene.add(sphere);
    // sphere.position.z = 5;
    updateThree();
}

function updateThree() {
    // draw();
    renderer.setAnimationLoop(animate);
}

function animate() {
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].status) {
            scene.remove(lines[i].mesh);
            lines.splice(i, 1);
            lines.push(new Particle(0.001, 0.001, 0.001));
            // scene.add(lines[lines.length - 1].mesh);
        } else {
            lines[i].update();
        }
    }

    
    spdControl();
    // Rotate the camera based on mouse position
    camControl();
    renderer.render(scene, camera);
    // console.log(mouseX, mouseY);
}

function camControl() {
    // camera.position.z -= 0.05 * speed;
    camera.rotation.z += 0.001 * speed;
    camera.position.x -= (mousex + camera.position.x) * 0.05;
    camera.position.y -= (-mousey + camera.position.y) * 0.05;
    // camera.position.z -= (-mousey + camera.position.z) * 0.05;
    camera.lookAt(scene.position);

}

function spdControl() {
    if (Math.abs(mousex) > 1.5 || Math.abs(mousey) > 1.5) {
        if (speed >= 0.04) {
            speed -= 0.015;
        }
        // if (glassMaterial.opacity > 0) {
        //     glassMaterial.opacity -= 0.01;
        // }

    } else {
        if (speed < 1) {
            speed += 0.015;
        }
        // if (glassMaterial.opacity < 0.9) {
        //     glassMaterial.opacity += 0.01;
        // }
    }
}

// function getLine() {
//     const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
//     const points = [];
//     points.push(new THREE.Vector3(-1, 0, -1));
//     // points.push(new THREE.Vector3(0, 1, 0));
//     points.push(new THREE.Vector3(-1, 0, 1));
//     const geometry = new THREE.BufferGeometry().setFromPoints(points);
//     const line = new THREE.Line(geometry, material);
//     return line;
// }

function getAmbientLight(color) {
    const light = new THREE.AmbientLight(color, 10);
    return light;
}

function getPointLight(x, y, z, color) {
    const light = new THREE.PointLight(color, 1000);
    light.position.set(x, y, z);

    const lightSphere = getSphere(1);
    lightSphere.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    light.add(lightSphere);
    // scene.add(light);

    return light;
}

function getCube(width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    // const material = new THREE.MeshNormalMaterial({
    //     color: 0x00ffff,
    //     // wireframe: true,
    // });
    const mesh = new THREE.Mesh(geometry, centerObjMaterial);
    return mesh;
}

function getSphere(dia) {
    const geometry = new THREE.SphereGeometry(dia, 16, 16);
    const material = particleMaterial;
    // material.color = (new THREE.Color(Math.random() * 0xffffff));
    // material.color.setHSL(Math.random() * 0.4 + 0.5, 0.9, 0.5);
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

// class Building {
//     constructor() {
//         this.geometry = new THREE.BoxGeometry(1, 1, 1);
//         this.material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
//         this.mesh = new THREE.Mesh(this.geometry, this.material);
//     }
// }

function randint(min, max) {
    return Math.random() * (max - min) + min;
}

function onMouseMove(event) {
    mousex = (event.clientX - windowHalfX) / 100;
    mousey = (event.clientY - windowHalfY) / 100;
}

window.addEventListener('resize', function () {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});


