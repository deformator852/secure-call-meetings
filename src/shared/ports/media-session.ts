import type { PeerId } from "@/entities/peer/types";
import type { IcePayload, SdpPayload } from "@/shared/signaling/protocol";

export type RemoteStreamHandler = (peerId: PeerId, stream: MediaStream | undefined) => void;

export interface IMediaSession {
  attachLocal(stream: MediaStream): void;
  addPeer(peerId: PeerId, initiator: boolean): void;
  removePeer(peerId: PeerId): void;
  handleOffer(from: PeerId, payload: SdpPayload): Promise<void>;
  handleAnswer(from: PeerId, payload: SdpPayload): Promise<void>;
  handleIce(from: PeerId, payload: IcePayload): Promise<void>;
  onRemoteStream(handler: RemoteStreamHandler): () => void;
  getRemoteStream(peerId: PeerId): MediaStream | undefined;
  dispose(): void;
}
