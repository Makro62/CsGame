import express from "express";
import { Server, LobbyRoom } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { createServer } from "http";
import { GameRoom } from "./rooms/GameRoom.js";

const port = Number(process.env.PORT) || 2567;

const app = express();
app.use(express.json());
app.use("/colyseus", monitor());

const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });

// Lobby room for server browser
gameServer.define("lobby", LobbyRoom);

// Game room with realtime listing for lobby updates
gameServer.define("fps_room", GameRoom).enableRealtimeListing();

httpServer.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Colyseus monitor: http://localhost:${port}/colyseus`);
});

// Graceful shutdown
let isShuttingDown = false;

function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received, shutting down gracefully...`);
  gameServer.gracefullyShutdown(false).then(() => {
    httpServer.close(() => process.exit(0));
  }).catch(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
