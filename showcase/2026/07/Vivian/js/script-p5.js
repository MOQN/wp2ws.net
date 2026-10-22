function setup() {
  let canvas = createCanvas(640, 480);
  canvas.parent("container-p5");
  canvas.hide();

  startThree();
}

function startThree() {
  if (typeof THREE === "undefined" || typeof Pane === "undefined" || typeof GLTFLoader === "undefined") {
    setTimeout(startThree, 10);
    return;
  }
  initThree(); // ***
}

function draw() {
  background(100);
  noLoop();
}