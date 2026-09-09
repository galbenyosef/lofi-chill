import { useEffect, useReducer, useState } from 'react';
import {
  Bell,
  BellOff,
  CassetteTape,
  Moon,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverTitle,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTimerChime } from '@/hooks/use-timer-chime';
import { AmbientMixer } from '@/components/ambient-mixer';
import { RadioPlayer } from '@/components/radio-player';
import { initialTimer, labels, timerReducer, type Mode } from '@/lib/timer';

export default function App() {
  const [timer, dispatch] = useReducer(timerReducer, undefined, initialTimer);
  const chime = useTimerChime(timer.completion);
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
    // Restore optional browser preferences after mounting.
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
        <a href={import.meta.env.BASE_URL} className="brand">
          <CassetteTape size={27} />
          <span>
            lofi <i>&</i> chill
          </span>
        </a>
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
        <h1 className="sr-only">Your lofi study desk</h1>
        <section className="timer-section" aria-label="Pomodoro timer">
          <div className="timer-screen">
            <div className="screen-header">
              <span className="screen-state">
                <span className="status-dot" />
                {timer.deadline ? 'PLAY' : 'STANDBY'}
              </span>
              <span>STUDY TAPE — VOL. 01</span>
              <span className="screen-speed">SP</span>
            </div>
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
                onClick={() => {
                  if (chime.enabled) chime.arm();
                  dispatch({ type: 'toggle', now: Date.now() });
                }}
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
              <Popover open={settings} onOpenChange={setSettings}>
                <PopoverTrigger
                  className="icon-button"
                  aria-label="Timer settings"
                >
                  <SlidersHorizontal size={20} />
                </PopoverTrigger>
                <PopoverContent
                  className="timer-settings-popover"
                  side="bottom"
                  align="end"
                  sideOffset={12}
                >
                  <PopoverTitle>Timer settings</PopoverTitle>
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
                    <button
                      className="text-button"
                      onClick={() => {
                        void chime.play();
                      }}
                    >
                      Test sound
                    </button>
                    <p>
                      Changes apply to your next session while a timer is
                      running.
                    </p>
                  </fieldset>
                </PopoverContent>
              </Popover>
            </div>
            <div className="chime-controls">
              <button
                className="text-button"
                aria-pressed={chime.enabled}
                onClick={() => {
                  if (!chime.enabled) chime.arm();
                  chime.setEnabled(!chime.enabled);
                }}
              >
                {chime.enabled ? <Bell size={15} /> : <BellOff size={15} />}End
                sound {chime.enabled ? 'on' : 'off'}
              </button>
            </div>
            {chime.error && (
              <output className="audio-warning" aria-live="polite">
                {chime.error}
              </output>
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
            <div className="tape-edge" aria-hidden="true">
              <span>LOFI & CHILL</span>
              <span>HIGH FIDELITY / LOW PRESSURE</span>
            </div>
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
