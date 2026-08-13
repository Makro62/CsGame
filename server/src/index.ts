import colyseus, { LobbyRoom } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { createServer } from "http";
import { GameRoom } from "./rooms/GameRoom.js";

const { Server } = colyseus;

const port = Number(process.env.PORT) || 2567;

const httpServer = createServer();
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
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  gameServer.gracefullyShutdown().then(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  gameServer.gracefullyShutdown().then(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
});
