"use client";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    mediaError,
    toggleMic,
    toggleCam,
    leave,
  } = useCallSession(roomId);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  if (phase === "media-error") {
    return (
      <CallEndedState
        title="Нет доступа к медиа"
        description={mediaError ?? "Разрешите камеру и микрофон в браузере."}
      />
    );
  }

  if (phase === "full") {
    return (
      <CallEndedState
        title="Комната занята"
        description="В MVP звонок только 1:1. Создайте новую ссылку."
      />
    );
  }

  if (phase === "ended") {
    return (
      <CallEndedState
        title="Звонок завершён"
        description="Организатор вышел или вы покинули комнату."
      />
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tracking-tight">Дзвінок за лінком</span>
          <Badge variant="outline">{role === "guest" ? "Гость" : "Организатор"}</Badge>
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
            label="Вы"
            placeholder={phase === "connecting" ? "Включаем камеру…" : "Нет видео"}
          />
          <VideoTile
            stream={remote?.stream}
            label={role === "guest" ? "Организатор" : "Гость"}
            placeholder="Ожидание гостя. Отправьте ссылку."
          />
        </div>
      </main>

      <footer className="flex flex-col items-center gap-3 px-4 pb-8">
        {phase === "connecting" ? (
          <p className="text-sm text-muted-foreground">Подключаемся к комнате…</p>
        ) : null}
        <CallControls
          micOn={micOn}
          camOn={camOn}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
          onCopyLink={() => void copyLink()}
          onLeave={leave}
        />
        <Button type="button" variant="ghost" size="sm" onClick={() => void copyLink()}>
          Скопировать ссылку
        </Button>
      </footer>
    </div>
  );
}
