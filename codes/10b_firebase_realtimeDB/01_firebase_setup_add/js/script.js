let database, dbRef;
const points = new Map();

const buttonHeight = 25;

function setup() {
  createCanvas(windowWidth, max(1, windowHeight - buttonHeight));

  const button = createButton("Open Another Window");
  button.style("display", "block");
  button.style("height", buttonHeight + "px");
  button.style("box-sizing", "border-box");
  button.mousePressed(function () {
    window.open(window.location.href, "_blank", "noopener");
  });

  setupDB();
  dbRef = getDBReference("demo/drawingPoints");
}

function windowResized() {
  resizeCanvas(windowWidth, max(1, windowHeight - buttonHeight));
}

function draw() {
  background(220);

  fill(30);
  for (const point of points.values()) {
    rect(point.x, point.y, 10, 10);
  }

  text("Open this same URL in another window and watch both windows update!", 10, 20);
  text("Click to save a point. Refresh to see your saved points again.", 10, 40);
  text("Press [Backspace] to clear the shared data for this example.", 10, 70);
}

function mousePressed(event) {
  if (event.target.tagName !== "CANVAS") return;
  let data = {
    x: mouseX,
    y: mouseY
  };
  FirebaseDatabase.push(dbRef, data).catch(function (error) {
    console.error("Could not save the point:", error.message);
  });
}

function keyPressed() {
  if (key == "Backspace") {
    let answer = confirm("Clear the shared data for this example in every window?")
    if (answer) {
      FirebaseDatabase.remove(dbRef).catch(console.error);
    }
  }
}

function setupDB() {
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyAoyAgIZ0O7goo9E5ve1hpSJqA1oGtogUI",
    authDomain: "fir-demo-5e3c4.firebaseapp.com",
    databaseURL: "https://fir-demo-5e3c4-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "fir-demo-5e3c4",
    storageBucket: "fir-demo-5e3c4.firebasestorage.app",
    messagingSenderId: "855011527638",
    appId: "1:855011527638:web:1ec204e3ccffe1ec0ab277"
  };

  const app = FirebaseApp.initializeApp(firebaseConfig);
  database = FirebaseDatabase.getDatabase(app);
}

function getDBReference(refName) {
  const reference = FirebaseDatabase.ref(database, refName);

  // event listeners
  FirebaseDatabase.onChildAdded(reference, function (data) {
    console.log("! DB ADDED");
    console.log(data.key);
    console.log(data.val());

    let value = data.val();
    points.set(data.key, value);
  });

  FirebaseDatabase.onChildRemoved(reference, function (data) {
    points.delete(data.key);
    console.log("! DB REMOVED");
    console.log(data.key);
    console.log(data.val());
  });

  FirebaseDatabase.onChildChanged(reference, function (data) {
    console.log("! DB CHANGED");
    console.log(data.key);
    console.log(data.val());
  });

  FirebaseDatabase.onChildMoved(reference, function (data) {
    console.log("! DB MOVED");
    console.log(data.key);
    console.log(data.val());
  });

  return reference;
}
