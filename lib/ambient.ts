export type Sound = 'rain' | 'brown' | 'waves';
export const soundNames: Record<Sound, string> = {
  rain: 'Rainfall',
  brown: 'Brown noise',
  waves: 'Ocean hush',
};
type Channel = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  oscillator?: OscillatorNode;
  modulation?: GainNode;
};
/** Bundled CC0 rain recording and locally synthesized noise; no third-party streams. */
export class AmbientMixer {
  private context: AudioContext;
  private rainBuffer: AudioBuffer | null = null;
  private rainLoading: Promise<void> | null = null;
  private rainRequest: AbortController | null = null;
  private disposed = false;
  private channels = new Map<Sound, Channel>();
  constructor() {
    this.context = new AudioContext();
  }
  async resume() {
    if (this.disposed) throw new Error('Audio mixer has been disposed.');
    // Resume inside the click gesture before awaiting the bundled recording.
    await Promise.all([this.context.resume(), this.loadRain()]);
    if (this.context.state !== 'running')
      throw new Error('Audio is paused by the browser. Try again.');
  }
  private loadRain(): Promise<void> {
    if (this.rainBuffer) return Promise.resolve();
    if (this.rainLoading) return this.rainLoading;
    const request = new AbortController();
    this.rainRequest = request;
    const timeout = setTimeout(() => request.abort(), 15000);
    this.rainLoading = (async () => {
      const response = await fetch(
        `${import.meta.env?.BASE_URL ?? '/'}audio/rain.mp3`,
        {
          signal: request.signal,
        },
      );
      if (!response.ok) throw new Error('Could not load the rain recording.');
      const buffer = await this.context.decodeAudioData(
        await response.arrayBuffer(),
      );
      if (this.disposed) throw new Error('Audio mixer has been disposed.');
      this.rainBuffer = buffer;
    })().finally(() => {
      clearTimeout(timeout);
      this.rainRequest = null;
      this.rainLoading = null;
    });
    return this.rainLoading;
  }
  setVolume(sound: Sound, volume: number) {
    if (this.disposed) return;
    const level = Math.max(0, Math.min(100, volume)) / 100;
    let channel = this.channels.get(sound);
    if (!channel && level === 0) return;
    if (!channel) {
      let buffer: AudioBuffer;
      if (sound === 'rain') {
        // Volume can change while the first recording download is pending.
        if (!this.rainBuffer) return;
        buffer = this.rainBuffer;
      } else {
        buffer = this.context.createBuffer(
          2,
          this.context.sampleRate * 8,
          this.context.sampleRate,
        );
        for (let side = 0; side < 2; side++) {
          const data = buffer.getChannelData(side);
          let brown = 0;
          for (let i = 0; i < data.length; i++) {
            const white = Math.random() * 2 - 1;
            brown = (brown + 0.02 * white) / 1.02;
            data[i] = sound === 'brown' ? brown * 3.5 : white * 0.35;
          }
          // Crossfade the seam into the beginning to avoid a click on every loop.
          const fade = Math.floor(this.context.sampleRate * 0.05);
          for (let i = 0; i < fade; i++) {
            const mix = i / fade;
            data[data.length - fade + i] =
              data[data.length - fade + i] * (1 - mix) + data[i] * mix;
          }
        }
      }
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = sound === 'rain' ? 0 : 0.05;
      const filter = this.context.createBiquadFilter();
      filter.type = sound === 'rain' ? 'allpass' : 'lowpass';
      filter.frequency.value = sound === 'waves' ? 650 : 450;
      const gain = this.context.createGain();
      gain.gain.value = 0;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.context.destination);
      channel = { source, filter, gain };
      if (sound === 'waves') {
        const oscillator = this.context.createOscillator();
        oscillator.frequency.value = 0.12;
        const modulation = this.context.createGain();
        modulation.gain.value = 280;
        oscillator.connect(modulation);
        modulation.connect(filter.frequency);
        oscillator.start();
        channel.oscillator = oscillator;
        channel.modulation = modulation;
      }
      source.start();
      this.channels.set(sound, channel);
    }
    channel.gain.gain.setTargetAtTime(
      level * (sound === 'rain' ? 1 : 0.5),
      this.context.currentTime,
      0.12,
    );
  }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.rainRequest?.abort();
    this.rainBuffer = null;
    this.channels.forEach((c) => {
      c.source.stop();
      c.oscillator?.stop();
      c.source.disconnect();
      c.filter.disconnect();
      c.gain.disconnect();
      c.modulation?.disconnect();
    });
    this.channels.clear();
    await this.context.close();
  }
}
