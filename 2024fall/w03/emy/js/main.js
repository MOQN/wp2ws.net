
let light, lightMesh;
let sculpture;
let boxes = [];
let rotatingBoxes = [];
let rotationSpeeds = [];

function setupThree() {
    // background color
    renderer.setClearColor("#000000");

    // add ambient light
    ambiLight = new THREE.AmbientLight("#999999");
    scene.add(ambiLight);
    
    // add light point
    light = getPointLight("#FFFFFF");
    scene.add(light);

    // add a small sphere for the light
    lightMesh = getBasicSphere();
    light.add(lightMesh);
    lightMesh.scale.set(10, 10, 10);

    sculpture = new THREE.Group();
    scene.add(sculpture);

    //loop to add 19 boxes
    let columns = 3;
    let spacing = 100; // spacing between the boxes

    for (let i = 0; i < 17; i++) {

        let x, y;
        let zOffset;
        const box = getToonBox();
        
        // calculate x & y arrangements -- 
        x = (i % columns) * spacing - spacing; // shift in x-axis
        y = Math.floor(i / columns) * spacing - spacing / 2; // shift in y-axis
    
        // make sure some of the boxes are coming forward
        zOffset = (i % 2 === 0) ? - 50 : 0; // reposition even i's slightly forwarder -- asked chatGPT for help with syntaxing
    
        box.position.set(x, y, zOffset); 
        box.scale.set(100, 100, 100);
        box.material.color = getRandomColor(); //  call the getRandomColor function
    
        // box.rotation.set(
        //     Math.random() * Math.PI,
        //     Math.random() * Math.PI,
        //     Math.random() * Math.PI
        // );

        sculpture.add(box);
        boxes.push(box);

        // randomize rotating boxes
        if (Math.random() > 0.5) {
            rotatingBoxes.push(box);
            // random rotation speed between 0.01 and 0.03
            rotationSpeeds.push({
                x: Math.random() * 0.02 + 0.01,
                y: Math.random() * 0.02 + 0.01 
            });
        }
    
        // create border for the box
        const border = createBorder(box); // pass the box as arg
        border.position.copy(box.position);
        //sculpture.add(border);
    }
}

function getRandomColor() {
    const randomValue = Math.random();
    // RGB
    const color = new THREE.Color(
        0,                   // red: always 0
        1 - randomValue,     // green: goes from 1 to 0 (green to blue)
        randomValue          // blue: goes from 0 to 1 (green to blue)
    );
    
    return color;
}

function createBorder(box) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: "#000000", 
        linewidth: 3 
    });
    
    // create the border lines
    const border = new THREE.LineSegments(edges, lineMaterial);
    
    // scale the border to match the box
    border.scale.set(box.scale.x, box.scale.y, box.scale.z);
    return border;
}

function updateThree() {
    let angle = frame * 0.01;
    let radDist = 500;
    let x = cos(angle) * radDist;
    let y = 200;
    let z = sin(angle) * radDist;
    light.position.set(x, y, z);

    // for (let i = 0; i < boxes.length; i++) {
    // 
    //     boxes[i].rotation.x += 0.01; 
    //     boxes[i].rotation.y += 0.01; 
    // }

    for (let i = 0; i < rotatingBoxes.length; i++) {
        rotatingBoxes[i].rotation.x += rotationSpeeds[i].x; 
        rotatingBoxes[i].rotation.y += rotationSpeeds[i].y; 
    }
}

function getToonBox() {
    const geometry = new THREE.BoxGeometry(1, 1, 1); 
    const material = new THREE.MeshToonMaterial({
        color: "#ffffff",
        gradientMap: null,
        wireframe: false
    }); 
    const mesh = new THREE.Mesh(geometry, material); 
    return mesh;
}

function getBasicSphere() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: "#ffffff"
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

function getPointLight(color) {
    const light = new THREE.PointLight(color, 2, 0, 0.1); // ( color , intensity, distance (0=infinite), decay )
    return light;
}


