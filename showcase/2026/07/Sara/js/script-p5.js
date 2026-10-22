function setup() {
  let canvas = createCanvas(640, 480);
  canvas.parent("container-p5");
  canvas.hide();
  noLoop();

  initThree(); // ***
}

function draw() {
  // Three.js owns the visible animation loop. p5 remains available for noise().
}
