let boxesRef;

let draggedBox;

function setupDB() {
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
  const database = FirebaseDatabase.getDatabase(app);
  boxesRef = FirebaseDatabase.ref(database, "demo/cubePositions");

  FirebaseDatabase.onValue(boxesRef, function (snapshot) {
    objects.forEach(function (box, index) {
      if (box === draggedBox) return;
      const position = snapshot.child(String(index)).val() || {};
      box.position.copy(box.userData.originalPosition);
      if (![position.x, position.y, position.z].every(Number.isFinite)) return;
      box.position.set(position.x, position.y, position.z);
    });
  });
}

function saveBoxPosition(box) {
  if (!boxesRef) return;
  const boxRef = FirebaseDatabase.child(boxesRef, String(objects.indexOf(box)));
  const position = {
    x: box.position.x,
    y: box.position.y,
    z: box.position.z
  };
  FirebaseDatabase.set(boxRef, position).catch(console.error);
}

function resetData() {
  FirebaseDatabase.remove(boxesRef).catch(console.error);
}
