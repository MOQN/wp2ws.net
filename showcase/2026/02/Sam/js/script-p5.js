function setup() {
 let canvas = createCanvas(640, 480);
 canvas.parent("container-p5");
 canvas.hide();


 // when p5 is 100% ready,
 // we initialize the Three.js scene!
 initThree(); // ***
}


function draw() {
 background(100);
 noLoop();
}

