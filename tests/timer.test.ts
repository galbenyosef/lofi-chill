import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialTimer,
  timerReducer,
  restoreTimer,
  localDay,
} from '../lib/timer.ts';
const now = new Date(2026, 8, 6, 12).getTime();
const initial = () => ({ ...initialTimer(), day: localDay(now) });
await test('elapsed wall clock time remains accurate without interval ticks', () => {
  const running = timerReducer(initial(), { type: 'toggle', now });
  const next = timerReducer(running, { type: 'tick', now: now + 62000 });
  assert.equal(next.remaining, 1438);
});
await test('pause and resume preserve remaining duration', () => {
  const running = timerReducer(initial(), { type: 'toggle', now });
  const paused = timerReducer(running, { type: 'toggle', now: now + 10000 });
  assert.equal(paused.deadline, null);
  const resumed = timerReducer(paused, { type: 'toggle', now: now + 50000 });
  assert.equal(resumed.deadline, now + 1540000);
});
await test('completion counts once and waits for an explicit break start', () => {
  const running = timerReducer(initial(), { type: 'toggle', now });
  const done = timerReducer(running, { type: 'tick', now: now + 1600000 });
  assert.equal(done.completed, 1);
  assert.equal(done.mode, 'short');
  assert.equal(done.deadline, null);
  assert.equal(
    timerReducer(done, { type: 'tick', now: now + 1800000 }).completed,
    1,
  );
});
await test('fourth focus session gives a long break; breaks do not count as focus', () => {
  const running = timerReducer(
    { ...initial(), completed: 3 },
    { type: 'toggle', now },
  );
  const done = timerReducer(running, { type: 'tick', now: now + 1500000 });
  assert.equal(done.mode, 'long');
  const breakRun = timerReducer(done, { type: 'toggle', now: now + 1500000 });
  const breakDone = timerReducer(breakRun, {
    type: 'tick',
    now: now + 2400000,
  });
  assert.equal(breakDone.mode, 'focus');
  assert.equal(breakDone.completed, 4);
});
await test('restore validates saved settings and resets stale daily counts', () => {
  const restored = restoreTimer(
    {
      durations: { focus: 40, short: -1, long: 'bad' },
      completed: 6,
      day: 'yesterday',
    },
    now,
  );
  assert.deepEqual(restored.durations, { focus: 40, short: 5, long: 15 });
  assert.equal(restored.completed, 0);
});
await test('reset and mode changes cancel deadlines without adding sessions', () => {
  const running = timerReducer(initial(), { type: 'toggle', now });
  const changed = timerReducer(running, { type: 'mode', mode: 'long', now });
  assert.equal(changed.remaining, 900);
  assert.equal(changed.deadline, null);
  assert.equal(changed.completed, 0);
  assert.equal(timerReducer(running, { type: 'reset', now }).remaining, 1500);
});

await test('every timer completion emits one chime event, including both break modes', () => {
  for (const mode of ['focus', 'short', 'long'] as const) {
    const running = timerReducer(
      { ...initial(), mode, remaining: 1 },
      { type: 'toggle', now },
    );
    const done = timerReducer(running, { type: 'tick', now: now + 1000 });
    assert.equal(done.completion, 1);
    assert.equal(
      timerReducer(done, { type: 'tick', now: now + 2000 }).completion,
      1,
    );
    assert.equal(timerReducer(running, { type: 'reset', now }).completion, 0);
    assert.equal(
      timerReducer(running, { type: 'mode', mode: 'short', now }).completion,
      0,
    );
    assert.equal(
      timerReducer(running, { type: 'toggle', now: now + 500 }).completion,
      0,
    );
  }
});

await test('switching tabs saves elapsed time, pauses, and restores each session independently', () => {
  let state = timerReducer(initial(), { type: 'toggle', now });
  state = timerReducer(state, {
    type: 'mode',
    mode: 'short',
    now: now + 62000,
  });
  assert.equal(state.saved.focus?.remaining, 1438);
  assert.equal(state.deadline, null);
  state = timerReducer(state, { type: 'toggle', now: now + 62000 });
  state = timerReducer(state, { type: 'mode', mode: 'long', now: now + 72000 });
  state = timerReducer(state, {
    type: 'mode',
    mode: 'focus',
    now: now + 90000,
  });
  assert.equal(state.remaining, 1438);
  assert.equal(state.deadline, null);
  state = timerReducer(state, { type: 'toggle', now: now + 90000 });
  assert.equal(state.deadline, now + 1528000);
  state = timerReducer(state, {
    type: 'mode',
    mode: 'short',
    now: now + 91000,
  });
  assert.equal(state.remaining, 290);
  state = timerReducer(state, { type: 'reset', now: now + 91000 });
  assert.equal(state.remaining, 300);
  assert.equal(state.saved.focus?.remaining, 1437);
});
await test('clicking the active tab does not pause or reset its timer', () => {
  const running = timerReducer(initial(), { type: 'toggle', now });
  assert.equal(
    timerReducer(running, { type: 'mode', mode: 'focus', now: now + 10000 }),
    running,
  );
});
await test('duration edits preserve paused progress in both active and inactive tabs', () => {
  let state = timerReducer(initial(), { type: 'toggle', now });
  state = timerReducer(state, { type: 'toggle', now: now + 10000 });
  state = timerReducer(state, { type: 'duration', mode: 'focus', minutes: 40 });
  assert.equal(state.remaining, 1490);
  state = timerReducer(state, {
    type: 'mode',
    mode: 'short',
    now: now + 10000,
  });
  state = timerReducer(state, { type: 'duration', mode: 'focus', minutes: 50 });
  state = timerReducer(state, {
    type: 'mode',
    mode: 'focus',
    now: now + 10000,
  });
  assert.equal(state.remaining, 1490);
  assert.equal(timerReducer(state, { type: 'reset', now }).remaining, 3000);
});
await test('switching at the deadline still counts completion exactly once', () => {
  const running = timerReducer(initial(), { type: 'toggle', now });
  const switched = timerReducer(running, {
    type: 'mode',
    mode: 'long',
    now: now + 1500000,
  });
  assert.equal(switched.completion, 1);
  assert.equal(switched.completed, 1);
  const focus = timerReducer(switched, {
    type: 'mode',
    mode: 'focus',
    now: now + 1501000,
  });
  assert.equal(focus.remaining, 1500);
  assert.equal(focus.completed, 1);
});
await test('finishing a break returns to previously paused focus progress', () => {
  let state = timerReducer(initial(), { type: 'toggle', now });
  state = timerReducer(state, {
    type: 'mode',
    mode: 'short',
    now: now + 60000,
  });
  state = timerReducer(state, { type: 'toggle', now: now + 60000 });
  state = timerReducer(state, { type: 'tick', now: now + 360000 });
  assert.equal(state.mode, 'focus');
  assert.equal(state.remaining, 1440);
  assert.equal(state.completed, 0);
  assert.equal(state.completion, 1);
});
