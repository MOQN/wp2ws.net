const axesHelper = new THREE.AxesHelper(1000)

let cube;
let smallCubes = [];
let force;

function setupThree() {
    // scene.add(axesHelper)

    cube = getBox();
    cube.scale.set(50, 50, 50);
    cube.position.set = (0, 0, 0)
    scene.add(cube);

    for (let i = 0; i < 50; i++) {
        let smallCube = new Cube
        smallCubes.push(smallCube)
    }
}

function updateThree() {
    // 类似p5.js的draw()
    // cube.position.x += 1
    // cube.rotation.x += 0.1
    // cube.scale.x += 0.1
    for (let i = 0; i < smallCubes.length; i++) {
        let smallCube = smallCubes[i]
        smallCube.display();
        smallCube.update();
        smallCube.move();
    }
}

function getBox() {
    // create the thing
    const geometry = new THREE.BoxGeometry(1, 1, 1); // decide the shape
    // const material = new THREE.MeshNormalMaterial(
    //     // {wireframe: true}
    // )
    const material = new THREE.MeshBasicMaterial({
        color: ("white")
    });
    const mesh = new THREE.Mesh(geometry, material);
    return (mesh);
    // append to the scene in setupThree()
}

class Cube {
    constructor() {
        this.r1 = random(0, 1);
        if (this.r1 < 0.5) {
            this.para1 = -1;
        } else {
            this.para1 = 1;
        }
        this.r2 = random(0, 1);
        if (this.r2 < 0.5) {
            this.para2 = -1;
        } else {
            this.para2 = 1;
        }
        this.r3 = random(0, 1);
        if (this.r3 < 0.5) {
            this.para3 = -1;
        } else {
            this.para3 = 1;
        }
        this.position = createVector(this.para1 * random(20, 450), this.para2 * random(20, 450), this.para3 * random(20, 450))
        this.scale = random(10, 25);

        this.mesh = getBox();

        this.velocity = createVector(0, 0, 0);
        this.acceleration = createVector(0, 0, 0);
        this.d = random(-1, 1) * 1000
    }
    display() {
        this.mesh.scale.set(this.scale, this.scale, this.scale);
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        scene.add(this.mesh);
    }
    update() {
        this.acceleration.add(0, 0, sin(frameCount / this.d) * 0.05)
        this.position.add(this.velocity);
    }
    applyForce(f) {
        let force = f.copy();
        if (this.mass > 0) {
            force.div(this.mass);
        }
        this.acceleration.add(force);
    }
    move() {
        this.velocity.add(this.acceleration);
        this.position.add(this.velocity);
        this.acceleration.mult(0);
    }
}