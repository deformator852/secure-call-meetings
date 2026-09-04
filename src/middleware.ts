import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const HTTPS_PORT = process.env.HTTPS_PORT ?? "3443";

export function middleware(request: NextRequest) {
  const agent = request.headers.get("user-agent") ?? "";
  if (!/Android|iPhone|iPad|iPod/i.test(agent)) {
    return NextResponse.next();
  }
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto === "https") {
    return NextResponse.next();
  }
  const host = request.headers.get("host") ?? "";
  const hostname = host.replace(/:\d+$/, "");
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return NextResponse.next();
  }
  if (request.nextUrl.protocol === "https:") {
    return NextResponse.next();
  }
  const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  return NextResponse.redirect(`https://${hostname}:${HTTPS_PORT}${path}`, 302);
}

export const config = {
  matcher: ["/((?!_next/hmr|_next/webpack-hmr|signal).*)"],
};
