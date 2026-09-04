import { CreateCallButton } from "@/features/create-room/create-call-button";

const points = [
  {
    title: "Ссылка = комната",
    body: "Открыли URL — сразу видео. Второй заходит по той же ссылке.",
  },
  {
    title: "Без аккаунтов",
    body: "Нет регистрации. Идентификатор комнаты живёт только в адресе.",
  },
  {
    title: "Медиа напрямую",
    body: "WebRTC между браузерами. Signaling эфемерный, без профилей.",
  },
];

export function LandingHero() {
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col justify-center px-6 py-20">
      <p className="text-sm text-muted-foreground">Дзвінок за лінком</p>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl">
        Открыл ссылку — сразу видеозвонок
      </h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400">
        Мини-Whereby без регистрации. Создайте комнату, отправьте URL, говорите
        1:1. Open source, можно поднять у себя.
      </p>
      <div className="mt-8">
        <CreateCallButton />
      </div>
      <p className="mt-6 max-w-xl text-sm leading-6 text-zinc-500">
        С телефона:{" "}
        <code className="font-mono text-zinc-400">https://192.168.31.96:3443</code>
        . Если браузер ругается на сертификат — «Дополнительно» и продолжить.
        Не используйте <code className="font-mono text-zinc-400">10.255.255.254</code>.
      </p>
      <div className="mt-16 grid gap-6 border-t border-border/60 pt-10 md:grid-cols-3">
        {points.map((point) => (
          <div key={point.title}>
            <h2 className="text-sm font-medium text-zinc-200">{point.title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{point.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
