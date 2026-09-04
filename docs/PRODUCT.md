# Call by Link — Product and Architecture

A tiny Whereby without registration: open a URL and enter a room. A second person joins through the same link. The room is the `id` in the URL. There are no accounts. The project is open source and self-hostable.

Stack: **Next.js App Router + TypeScript + WebRTC + Tailwind CSS + shadcn/ui**. The interface uses a dark Vercel-like style with neutral zinc colors, subtle borders, generous spacing, and no decorative gradients.

---

## 1. Positioning

| Included | Not included |
| --- | --- |
| The link is the room | Login, OAuth, or profiles |
| Host approval in the full product | Calendar, recording, or billing |
| Nickname before joining in the full product | Persistent user storage |
| In-room chat in the full product | Native mobile apps in v1 |
| Open source and self-hostable | A mandatory hosted SaaS dependency |

### What “no backend” actually means

Media travels peer-to-peer through WebRTC. Two browsers still need **ephemeral signaling** to exchange SDP and ICE data. This is not an account backend and does not require a user database. Room state lives in memory while the room is active, or in Redis when running multiple instances. STUN, and optionally TURN, are required for NAT traversal.

The accurate product statement is: **no accounts, ephemeral signaling, optional TURN**.

WebRTC encrypts media and data channels with **DTLS-SRTP**. The signaling operator can see room membership, nicknames, and SDP, but cannot see media sent directly between peers. This limitation must be explained honestly in the UI and documentation.

---

## 2. User flows

### 2.1 MVP — create a one-to-one call

1. Open `/`.
2. Press **Create a call**.
3. Navigate to `/r/{roomId}`. The first participant becomes the **host**.
4. Press **Enable camera and join** and grant camera and microphone permission.
5. The screen shows the local video, an empty guest tile, and **Copy link**.
6. A second person opens the same link, grants media permission, and joins immediately.
7. Both participants see local and remote video and can mute the microphone, disable the camera, copy the link, or leave.
8. If the host leaves, the room closes and the guest sees **Call ended**. If the guest leaves, the host returns to the waiting state.

Out of scope for the MVP: nicknames, waiting-room approval, chat, more than two participants, TURN configuration UI, and settings screens.

### 2.2 Full product

1. **Creation:** same as the MVP. The host enters the room first.
2. **Nickname:** each participant sees a lobby with a 3–24 character nickname field and camera preview.
3. **Approval:** a guest enters a waiting room. The host sees “X wants to join” and can accept or reject the request.
4. **Multiple participants:** mesh topology for up to **four** people, including the host. A fifth participant sees **Room is full**.
5. **Chat:** a right-side panel on desktop and a sheet on mobile. Text and system events travel over an ordered WebRTC DataChannel.
6. **Encryption UI:** show a clear **DTLS-SRTP** status and explain that media does not pass through the signaling server.
7. **Self-hosting:** Docker Compose with the app and optional coturn. Supported environment variables include `NEXT_PUBLIC_STUN_URLS`, `TURN_URL`, `TURN_USER`, `TURN_PASS`, and optional `SIGNALING_REDIS_URL`.

---

## 3. Information architecture

| Route or state | Audience | Content |
| --- | --- | --- |
| `/` | Everyone | Hero, Create a call CTA, product benefits, source link |
| `/r/[roomId]` | Host and guest | Room state orchestrator |
| `lobby` | Full product | Nickname and media preview |
| `waiting` | Guest | Waiting for host approval |
| `in-call` | Participants | Video grid, controls, roster, and chat |
| `ended`, `denied`, `full` | Participant | Status explanation and Back home action |

Full-product room states:

`lobby` → `requesting` → `in-call` | `denied` | `full` | `ended`

The MVP collapses `lobby` and `requesting` into a single explicit **Enable camera and join** action.

---

## 4. Design

- Dark mode is the default.
- Use `next-themes` with class-based theming.
- Use neutral shadcn zinc colors.
- Primary actions are near-white on black; red is reserved for destructive actions.
- Use Geist Sans and Geist Mono.
- Landing content width is approximately 1080 px.
- The call fills the viewport and video tiles use `aspect-video`, `rounded-xl`, and `border-border/60`.
- Use shadcn components such as `Button`, `Input`, `Dialog`, `Sheet`, `Avatar`, `Badge`, `Tooltip`, `Separator`, `ScrollArea`, `DropdownMenu`, and `Sonner`.
- Avoid gradients, neon effects, stock illustrations, and colored shadows.

Key UI widgets:

- `LandingHero`
- `CreateCallButton`
- `LobbyForm`
- `WaitingRoom`
- `JoinRequestList`
- `VideoTile`
- `VideoGrid`
- `CallControls`
- `PeerRoster`
- `ChatPanel`
- `ChatMessage`
- `EncryptionBadge`
- `CallEndedState`

---

## 5. Component architecture and SOLID

The structure follows feature-oriented layering with ports and adapters:

```text
src/
  app/                          # routes and providers; keep pages thin
    page.tsx
    r/[roomId]/page.tsx
    signal/route.ts
    layout.tsx
    globals.css
  widgets/                      # page-level composition
    landing/
    call-stage/
  features/
    create-room/
    lobby/
    waiting-room/
    media-controls/
    chat/
    host-approval/
  entities/
    room/
    peer/
    message/
  shared/
    ui/
    config/
    lib/
    ports/
    signaling/
  infrastructure/
    signaling/
    media/
    webrtc/
```

