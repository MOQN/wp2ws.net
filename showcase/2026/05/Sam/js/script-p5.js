function setup() {
  let canvas = createCanvas(640, 480);
  canvas.parent("container-p5");
  canvas.hide();

  if (window.THREE && window.OrbitControls && window.Pane) {
    initThree();
  } else {
    window.addEventListener("three-ready", initThree, { once: true });
  }
}

function draw() {
  background(100);
  noLoop();
}
