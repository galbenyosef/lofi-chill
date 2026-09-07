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
/** Locally synthesized ambience: no audio downloads, music samples, or stream proxy. */
export class AmbientMixer {
  private context: AudioContext;
  private channels = new Map<Sound, Channel>();
  constructor() {
    this.context = new AudioContext();
  }
  async resume() {
    await this.context.resume();
    if (this.context.state !== 'running')
      throw new Error('Audio is paused by the browser. Try again.');
  }
  setVolume(sound: Sound, volume: number) {
    const level = Math.max(0, Math.min(100, volume)) / 100;
    let channel = this.channels.get(sound);
    if (!channel && level === 0) return;
    if (!channel) {
      const buffer = this.context.createBuffer(
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
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = 0.05;
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value =
        sound === 'rain' ? 2600 : sound === 'waves' ? 650 : 450;
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
      level * 0.5,
      this.context.currentTime,
      0.12,
    );
  }
  async dispose() {
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
