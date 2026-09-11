export type Sound = 'rain' | 'brown' | 'waves' | 'birds' | 'fire';
export const soundNames: Record<Sound, string> = {
  rain: 'Rainfall',
  brown: 'Brown noise',
  waves: 'Ocean hush',
  birds: 'Birdsong',
  fire: 'Fireplace',
};
export const defaultVolumes: Record<Sound, number> = {
  rain: 35,
  brown: 0,
  waves: 0,
  birds: 0,
  fire: 0,
};
export function restoreVolumes(value: unknown): Record<Sound, number> {
  const volumes = { ...defaultVolumes };
  if (!value || typeof value !== 'object') return volumes;
  for (const sound of Object.keys(volumes) as Sound[]) {
    const level = (value as Record<string, unknown>)[sound];
    if (
      typeof level === 'number' &&
      Number.isFinite(level) &&
      level >= 0 &&
      level <= 100
    )
      volumes[sound] = level;
  }
  return volumes;
}
const recordings: Partial<Record<Sound, string>> = {
  rain: 'rain.mp3',
  birds: 'birds.mp3',
  fire: 'fire.mp3',
};
type Channel = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  oscillator?: OscillatorNode;
  modulation?: GainNode;
};
/** Bundled CC0 recordings and locally synthesized noise; no third-party streams. */
export class AmbientMixer {
  private context: AudioContext;
  private buffers = new Map<Sound, AudioBuffer>();
  private loading = new Map<Sound, Promise<void>>();
  private requests = new Map<Sound, AbortController>();
  private disposed = false;
  private channels = new Map<Sound, Channel>();
  constructor() {
    this.context = new AudioContext();
  }
  async resume() {
    if (this.disposed) throw new Error('Audio mixer has been disposed.');
    // Resume inside the click gesture before awaiting the bundled recording.
    await Promise.all([
      this.context.resume(),
      ...Object.keys(recordings).map((sound) =>
        this.loadRecording(sound as Sound),
      ),
    ]);
    if (this.context.state !== 'running')
      throw new Error('Audio is paused by the browser. Try again.');
  }
  private loadRecording(sound: Sound): Promise<void> {
    if (this.buffers.has(sound)) return Promise.resolve();
    const pending = this.loading.get(sound);
    if (pending) return pending;
    const request = new AbortController();
    this.requests.set(sound, request);
    const timeout = setTimeout(() => request.abort(), 15000);
    const loading = (async () => {
      const response = await fetch(
        `${import.meta.env?.BASE_URL ?? '/'}audio/${recordings[sound]}`,
        { signal: request.signal },
      );
      if (!response.ok) throw new Error(`Could not load ${soundNames[sound]}.`);
      const buffer = await this.context.decodeAudioData(
        await response.arrayBuffer(),
      );
      if (this.disposed) throw new Error('Audio mixer has been disposed.');
      this.buffers.set(sound, buffer);
    })().finally(() => {
      clearTimeout(timeout);
      this.requests.delete(sound);
      this.loading.delete(sound);
    });
    this.loading.set(sound, loading);
    return loading;
  }
  setVolume(sound: Sound, volume: number) {
    if (this.disposed) return;
    const level = Math.max(0, Math.min(100, volume)) / 100;
    let channel = this.channels.get(sound);
    if (!channel && level === 0) return;
    if (!channel) {
      let buffer: AudioBuffer;
      if (recordings[sound]) {
        // Volume can change while the first recording download is pending.
        const recording = this.buffers.get(sound);
        if (!recording) return;
        buffer = recording;
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
      source.loopStart = recordings[sound] ? 0 : 0.05;
      const filter = this.context.createBiquadFilter();
      filter.type = recordings[sound] ? 'allpass' : 'lowpass';
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
      level * (recordings[sound] ? 1 : 0.5),
      this.context.currentTime,
      0.12,
    );
  }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.requests.forEach((request) => request.abort());
    this.buffers.clear();
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
