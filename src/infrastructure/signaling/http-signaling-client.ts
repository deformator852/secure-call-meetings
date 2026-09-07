import type { RoomId } from "@/entities/room/types";
import type { ISignalingPort, SignalingJoinMeta } from "@/shared/ports/signaling";
import type { ClientMessage, ServerMessage } from "@/shared/signaling/protocol";

export class HttpSignalingClient implements ISignalingPort {
  private source: EventSource | undefined;
  private peerId: string | undefined;
  private readonly listeners = new Set<(event: ServerMessage) => void>();

  connect(roomId: RoomId, meta: SignalingJoinMeta): void {
    this.disconnect();
    this.peerId = meta.peerId;
    const params = new URLSearchParams({ roomId, peerId: meta.peerId });
    const source = new EventSource(`/signal?${params.toString()}`);
    this.source = source;

    source.addEventListener("message", (event) => {
      try {
        const parsed = JSON.parse(event.data) as ServerMessage;
        this.listeners.forEach((listener) => listener(parsed));
        if (parsed.type === "room-full" || parsed.type === "room-closed") {
          this.disconnect();
        }
      } catch {
        // ignore malformed frames
      }
    });
    source.addEventListener("error", () => {
      // EventSource reconnects with the same peer id; the hub replaces the socket.
    });
  }

  send(event: ClientMessage): void {
    if (!this.peerId || event.type === "join") {
      return;
    }
    void fetch(`/signal?peerId=${encodeURIComponent(this.peerId)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    });
  }

  subscribe(handler: (event: ServerMessage) => void): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  disconnect(): void {
    this.source?.close();
    this.source = undefined;
  }
}
