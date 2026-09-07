import type { VoiceId } from "@/entities/media/voice";

export interface ILocalMedia {
  start(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  stop(): void;
  setMic(on: boolean): void;
  setCam(on: boolean): void;
  setVoice(voice: VoiceId): void;
  setMonitor(on: boolean): void;
  getStream(): MediaStream | undefined;
}
