import type { PeerId } from "@/entities/peer/types";
import type { IMediaSession, RemoteStreamHandler } from "@/shared/ports/media-session";
import type { IcePayload, SdpPayload } from "@/shared/signaling/protocol";

type SignalOut =
  | { type: "offer"; to: PeerId; payload: SdpPayload }
  | { type: "answer"; to: PeerId; payload: SdpPayload }
  | { type: "ice"; to: PeerId; payload: IcePayload };

type PeerSlot = {
  pc: RTCPeerConnection;
  pendingIce: IcePayload[];
};

export class RtcMediaSession implements IMediaSession {
  private local: MediaStream | undefined;
  private readonly peers = new Map<PeerId, PeerSlot>();
  private readonly remotes = new Map<PeerId, MediaStream>();
  private readonly remoteListeners = new Set<RemoteStreamHandler>();

  constructor(
    private readonly rtcConfig: RTCConfiguration,
    private readonly send: (message: SignalOut) => void,
  ) {}

  attachLocal(stream: MediaStream): void {
    this.local = stream;
    for (const { pc } of this.peers.values()) {
      this.syncLocalTracks(pc, stream);
    }
  }

  addPeer(peerId: PeerId, initiator: boolean): void {
    if (this.peers.has(peerId)) {
      return;
    }
    const pc = new RTCPeerConnection(this.rtcConfig);
    const slot: PeerSlot = { pc, pendingIce: [] };
    this.peers.set(peerId, slot);

    if (this.local) {
      this.syncLocalTracks(pc, this.local);
    } else {
      pc.addTransceiver("audio", { direction: "sendrecv" });
      pc.addTransceiver("video", { direction: "sendrecv" });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({ type: "ice", to: peerId, payload: event.candidate.toJSON() });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      this.remotes.set(peerId, stream);
      this.emitRemote(peerId, stream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        void pc.restartIce();
      }
    };

    if (initiator) {
      void this.createOffer(peerId);
    }
  }

  removePeer(peerId: PeerId): void {
    const slot = this.peers.get(peerId);
    if (!slot) {
      return;
    }
    slot.pc.close();
    this.peers.delete(peerId);
    this.remotes.delete(peerId);
    this.emitRemote(peerId, undefined);
  }

  async handleOffer(from: PeerId, payload: SdpPayload): Promise<void> {
    this.addPeer(from, false);
    const slot = this.peers.get(from);
    if (!slot) {
      return;
    }
    await slot.pc.setRemoteDescription(payload);
    await this.flushIce(from);
    const answer = await slot.pc.createAnswer();
    await slot.pc.setLocalDescription(answer);
    if (slot.pc.localDescription) {
      this.send({ type: "answer", to: from, payload: slot.pc.localDescription });
    }
  }

  async handleAnswer(from: PeerId, payload: SdpPayload): Promise<void> {
    const slot = this.peers.get(from);
    if (!slot) {
      return;
    }
    await slot.pc.setRemoteDescription(payload);
    await this.flushIce(from);
  }

  async handleIce(from: PeerId, payload: IcePayload): Promise<void> {
    const slot = this.peers.get(from);
    if (!slot) {
      return;
    }
    if (!slot.pc.remoteDescription) {
      slot.pendingIce.push(payload);
      return;
    }
    try {
      await slot.pc.addIceCandidate(payload);
    } catch {
      // candidate may be outdated after renegotiation
    }
  }

  onRemoteStream(handler: RemoteStreamHandler): () => void {
    this.remoteListeners.add(handler);
    return () => {
      this.remoteListeners.delete(handler);
    };
  }

  getRemoteStream(peerId: PeerId): MediaStream | undefined {
    return this.remotes.get(peerId);
  }

  dispose(): void {
    for (const peerId of [...this.peers.keys()]) {
      this.removePeer(peerId);
    }
    this.local = undefined;
    this.remoteListeners.clear();
  }

  private async createOffer(peerId: PeerId): Promise<void> {
    const slot = this.peers.get(peerId);
    if (!slot) {
      return;
    }
    const offer = await slot.pc.createOffer();
    await slot.pc.setLocalDescription(offer);
    if (slot.pc.localDescription) {
      this.send({ type: "offer", to: peerId, payload: slot.pc.localDescription });
    }
  }

  private async flushIce(peerId: PeerId): Promise<void> {
    const slot = this.peers.get(peerId);
    if (!slot) {
      return;
    }
    const queued = slot.pendingIce.splice(0);
    for (const candidate of queued) {
      try {
        await slot.pc.addIceCandidate(candidate);
      } catch {
        // ignore stale ICE
      }
    }
  }

  private syncLocalTracks(pc: RTCPeerConnection, stream: MediaStream): void {
    const senders = pc.getSenders();
    for (const track of stream.getTracks()) {
      const existing = senders.find((sender) => sender.track?.kind === track.kind);
      const sender = existing ?? pc.addTrack(track, stream);
      if (existing) {
        void existing.replaceTrack(track);
      }
      if (track.kind === "audio") {
        void this.disableAudioDtx(sender);
      }
    }
  }

  private async disableAudioDtx(sender: RTCRtpSender): Promise<void> {
    try {
      const params = sender.getParameters();
      if (!params.encodings.length) {
        return;
      }
      params.encodings = params.encodings.map((encoding) => ({ ...encoding, dtx: false }));
      await sender.setParameters(params);
    } catch {
      // DTX control is optional; ignore unsupported browsers.
    }
  }

  private emitRemote(peerId: PeerId, stream: MediaStream | undefined): void {
    this.remoteListeners.forEach((listener) => listener(peerId, stream));
  }
}
