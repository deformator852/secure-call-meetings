import type { PeerId, PeerRole } from "@/entities/peer/types";
import type { RoomId } from "@/entities/room/types";
import type { ClientMessage, ServerMessage } from "@/shared/signaling/protocol";
import { isUuid } from "@/shared/signaling/protocol";

const MAX_PEERS = 2;

export type SignalLink = {
  send(message: ServerMessage): void;
  close(): void;
};

type SocketPeer = {
  peerId: PeerId;
  role: PeerRole;
  link: SignalLink;
};

type Room = {
  id: RoomId;
  hostId: PeerId | undefined;
  peers: Map<PeerId, SocketPeer>;
};

export class RoomHub {
  private readonly rooms = new Map<RoomId, Room>();
  private readonly byLink = new Map<SignalLink, { roomId: RoomId; peerId: PeerId }>();
  private readonly byPeer = new Map<PeerId, SignalLink>();

  join(link: SignalLink, roomId: RoomId, peerId: PeerId): void {
    if (!isUuid(roomId) || !isUuid(peerId)) {
      link.send({ type: "error", message: "invalid-id" });
      return;
    }

    if (this.byLink.has(link) || this.byPeer.has(peerId)) {
      link.send({ type: "error", message: "already-joined" });
      return;
    }

    let room = this.rooms.get(roomId);
    if (!room) {
      room = { id: roomId, hostId: undefined, peers: new Map() };
      this.rooms.set(roomId, room);
    }

    if (room.peers.size >= MAX_PEERS) {
      link.send({ type: "room-full" });
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

    room.peers.set(peerId, { peerId, role, link });
    this.byLink.set(link, { roomId, peerId });
    this.byPeer.set(peerId, link);

    link.send({ type: "joined", role, peers: others });

    for (const peer of room.peers.values()) {
      if (peer.peerId !== peerId) {
        peer.link.send({ type: "peer-joined", peerId, role });
      }
    }
  }

  dispatch(fromPeerId: PeerId, message: ClientMessage): void {
    if (message.type === "join") {
      return;
    }
    const link = this.byPeer.get(fromPeerId);
    if (!link) {
      return;
    }
    this.handleFromLink(link, message);
  }

  handleRaw(link: SignalLink, raw: string): void {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw) as ClientMessage;
    } catch {
      link.send({ type: "error", message: "invalid-json" });
      return;
    }

    if (message.type === "join") {
      this.join(link, message.roomId, message.peerId);
      return;
    }

    this.handleFromLink(link, message);
  }

  disconnect(link: SignalLink): void {
    const binding = this.byLink.get(link);
    if (!binding) {
      return;
    }
    this.byLink.delete(link);
    this.byPeer.delete(binding.peerId);
    const room = this.rooms.get(binding.roomId);
    if (!room) {
      return;
    }
    room.peers.delete(binding.peerId);

    if (room.hostId === binding.peerId) {
      for (const peer of room.peers.values()) {
        peer.link.send({ type: "room-closed" });
        this.byLink.delete(peer.link);
        this.byPeer.delete(peer.peerId);
        peer.link.close();
      }
      this.rooms.delete(room.id);
      return;
    }

    if (room.peers.size === 0) {
      this.rooms.delete(room.id);
      return;
    }

    for (const peer of room.peers.values()) {
      peer.link.send({ type: "peer-left", peerId: binding.peerId });
    }
  }

  private handleFromLink(link: SignalLink, message: ClientMessage): void {
    const binding = this.byLink.get(link);
    if (!binding) {
      link.send({ type: "error", message: "not-joined" });
      return;
    }
    if (message.type === "offer" || message.type === "answer" || message.type === "ice") {
      this.forward(binding.roomId, binding.peerId, message);
    }
  }

  private forward(
    roomId: RoomId,
    from: PeerId,
    message: Extract<ClientMessage, { type: "offer" | "answer" | "ice" }>,
  ): void {
    const target = this.rooms.get(roomId)?.peers.get(message.to);
    if (!target) {
      return;
    }
    switch (message.type) {
      case "offer":
        target.link.send({ type: "offer", from, payload: message.payload });
        break;
      case "answer":
        target.link.send({ type: "answer", from, payload: message.payload });
        break;
      case "ice":
        target.link.send({ type: "ice", from, payload: message.payload });
        break;
    }
  }
}
