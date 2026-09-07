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
import { isVoiceId, VOICE_OPTIONS, type VoiceId } from "@/entities/media/voice";

type CallControlsProps = {
  micOn: boolean;
  camOn: boolean;
  voice: VoiceId;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onVoiceChange: (voice: VoiceId) => void;
  onCopyLink: () => void;
  onLeave: () => void;
};

export function CallControls({
  micOn,
  camOn,
  voice,
  onToggleMic,
  onToggleCam,
  onVoiceChange,
  onCopyLink,
  onLeave,
}: CallControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-border/60 bg-zinc-950/90 px-3 py-2">
      <label className="sr-only" htmlFor="voice-select">
        Voice
      </label>
      <select
        id="voice-select"
        className="h-9 rounded-lg border border-border/60 bg-zinc-900 px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={voice}
        onChange={(event) => {
          if (isVoiceId(event.target.value)) {
            onVoiceChange(event.target.value);
          }
        }}
      >
        {VOICE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant={micOn ? "secondary" : "destructive"}
        size="icon-lg"
        className="touch-manipulation"
        aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
        onClick={onToggleMic}
      >
        {micOn ? <Mic /> : <MicOff />}
      </Button>
      <Button
        type="button"
        variant={camOn ? "secondary" : "destructive"}
        size="icon-lg"
        className="touch-manipulation"
        aria-label={camOn ? "Turn camera off" : "Turn camera on"}
        onClick={onToggleCam}
      >
        {camOn ? <Video /> : <VideoOff />}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon-lg"
        className="touch-manipulation"
        aria-label="Copy link"
        onClick={onCopyLink}
      >
        <Copy />
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="icon-lg"
        className="touch-manipulation"
        aria-label="Leave call"
        onClick={onLeave}
      >
        <PhoneOff />
      </Button>
    </div>
  );
}
