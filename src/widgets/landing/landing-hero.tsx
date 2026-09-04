import { CreateCallButton } from "@/features/create-room/create-call-button";

const points = [
  {
    title: "The link is the room",
    body: "Open the URL and start a call. The other person joins with the same link.",
  },
  {
    title: "No accounts",
    body: "No registration. The room identifier exists only in the URL.",
  },
  {
    title: "Direct media",
    body: "WebRTC between browsers. Ephemeral signaling with no user profiles.",
  },
];

export function LandingHero() {
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col justify-center px-6 py-20">
      <p className="text-sm text-muted-foreground">Call by Link</p>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl">
        Open a link. Start a video call.
      </h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400">
        A tiny Whereby without registration. Create a room, share the URL, and
        talk one-to-one. Open source and self-hostable.
      </p>
      <div className="mt-8">
        <CreateCallButton />
      </div>
      <p className="mt-6 max-w-xl text-sm leading-6 text-zinc-500">
        On your phone:{" "}
        <code className="font-mono text-zinc-400">https://192.168.31.96:3443</code>
        . If the browser warns about the certificate, choose Advanced and
        continue. Do not use{" "}
        <code className="font-mono text-zinc-400">10.255.255.254</code>.
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
