'use client';

import Link from 'next/link';
import { useEffect, useReducer, useState } from 'react';
import {
  Headphones,
  Moon,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTimerTools } from '@/hooks/use-timer-tools';
import { AmbientMixer } from '@/components/ambient-mixer';
import { RadioPlayer } from '@/components/radio-player';
import { initialTimer, labels, timerReducer, type Mode } from '@/lib/timer';

export default function Home() {
  const [timer, dispatch] = useReducer(timerReducer, undefined, initialTimer);
  useTimerTools(timer, dispatch);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(false);
  const [quiet, setQuiet] = useState(false);
  useEffect(() => {
    try {
      dispatch({
        type: 'restore',
        value: JSON.parse(localStorage.getItem('lofi-chill.timer') || 'null'),
        now: Date.now(),
      });
    } catch {
      /* Storage is optional. */
    }
    // Browser-only preference hydration intentionally updates after the server render.
    // oxlint-disable-next-line react/react-compiler
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(
          'lofi-chill.timer',
          JSON.stringify({
            durations: timer.durations,
            completed: timer.completed,
            day: timer.day,
          }),
        );
      } catch {
        /* Storage is optional. */
      }
    }
  }, [timer.durations, timer.completed, timer.day, ready]);
  useEffect(() => {
    const tick = () => dispatch({ type: 'tick', now: Date.now() });
    const interval = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  const time = `${Math.floor(timer.remaining / 60)
    .toString()
    .padStart(2, '0')}:${(timer.remaining % 60).toString().padStart(2, '0')}`;
  useEffect(() => {
    document.title = `${time} · ${labels[timer.mode]} · lofi & chill`;
  }, [time, timer.mode]);
  return (
    <div className={`study-app ${quiet ? 'quiet' : ''}`}>
      <header className="topbar">
        <Link href="/" className="brand">
          <Headphones size={23} />
          <span>
            lofi <i>&</i> chill
          </span>
        </Link>
        <button
          className="text-button"
          onClick={() => setQuiet(!quiet)}
          aria-pressed={quiet}
        >
          <Moon size={17} />
          {quiet ? 'Show everything' : 'Focus mode'}
        </button>
      </header>
      <main>
        <section className="timer-section" aria-label="Pomodoro timer">
          <p className="eyebrow">
            <span className="status-dot" /> YOUR LITTLE CORNER OF CALM
          </p>
          <Tabs
            value={timer.mode}
            onValueChange={(value) =>
              dispatch({ type: 'mode', mode: value as Mode, now: Date.now() })
            }
          >
            <TabsList className="timer-tabs" aria-label="Session type">
              {(Object.keys(labels) as Mode[]).map((mode) => (
                <TabsTrigger key={mode} value={mode}>
                  {labels[mode]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className={`timer-face ${timer.deadline ? 'running' : ''}`}>
            <span
              role="timer"
              aria-label={`${labels[timer.mode]} time remaining`}
            >
              {time}
            </span>
          </div>
          <output className="timer-notice" aria-live="polite">
            {timer.notice}
          </output>
          <div className="timer-actions">
            <button
              className="icon-button"
              aria-label="Reset timer"
              onClick={() => dispatch({ type: 'reset', now: Date.now() })}
            >
              <RotateCcw size={20} />
            </button>
            <button
              className="primary-button"
              onClick={() => dispatch({ type: 'toggle', now: Date.now() })}
            >
              {timer.deadline ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
              {timer.deadline
                ? 'Pause session'
                : `Start ${timer.mode === 'focus' ? 'focusing' : 'break'}`}
            </button>
            <button
              className="icon-button"
              aria-label="Timer settings"
              aria-expanded={settings}
              onClick={() => setSettings(!settings)}
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>
          {settings && (
            <fieldset className="timer-settings">
              <legend>Session length · minutes</legend>
              {(Object.keys(labels) as Mode[]).map((mode) => (
                <label key={mode}>
                  {labels[mode]}
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={timer.durations[mode]}
                    onChange={(e) =>
                      dispatch({
                        type: 'duration',
                        mode,
                        minutes: Number(e.target.value),
                      })
                    }
                  />
                </label>
              ))}
              <p>
                Changes apply to your next session while a timer is running.
              </p>
            </fieldset>
          )}
          <div className="session-count">
            <span className="session-dots" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={
                    i < (timer.completed % 4 || (timer.completed ? 4 : 0))
                      ? 'filled'
                      : ''
                  }
                />
              ))}
            </span>
            <span>
              {timer.completed} focus{' '}
              {timer.completed === 1 ? 'session' : 'sessions'} today
            </span>
          </div>
        </section>
        <div className="sound-desk">
          <RadioPlayer />
          <AmbientMixer />
        </div>
      </main>
      <footer>
        <span>
          <Sparkles size={14} /> A little focus. A little flow.
        </span>
        <span>Take it one session at a time.</span>
      </footer>
    </div>
  );
}
