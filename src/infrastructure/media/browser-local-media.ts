import type { VoiceId } from "@/entities/media/voice";
import type { ILocalMedia } from "@/shared/ports/local-media";

const defaultConstraints: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  },
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
};

export class BrowserLocalMedia implements ILocalMedia {
  private capture: MediaStream | undefined;
  private outbound: MediaStream | undefined;
  private audioContext: AudioContext | undefined;
  private sourceNode: MediaStreamAudioSourceNode | undefined;
  private workletNode: AudioWorkletNode | undefined;
  private destinationNode: MediaStreamAudioDestinationNode | undefined;
  private monitorGain: GainNode | undefined;
  private voice: VoiceId = "natural";
  private monitorOn = false;

  async start(constraints: MediaStreamConstraints = defaultConstraints): Promise<MediaStream> {
    this.stop();

    const audioContext = new AudioContext({ latencyHint: "interactive" });
    this.audioContext = audioContext;
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    this.capture = await navigator.mediaDevices.getUserMedia(constraints);
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    await audioContext.audioWorklet.addModule("/audio/voice-processor.js?v=4");
    const sourceNode = audioContext.createMediaStreamSource(this.capture);
    const workletNode = new AudioWorkletNode(audioContext, "voice-processor", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      channelCount: 1,
      channelCountMode: "explicit",
      processorOptions: { voice: this.voice },
    });
    const destinationNode = audioContext.createMediaStreamDestination();
    const monitorGain = audioContext.createGain();
    monitorGain.gain.value = this.monitorOn ? 0.85 : 0;
    sourceNode.connect(workletNode);
    workletNode.connect(destinationNode);
    workletNode.connect(monitorGain);
    monitorGain.connect(audioContext.destination);

    this.sourceNode = sourceNode;
    this.workletNode = workletNode;
    this.destinationNode = destinationNode;
    this.monitorGain = monitorGain;
    this.applyVoice();
    void this.syncCaptureProcessing();

    const processedAudio = destinationNode.stream.getAudioTracks()[0];
    if (processedAudio) {
      processedAudio.enabled = false;
      processedAudio.contentHint = "speech";
      await waitForTrackToFlow(processedAudio);
      processedAudio.enabled = true;
    }
    const video = this.capture.getVideoTracks()[0];
    this.outbound = new MediaStream([
      ...(processedAudio ? [processedAudio] : []),
      ...(video ? [video] : []),
    ]);
    return this.outbound;
  }

  stop(): void {
    this.sourceNode?.disconnect();
    this.workletNode?.disconnect();
    this.destinationNode?.disconnect();
    this.monitorGain?.disconnect();
    this.sourceNode = undefined;
    this.workletNode = undefined;
    this.destinationNode = undefined;
    this.monitorGain = undefined;
    this.capture?.getTracks().forEach((track) => track.stop());
    this.capture = undefined;
    this.outbound = undefined;
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = undefined;
    }
  }

  setMic(on: boolean): void {
    this.capture?.getAudioTracks().forEach((track) => {
      track.enabled = on;
    });
    this.outbound?.getAudioTracks().forEach((track) => {
      track.enabled = on;
    });
  }

  setCam(on: boolean): void {
    this.capture?.getVideoTracks().forEach((track) => {
      track.enabled = on;
    });
  }

  setVoice(voice: VoiceId): void {
    this.voice = voice;
    this.applyVoice();
    if (this.audioContext?.state === "suspended") {
      void this.audioContext.resume();
    }
  }

  setMonitor(on: boolean): void {
    this.monitorOn = on;
    if (this.monitorGain) {
      this.monitorGain.gain.value = on ? 0.85 : 0;
    }
    void this.syncCaptureProcessing();
  }

  getStream(): MediaStream | undefined {
    return this.outbound;
  }

  private applyVoice(): void {
    this.workletNode?.port.postMessage({ voice: this.voice });
  }

  private async syncCaptureProcessing(): Promise<void> {
    const track = this.capture?.getAudioTracks()[0];
    if (!track) {
      return;
    }
    try {
      await track.applyConstraints({
        echoCancellation: !this.monitorOn,
        noiseSuppression: false,
        autoGainControl: false,
      });
    } catch {
      // Some devices reject toggling AEC while the track is live.
    }
  }
}

function waitForTrackToFlow(track: MediaStreamTrack): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      track.removeEventListener("unmute", finish);
      resolve();
    };
    track.addEventListener("unmute", finish);
    window.setTimeout(finish, track.muted ? 300 : 80);
  });
}
