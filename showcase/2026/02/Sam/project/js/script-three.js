console.log("three.js Version: " + THREE.REVISION);


let scene, camera, renderer, container;


function initThree() {
 scene = new THREE.Scene();
 // scene.background = new THREE.Color(0xFF0000);


 const fov = 75;
 const aspectRatio = window.innerWidth / window.innerHeight;
 const near = 0.1;
 const far = 10000;
 camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
 camera.position.z = 1000;


 renderer = new THREE.WebGLRenderer();
 renderer.setSize(window.innerWidth, window.innerHeight);
 console.log(window.innerHeight);


 container = document.getElementById("container-three");
 container.appendChild(renderer.domElement);


 setupThree(); // ***

 renderer.setAnimationLoop(animate);
}


function animate() {
 //

 updateThree(); // ***


 renderer.render(scene, camera);
}


// event listener!
window.addEventListener("resize", function () {
 camera.aspect = window.innerWidth / window.innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(window.innerWidth, window.innerHeight);
});
