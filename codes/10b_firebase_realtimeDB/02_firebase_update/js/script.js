let database, dbRef;

let pos = { x: 0, y: 0 };

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
  dbRef = FirebaseDatabase.ref(database, "demo/mousePosition");

  FirebaseDatabase.onValue(
    dbRef,
    function (snapshot) {
      const savedPosition = snapshot.val();
      if (savedPosition) {
        pos = savedPosition;
      } else {
        FirebaseDatabase.set(dbRef, pos).catch(function (error) {
          console.error("Could not save the first position:", error.message);
        });
      }
    },
    function (error) {
      console.error("Could not read the position:", error.message);
    }
  );
}

function windowResized() {
  resizeCanvas(windowWidth, max(1, windowHeight - buttonHeight));
}

function draw() {
  background(220);
  ellipse(pos.x, pos.y, 30, 30);
  fill(30);
  text("Open this same URL in another window and watch both windows update!", 10, 20);
}

function mouseDragged() {
  let newPos = { x: mouseX, y: mouseY };

  FirebaseDatabase.update(dbRef, newPos).catch(function (error) {
    console.error("Could not change the position:", error.message);
  });
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
