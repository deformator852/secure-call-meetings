import { getHub } from "@/infrastructure/signaling/hub-singleton";
import type { SignalLink } from "@/infrastructure/signaling/room-hub";
import type { ClientMessage } from "@/shared/signaling/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId") ?? "";
  const peerId = searchParams.get("peerId") ?? "";
  const encoder = new TextEncoder();
  const hub = getHub();
  let link: SignalLink | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      link = {
        send(message) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
        },
        close() {
          try {
            controller.close();
          } catch {
            // already closed
          }
        },
      };
      hub.join(link, roomId, peerId);
    },
    cancel() {
      if (link) {
        hub.disconnect(link);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(request: Request) {
  const peerId = new URL(request.url).searchParams.get("peerId") ?? "";
  try {
    const message = (await request.json()) as ClientMessage;
    getHub().dispatch(peerId, message);
    return new Response(null, { status: 204 });
  } catch {
    return new Response("invalid-json", { status: 400 });
  }
}
