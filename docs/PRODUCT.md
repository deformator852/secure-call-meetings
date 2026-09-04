# Дзвінок за лінком — продукт и архитектура

Мини-Whereby без регистрации: открыл URL — сразу комната. Второй заходит по тому же линку. Комната = `id` в URL. Аккаунтов нет. Репозиторий открытый, инстанс можно поднять у себя.

Стек: **Next.js (App Router) + TypeScript + WebRTC + Tailwind + shadcn/ui**. Дизайн: тёмная тема в духе Vercel (нейтральный zinc, тонкие бордеры, много воздуха, без декоративных градиентов).

---

## 1. Позиционирование

| Есть | Нет |
| --- | --- |
| Ссылка = комната | Логин, OAuth, профили |
| Хост апрувит гостей (полный продукт) | Календарь, запись, биллинг |
| Ник перед входом (полный продукт) | Постоянное хранилище пользователей |
| Чат в комнате (полный продукт) | Мобильные нативные приложения в v1 |
| Self-host + OSS | Облачный «наш» SaaS как обязательная зависимость |

**Одна честная оговорка про «без бэкенда».** Медиа идёт P2P (WebRTC). Чтобы два браузера нашли друг друга, нужен **эфемерный signaling**: обмен SDP/ICE. Это не бэкенд аккаунтов и не БД пользователей — in-memory (или Redis при нескольких инстансах) живёт только пока комната активна. STUN (и опционально TURN) нужны для NAT. В доке и README это формулируется так: *no accounts, ephemeral signaling, optional TURN*.

Шифрование медиа и data channel — **DTLS-SRTP** (стандарт WebRTC). Это транспортное E2E между пирами, не «наш» сервер не видит видео. Signaling (кто в комнате, SDP) на self-host инстансе виден оператору сервера — это нормально и нужно явно написать в UI/доке.

---

## 2. Пользовательские сценарии

### 2.1 MVP — создать звонок и поговорить 1:1

1. Открыть `/`.
2. Нажать **Создать звонок**.
3. Редирект на `/r/{roomId}`. Первый посетитель = **host**. Браузер запрашивает камеру и микрофон.
4. На экране: своё видео, пустой слот «ожидание гостя», кнопка **Скопировать ссылку**.
5. Второй открывает ту же ссылку, разрешает медиа, сразу подключается (в MVP без ника и без апрува).
6. 1:1: локальное + удалённое видео, mute / камера / повесить трубку.
7. Хост ушёл — комната помечается закрытой, гость видит «Звонок завершён». Гость ушёл — слот снова «ожидание».

Вне скоупа MVP: ник, waiting room, чат, >2 участников, TURN UI, экраны настроек.

### 2.2 Полный продукт

1. **Создание:** как в MVP. Host сразу в комнате.
2. **Ник:** любой, кто заходит по ссылке (включая host при первом заходе, если ещё не задан), видит лобби: поле ника (3–24 символа), превью камеры, **Войти**.
3. **Апрув:** гость после лобби попадает в waiting room. Host видит карточку «X хочет войти» → Принять / Отклонить. Отклонённый видит отказ, ссылка для него больше не пускает в эту сессию (пока host не создаст новую комнату).
4. **Несколько человек:** mesh до **4** участников (включая host). 5-й получает «комната заполнена». Mesh выбран сознательно: без SFU, self-host остаётся одним Next.js-процессом.
5. **Чат:** панель справа (desktop) / sheet (mobile). Текст + системные события («Anna вошла»). Сообщения идут по WebRTC DataChannel, не через signaling-сервер как хранилище.
6. **Шифрование в UI:** бейдж «DTLS-SRTP» / «канал зашифрован», коротко «медиа не проходит через сервер». Без фальшивого «military-grade» маркетинга.
7. **Self-host:** Docker Compose: app + опциональный coturn. Env: `NEXT_PUBLIC_STUN_URLS`, `TURN_URL`, `TURN_USER`, `TURN_PASS`, `SIGNALING_REDIS_URL` (опционально).

---

## 3. Информационная архитектура и экраны

| Маршрут | Кто | Содержимое |
| --- | --- | --- |
| `/` | все | Hero, CTA «Создать звонок», 3 тезиса (ссылка = комната, без аккаунтов, self-host), ссылка на GitHub |
| `/r/[roomId]` | host / guest | оркестратор состояний ниже |
| `/r/[roomId]` lobby | полный продукт | ник + превью медиа |
| `/r/[roomId]` waiting | гость | «Ждём подтверждения от организатора» |
| `/r/[roomId]` in-call | участники | сетка видео, контролы, чат, roster |
| `/r/[roomId]` ended / denied / full | — | одно состояние, кнопка на главную |

