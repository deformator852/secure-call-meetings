"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createId } from "@/shared/lib/id";

export function CreateCallButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const create = () => {
    setPending(true);
    router.push(`/r/${createId()}`);
  };

  return (
    <Button size="lg" className="h-12 touch-manipulation px-6" onClick={create} disabled={pending}>
      {pending ? "Создаём…" : "Создать звонок"}
    </Button>
  );
}
