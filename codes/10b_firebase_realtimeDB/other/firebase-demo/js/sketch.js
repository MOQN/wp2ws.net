let database, dbRef, myId;

let posData = {
  x: 0,
  y: 0,
}

function setup() {
  let canvas = createCanvas(500, 400);
  canvas.parent("p5-canvas-container");
  background(220);

  setupDatabase();
  dbRef = getDBReference("realtimeData");

  dbRef.push(posData)
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
  background(220);
  circle(posData.x, posData.y, 30);
}

function mousePressed() {
  let newData = { x: mouseX, y: mouseY };
  if (myId) {
    dbRef.child(myId).set(newData)
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
    clearDBReference("realtimeData")
  }
}



function setupDatabase() {
  const firebaseConfig = {
    apiKey: "AIzaSyCDiL8DF0iYApUsLi1-LCihDV16uMW4sUQ",
    authDomain: "fir-demo-at-6.firebaseapp.com",
    databaseURL: "https://fir-demo-at-6-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "fir-demo-at-6",
    storageBucket: "fir-demo-at-6.firebasestorage.app",
    messagingSenderId: "746729256101",
    appId: "1:746729256101:web:b3a3bc6690881d2a24894c"
  };

  firebase.initializeApp(firebaseConfig);
  database = firebase.database();

  console.log(database);
}


function getDBReference(refName) {
  let ref = database.ref(refName);

  // event listeners
  ref.on("child_added", data => {
    console.log("! DB: Item added");
    console.log(data.key);
    console.log(data.val());
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

    posData = data.val();
  });
  ref.on("child_moved", data => {
    console.log("! DB MOVED");
    console.log(data.key);
    console.log(data.val());
  })

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