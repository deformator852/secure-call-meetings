"use client";

import {
  Copy,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type CallControlsProps = {
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onCopyLink: () => void;
  onLeave: () => void;
};

export function CallControls({
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onCopyLink,
  onLeave,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-full border border-border/60 bg-zinc-950/90 px-3 py-2">
      <Button
        type="button"
        variant={micOn ? "secondary" : "destructive"}
        size="icon-lg"
        className="touch-manipulation"
        aria-label={micOn ? "Выключить микрофон" : "Включить микрофон"}
        onClick={onToggleMic}
      >
        {micOn ? <Mic /> : <MicOff />}
      </Button>
      <Button
        type="button"
        variant={camOn ? "secondary" : "destructive"}
        size="icon-lg"
        className="touch-manipulation"
        aria-label={camOn ? "Выключить камеру" : "Включить камеру"}
        onClick={onToggleCam}
      >
        {camOn ? <Video /> : <VideoOff />}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon-lg"
        className="touch-manipulation"
        aria-label="Скопировать ссылку"
        onClick={onCopyLink}
      >
        <Copy />
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="icon-lg"
        className="touch-manipulation"
        aria-label="Покинуть звонок"
        onClick={onLeave}
      >
        <PhoneOff />
      </Button>
    </div>
  );
}