**Состояния комнаты (клиент):** `lobby` → `requesting` → `in-call` | `denied` | `full` | `ended`.  
MVP схлопывает `lobby` и `requesting`: сразу `in-call`.

---

## 4. Дизайн (Vercel-like, shadcn)

- Тема по умолчанию **dark**. `next-themes`, class strategy. Цвета shadcn: `zinc` / `neutral`, accent — почти белая кнопка на чёрном (как Vercel CTA), destructive — красный только для «покинуть / отклонить».
- Шрифт: **Geist** (или `next/font` Geist Sans + Geist Mono для room id).
- Сетка: max-width лендинга ~1080px, комната — full viewport, видео в `aspect-video`, скругление `rounded-xl`, бордер `border-border/60`.
- Компоненты shadcn: `Button`, `Input`, `Dialog`, `Sheet`, `Avatar`, `Badge`, `Tooltip`, `Separator`, `ScrollArea`, `DropdownMenu`, `Sonner` (тосты: «Ссылка скопирована»).
- Не делать: градиентные фоны, неон, иллюстрации-стоки, цветные тени.

**Ключевые UI-блоки (виджеты, не страницы):**

- `LandingHero`
- `CreateCallButton`
- `LobbyForm` (ник + превью)
- `WaitingRoom`
- `JoinRequestList` (host)
- `VideoTile` / `VideoGrid`
- `CallControls` (mic, cam, copy link, chat, leave)
- `PeerRoster`
- `ChatPanel` / `ChatMessage`
- `EncryptionBadge`
- `CallEndedState`

---

## 5. Компонентная архитектура и SOLID

Слойность ближе к Feature-Sliced + портам (гексагоналка), без оверинжиниринга.

```
src/
  app/                          # маршруты, providers — тонкие
    page.tsx
    r/[roomId]/page.tsx
    layout.tsx
    globals.css
  widgets/                      # сборка экрана из фич
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
    room/                       # типы Room, RoomId, Role
    peer/                       # PeerId, Nickname, MediaState
    message/                    # ChatMessage
  shared/
    ui/                         # shadcn
    config/                     # ice servers, limits
    lib/
  infrastructure/
    signaling/                  # WebSocket клиент + серверный adapter
    webrtc/                     # PeerConnection factory, transceiver
```

### SOLID на практике

| Принцип | Как соблюдаем |
| --- | --- |
| **S** | `VideoTile` только рендерит поток. `usePeerConnection` не знает про чат. `HostApproval` не трогает ICE. |
| **O** | Новый транспорт signaling (WS → Redis pub/sub) через `ISignalingPort`, UI не меняется. |
| **L** | `MeshMediaSession` и будущий `SfuMediaSession` реализуют один `IMediaSession`. |
| **I** | Отдельные порты: `ISignalingPort`, `IMediaSession`, `ILocalMedia`, `IClipboard`. Не один `ICallGodObject`. |
| **D** | Фичи зависят от портов. `infrastructure/webrtc` — единственное место с `RTCPeerConnection`. Тесты фич мокают порты. |

### Порты (контракты)

```ts
type RoomId = string;
type PeerId = string;

interface ILocalMedia {
  start(constraints: MediaStreamConstraints): Promise<MediaStream>;
  stop(): void;
  setMic(on: boolean): void;
  setCam(on: boolean): void;
}

interface ISignalingPort {
  connect(roomId: RoomId, meta: { nickname: string; role: "host" | "guest" }): void;
  send(event: SignalingOutbound): void;
  subscribe(handler: (event: SignalingInbound) => void): () => void;
  disconnect(): void;
}

interface IMediaSession {
  addPeer(peerId: PeerId, polite: boolean): void;
  removePeer(peerId: PeerId): void;
  attachLocal(stream: MediaStream): void;
  getRemoteStream(peerId: PeerId): MediaStream | undefined;
  sendChat(payload: string): void;
  onChat(handler: (from: PeerId, payload: string) => void): () => void;
  dispose(): void;
}
```

Правило: **никакого `RTCPeerConnection` в React-компонентах**. Хуки (`useCallSession`, `useLocalMedia`) — адаптеры UI → порты.

Perfect negotiation (polite/impolite) обязателен: host = impolite, guests = polite. Иначе glare на mesh.

---

## 6. Signaling и WebRTC

### MVP (1:1)

