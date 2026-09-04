import type { PeerId, PeerRole } from "@/entities/peer/types";
import type { RoomId } from "@/entities/room/types";
import type { ClientMessage, ServerMessage } from "@/shared/signaling/protocol";

export type SignalingJoinMeta = {
  peerId: PeerId;
  roleHint?: PeerRole;
};

export interface ISignalingPort {
  connect(roomId: RoomId, meta: SignalingJoinMeta): void;
  send(event: ClientMessage): void;
  subscribe(handler: (event: ServerMessage) => void): () => void;
  disconnect(): void;
}
