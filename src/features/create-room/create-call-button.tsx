"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CreateCallButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const create = () => {
    setPending(true);
    const roomId = crypto.randomUUID();
    router.push(`/r/${roomId}`);
  };

  return (
    <Button size="lg" onClick={create} disabled={pending}>
      {pending ? "Создаём…" : "Создать звонок"}
    </Button>
  );
}
