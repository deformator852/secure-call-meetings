import { WebSocketServer } from "ws";
import { RoomHub } from "../src/infrastructure/signaling/room-hub";

const port = Number.parseInt(process.env.SIGNALING_PORT ?? "3001", 10);
const hub = new RoomHub();
const wss = new WebSocketServer({ port });

wss.on("connection", (socket) => {
  socket.on("message", (data) => {
    hub.handleMessage(socket, data.toString());
  });
  socket.on("close", () => {
    hub.disconnect(socket);
  });
  socket.on("error", () => {
    hub.disconnect(socket);
  });
});

console.log(`signaling ws://localhost:${port}`);
