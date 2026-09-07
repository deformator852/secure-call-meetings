"use client";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VOICE_OPTIONS } from "@/entities/media/voice";
import { useCallSession } from "@/features/media-controls/use-call-session";
import { CallControls } from "@/widgets/call-stage/call-controls";
import { CallEndedState } from "@/widgets/call-stage/call-ended-state";
import { VideoTile } from "@/widgets/call-stage/video-tile";

type CallStageProps = {
  roomId: string;
};

export function CallStage({ roomId }: CallStageProps) {
  const {
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
  } = useCallSession(roomId);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  if (phase === "full") {
    return (
      <CallEndedState
        title="Room is full"
        description="The MVP supports one-to-one calls only. Create a new link."
      />
    );
  }

  if (phase === "ended") {
    return (
      <CallEndedState
        title="Call ended"
        description="The host left, or you left the room."
      />
    );
  }

  if (phase === "idle") {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Join the call</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Continue to let the browser request camera and microphone access.
          Mobile browsers require HTTPS.
        </p>
        <Button
          size="lg"
          className="mt-8 h-12 touch-manipulation px-6"
          onClick={() => void join()}
        >
          Enable camera and join
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tracking-tight">Call by Link</span>
          <Badge variant="outline">{role === "guest" ? "Guest" : "Host"}</Badge>
        </div>
        <code className="hidden font-mono text-xs text-muted-foreground sm:block">
          {roomId}
        </code>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center p-4 md:p-6">
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
          <VideoTile
            stream={localStream}
            muted
            mirrored
            label={
              voice === "natural"
                ? "You"
                : `You · ${VOICE_OPTIONS.find((option) => option.id === voice)?.label}`
            }
            placeholder={mediaError ?? (phase === "connecting" ? "Connecting…" : "No video")}
          />
          <VideoTile
            stream={remote?.stream}
            label={role === "guest" ? "Host" : "Guest"}
            placeholder="Waiting for a guest. Share the link."
          />
        </div>
      </main>

      <footer className="flex flex-col items-center gap-3 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {mediaError ? <p className="text-sm text-destructive">{mediaError}</p> : null}
        {phase === "connecting" ? (
          <p className="text-sm text-muted-foreground">Connecting to the room…</p>
        ) : null}
        <CallControls
          micOn={micOn}
          camOn={camOn}
          voice={voice}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
          onVoiceChange={setVoice}
          onCopyLink={() => void copyLink()}
          onLeave={leave}
        />
        {!remote && voice !== "natural" ? (
          <p className="text-xs text-muted-foreground">Speak to preview this voice</p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="touch-manipulation"
          onClick={() => void copyLink()}
        >
          Copy link
        </Button>
      </footer>
    </div>
  );
}
