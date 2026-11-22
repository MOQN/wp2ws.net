# Node.js and Socket.IO

## Resources

* [Node.js Official Website](https://nodejs.org/)
* [Socket.IO Official Website](https://socket.io/)
* [Socket.IO Documentation](https://socket.io/docs/v4/)
* [Emitting events](https://socket.io/docs/v4/emitting-events/)
* [Listening to events](https://socket.io/docs/v4/listening-to-events/)
* [Broadcasting events](https://socket.io/docs/v4/broadcasting-events/)

## Why Node.js?

* **Node.js** runs the JavaScript in `server.js`.
* The **Express app (`app`)** serves the HTML, CSS, and JavaScript in `public/`.
* The **HTTP server (`server`)** listens on a port and passes HTTP requests to the Express app.

## Why Socket.IO?

* The **Socket.IO server (`io`)** uses the same HTTP server to exchange **named events** with browsers.
* Send the mouse position as `{ x, y }`. The server forwards it so another browser can draw the point.

?> **WebSocket vs. Socket.IO** — WebSocket is a protocol for two-way communication. Socket.IO can use WebSocket underneath and adds named events, automatic reconnection, and an HTTP long-polling fallback. Use the Socket.IO client to connect to a Socket.IO server.

## Node.js Setup

### 1. Install dependencies

* From the folder with `package.json` and `server.js`, run `npm install`.
* Starting from an empty folder?
  * `npm init -y`
  * `npm pkg set type=module`
  * `npm install express socket.io`

### 2. Run the server

* In `server.js`, pass the **Express app (`app`)** to `http.createServer(app)`.
* Serve `public/` relative to the folder containing `server.js`.
* Run `node server.js` and open [http://localhost:3000](http://localhost:3000). The default port is `3000`.

```javascript
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

app.use(express.static(import.meta.dirname + "/public"));

io.on("connection", function (socket) {
  socket.on("message_name", function (data) {
    socket.broadcast.emit("message_name", data);
  });
});

server.listen(port, function () {
  console.log("Open http://localhost:" + port);
});
```

?> **Restart after server changes.** Whenever you edit `server.js`, stop it with `Ctrl+C` and run `node server.js` again. For changes in `public/`, reload the browser page.

## Socket.IO Setup

### 1. Attach Socket.IO to the HTTP server

* **`new Server(server)`** attaches Socket.IO to the HTTP server in `server.js`.
* **`io.on("connection", ...)`** runs when a client connects. The **`socket`** inside it represents that client.
* **`socket.on("message_name", ...)`** receives the coordinates. **`socket.broadcast.emit()`** forwards them to the other browsers.

### 2. Connect from the browser

* In `public/index.html`, load the Socket.IO client before your sketch. The Socket.IO server serves `/socket.io/socket.io.js`.

```html
<script src="/socket.io/socket.io.js"></script>
```

* In `public/js/script.js`, call `setupSocket()` from p5.js `setup()`.
* Send the current coordinates on `mouseMoved()` while the pointer is inside the canvas. Store incoming coordinates in `otherPoint` and use them to draw the other browser's red point in `draw()`.

```javascript
let socket;
let otherPoint = null;

function setupSocket() {
  socket = io();
  socket.on("message_name", receiveViaSocket);
}

function mouseMoved() {
  if (mouseX < 0 || mouseY < 0 || mouseX > width || mouseY > height) return;
  sendViaSocket();
}

function sendViaSocket() {
  if (!socket || !socket.connected) return;

  const data = {
    x: mouseX,
    y: mouseY
  };
  socket.emit("message_name", data);
}

function receiveViaSocket(data) {
  otherPoint = data;
}
```

### 3. Choose who gets the event

* **Browser `socket.emit()`** sends an event to the server.
* **Server `socket.emit()`** sends an event to one client. Use it to send `users_state` to a newly connected client.
* **Server `socket.broadcast.emit()`** sends an event to every other connected client. Use it to forward `message_name`.
* **Server `io.emit()`** sends an event to every connected client, including the sender. Use it to share updated `block_state`.

* [Socket.IO Docs — Broadcasting events](https://socket.io/docs/v4/broadcasting-events/)

### 4. Try it in two windows

* Open `http://localhost:3000` in two browser windows.
* Move the mouse over one canvas. Look for the red point following it in the other window.
