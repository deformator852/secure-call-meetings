import { RoomHub } from "@/infrastructure/signaling/room-hub";

const globalForHub = globalThis as typeof globalThis & { __roomHub?: RoomHub };

export function getHub(): RoomHub {
  globalForHub.__roomHub ??= new RoomHub();
  return globalForHub.__roomHub;
}
