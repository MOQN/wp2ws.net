console.log("three.js version: " + THREE.REVISION)

// SCENE: the 3d environment
// CAMERA: your eye
// RENDERER: 三渲二, 3d -> 2d
// CONTAINER: put the rendered 2d image in the div

let scene, camera, renderer, container;

function initThree() {
    scene = new THREE.Scene();

    let fov = 75; // field of view
    let aspectRatio = window.innerWidth / window.innerHeight // width / height
    let near = 0.1;
    let far = 10000;
    // frustum 柱体截面体，near和far clipping plane决定从何处开始到何处结束电脑需要花算力显示物体
    camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
    camera.position.z = 1000;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight)

    container = document.getElementById("container-three")
    container.appendChild(renderer.domElement)

    controls = new OrbitControls(camera, renderer.domElement);

    setupThree(); // 约等于p5.js的setup()

    // Function from THREE, Important when using WebXR
    renderer.setAnimationLoop(animate);
}

function animate() {

    updateThree(); // 约等于p5.js的draw()
    // update is the process of info transition between cpu and gpu

    renderer.render(scene, camera);// render the scene utilizing from the camera's perspective
}

window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight);
})