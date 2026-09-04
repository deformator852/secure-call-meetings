# Call by Link

Open a link and start a video call. The other person joins through the same URL. No registration: the room is the ID in the address.

Stack: Next.js, TypeScript, WebRTC, Tailwind, and shadcn/ui. Dark Vercel-style interface.

See the complete MVP and full-product specification in [docs/PRODUCT.md](./docs/PRODUCT.md).

## Run the MVP

Requires Node.js 20+ and browser access to a camera and microphone.

```bash
npm install
npm run dev
```

On the computer: [http://localhost:3000](http://localhost:3000)

- HTTP: port `3000`
- HTTPS for mobile camera access: port `3443`
- Signaling: same-origin SSE + POST at `/signal`

### Phone on the same Wi-Fi

Do not open `http://10.255.255.254:3000`; it is an internal WSL address and is not reachable from the phone.

1. Restart with `npm run dev`.
2. Run once from an elevated PowerShell: `powershell -ExecutionPolicy Bypass -File .\scripts\expose-lan.ps1`
3. On the phone, open **https://192.168.31.96:3443**. Opening `http://192.168.31.96:3000` redirects mobile browsers to HTTPS.
4. On the certificate warning, choose **Advanced** and continue. On iPhone, the certificate may also need to be trusted in Settings.
5. Create or open a room from this address and press **Enable camera and join**.

Mobile browsers do not allow camera access over plain HTTP. This is a browser security restriction, not a network issue.

Optional environment variables:

```bash
NEXT_PUBLIC_STUN_URLS=stun:stun.l.google.com:19302
HTTPS_PORT=3443
```

There are no accounts. Media travels peer-to-peer over DTLS-SRTP. Signaling only exchanges SDP/ICE and is stored in process memory.
