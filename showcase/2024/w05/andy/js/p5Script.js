let frame1
let stars = [];
let scaleRatio;
let mappedScaleRatio = 1;
let lerppedScaleRatio = 1; 


function setup() {
    frame1 = createCanvas(windowWidth, windowHeight);
    frame1.parent('p5Container');
    cursor('none');
    // background(220);
    //star bg
    for (let i = 0; i <= width/2; i++) {
        stars.push(new Star());
    }
}

function draw() {
    clear();
    star();
    // translate(frame1.width/2, frame1.height/2);
    fill(255 - speed * 255);
    noStroke();
    circle(mouseX, mouseY, 30 - speed * 30);
    // noLoop();
    push();
    translate(width / 2, height / 2);
    scaleRatio = dist(mouseX, mouseY, width / 2, height / 2)
    mappedScaleRatio = map(scaleRatio, dist(0, 0, width / 2, height / 2), 0, 0.7, 1.4);
    lerppedScaleRatio = lerp(lerppedScaleRatio, mappedScaleRatio, 0.05);
    scale(lerppedScaleRatio);
    for (let i = 0; i < 50; i++) {
        fill(255, 0, 0, i / 10);
        circle(0, 0, height / 5 + i);
    }

    // fill(0);
    // circle(width / 2, height / 2, height/5);
    pop();
}


function star() {
    for (let i = 0; i < stars.length; i++) {
        let s = stars[i];
        stars[i].update();
        s.display();
    }
}



class Star {
    constructor() {
        let xRange = random() < 0.5 ? random(-width/2, width / 2 - width / 20) : random(width / 2 + width / 20, width * 1.5);
        let yRange = random() < 0.5 ? random(-height/2, height / 2 - height / 20) : random(height / 2 + height / 20, height * 1.5);
        this.pX = xRange;
        this.pY = yRange;
        this.pos = createVector(this.pX - width / 2, this.pY - height / 2);
        this.brightness = random(255);
        this.color = [random(100, 255), random(100, 255), random(100, 255)];
        this.currentTransX = 0;
        this.currentTransY = 0;
    }

    display() {
        push();
        noStroke();
        translate(this.pX, this.pY);
        this.transVec = createVector(mouseX - width / 2, mouseY - height / 2);
        this.currentTransX = lerp(this.currentTransX, this.transVec.x, 0.1);
        this.currentTransY = lerp(this.currentTransY, this.transVec.y, 0.1);
        translate(-this.currentTransX, -this.currentTransY);
        fill(this.color[0], this.color[1], this.color[2], this.brightness);

        rotate(this.pos.heading() + PI / 2);

        let ratio1 = map(dist(this.pX, this.pY, width / 2, height / 2), 0, 170, 30, 1);
        let ratio2 = constrain(ratio1, 1, 30);
        scale(ratio2 / 2, 1 / 2);

        circle(0, 0, width / 600);
        pop();
    }

    update() {
        this.brightness += random(-50, 50);
    }
}