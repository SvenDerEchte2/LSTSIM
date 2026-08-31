const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const rooms = {};     // room -> Set of ws
const roomLocks = {}; // room -> { id, releaseTimeout }

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (err) {
      console.error("❌ Ungültiges JSON empfangen:", msg);
      return;
    }

    const { type, room, payload, from, to } = data;

    // --- Raum beitreten ---
    if (type === "join") {
      ws.room = room;
      ws.id = from;

      if (!rooms[room]) rooms[room] = new Set();

      // Send List of active users to new client
      const activeUsers = Array.from(rooms[room]).map(c => c.id);
      ws.send(JSON.stringify({ type: "user_list", users: activeUsers }));

      rooms[room].add(ws);
      console.log(`👤 ${from} ist Raum '${room}' beigetreten`);

      // Notify existing users
      broadcast(room, { type: "user_joined", id: from }, ws);

      // Falls Raum derzeit gesperrt ist
      if (roomLocks[room]) {
        ws.send(JSON.stringify({ type: "lock_granted", holder: roomLocks[room].id }));
      }
      return;
    }

    // --- WebRTC Signalisierung (Zielgerichtet) ---
    if (type === "signal") {
      const targetWs = findClient(room, to);
      if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({ type: "signal", from, payload }));
      }
      return;
    }

    // --- PTT Sprechanforderung ---
    if (type === "request_lock") {
      if (!roomLocks[room]) {
        roomLocks[room] = { id: from };
        console.log(`🔒 Sprechrecht erteilt an ${from} in Raum ${room}`);
        broadcast(room, { type: "lock_granted", holder: from });
      } else if (roomLocks[room].id !== from) {
        ws.send(JSON.stringify({ type: "busy", holder: roomLocks[room].id }));
        console.log(`🚫 ${from} wollte sprechen, aber Raum ${room} ist belegt von ${roomLocks[room].id}`);
      }
      return;
    }

    // --- PTT Sprechfreigabe (mit kurzer Nachklingzeit) ---
    if (type === "release_lock") {
      if (roomLocks[room] && roomLocks[room].id === from) {
        if (roomLocks[room].releaseTimeout) {
          clearTimeout(roomLocks[room].releaseTimeout);
        }

        // 500ms Nachklingzeit zum Puffern letzter Audio-Packete
        roomLocks[room].releaseTimeout = setTimeout(() => {
          delete roomLocks[room];
          console.log(`🔓 Kanal in Raum ${room} wieder frei`);
          broadcast(room, { type: "unlock", holder: from });
        }, 500);
      }
      return;
    }
  });

  ws.on("close", () => handleDisconnect(ws));
  ws.on("error", (err) => console.error("WebSocket Verbindungsfehler:", err));
});

function handleDisconnect(ws) {
  const room = ws.room;
  if (room && rooms[room]) {
    rooms[room].delete(ws);
    broadcast(room, { type: "user_left", id: ws.id });

    if (rooms[room].size === 0) {
      delete rooms[room];
      delete roomLocks[room];
    }
  }

  if (room && roomLocks[room] && roomLocks[room].id === ws.id) {
    if (roomLocks[room].releaseTimeout) clearTimeout(roomLocks[room].releaseTimeout);
    delete roomLocks[room];
    broadcast(room, { type: "unlock", holder: "disconnect" });
  }
}

function findClient(room, id) {
  if (!rooms[room]) return null;
  for (const client of rooms[room]) {
    if (client.id === id) return client;
  }
  return null;
}

function broadcast(room, data, exclude) {
  if (!rooms[room]) return;
  for (const client of rooms[room]) {
    if (client.readyState === WebSocket.OPEN && client !== exclude) {
      client.send(JSON.stringify(data));
    }
  }
}

// Heartbeat alle 25s (Verhindert Disconnects auf Render.com)
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);

wss.on("close", () => clearInterval(interval));

console.log(`✅ Funk-Server gestartet auf Port ${PORT}`);