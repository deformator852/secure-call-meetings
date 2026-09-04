import type { PeerId, PeerRole } from "@/entities/peer/types";
import type { RoomId } from "@/entities/room/types";

export type IcePayload = RTCIceCandidateInit;
export type SdpPayload = RTCSessionDescriptionInit;

export type ClientMessage =
  | { type: "join"; roomId: RoomId; peerId: PeerId }
  | { type: "offer"; to: PeerId; payload: SdpPayload }
  | { type: "answer"; to: PeerId; payload: SdpPayload }
  | { type: "ice"; to: PeerId; payload: IcePayload };

export type PeerInfo = {
  peerId: PeerId;
  role: PeerRole;
};

export type ServerMessage =
  | { type: "joined"; role: PeerRole; peers: PeerInfo[] }
  | { type: "peer-joined"; peerId: PeerId; role: PeerRole }
  | { type: "peer-left"; peerId: PeerId }
  | { type: "room-full" }
  | { type: "room-closed" }
  | { type: "offer"; from: PeerId; payload: SdpPayload }
  | { type: "answer"; from: PeerId; payload: SdpPayload }
  | { type: "ice"; from: PeerId; payload: IcePayload }
  | { type: "error"; message: string };

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
