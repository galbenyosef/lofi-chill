'use client';
import { useEffect, useRef, useState } from 'react';
import { CloudRain, Waves, Wind, Volume2, Pause, Play } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { AmbientMixer as Engine, soundNames, type Sound } from '@/lib/ambient';
const icons = { rain: CloudRain, brown: Wind, waves: Waves };
export function AmbientMixer() {
  const engine = useRef<Engine | null>(null);
  const operation = useRef(0);
  const [volumes, setVolumes] = useState<Record<Sound, number>>({ rain:35, brown:0, waves:0 });
  const [playing, setPlaying] = useState(false);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    // Browser-only preference hydration intentionally updates after the server render.
    // oxlint-disable-next-line react/react-compiler
    try { const stored = JSON.parse(localStorage.getItem('lofi-chill.ambience') || 'null'); if (stored && ['rain','brown','waves'].every(key => typeof stored[key] === 'number' && stored[key] >= 0 && stored[key] <= 100)) setVolumes(stored); } catch { /* Optional preferences. */ }
    // oxlint-disable-next-line react/react-compiler
    setReady(true);
    // These refs own the current audio engine and async generation, not DOM nodes.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    return () => { operation.current++; void engine.current?.dispose().catch(() => {}); engine.current = null; };
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem('lofi-chill.ambience', JSON.stringify(volumes)); } catch { /* Optional preferences. */ } } }, [volumes, ready]);
  useEffect(() => { if (engine.current) for (const sound of Object.keys(soundNames) as Sound[]) engine.current.setVolume(sound, playing ? volumes[sound] : 0); }, [volumes, playing]);
  async function toggle() {
    if (playing) { setPlaying(false); return; }
    const id = ++operation.current;
    setPending(true); setError('');
    try { engine.current ??= new Engine(); await engine.current.resume(); if (id === operation.current) setPlaying(true); }
    catch { if (id === operation.current) setError('Couldn’t start audio. Check your browser’s sound settings and try again.'); }
    finally { if (id === operation.current) setPending(false); }
  }
  return <section className="sound-panel" aria-labelledby="ambience-heading">
    <div className="panel-heading"><p className="eyebrow">02 / A LITTLE ATMOSPHERE</p><Volume2 size={18} /></div>
    <div className="ambience-heading"><h2 id="ambience-heading">Make yourself comfortable.</h2><button className="icon-button" disabled={pending} onClick={toggle} aria-label={playing ? 'Pause ambient sounds' : 'Play ambient sounds'} aria-pressed={playing}>{playing ? <Pause size={16} /> : <Play size={16} />}</button></div>
    <div className="ambient-channels">{(Object.keys(soundNames) as Sound[]).map(sound => { const Icon = icons[sound]; return <div className="ambient-channel" key={sound}><Icon size={19} /><span id={`${sound}-label`}>{soundNames[sound]}</span><Slider aria-labelledby={`${sound}-label`} value={[volumes[sound]]} min={0} max={100} step={1} onValueChange={value => setVolumes(v => ({ ...v, [sound]: Array.isArray(value) ? value[0] : value }))} /><output>{volumes[sound]}%</output></div>; })}</div>
    <output className="ambient-status" aria-live="polite">{error || (pending ? 'Starting ambience…' : playing ? (Object.values(volumes).some(v => v > 0) ? 'Your atmosphere is playing.' : 'Turn up a sound to hear your mix.') : 'Press play, then blend your own atmosphere.')}</output>
  </section>;
}
