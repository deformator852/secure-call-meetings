import type { RoomId } from "@/entities/room/types";
import type { ISignalingPort, SignalingJoinMeta } from "@/shared/ports/signaling";
import type { ClientMessage, ServerMessage } from "@/shared/signaling/protocol";

export class WsSignalingClient implements ISignalingPort {
  private socket: WebSocket | undefined;
  private readonly listeners = new Set<(event: ServerMessage) => void>();
  private roomId: RoomId | undefined;
  private meta: SignalingJoinMeta | undefined;

  constructor(private readonly url: string) {}

  connect(roomId: RoomId, meta: SignalingJoinMeta): void {
    this.disconnect();
    this.roomId = roomId;
    this.meta = meta;
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      if (this.socket !== socket || !this.roomId || !this.meta) {
        return;
      }
      this.send({ type: "join", roomId: this.roomId, peerId: this.meta.peerId });
    });

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }
      try {
        const parsed = JSON.parse(event.data) as ServerMessage;
        this.listeners.forEach((listener) => listener(parsed));
      } catch {
        // ignore malformed frames
      }
    });
  }

  send(event: ClientMessage): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(event));
  }

  subscribe(handler: (event: ServerMessage) => void): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = undefined;
  }
}