### SOLID in practice

| Principle | Application |
| --- | --- |
| Single responsibility | `VideoTile` only renders a stream. Media negotiation and signaling remain outside React components. |
| Open/closed | A different signaling or media implementation can satisfy the same port without changing UI features. |
| Liskov substitution | `MeshMediaSession` and a future `SfuMediaSession` can implement the same `IMediaSession`. |
| Interface segregation | Use focused `ISignalingPort`, `IMediaSession`, and `ILocalMedia` interfaces rather than one call service. |
| Dependency inversion | Features depend on ports. `infrastructure/webrtc` is the only layer that owns `RTCPeerConnection`. |

### Core ports

```ts
type RoomId = string;
type PeerId = string;

interface ILocalMedia {
  start(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  stop(): void;
  setMic(on: boolean): void;
  setCam(on: boolean): void;
  getStream(): MediaStream | undefined;
}

interface ISignalingPort {
  connect(roomId: RoomId, meta: { peerId: PeerId }): void;
  send(event: SignalingOutbound): void;
  subscribe(handler: (event: SignalingInbound) => void): () => void;
  disconnect(): void;
}

interface IMediaSession {
  attachLocal(stream: MediaStream): void;
  addPeer(peerId: PeerId, initiator: boolean): void;
  removePeer(peerId: PeerId): void;
  getRemoteStream(peerId: PeerId): MediaStream | undefined;
  dispose(): void;
}
```

`RTCPeerConnection` must never appear in React components. Hooks such as `useCallSession` adapt the UI to these ports.

---

## 6. Signaling and WebRTC

### MVP

- Generate room and peer IDs with `crypto.randomUUID()` when available, with a UUID fallback for older or insecure contexts.
- Signaling uses same-origin SSE and POST at `/signal`.
- Active rooms are held in an in-memory `RoomHub`.
- HTTPS development access is exposed on port `3443` for mobile camera permission.
- Google public STUN is the default; TURN is configured through environment variables later.
- Use `addTransceiver("audio" | "video", { direction: "sendrecv" })`.

Minimal signaling messages:

```text
joined { role, peers }
peer-joined { peerId, role }
peer-left { peerId }
offer / answer / ice { to, from, payload }
room-full
room-closed
```

### Full product

Each peer maintains `N - 1` connections. The signaling layer distributes the roster and only the host can send join approval.

The four-person limit is intentional for mesh topology. An SFU such as LiveKit or mediasoup is a separate later phase.

---

## 7. Security

| Threat | Mitigation |
| --- | --- |
| Room guessing | Use `crypto.randomUUID()` with approximately 122 random bits. |
| Join spam | Host approval in the full product and per-IP signaling rate limits. |
| Host impersonation | The first peer in an empty room is the host; later host claims are ignored. |
| Chat or nickname XSS | Render text only, escape output, and enforce length limits. |
| Media exposure | The signaling server never proxies RTP. |
| TURN secret exposure | Keep credentials in self-hosted environment variables. |
| Signaling interception | Require HTTPS in production. |

Do not claim that the server knows nothing. It knows the roster, nicknames, and SDP. It does not receive peer-to-peer media.

---

## 8. Delivery scope

### MVP

- [x] Landing page and Create a call action
- [x] `/r/[uuid]` room route
- [x] First participant becomes host
- [x] Explicit mobile-friendly media permission action
- [x] Local and remote video
- [x] Same-origin signaling
- [x] Copy link, microphone, camera, and leave controls
- [x] Dark shadcn UI
- [x] Component and port separation
- [x] Local HTTPS development path for phones

### Full product

- [ ] Lobby with nickname and preview
- [ ] Waiting room and host approval
- [ ] Mesh calls with up to four participants
- [ ] DataChannel chat
- [ ] Optional voice changer with an off state and a selectable list of voice effects
- [ ] Encryption status
- [ ] Denied, full, and ended states
- [ ] Docker Compose and optional coturn
- [ ] License and contribution guide

### Not now

Recording, screen sharing, virtual backgrounds, native mobile apps, an SFU, accounts, billing, and room passwords.

---

## 9. Definition of done

The MVP is complete when two browsers or devices opening the same link can see and hear each other; the host can copy the link in one action; and the UI contains no placeholders for unfinished features.

The full product is complete when an unapproved guest cannot receive media, three participants can join with nicknames and chat, the UI accurately displays DTLS-SRTP encryption, and `docker compose up` starts a self-hosted instance.

---

## 10. Implementation order

1. Next.js, TypeScript, Tailwind, shadcn, dark theme, and Geist.
2. Domain types and ports.
3. Landing page and room ID generation.
4. Local media, `VideoTile`, and `CallControls`.
5. Signaling and one-to-one negotiation.
6. MVP interface polish and mobile HTTPS.
7. Lobby, nickname, waiting room, and host approval.
8. Three-to-four-person mesh.
9. DataChannel chat.
10. Optional voice changer with effect selection.
11. Docker, TURN, security copy, and open-source project files.
