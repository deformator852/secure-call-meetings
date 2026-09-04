"use client";

import type { ReactElement } from "react";
import {
  Copy,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CallControlsProps = {
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onCopyLink: () => void;
  onLeave: () => void;
};

function ControlTip({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

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
      <ControlTip label={micOn ? "Выключить микрофон" : "Включить микрофон"}>
        <Button
          type="button"
          variant={micOn ? "secondary" : "destructive"}
          size="icon"
          aria-label={micOn ? "Выключить микрофон" : "Включить микрофон"}
          onClick={onToggleMic}
        >
          {micOn ? <Mic /> : <MicOff />}
        </Button>
      </ControlTip>
      <ControlTip label={camOn ? "Выключить камеру" : "Включить камеру"}>
        <Button
          type="button"
          variant={camOn ? "secondary" : "destructive"}
          size="icon"
          aria-label={camOn ? "Выключить камеру" : "Включить камеру"}
          onClick={onToggleCam}
        >
          {camOn ? <Video /> : <VideoOff />}
        </Button>
      </ControlTip>
      <ControlTip label="Скопировать ссылку">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Скопировать ссылку"
          onClick={onCopyLink}
        >
          <Copy />
        </Button>
      </ControlTip>
      <ControlTip label="Покинуть звонок">
        <Button
          type="button"
          variant="destructive"
          size="icon"
          aria-label="Покинуть звонок"
          onClick={onLeave}
        >
          <PhoneOff />
        </Button>
      </ControlTip>
    </div>
  );
}
