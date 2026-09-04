"use client";

import { useEffect, useRef } from "react";
import { cn } from "cn";

type VideoTileProps = {
  stream?: MediaStream;
  muted?: boolean;
  mirrored?: boolean;
  label: string;
  placeholder?: string;
  className?: string;
};

export function VideoTile({
  stream,
  muted = false,
  mirrored = false,
  label,
  placeholder,
  className,
}: VideoTileProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    el.srcObject = stream ?? null;
  }, [stream]);

  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-xl border border-border/60 bg-zinc-950",
        className,
      )}
    >
      {stream ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={muted}
          className={cn("absolute inset-0 h-full w-full object-cover", mirrored && "-scale-x-100")}
        />
      ) : (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
          {placeholder}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-300">
        {label}
      </div>
    </div>
  );
}
