import { useCallback, useEffect, useRef, useState } from 'react';

/** A short, low-volume two-note chime, separate from the ambient mixer. */
export function useTimerChime(completion: number) {
  const context = useRef<AudioContext | null>(null);
  const lastCompletion = useRef(completion);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState('');
  const prepare = useCallback(async () => {
    context.current ??= new AudioContext();
    if (context.current.state !== 'running') await context.current.resume();
    return context.current;
  }, []);
  const play = useCallback(async () => {
    try {
      const audio = await prepare();
      if (audio.state !== 'running') throw new Error('Audio unavailable');
      [523.25, 659.25].forEach((frequency, index) => {
        const start = audio.currentTime + index * 0.24;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.07, start + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.25);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(start + 1.3);
      });
      setError('');
    } catch {
      setError(
        'Sound is blocked. Click Test sound to enable the completion chime.',
      );
    }
  }, [prepare]);
  const arm = useCallback(() => {
    void prepare()
      .then(() => setError(''))
      .catch(() =>
        setError(
          'Sound is blocked. Click Test sound to enable the completion chime.',
        ),
      );
  }, [prepare]);
  useEffect(() => {
    if (completion === lastCompletion.current) return;
    lastCompletion.current = completion;
    // Synchronize the completion event with browser audio; errors are asynchronous.
    // oxlint-disable-next-line react/react-compiler
    if (enabled) void play();
  }, [completion, enabled, play]);
  useEffect(
    () => () => {
      // The ref owns the latest audio resource, not a rendered DOM node.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      const audio = context.current;
      context.current = null;
      if (audio) void audio.close().catch(() => {});
    },
    [],
  );
  return { enabled, setEnabled, arm, play, error };
}
