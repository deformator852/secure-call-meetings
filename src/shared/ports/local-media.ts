export interface ILocalMedia {
  start(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  stop(): void;
  setMic(on: boolean): void;
  setCam(on: boolean): void;
  getStream(): MediaStream | undefined;
}
