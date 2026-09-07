class VoiceProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.voice = "natural";
    this.pitch = 1;
    this.ringMix = 0;
    this.ringHz = 55;
    this.lowpass = 1;
    this.highpass = 0;
    this.phase = 0;
    this.lp = 0;
    this.hp = 0;
    this.delaySize = 4096;
    this.grainSize = 2048;
    this.buffer = new Float32Array(this.delaySize);
    this.writePos = 0;
    this.grainPos = 0;
    this.port.onmessage = (event) => {
      if (event.data && event.data.voice) {
        this.setVoice(event.data.voice);
      }
    };
    this.setVoice(options.processorOptions && options.processorOptions.voice);
  }

  setVoice(voice) {
    this.voice = voice;
    switch (voice) {
      case "deep":
        this.pitch = 0.92;
        this.ringMix = 0;
        this.lowpass = 0.72;
        this.highpass = 0;
        break;
      case "high":
        this.pitch = 1.1;
        this.ringMix = 0;
        this.lowpass = 1;
        this.highpass = 0.02;
        break;
      case "chipmunk":
        this.pitch = 1.18;
        this.ringMix = 0;
        this.lowpass = 1;
        this.highpass = 0.03;
        break;
      case "robot":
        this.pitch = 1;
        this.ringMix = 0.18;
        this.ringHz = 55;
        this.lowpass = 0.88;
        this.highpass = 0;
        break;
      default:
        this.pitch = 1;
        this.ringMix = 0;
        this.lowpass = 1;
        this.highpass = 0;
        this.voice = "natural";
    }
  }

  sampleAt(pos) {
    const size = this.delaySize;
    const wrapped = ((pos % size) + size) % size;
    const i0 = wrapped | 0;
    const i1 = (i0 + 1) % size;
    const frac = wrapped - i0;
    return this.buffer[i0] * (1 - frac) + this.buffer[i1] * frac;
  }

  process(inputs, outputs) {
    const output = outputs[0] && outputs[0][0];
    if (!output) {
      return true;
    }

    const input = inputs[0] && inputs[0][0];
    const dry = this.voice === "natural";
    const grain = this.grainSize;
    const twoPi = 2 * Math.PI;

    for (let i = 0; i < output.length; i++) {
      const incoming = input ? (input[i] ?? 0) : 0;
      this.buffer[this.writePos] = incoming;

      let sample = incoming;
      if (!dry && this.pitch !== 1) {
        const r1 = this.writePos - grain + this.grainPos;
        const r2 = r1 + grain / 2;
        const x = this.grainPos / grain;
        const w1 = 0.5 * (1 - Math.cos(twoPi * x));
        const w2 = 0.5 * (1 - Math.cos(twoPi * (x + 0.5)));
        sample = this.sampleAt(r1) * w1 + this.sampleAt(r2) * w2;
        this.grainPos += this.pitch;
        if (this.grainPos >= grain) {
          this.grainPos -= grain;
        }
      }

      if (!dry && this.lowpass < 1) {
        this.lp += this.lowpass * (sample - this.lp);
        sample = this.lp;
      }
      if (!dry && this.highpass > 0) {
        this.hp += this.highpass * (sample - this.hp);
        sample -= this.hp;
      }
      if (!dry && this.ringMix > 0) {
        this.phase += (this.ringHz / sampleRate) * twoPi;
        if (this.phase > twoPi) {
          this.phase -= twoPi;
        }
        const carrier = 0.82 + 0.18 * Math.sin(this.phase);
        sample = sample * (1 - this.ringMix) + sample * carrier * this.ringMix;
      }

      if (sample > 1) {
        sample = 1;
      } else if (sample < -1) {
        sample = -1;
      }
      output[i] = dry ? incoming : sample;
      this.writePos = (this.writePos + 1) % this.delaySize;
    }

    return true;
  }
}

registerProcessor("voice-processor", VoiceProcessor);
