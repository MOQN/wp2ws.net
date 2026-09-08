let database, dbRef;

let myId;
let pos = { x: 0, y: 0 };

function setup() {
  createCanvas(800, 600);

  setupDB();
  clearDBReference("realtimeData");
  dbRef = getDBReference("realtimeData");
  dbRef.push(pos)
    .then(function (db) {
      console.log("! DB Added succeeded.");
      myId = db.key;
      console.log("Newly added ID:", myId);
    })
    .catch(function (error) {
      console.log("! DB Added failed: " + error.message);
    });
}

function draw() {
  background(0);
  ellipse(pos.x, pos.y, 30, 30);
}

function mouseDragged() {
  let newPos = { x: mouseX, y: mouseY };
  if (myId) {
    dbRef.child(myId).set(newPos)
      .then(() => {
        console.log("Position updated successfully.");
      })
      .catch((error) => {
        console.error("Failed to update position:", error.message);
      });
  } else {
    console.error("myId is not defined or invalid.");
  }
}

function keyPressed() {
  if (key == " ") {
    clearDBReference("realtimeData");
  }
}

function setupDB() {
  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  //https://firebase.google.com/docs/web/learn-more?hl=en&authuser=0&_gl=1*1dggmn*_ga*MjA5NDIyNTE1Mi4xNzMzMTY0MTU1*_ga_CW55HF8NVT*MTczMzE2NDE1NS4xLjEuMTczMzE2NDMzOS41Ni4wLjA.#modular-version

  const firebaseConfig = {
    apiKey: "AIzaSyABb15Oeq1CPfGq6YyTk0WZ4n1UqCxDOhE",
    authDomain: "fir-demo-6bea6.firebaseapp.com",
    databaseURL: "https://fir-demo-6bea6-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "fir-demo-6bea6",
    storageBucket: "fir-demo-6bea6.firebasestorage.app",
    messagingSenderId: "248825681634",
    appId: "1:248825681634:web:2e0a7662312c04f7c6b0bb",

  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  database = firebase.database();
}

function getDBReference(refName) {
  let ref = database.ref(refName);

  // event listeners
  ref.on("child_added", data => {
    console.log("! DB ADDED");
    //console.log(data.key);
    //console.log(data.val());
  });
  ref.on("child_removed", data => {
    console.log("! DB REMOVED");
    console.log(data.key);
    console.log(data.val());
  });
  ref.on("child_changed", data => {
    console.log("! DB CHANGED");
    console.log(data.key);
    console.log(data.val());

    pos = data.val();
  });
  ref.on("child_moved", data => {
    console.log("! DB MOVED");
    console.log(data.key);
    console.log(data.val());
  });

  return ref;
}

function clearDBReference(refName) {
  let ref = database.ref(refName);

  // clear out the previous data in the key
  ref
    .remove()
    .then(function () {
      console.log("! DB Remove succeeded.");
    })
    .catch(function (error) {
      console.log("! DB Remove failed: " + error.message);
    });
}