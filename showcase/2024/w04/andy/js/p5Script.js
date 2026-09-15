let frame1

function setup() {
    frame1 = createCanvas(windowWidth, windowHeight);
    frame1.parent('p5Container');
    cursor('none');
    // background(220);
}

function draw() {
    clear();
    // translate(frame1.width/2, frame1.height/2);
    fill(255 - speed*255);
    noStroke();
    circle(mouseX, mouseY, 30 - speed*30);
    // noLoop();
}