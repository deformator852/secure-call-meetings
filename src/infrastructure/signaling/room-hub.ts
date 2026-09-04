import type { WebSocket } from "ws";
import type { PeerId, PeerRole } from "@/entities/peer/types";
import type { RoomId } from "@/entities/room/types";
import type { ClientMessage, ServerMessage } from "@/shared/signaling/protocol";
import { isUuid } from "@/shared/signaling/protocol";

const MAX_PEERS = 2;

type SocketPeer = {
  peerId: PeerId;
  role: PeerRole;
  socket: WebSocket;
};

type Room = {
  id: RoomId;
  hostId: PeerId | undefined;
  peers: Map<PeerId, SocketPeer>;
};

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

export class RoomHub {
  private readonly rooms = new Map<RoomId, Room>();
  private readonly sockets = new Map<WebSocket, { roomId: RoomId; peerId: PeerId }>();

  handleMessage(socket: WebSocket, raw: string): void {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw) as ClientMessage;
    } catch {
      send(socket, { type: "error", message: "invalid-json" });
      return;
    }

    if (message.type === "join") {
      this.join(socket, message.roomId, message.peerId);
      return;
    }

    const binding = this.sockets.get(socket);
    if (!binding) {
      send(socket, { type: "error", message: "not-joined" });
      return;
    }

    if (message.type === "offer" || message.type === "answer" || message.type === "ice") {
      this.forward(binding.roomId, binding.peerId, message);
    }
  }

  disconnect(socket: WebSocket): void {
    const binding = this.sockets.get(socket);
    if (!binding) {
      return;
    }
    this.sockets.delete(socket);
    const room = this.rooms.get(binding.roomId);
    if (!room) {
      return;
    }
    room.peers.delete(binding.peerId);

    if (room.hostId === binding.peerId) {
      for (const peer of room.peers.values()) {
        send(peer.socket, { type: "room-closed" });
        this.sockets.delete(peer.socket);
        peer.socket.close();
      }
      this.rooms.delete(room.id);
      return;
    }

    if (room.peers.size === 0) {
      this.rooms.delete(room.id);
      return;
    }

    for (const peer of room.peers.values()) {
      send(peer.socket, { type: "peer-left", peerId: binding.peerId });
    }
  }

  private join(socket: WebSocket, roomId: RoomId, peerId: PeerId): void {
    if (!isUuid(roomId) || !isUuid(peerId)) {
      send(socket, { type: "error", message: "invalid-id" });
      return;
    }

    if (this.sockets.has(socket)) {
      send(socket, { type: "error", message: "already-joined" });
      return;
    }

    let room = this.rooms.get(roomId);
    if (!room) {
      room = { id: roomId, hostId: undefined, peers: new Map() };
      this.rooms.set(roomId, room);
    }

    if (room.peers.size >= MAX_PEERS) {
      send(socket, { type: "room-full" });
      socket.close();
      return;
    }

    if (room.peers.has(peerId)) {
      send(socket, { type: "error", message: "peer-exists" });
      return;
    }

    const role: PeerRole = room.hostId ? "guest" : "host";
    if (role === "host") {
      room.hostId = peerId;
    }

    const others = [...room.peers.values()].map((peer) => ({
      peerId: peer.peerId,
      role: peer.role,
    }));

    room.peers.set(peerId, { peerId, role, socket });
    this.sockets.set(socket, { roomId, peerId });

    send(socket, { type: "joined", role, peers: others });

    for (const peer of room.peers.values()) {
      if (peer.peerId !== peerId) {
        send(peer.socket, { type: "peer-joined", peerId, role });
      }
    }
  }

  private forward(
    roomId: RoomId,
    from: PeerId,
    message: Extract<ClientMessage, { type: "offer" | "answer" | "ice" }>,
  ): void {
    const room = this.rooms.get(roomId);
    const target = room?.peers.get(message.to);
    if (!target) {
      return;
    }
    switch (message.type) {
      case "offer":
        send(target.socket, { type: "offer", from, payload: message.payload });
        break;
      case "answer":
        send(target.socket, { type: "answer", from, payload: message.payload });
        break;
      case "ice":
        send(target.socket, { type: "ice", from, payload: message.payload });
        break;
    }
  }
}
