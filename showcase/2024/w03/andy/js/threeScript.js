let container;
let camera, renderer;
let controls;
let cube, sphere;

let mousex = 0, mousey = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

const light = new THREE.DirectionalLight(0xffffff, 1);

const scene = new THREE.Scene();
let speed = 1;
let lines = [];
let amount = 1000;

let glassMaterial = new THREE.MeshNormalMaterial({
    color: 0xda70d6,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide
});

class Line {
    constructor(z, color) {
        this.material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 1,
            linecap: 'round', //ignored by WebGLRenderer
            linejoin: 'round' //ignored by WebGLRenderer
        });
        this.material.color = (new THREE.Color(Math.random() * 0xffffff));
        this.material.color.setHSL(Math.random() * 0.4 + 0.5, 0.9, 0.5);
        this.positionX = randint(-10, 10);
        this.positionY = randint(-10, 10);
        this.positionZ = z || randint(-100, 40);
        this.positionDie = randint(8, 20);
        this.length = randint(2, 5);
        this.points = [];
        this.points.push(new THREE.Vector3(this.positionX, this.positionY, this.positionZ - this.length));
        this.points.push(new THREE.Vector3(this.positionX, this.positionY, this.positionZ));
        this.geometry = new THREE.BufferGeometry().setFromPoints(this.points);
        this.mesh = new THREE.Line(this.geometry, this.material);
        this.status = true;
        this.speedVar = randint(0.9, 1.1);
    }



    update() {
        this.mesh.position.z += (speed * this.speedVar);
        if (this.mesh.position.z > -this.positionZ + 40) {
            this.status = false;
        }
    }
}

initThree()

function initThree() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    nearClippingPlane = 0.1;
    farClippingPlane = 1000;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);

    container = document.getElementById('threeContainer');
    container.appendChild(renderer.domElement);
    // control = new OrbitControls(camera, renderer.domElement);

    // Add event listener for mouse movement
    document.addEventListener('mousemove', onMouseMove, false);

    setupThree();
}

function setupThree() {
    scene.background = new THREE.Color(0x0f0f0f);
    for (let i = 0; i < amount; i++) {
        lines.push(new Line());
        scene.add(lines[i].mesh);
    }

    cube1 = getCube(1.5, 1.5, 1.5);
    scene.add(cube1);
    camera.position.z = 5;

    light.position.set(0, 5, 10);
    scene.add(light);
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
            lines.push(new Line(-100));
            scene.add(lines[lines.length - 1].mesh);
        } else {
            lines[i].update();
        }
    }

    spdControl();
    // Rotate the camera based on mouse position
    camera.position.x -= (mousex * 1.5 + camera.position.x) * 0.05;
    camera.position.y -= (-mousey * 1.5 + camera.position.y) * 0.05;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
    // console.log(mouseX, mouseY);
}

function spdControl() {
    if (Math.abs(mousex) > 1.5 || Math.abs(mousey) > 1.5) {
        if (speed >= 0.04) {
            speed -= 0.015;
        }
        if (glassMaterial.opacity < 0.9) {
            glassMaterial.opacity += 0.01;
        }

    } else {
        if (speed < 1) {
            speed += 0.015;
        }
        if (glassMaterial.opacity > 0) {
            glassMaterial.opacity -= 0.01;
        }
    }
}

function getLine() {
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const points = [];
    points.push(new THREE.Vector3(-1, 0, -1));
    // points.push(new THREE.Vector3(0, 1, 0));
    points.push(new THREE.Vector3(-1, 0, 1));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    return line;
}

function getCube(width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshNormalMaterial({
        color: 0x00ffff,
        // wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, glassMaterial);
    return mesh;
}

function getSphere() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

class Building {
    constructor() {
        this.geometry = new THREE.BoxGeometry(1, 1, 1);
        this.material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
    }
}

function randint(min, max) {
    return Math.random() * (max - min + 1) + min;
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


