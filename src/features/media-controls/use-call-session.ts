"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CallPhase } from "@/entities/room/types";
import { getRtcConfiguration } from "@/shared/config/ice";
import { createId } from "@/shared/lib/id";
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
    return "Нужен доступ к камере и микрофону";
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Камера на телефоне работает только по HTTPS";
  }
  return "Не удалось включить камеру";
}

export function useCallSession(roomId: string) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [role, setRole] = useState<"host" | "guest" | undefined>();
  const [localStream, setLocalStream] = useState<MediaStream | undefined>();
  const [remote, setRemote] = useState<RemotePeer | undefined>();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mediaError, setMediaError] = useState<string | undefined>();

  const localMedia = useRef(new BrowserLocalMedia());
  const signaling = useRef<HttpSignalingClient | undefined>(undefined);
  const session = useRef<RtcMediaSession | undefined>(undefined);
  const peerId = useRef(createId());

  const leave = useCallback(() => {
    session.current?.dispose();
    session.current = undefined;
    signaling.current?.disconnect();
    signaling.current = undefined;
    localMedia.current.stop();
    setLocalStream(undefined);
    setRemote(undefined);
    setPhase("ended");
  }, []);

  const join = useCallback(async () => {
    if (signaling.current) {
      return;
    }
    setPhase("connecting");
    setMediaError(undefined);

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
            media.addPeer(peer.peerId, event.role === "host");
          }
          break;
        case "peer-joined":
          media.addPeer(event.peerId, true);
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
          break;
        case "room-closed":
          setPhase("ended");
          media.dispose();
          signalingClient.disconnect();
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
  }, [roomId]);

  useEffect(() => {
    return () => {
      session.current?.dispose();
      session.current = undefined;
      signaling.current?.disconnect();
      signaling.current = undefined;
      localMedia.current.stop();
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

  return {
    phase,
    role,
    localStream,
    remote,
    micOn,
    camOn,
    mediaError,
    join,
    toggleMic,
    toggleCam,
    leave,
  };
}
