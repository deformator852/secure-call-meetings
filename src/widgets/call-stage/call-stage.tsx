"use client";

import { useEffect, useState } from "react";
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
    join,
    toggleMic,
    toggleCam,
    leave,
  } = useCallSession(roomId);
  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    setIsSecure(window.isSecureContext);
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

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

  if (phase === "idle") {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Подключение к звонку</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Нажмите кнопку — браузер запросит камеру и микрофон. На телефоне это
          работает только по HTTPS (если открыли http, вас должно перекинуть).
        </p>
        {!isSecure ? (
          <p className="mt-3 max-w-md text-sm text-destructive">
            Сейчас страница небезопасная. Откройте адрес с https:// и портом 3443.
          </p>
        ) : null}
        <Button
          size="lg"
          className="mt-8 h-12 touch-manipulation px-6"
          onClick={() => void join()}
        >
          Включить камеру и войти
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
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
            placeholder={mediaError ?? (phase === "connecting" ? "Подключаемся…" : "Нет видео")}
          />
          <VideoTile
            stream={remote?.stream}
            label={role === "guest" ? "Организатор" : "Гость"}
            placeholder="Ожидание гостя. Отправьте ссылку."
          />
        </div>
      </main>

      <footer className="flex flex-col items-center gap-3 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {mediaError ? <p className="text-sm text-destructive">{mediaError}</p> : null}
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
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="touch-manipulation"
          onClick={() => void copyLink()}
        >
          Скопировать ссылку
        </Button>
      </footer>
    </div>
  );
}
