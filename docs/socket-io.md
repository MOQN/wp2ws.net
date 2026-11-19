# Node.js and Socket.IO

## Resources

* [Node.js Official Website](https://nodejs.org/)
* [Socket.IO Official Website](https://socket.io/)
* [Socket.IO Documentation](https://socket.io/docs/v4/)

## Why Node.js?

* **Node.js** runs JavaScript on the server.
* The **Express app (`app`)** handles HTTP requests. `express.static("public")` serves files from `public/`.
* The **HTTP server (`server`)** listens for connections. `http.createServer(app)` passes HTTP requests to the Express app.

## Why Socket.IO?

* The **Socket.IO server (`io`)** attaches to the HTTP server and exchanges **named events** with browsers.
* **Broadcasting** sends an update from one browser to the other connected browsers.

?> **WebSocket vs. Socket.IO** — WebSocket is a protocol for two-way communication. Socket.IO can use WebSocket as a transport and adds named events, automatic reconnection, and an HTTP long-polling fallback. Connect to a Socket.IO server with the Socket.IO client. [Socket.IO Documentation](https://socket.io/docs/v4/)

## Node.js Setup

### 1. Initialize the project

* Install Node.js, then run these commands in your project folder.

```sh
npm init -y
npm pkg set type=module
npm install express
```

### 2. Create the Express app and HTTP server

* Create `server.js`. Put your web page in `public/index.html`.

```javascript
import express from "express";
import http from "node:http";

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);

server.listen(3000, "127.0.0.1", () => {
  console.log("Server running at http://127.0.0.1:3000");
});
```

* Run `node server.js` and open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Socket.IO Setup

### 1. Attach the Socket.IO server

* Run `npm install socket.io`.
* Add this to `server.js` after `http.createServer(app)` and before `server.listen(...)`.
* **`io`** is the Socket.IO server. Inside the connection handler, **`socket`** represents one connected browser.
* **`socket.on()`** listens for an event. **`socket.broadcast.emit()`** sends it to all other connected browsers. [Broadcasting events](https://socket.io/docs/v4/broadcasting-events/)

```javascript
import { Server } from "socket.io";

const io = new Server(server);

io.on("connection", (socket) => {
  socket.on("message_name", (data) => {
    socket.broadcast.emit("message_name", data);
  });
});
```

### 2. Connect the Socket.IO client

* Add this before the closing `</body>` tag in `public/index.html`.
* **`io()`** connects the browser to the Socket.IO server. **`socket.emit()`** sends an event, and **`socket.on()`** listens for one. Use the same event name on both sides. [Emitting events](https://socket.io/docs/v4/emitting-events/)

```html
<button id="send">Send</button>

<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io();

  socket.on("message_name", (data) => {
    console.log(data);
  });

  document.querySelector("#send").addEventListener("click", () => {
    socket.emit("message_name", { text: "Hello!" });
  });
</script>
```

### 3. Try it in two tabs

?> **Restart after server changes.** Whenever you edit `server.js` or other server-side code, stop the server with `Ctrl+C`, then run `node server.js` again.

* Open the page in two tabs.
* Click **Send** in one tab. Check the browser console in the other tab.
