import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { AmbientMixer } from '../lib/ambient.ts';
function mockAudio(t: TestContext) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  class AudioContextStub {
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
}
await test('rain download failures can be retried and successful decoding is cached', async (t) => {
  mockAudio(t);
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.equal(url, '/audio/rain.mp3');
    requests++;
    return requests === 1
      ? new Response('', { status: 503 })
      : new Response(new Uint8Array([1, 2, 3]));
  });
  const mixer = new AmbientMixer();
  await assert.rejects(mixer.resume(), /Could not load/);
  await Promise.all([mixer.resume(), mixer.resume()]);
  await mixer.resume();
  assert.equal(requests, 2);
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
