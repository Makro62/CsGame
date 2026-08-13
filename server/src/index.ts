import colyseus from "colyseus";
import { monitor } from "@colyseus/monitor";
import { createServer } from "http";
import { GameRoom } from "./rooms/GameRoom.js";

const { Server } = colyseus;

const port = 2567;

const httpServer = createServer();
const gameServer = new Server({ server: httpServer });

gameServer.define("fps_room", GameRoom);

httpServer.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Colyseus monitor: http://localhost:${port}/colyseus`);
});
