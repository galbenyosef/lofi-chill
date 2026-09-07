export type Mode = 'focus' | 'short' | 'long';
export type Durations = Record<Mode, number>;
export type Timer = {
  mode: Mode;
  remaining: number;
  deadline: number | null;
  completed: number;
  completion: number;
  day: string;
  durations: Durations;
  notice: string;
};
export const labels: Record<Mode, string> = {
  focus: 'Focus',
  short: 'Short break',
  long: 'Long break',
};
export const localDay = (now: number) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
export const initialTimer = (): Timer => ({
  mode: 'focus',
  remaining: 1500,
  deadline: null,
  completed: 0,
  completion: 0,
  day: localDay(Date.now()),
  durations: { focus: 25, short: 5, long: 15 },
  notice: 'Make room for one thing.',
});
export type Action =
  | { type: 'tick' | 'toggle' | 'reset'; now: number }
  | { type: 'mode'; mode: Mode; now: number }
  | { type: 'duration'; mode: Mode; minutes: number }
  | { type: 'restore'; value: unknown; now: number };
export function restoreTimer(value: unknown, now: number): Timer {
  const base = initialTimer();
  if (!value || typeof value !== 'object') return base;
  const v = value as Partial<Timer>;
  for (const mode of ['focus', 'short', 'long'] as Mode[]) {
    const n = v.durations?.[mode];
    if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 120)
      base.durations[mode] = n;
  }
  base.remaining = base.durations.focus * 60;
  if (
    v.day === localDay(now) &&
    Number.isSafeInteger(v.completed) &&
    v.completed! >= 0
  )
    base.completed = v.completed!;
  base.day = localDay(now);
  return base;
}
export function timerReducer(state: Timer, action: Action): Timer {
  if (action.type === 'restore') return restoreTimer(action.value, action.now);
  let s = state;
  if ('now' in action && localDay(action.now) !== s.day)
    s = { ...s, day: localDay(action.now), completed: 0 };
  if (action.type === 'duration') {
    if (
      !Number.isInteger(action.minutes) ||
      action.minutes < 1 ||
      action.minutes > 120
    )
      return s;
    return {
      ...s,
      durations: { ...s.durations, [action.mode]: action.minutes },
      ...(s.mode === action.mode && s.deadline === null
        ? { remaining: action.minutes * 60 }
        : {}),
    };
  }
  if (action.type === 'mode')
    return {
      ...s,
      mode: action.mode,
      remaining: s.durations[action.mode] * 60,
      deadline: null,
      notice:
        action.mode === 'focus'
          ? 'Make room for one thing.'
          : 'A little room to breathe.',
    };
  if (action.type === 'reset')
    return {
      ...s,
      remaining: s.durations[s.mode] * 60,
      deadline: null,
      notice: 'Ready when you are.',
    };
  const remaining =
    s.deadline === null
      ? s.remaining
      : Math.max(0, Math.ceil((s.deadline - action.now) / 1000));
  if (s.deadline !== null && remaining === 0) {
    const completed = s.completed + (s.mode === 'focus' ? 1 : 0);
    const mode =
      s.mode === 'focus' ? (completed % 4 === 0 ? 'long' : 'short') : 'focus';
    return {
      ...s,
      completed,
      completion: s.completion + 1,
      mode,
      remaining: s.durations[mode] * 60,
      deadline: null,
      notice:
        s.mode === 'focus'
          ? 'Nice work. Your break is ready.'
          : 'Welcome back. Ready for another session?',
    };
  }
  if (action.type === 'toggle')
    return {
      ...s,
      remaining,
      deadline: s.deadline === null ? action.now + remaining * 1000 : null,
      notice:
        s.deadline === null
          ? s.mode === 'focus'
            ? 'One thing at a time.'
            : 'Rest is part of the work.'
          : 'Take your time. We’ll be here.',
    };
  return remaining === s.remaining ? s : { ...s, remaining };
}
