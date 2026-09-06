import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialTimer, timerReducer, restoreTimer, localDay } from '../lib/timer.ts';
const now = new Date(2026, 8, 6, 12).getTime();
const initial = () => ({ ...initialTimer(), day: localDay(now) });
test('elapsed wall clock time remains accurate without interval ticks', () => {
 const running = timerReducer(initial(), { type:'toggle', now });
 const next = timerReducer(running, { type:'tick', now:now + 62000 });
 assert.equal(next.remaining, 1438);
});
test('pause and resume preserve remaining duration', () => {
 const running = timerReducer(initial(), { type:'toggle', now });
 const paused = timerReducer(running, { type:'toggle', now:now + 10000 });
 assert.equal(paused.deadline, null);
 const resumed = timerReducer(paused, { type:'toggle', now:now + 50000 });
 assert.equal(resumed.deadline, now + 1540000);
});
test('completion counts once and waits for an explicit break start', () => {
 const running = timerReducer(initial(), { type:'toggle', now });
 const done = timerReducer(running, { type:'tick', now:now + 1600000 });
 assert.equal(done.completed, 1); assert.equal(done.mode, 'short'); assert.equal(done.deadline, null);
 assert.equal(timerReducer(done, { type:'tick', now:now + 1800000 }).completed, 1);
});
test('fourth focus session gives a long break; breaks do not count as focus', () => {
 const running = timerReducer({ ...initial(), completed:3 }, { type:'toggle', now });
 const done = timerReducer(running, { type:'tick', now:now + 1500000 });
 assert.equal(done.mode, 'long');
 const breakRun = timerReducer(done, { type:'toggle', now:now + 1500000 });
 const breakDone = timerReducer(breakRun, { type:'tick', now:now + 2400000 });
 assert.equal(breakDone.mode, 'focus'); assert.equal(breakDone.completed, 4);
});
test('restore validates saved settings and resets stale daily counts', () => {
 const restored = restoreTimer({ durations:{ focus:40, short:-1, long:'bad' }, completed:6, day:'yesterday' }, now);
 assert.deepEqual(restored.durations, { focus:40, short:5, long:15 }); assert.equal(restored.completed, 0);
});
test('reset and mode changes cancel deadlines without adding sessions', () => {
 const running = timerReducer(initial(), { type:'toggle', now });
 const changed = timerReducer(running, { type:'mode', mode:'long', now });
 assert.equal(changed.remaining, 900); assert.equal(changed.deadline, null); assert.equal(changed.completed,0);
 assert.equal(timerReducer(running, { type:'reset', now }).remaining,1500);
});
