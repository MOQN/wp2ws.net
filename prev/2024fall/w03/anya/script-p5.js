function setup() {
    let canvas = createCanvas(640, 400);
    canvas.parent("container-p5");
    canvas.hide();
  
    initThree();
  }
  
  function draw() {
    background(220);
    noLoop();
  }
  