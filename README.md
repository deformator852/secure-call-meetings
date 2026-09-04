# Дзвінок за лінком

Открыл ссылку — сразу видеозвонок. Второй заходит по тому же URL. Без регистрации: комната = id в адресе.

Стек: Next.js, TypeScript, WebRTC, Tailwind, shadcn/ui. Тёмная тема в духе Vercel.

Полная спека (MVP и полный продукт): [docs/PRODUCT.md](./docs/PRODUCT.md).

## Запуск MVP

Нужны Node.js 20+ и камера/микрофон в браузере.

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000), нажмите **Создать звонок**, скопируйте ссылку во вторую вкладку (лучше инкогнито или другой браузер).

- UI: порт `3000`
- Signaling (WebSocket): порт `3001`

Переменные (необязательно):

```bash
NEXT_PUBLIC_SIGNALING_URL=ws://localhost:3001
NEXT_PUBLIC_STUN_URLS=stun:stun.l.google.com:19302
SIGNALING_PORT=3001
```

Аккаунтов нет. Медиа идёт P2P (DTLS-SRTP). Signaling только обменивает SDP/ICE и живёт в памяти процесса.
