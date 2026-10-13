function setup() { // won't be called until p5 is completely loaded
    let canvas = createCanvas(640, 480);
    canvas.parent("container-p5");
    canvas.hide();

    // when p5.js is 100% ready
    // we initializa the three.js scene
    initThree();
}

function draw() {
    background(100);
    noLoop();
}