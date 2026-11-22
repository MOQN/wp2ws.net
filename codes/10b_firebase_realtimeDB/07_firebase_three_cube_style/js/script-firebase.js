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
  boxesRef = FirebaseDatabase.ref(database, "demo/cubeStyles");

  FirebaseDatabase.onValue(boxesRef, function (snapshot) {
    objects.forEach(function (box, index) {
      if (box === draggedBox) return;
      const position = snapshot.child(String(index)).val() || {};
      box.position.copy(box.userData.originalPosition);
      if ([position.x, position.y, position.z].every(Number.isFinite)) {
        box.position.set(position.x, position.y, position.z);
      }
      box.material.color.copy(box.userData.originalColor);
      box.scale.setScalar(90);
      if (typeof position.color === "string") box.material.color.set(position.color);
      if (Number.isFinite(position.size)) box.scale.setScalar(position.size);
      if (box === selectedBox) {
        params.color = "#" + box.material.color.getHexString();
        params.size = box.scale.x;
      }
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
  FirebaseDatabase.update(boxRef, position).catch(console.error);
}

function saveBoxStyle() {
  if (!selectedBox) return;
  const boxRef = FirebaseDatabase.child(boxesRef, String(objects.indexOf(selectedBox)));
  FirebaseDatabase.update(boxRef, { color: params.color, size: params.size }).catch(console.error);
}

function resetData() {
  FirebaseDatabase.remove(boxesRef).catch(console.error);
}
