"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PeerId } from "@/entities/peer/types";
import type { CallPhase } from "@/entities/room/types";
import { getRtcConfiguration, getSignalingUrl } from "@/shared/config/ice";
import { BrowserLocalMedia } from "@/infrastructure/media/browser-local-media";
import { WsSignalingClient } from "@/infrastructure/signaling/ws-signaling-client";
import { RtcMediaSession } from "@/infrastructure/webrtc/rtc-media-session";
import type { ServerMessage } from "@/shared/signaling/protocol";

type RemotePeer = {
  peerId: PeerId;
  stream: MediaStream | undefined;
};

export function useCallSession(roomId: string) {
  const [phase, setPhase] = useState<CallPhase>("connecting");
  const [role, setRole] = useState<"host" | "guest" | undefined>();
  const [localStream, setLocalStream] = useState<MediaStream | undefined>();
  const [remote, setRemote] = useState<RemotePeer | undefined>();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mediaError, setMediaError] = useState<string | undefined>();

  const localMedia = useRef(new BrowserLocalMedia());
  const signaling = useRef<WsSignalingClient | undefined>(undefined);
  const session = useRef<RtcMediaSession | undefined>(undefined);
  const peerId = useMemo(() => crypto.randomUUID(), []);

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

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await localMedia.current.start();
        if (cancelled) {
          localMedia.current.stop();
          return;
        }
        setLocalStream(stream);

        const signalingClient = new WsSignalingClient(getSignalingUrl());
        signaling.current = signalingClient;

        const media = new RtcMediaSession(getRtcConfiguration(), (message) => {
          signalingClient.send(message);
        });
        session.current = media;
        media.attachLocal(stream);
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
        signalingClient.connect(roomId, { peerId });
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Нужен доступ к камере и микрофону"
            : "Не удалось включить камеру";
        setMediaError(message);
        setPhase("media-error");
      }
    };

    void start();

    return () => {
      cancelled = true;
      session.current?.dispose();
      session.current = undefined;
      signaling.current?.disconnect();
      signaling.current = undefined;
      localMedia.current.stop();
    };
  }, [peerId, roomId]);

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
    toggleMic,
    toggleCam,
    leave,
  };
}
