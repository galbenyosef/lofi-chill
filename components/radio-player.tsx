'use client';
import { useEffect, useState } from 'react';
import { ExternalLink, Radio, Play, Square } from 'lucide-react';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { stations, isStation, radioEmbedUrl, type Station } from '@/lib/radio';

export function RadioPlayer() {
  const [station, setStation] = useState<Station>('lofi');
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    try {
      const value = localStorage.getItem('lofi-chill.station');
      // Browser-only preference hydration intentionally updates after the server render.
      // oxlint-disable-next-line react/react-compiler
      if (isStation(value)) setStation(value);
    } catch {
      /* Optional preferences. */
    }
  }, []);
  useEffect(() => {
    if (!enabled || loaded) return;
    const timeout = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timeout);
  }, [enabled, station, loaded]);
  function chooseStation(value: string) {
    if (!isStation(value)) return;
    setStation(value);
    setLoaded(false);
    setSlow(false);
    try {
      localStorage.setItem('lofi-chill.station', value);
    } catch {
      /* Optional preferences. */
    }
  }
  return (
    <section
      className="sound-panel radio-panel"
      aria-labelledby="radio-heading"
    >
      <div className="panel-heading">
        <p className="eyebrow">SIDE A / THE SOUNDTRACK</p>
        <Radio size={18} />
      </div>
      <h2 id="radio-heading">Find your frequency.</h2>
      <label className="sr-only" htmlFor="station">
        Radio station
      </label>
      <NativeSelect
        id="station"
        value={station}
        className="station-select"
        onChange={(e) => chooseStation(e.target.value)}
      >
        {Object.entries(stations).map(([id, data]) => (
          <NativeSelectOption key={id} value={id}>
            {data.name} · {data.description}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {enabled ? (
        <div className="radio-embed">
          <iframe
            key={station}
            src={radioEmbedUrl(station)}
            title={`${stations[station].name} — live radio`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setLoaded(true)}
          />
          <div className="radio-transport">
            <button className="text-button" onClick={() => setEnabled(false)}>
              <Square size={13} fill="currentColor" />
              Stop radio
            </button>
            <span className="radio-provider">YOUTUBE / INLINE PLAYER</span>
          </div>
          <output className="radio-help" aria-live="polite">
            {!loaded
              ? slow
                ? 'Still connecting. Check your connection or try another station.'
                : 'Tuning in…'
              : 'Play, pause, and adjust volume in the player above.'}
          </output>
        </div>
      ) : (
        <button
          className="radio-start"
          onClick={() => {
            setLoaded(false);
            setSlow(false);
            setEnabled(true);
          }}
        >
          <span className="radio-play">
            <Play size={23} fill="currentColor" />
          </span>
          <span>
            <strong>Play radio</strong>
            <span>{stations[station].description}</span>
          </span>
          <span className="radio-badge">LIVE</span>
        </button>
      )}
      <div className="radio-footnote">
        <span>Radio by {stations[station].creator} · YouTube may show ads</span>
        <a
          href={`https://www.youtube.com/watch?v=${stations[station].videoId}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Visit the original broadcast on YouTube"
        >
          Source <ExternalLink size={12} />
        </a>
      </div>
      <details className="privacy-note">
        <summary>About this player</summary>
        <p>
          Play radio loads YouTube’s official player here. Nothing opens in
          another tab unless you choose the source link or a link inside
          YouTube. If your browser blocks autoplay, press play inside the video.
          Connecting shares your connection information with YouTube. Broadcasts
          may occasionally be unavailable; try another station.
        </p>
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noreferrer"
        >
          Google privacy information
        </a>
      </details>
    </section>
  );
}
