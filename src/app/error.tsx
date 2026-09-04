"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Не загрузилось</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">{error.message}</p>
      <Button size="lg" className="mt-8 touch-manipulation" onClick={reset}>
        Попробовать снова
      </Button>
    </div>
  );
}
