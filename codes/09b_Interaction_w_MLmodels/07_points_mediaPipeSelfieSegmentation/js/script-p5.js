// This example code is created based on:
// https://github.com/tensorflow/tfjs-models/tree/master/body-segmentation
// https://github.com/tensorflow/tfjs-models/tree/master/body-segmentation/src/selfie_segmentation_mediapipe
// Demo: https://storage.googleapis.com/tfjs-models/demos/body-pix/index.html

let cam;
let segmenter;
let segmentationData = [];
let segmentationWidth = 0;
let segmentationHeight = 0;
let segmentationPending = false;
let segmentationError = "";
let pixelCanvas;
let pixelContext;

function setup() {
  let canvas = createCanvas(640, 480);
  canvas.parent("container-p5");
  //canvas.hide();
  background(50);

  frameRate(30);

  // Request a canvas optimized for the pixel readback used by the particles.
  pixelCanvas = document.createElement("canvas");
  pixelCanvas.width = 640;
  pixelCanvas.height = 480;
  pixelContext = pixelCanvas.getContext("2d", { willReadFrequently: true });

  cam = createCapture(VIDEO, {}, camReady);
  cam.size(640, 480);
  cam.hide();

  initThree();
}

function draw() {
  getSegmentation();

  background(0);
  if (cam.elt.readyState < 2) {
    fill(255);
    text("Waiting for webcam...", 20, 30);
    return;
  }
  image(cam, 0, 0);

  if (!segmentationData.length) {
    fill(255);
    text(segmentationError || "Loading segmentation model...", 20, 30);
    return;
  }

  noStroke();
  fill(255);
  const gridSize = 30;
  pixelContext.drawImage(cam.elt, 0, 0, cam.width, cam.height);
  const pixels = pixelContext.getImageData(0, 0, cam.width, cam.height).data;
  for (let y = 0; y < cam.height; y += gridSize) {
    for (let x = 0; x < cam.width; x += gridSize) {
      const index = (x + y * cam.width) * 4;
      const maskX = Math.min(segmentationWidth - 1, Math.floor(x / cam.width * segmentationWidth));
      const maskY = Math.min(segmentationHeight - 1, Math.floor(y / cam.height * segmentationHeight));
      // The alpha channel stores the probability that this pixel is a person.
      const confidence = segmentationData[(maskX + maskY * segmentationWidth) * 4 + 3] / 255;
      if (confidence < 0.5 || index + 2 >= pixels.length) continue;

      const x3D = random(-0.05, 0.05) + map(x, 0, cam.width, 1.0, -1.0); // mirroring
      const y3D = random(-0.05, 0.05) + map(y, 0, cam.height, 1.0, -1.0); // y axis is flipped in 3D
      const z3D = random(-0.1, 0.1); // y axis is flipped in 3D
      const r = pixels[index + 0] / 255;
      const g = pixels[index + 1] / 255;
      const b = pixels[index + 2] / 255;

      if (confidence >= 0.5) {
        // generate a particle here!
        const scaleAdj = WORLD_HALF;
        const tParticle = new Particle()
          .setPosition(x3D * scaleAdj, y3D * scaleAdj, z3D * scaleAdj)
          .setColor(r, g, b)
          .setVelocity(0, random(-0.2, -0.1), random(-0.1, 0.1))
        particles.push(tParticle);
      }
    }
  }
}

function camReady() {
  console.log("Webcam Ready!");
  loadBodySegmentationModel().catch(error => {
    segmentationError = "Could not load segmentation model. See console.";
    console.error(error);
  });
}

async function loadBodySegmentationModel() {
  const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
  const segmenterConfig = {
    runtime: 'mediapipe',
    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation'
  };
  segmenter = await bodySegmentation.createSegmenter(model, segmenterConfig);
  console.log("Model Loaded!");
}

async function getSegmentation() {
  if (!segmenter || segmentationPending || cam.elt.readyState < 2) return;

  segmentationPending = true;
  try {
    const segmentation = await segmenter.segmentPeople(cam.elt, { flipHorizontal: false });
    if (segmentation.length > 0) {
      const result = await segmentation[0].mask.toImageData();
      segmentationData = result.data;
      segmentationWidth = result.width;
      segmentationHeight = result.height;
    } else {
      segmentationData = [];
    }
  } catch (error) {
    segmentationData = [];
    segmentationError = "Segmentation failed. See console.";
    console.error(error);
  } finally {
    segmentationPending = false;
  }
}