- Комната: `crypto.randomUUID()` на клиенте при создании, сразу navigation.
- Signaling: Next.js не умеет WS из обычного serverless одинаково везде. Для self-host — **кастомный server** (`server.ts` + `socket.io` / `ws`) рядом с Next, или Route Handler только если деплой long-lived (не чистый Vercel serverless без Durable Objects).
- Рекомендация для OSS self-host: **Node-сервер: Next + ws**. Комнаты = `Map<RoomId, RoomState>` в памяти. TTL пустой комнаты 10 минут.
- ICE: публичный STUN Google по умолчанию; TURN — env.

Сообщения signaling (минимальный набор):

```
hello { peerId, role, nickname? }
join-request { peerId, nickname }      // полный продукт
join-accept { peerId }
join-reject { peerId }
peer-left { peerId }
offer / answer / ice { to, from, payload }
room-full
room-closed
```

Медиа: `addTransceiver('video'|'audio', { direction: 'sendrecv' })`.  
Чат (полный продукт): `RTCDataChannel` label `chat`, ordered.

### Полный продукт (до 4 mesh)

Каждый пир держит N−1 соединений. Signaling рассылает roster. Host единственный, кто шлёт `join-accept`.

Ограничение 4 — продуктовое, не «пока так». В UI: «До 4 человек в комнате». SFU (LiveKit/mediasoup) — фаза 3, отдельный аддон, не в «полном v1».

---

## 7. Безопасность

| Угроза | Мера |
| --- | --- |
| Угадывание комнаты | `crypto.randomUUID()` (122 бита). Не короткие коды в v1. |
| Спам-джойны | Host approval (полный продукт). Rate-limit signaling по IP на инстансе. |
| Подмена host | Первый `hello` в пустую комнату = host. Повторный host с тем же id отклоняется. Room id не даёт прав host после того, как host уже есть. |
| XSS в чате/нике | Только текст, sanitize/escape, лимит длины. |
| Утечка медиа на сервер | Сервер не проксирует RTP. Только signaling. |
| TURN credentials | Только на self-host через env, не в публичном клиентском репо с секретами. |
| Перехват signaling | HTTPS/WSS обязателен в проде. Документировать: оператор сервера видит SDP и ники. |

**Не обещать:** «сервер ничего не знает». Сервер знает roster, ники, SDP. Медиа — нет.

---

## 8. MVP vs полный продукт

### MVP (должен закрываться как отдельный PR / milestone)

- [ ] Лендинг + «Создать звонок»
- [ ] `/r/[uuid]`, первый = host
- [ ] getUserMedia + локальное видео
- [ ] Signaling 1:1 + remote video
- [ ] Copy link, mute, cam, leave
- [ ] Тёмная тема shadcn, Vercel-like лендинг и in-call
- [ ] README: как запустить локально
- [ ] Компоненты и порты как в §5 (не монолит в `page.tsx`)

### Полный продукт (поверх MVP, без ломания портов)

- [ ] Лобби с ником и превью
- [ ] Waiting room + апрув host
- [ ] Mesh до 4
- [ ] Чат по DataChannel
- [ ] EncryptionBadge + честный copy
- [ ] Состояния: denied / full / ended
- [ ] Docker Compose + опциональный coturn
- [ ] LICENSE (MIT или Apache-2.0), CONTRIBUTING

### Не сейчас

Запись звонка, экраны share в MVP (можно как быстрый follow-up), виртуальный фон, мобильные приложения, SFU, аккаунты, пароль на комнату (если понадобится — отдельная фича: fragment `#pwd` без сервера).

---

## 9. Критерии готовности

**MVP готов, когда:** два браузера (лучше два устройства / инкогнито) по одной ссылке видят и слышат друг друга за NAT домашнего роутера со STUN; хост может скопировать ссылку одной кнопкой; UI не содержит заглушек «todo chat».

**Полный продукт готов, когда:** гость без апрува не получает медиа; 3 участника с никами и чатом; в UI видно, что медиа зашифровано DTLS-SRTP; `docker compose up` поднимает звонок.

---

## 10. Порядок реализации

1. Каркас Next.js + TS + Tailwind + shadcn + dark theme + Geist.
2. Доменные типы + порты (пустые in-memory/noop реализации).
3. Лендинг и генерация room id.
4. Local media + `VideoTile` / `CallControls`.
5. Signaling server + 1:1 negotiation.
6. Полировка MVP UI.
7. Лобби / ник / approval.
8. Mesh 3–4.
9. DataChannel чат.
10. Docker, TURN, security copy, OSS файлы.
