import type { ILocalMedia } from "@/shared/ports/local-media";

const defaultConstraints: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true },
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
};

export class BrowserLocalMedia implements ILocalMedia {
  private stream: MediaStream | undefined;

  async start(constraints: MediaStreamConstraints = defaultConstraints): Promise<MediaStream> {
    this.stop();
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.stream;
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
  }

  setMic(on: boolean): void {
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = on;
    });
  }

  setCam(on: boolean): void {
    this.stream?.getVideoTracks().forEach((track) => {
      track.enabled = on;
    });
  }

  getStream(): MediaStream | undefined {
    return this.stream;
  }
}
