let database;
let blocksRef;

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
  database = FirebaseDatabase.getDatabase(app);
  blocksRef = FirebaseDatabase.ref(database, "demo/sharedBlocks");

  FirebaseDatabase.onChildAdded(blocksRef, function (snapshot) {
    const block = getBlock(snapshot.key, snapshot.val());
    blocks.set(snapshot.key, block);
    scene.add(block);
  });

  FirebaseDatabase.onChildRemoved(blocksRef, function (snapshot) {
    const block = blocks.get(snapshot.key);
    if (!block) return;
    scene.remove(block);
    block.geometry.dispose();
    block.material.dispose();
    blocks.delete(snapshot.key);
  });
}

function addBlock(x, z) {
  const color = floor(random(0x1000000));
  FirebaseDatabase.push(blocksRef, { x: x, z: z, color: color }).catch(console.error);
}

function removeBlock(key) {
  FirebaseDatabase.remove(FirebaseDatabase.child(blocksRef, key)).catch(console.error);
}

function resetData() {
  FirebaseDatabase.remove(blocksRef).catch(console.error);
}
