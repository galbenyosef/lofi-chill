import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStation, radioEmbedUrl, stations } from '../lib/radio.ts';
await test('radio playback uses an inline embed with visible controls for every station', () => {
  for (const station of Object.keys(stations)) {
    assert.ok(isStation(station));
    const url = new URL(radioEmbedUrl(station));
    assert.equal(url.origin, 'https://www.youtube-nocookie.com');
    assert.equal(url.pathname, `/embed/${stations[station].videoId}`);
    assert.equal(url.searchParams.get('playsinline'), '1');
    assert.equal(url.searchParams.get('autoplay'), '1');
    assert.equal(url.searchParams.get('controls'), '1');
  }
});
await test('obsolete and malformed saved stations fall back without constructing arbitrary URLs', () => {
  for (const value of [
    'loungetunes',
    '__proto__',
    'constructor',
    'https://example.com',
    null,
    {},
  ])
    assert.equal(isStation(value), false);
  assert.equal(isStation('lofi'), true);
  assert.equal(isStation('synthwave'), true);
});
