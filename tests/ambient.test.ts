import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { AmbientMixer, restoreVolumes } from '../lib/ambient.ts';
function mockAudio(t: TestContext) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  const sources: {
    buffer?: unknown;
    loop: boolean;
    loopStart: number;
    started: boolean;
  }[] = [];
  const levels: number[] = [];
  class AudioContextStub {
    currentTime = 0;
    destination = {};
    createBufferSource() {
      const source = {
        loop: false,
        loopStart: 0,
        started: false,
        connect() {},
        disconnect() {},
        stop() {},
        start() {
          this.started = true;
        },
      };
      sources.push(source);
      return source;
    }
    createBiquadFilter() {
      return {
        type: '',
        frequency: { value: 0 },
        connect() {},
        disconnect() {},
      };
    }
    createGain() {
      return {
        gain: {
          value: 0,
          setTargetAtTime(value: number) {
            levels.push(value);
          },
        },
        connect() {},
        disconnect() {},
      };
    }
    state = 'suspended';
    async resume() {
      this.state = 'running';
    }
    async close() {
      this.state = 'closed';
    }
    async decodeAudioData() {
      return { duration: 45 };
    }
  }
  Object.defineProperty(globalThis, 'AudioContext', {
    value: AudioContextStub,
    configurable: true,
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original);
    else Reflect.deleteProperty(globalThis, 'AudioContext');
  });
  return { sources, levels };
}
await test('rain download failures can be retried and successful decoding is cached', async (t) => {
  mockAudio(t);
  const requests = new Map<string, number>();
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.match(url, /^\/audio\/(rain|birds|fire)\.mp3$/);
    requests.set(url, (requests.get(url) ?? 0) + 1);
    return url === '/audio/rain.mp3' && requests.get(url) === 1
      ? new Response('', { status: 503 })
      : new Response(new Uint8Array([1, 2, 3]));
  });
  const mixer = new AmbientMixer();
  await assert.rejects(mixer.resume(), /Could not load/);
  await Promise.all([mixer.resume(), mixer.resume()]);
  await mixer.resume();
  assert.equal(requests.get('/audio/rain.mp3'), 2);
  assert.equal(requests.get('/audio/birds.mp3'), 1);
  assert.equal(requests.get('/audio/fire.mp3'), 1);
  await mixer.dispose();
});
await test('disposing the mixer cancels a pending rain request and prevents restarting', async (t) => {
  mockAudio(t);
  let aborted = false;
  t.mock.method(
    globalThis,
    'fetch',
    (_url: string, options: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        options.signal?.addEventListener(
          'abort',
          () => {
            aborted = true;
            reject(new Error('aborted'));
          },
          { once: true },
        );
      }),
  );
  const mixer = new AmbientMixer();
  const pending = assert.rejects(mixer.resume(), /aborted/);
  await mixer.dispose();
  await pending;
  assert.equal(aborted, true);
  await assert.rejects(mixer.resume(), /disposed/);
  await mixer.dispose();
});

await test('new recordings loop through individual gains and fade to silence when paused', async (t) => {
  const { sources, levels } = mockAudio(t);
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(new Uint8Array([1])),
  );
  const mixer = new AmbientMixer();
  await mixer.resume();
  mixer.setVolume('birds', 30);
  mixer.setVolume('fire', 20);
  assert.equal(sources.length, 2);
  assert.ok(
    sources.every(
      (source) =>
        source.loop &&
        source.loopStart === 0 &&
        source.started &&
        source.buffer,
    ),
  );
  assert.deepEqual(levels, [0.3, 0.2]);
  mixer.setVolume('birds', 0);
  mixer.setVolume('fire', 0);
  assert.deepEqual(levels, [0.3, 0.2, 0, 0]);
  mixer.setVolume('birds', 45);
  assert.equal(sources.length, 2);
  await mixer.dispose();
});
await test('old three-channel preferences migrate with new sounds muted and invalid levels ignored', () => {
  assert.deepEqual(restoreVolumes({ rain: 70, brown: 10, waves: 25 }), {
    rain: 70,
    brown: 10,
    waves: 25,
    birds: 0,
    fire: 0,
  });
  assert.deepEqual(
    restoreVolumes({ rain: -1, brown: Infinity, birds: 30, fire: '50' }),
    {
      rain: 35,
      brown: 0,
      waves: 0,
      birds: 30,
      fire: 0,
    },
  );
});
