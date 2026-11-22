# Firebase RealtimeDatabase

## Resources

* [Firebase Official Website](https://firebase.google.com/)
* [Firebase RealtimeDatabase Documentation](https://firebase.google.com/docs/database)

## Why RealtimeDatabase?

* **RealtimeDatabase:** One JSON tree! Listen to changes at a path like `users/`.
* **Cloud Firestore:** Collections and documents. Better suited to more complex queries. (It also supports real-time updates.)
* **For our example:** We can use it to sync player positions and shared object state with a simple JSON tree!
* [Official comparison](https://firebase.google.com/docs/database/rtdb-vs-firestore)

## Setup

### Firebase Project

* Let's go to the [Firebase website](https://firebase.google.com/).

![Firebase RealtimeDatabase — Step 01](assets-firebase-rtdb/firebase-rtdb-01.png)

* Create a **new Firebase project**.

![Firebase RealtimeDatabase — Step 02](assets-firebase-rtdb/firebase-rtdb-02.png)

* Give your project a short name.

![Firebase RealtimeDatabase — Step 03](assets-firebase-rtdb/firebase-rtdb-03.png)

* Feel free to **enable** Gemini.


![Firebase RealtimeDatabase — Step 04](assets-firebase-rtdb/firebase-rtdb-04.png)

* Let's **turn off Google Analytics** for this project.

![Firebase RealtimeDatabase — Step 05](assets-firebase-rtdb/firebase-rtdb-05.png)

* Wait a bit :D

![Firebase RealtimeDatabase — Step 06](assets-firebase-rtdb/firebase-rtdb-06.png)

* Your project is ready. Yay!

![Firebase RealtimeDatabase — Step 07](assets-firebase-rtdb/firebase-rtdb-07.png)


* You’ll see your project in **Project Overview** and on the Firebase Console home page.

![Firebase RealtimeDatabase — Step 08](assets-firebase-rtdb/firebase-rtdb-08.png)

### RealtimeDatabase
* In the console, go to **Databases & Storage → Realtime Database**.

![Firebase RealtimeDatabase — Step 09](assets-firebase-rtdb/firebase-rtdb-09.png)

* Click **Create Database**.

![Firebase RealtimeDatabase — Step 10](assets-firebase-rtdb/firebase-rtdb-10.png)

* Let's pick **Singapore**. It's the closest to us.

![Firebase RealtimeDatabase — Step 11](assets-firebase-rtdb/firebase-rtdb-11.png)

* Let's start in **test mode** for now.
  * Test mode allows public reads and writes while it’s active. We’ll skip custom security rules in this class. When you’re done testing, set both `.read` and `.write` to `false` in **Rules**.

![Firebase RealtimeDatabase — Step 12](assets-firebase-rtdb/firebase-rtdb-12.png)

* Your database is ready. This view might look unfamiliar, but you can add data right here.

![Firebase RealtimeDatabase — Step 13](assets-firebase-rtdb/firebase-rtdb-13.png)

* Let’s try adding `x` with the numeric value `100`.

![Firebase RealtimeDatabase — Step 14](assets-firebase-rtdb/firebase-rtdb-14.png)

* You should see the new value in the database.


![Firebase RealtimeDatabase — Step 15](assets-firebase-rtdb/firebase-rtdb-15.png)

!> **That’s a **real-time update**!** 🎉 <br> When a connected page is listening to this path, the change triggers its listener. Now let’s connect our project.

### Web App

* Go to **Project Overview** and click **+ Add app** under your project name.

![Firebase RealtimeDatabase — Step 16](assets-firebase-rtdb/firebase-rtdb-16.png)

* We’re building a web project, so select **Web (`</>`)**.

![Firebase RealtimeDatabase — Step 17](assets-firebase-rtdb/firebase-rtdb-17.png)

* Give your app a short name and click **Register app**.

![Firebase RealtimeDatabase — Step 18](assets-firebase-rtdb/firebase-rtdb-18.png)

* Scroll down to **SDK setup and configuration**. For now, just copy `firebaseConfig` for your project.

![Firebase RealtimeDatabase — Step 19](assets-firebase-rtdb/firebase-rtdb-19.png)

* You can also find `firebaseConfig` from **Project Overview**. Click the app you already created; it may appear as **1 app**.

![Firebase RealtimeDatabase — Step 20](assets-firebase-rtdb/firebase-rtdb-20.png)

* Click the gear icon for that app.

![Firebase RealtimeDatabase — Step 21](assets-firebase-rtdb/firebase-rtdb-21.png)

* You should land on **General**. Scroll down.

![Firebase RealtimeDatabase — Step 22](assets-firebase-rtdb/firebase-rtdb-22.png)

* Find it under **SDK setup and configuration → Config**.

![Firebase RealtimeDatabase — Step 23](assets-firebase-rtdb/firebase-rtdb-23.png)

!> That's it! Copy `firebaseConfig` and use it in your project. See below for details.

?> Check that it includes `databaseURL`. If you created the app before the database, it may not be listed yet.




## Firebase Configuration

* In `index.html`, import the Firebase modules inside a `<script type="module">` block.
* Imports stay inside that block. Put `FirebaseApp` and `FirebaseDatabase` on `window` so `script.js` can use them as globals without importing them again.
* Load `script.js` with `defer` after the module block so it runs after the globals are set.

```html
<script type="module">
  import * as FirebaseApp from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
  import * as FirebaseDatabase from "https://www.gstatic.com/firebasejs/13.4.0/firebase-database.js";

  window.FirebaseApp = FirebaseApp;
  window.FirebaseDatabase = FirebaseDatabase;
</script>
```

* In `js/script.js` (01–05) or `js/script-firebase.js` (06–11), use the globals to initialize Firebase. Replace the dummy config with your own `firebaseConfig`, including `databaseURL`!
* The snippets on this page and the [Firebase class examples](/examples/10b/01.md) use the modular SDK.

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:example"
};

const app = FirebaseApp.initializeApp(firebaseConfig);
const database = FirebaseDatabase.getDatabase(app);
```

## RealtimeDatabase Event Listeners

* **`FirebaseDatabase.onValue()`** — Gives you the whole snapshot at a path when the data first loads and whenever it changes.
* **`FirebaseDatabase.onChildAdded()`** — Fires once for each existing direct child, then once for each new child.
* **`FirebaseDatabase.onChildChanged()`** — Fires when a direct child's data changes. Gives you the updated child.
* **`FirebaseDatabase.onChildRemoved()`** — Fires when a direct child is removed. Gives you the removed child's snapshot.
* **`FirebaseDatabase.onChildMoved()`** — Fires when a child's position in an ordered query changes.

* Say each child under `points/` has an `x` and a `y`. In p5.js, attach this listener after `createCanvas()` to draw a square for each point.

```javascript
const reference = FirebaseDatabase.ref(database, "points");

FirebaseDatabase.onChildAdded(reference, data => {
  console.log("! DB ADDED");
  console.log(data.key);
  console.log(data.val());

  const value = data.val();
  fill(255);
  rect(value.x, value.y, 10, 10);
});
```

* `data.key` is the child's ID. `data.val()` is what you stored there.
* [Read and write data](https://firebase.google.com/docs/database/web/read-and-write)
* [Work with lists of data](https://firebase.google.com/docs/database/web/lists-of-data)

## Organizing and Sending Data

Let's say we're moving a book around in a shared room. Everyone should see where it ends up.

* **Choose a path.** Store each object's current state at `objects/<objectId>`. Reuse the same ID when that object moves.
* **Group related values.** Put coordinates together in a `position` object, and keep fields like `color` beside it.
* **`FirebaseDatabase.set()`** replaces everything at that path. Use it to write the object's initial state.
* **`FirebaseDatabase.update()`** changes only the fields you pass in. Use it to send a new position while keeping the object's color.
* **`FirebaseDatabase.push()`** creates a new child with a generated key. Use it for a list of messages or actions.

```javascript
const objectRef = FirebaseDatabase.ref(database, "objects/book-01");

// Write the initial state.
FirebaseDatabase.set(objectRef, {
  position: { x: 0, y: 0, z: 0 },
  color: "#ff6600"
});

// Send a new position when someone moves the book.
FirebaseDatabase.update(objectRef, { position: { x: 20, y: 0, z: -5 } });

// Record a move under its own generated key.
const actionsRef = FirebaseDatabase.ref(database, "actions");
FirebaseDatabase.push(actionsRef, {
  objectId: "book-01",
  type: "move"
});
```

* Listen at `objects/` with `FirebaseDatabase.onChildAdded()` and `FirebaseDatabase.onChildChanged()`. Use `data.key` to identify the object and `data.val()` to read its state.
