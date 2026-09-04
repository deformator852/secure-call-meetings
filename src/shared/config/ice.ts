function parseStunUrls(): string[] {
  const raw = process.env.NEXT_PUBLIC_STUN_URLS;
  if (!raw) {
    return ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"];
  }
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getRtcConfiguration(): RTCConfiguration {
  return {
    iceServers: [{ urls: parseStunUrls() }],
  };
}

export function getSignalingUrl(): string {
  if (process.env.NEXT_PUBLIC_SIGNALING_URL) {
    return process.env.NEXT_PUBLIC_SIGNALING_URL;
  }
  if (typeof window === "undefined") {
    return "ws://localhost:3000/ws";
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}
