"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceId } from "@/entities/media/voice";
import type { CallPhase } from "@/entities/room/types";
import { getRtcConfiguration } from "@/shared/config/ice";
import { getOrCreatePeerId } from "@/shared/lib/id";
import { BrowserLocalMedia } from "@/infrastructure/media/browser-local-media";
import { HttpSignalingClient } from "@/infrastructure/signaling/http-signaling-client";
import { RtcMediaSession } from "@/infrastructure/webrtc/rtc-media-session";
import type { ServerMessage } from "@/shared/signaling/protocol";

type RemotePeer = {
  peerId: string;
  stream: MediaStream | undefined;
};

function mediaErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Camera and microphone access is required";
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Mobile camera access requires HTTPS";
  }
  return "Could not start the camera";
}

export function useCallSession(roomId: string) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [role, setRole] = useState<"host" | "guest" | undefined>();
  const [localStream, setLocalStream] = useState<MediaStream | undefined>();
  const [remote, setRemote] = useState<RemotePeer | undefined>();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [voice, setVoiceState] = useState<VoiceId>("natural");
  const [mediaError, setMediaError] = useState<string | undefined>();

  const localMedia = useRef(new BrowserLocalMedia());
  const signaling = useRef<HttpSignalingClient | undefined>(undefined);
  const session = useRef<RtcMediaSession | undefined>(undefined);
  const joining = useRef(false);
  const peerId = useRef(getOrCreatePeerId(roomId));

  const leave = useCallback(() => {
    session.current?.dispose();
    session.current = undefined;
    signaling.current?.disconnect();
    signaling.current = undefined;
    joining.current = false;
    localMedia.current.stop();
    setLocalStream(undefined);
    setRemote(undefined);
    setPhase("ended");
  }, []);

  const join = useCallback(async () => {
    if (signaling.current || joining.current) {
      return;
    }
    joining.current = true;
    setPhase("connecting");
    setMediaError(undefined);
    localMedia.current.setVoice(voice);

    let stream: MediaStream | undefined;
    try {
      stream = await localMedia.current.start();
      setLocalStream(stream);
    } catch (error) {
      setMediaError(mediaErrorMessage(error));
    }

    const signalingClient = new HttpSignalingClient();
    signaling.current = signalingClient;

    const media = new RtcMediaSession(getRtcConfiguration(), (message) => {
      signalingClient.send(message);
    });
    session.current = media;
    if (stream) {
      media.attachLocal(stream);
    }
    media.onRemoteStream((id, remoteStream) => {
      setRemote(remoteStream ? { peerId: id, stream: remoteStream } : undefined);
    });

    const onMessage = (event: ServerMessage) => {
      switch (event.type) {
        case "joined":
          setRole(event.role);
          setPhase("in-call");
          for (const peer of event.peers) {
            media.addPeer(peer.peerId, true);
          }
          break;
        case "peer-joined":
          media.addPeer(event.peerId, false);
          break;
        case "peer-left":
          media.removePeer(event.peerId);
          break;
        case "offer":
          void media.handleOffer(event.from, event.payload);
          break;
        case "answer":
          void media.handleAnswer(event.from, event.payload);
          break;
        case "ice":
          void media.handleIce(event.from, event.payload);
          break;
        case "room-full":
          setPhase("full");
          signalingClient.disconnect();
          signaling.current = undefined;
          joining.current = false;
          break;
        case "room-closed":
          setPhase("ended");
          media.dispose();
          signalingClient.disconnect();
          signaling.current = undefined;
          joining.current = false;
          localMedia.current.stop();
          setLocalStream(undefined);
          setRemote(undefined);
          break;
        default:
          break;
      }
    };

    signalingClient.subscribe(onMessage);
    signalingClient.connect(roomId, { peerId: peerId.current });
  }, [roomId, voice]);

  useEffect(() => {
    const media = localMedia.current;
    return () => {
      session.current?.dispose();
      session.current = undefined;
      signaling.current?.disconnect();
      signaling.current = undefined;
      joining.current = false;
      media.stop();
    };
  }, []);

  const toggleMic = useCallback(() => {
    setMicOn((current) => {
      const next = !current;
      localMedia.current.setMic(next);
      return next;
    });
  }, []);

  const toggleCam = useCallback(() => {
    setCamOn((current) => {
      const next = !current;
      localMedia.current.setCam(next);
      return next;
    });
  }, []);

  const setVoice = useCallback((next: VoiceId) => {
    localMedia.current.setVoice(next);
    setVoiceState(next);
  }, []);

  useEffect(() => {
    localMedia.current.setMonitor(!remote && voice !== "natural" && micOn);
  }, [micOn, remote, voice]);

  return {
    phase,
    role,
    localStream,
    remote,
    micOn,
    camOn,
    voice,
    mediaError,
    join,
    toggleMic,
    toggleCam,
    setVoice,
    leave,
  };
}
