export const stations = {
  lofi: {
    name: 'Lofi Girl',
    description: 'Beats to relax / study to',
    videoId: 'jfKfPfyJRdk',
  },
  synthwave: {
    name: 'Synthwave',
    description: 'Beats to chill / game to',
    videoId: 'MVPTGNGiI-4',
  },
} as const;
export type Station = keyof typeof stations;
export function isStation(value: unknown): value is Station {
  return typeof value === 'string' && Object.hasOwn(stations, value);
}
export function radioEmbedUrl(station: Station) {
  const url = new URL(
    `https://www.youtube-nocookie.com/embed/${stations[station].videoId}`,
  );
  url.search = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    controls: '1',
    rel: '0',
  }).toString();
  return url.href;
}
