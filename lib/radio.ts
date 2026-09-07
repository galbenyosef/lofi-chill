export const stations = {
  lofi: {
    name: 'Lofi Girl',
    creator: 'Lofi Girl',
    description: 'Beats to study to',
    videoId: 'rFZHOHl-L8A',
  },
  hiphop: {
    name: 'steezyasfuck',
    creator: 'steezyasfuck',
    description: 'Hip hop beats',
    videoId: 'rPjez8z61rI',
  },
  synthwave: {
    name: 'Synthwave',
    creator: 'Lofi Girl',
    description: 'Beats to chill / game to',
    videoId: '4xDzrJKXOOY',
  },
  sleep: {
    name: 'Lofi Girl',
    creator: 'Lofi Girl',
    description: 'Beats to sleep / chill to',
    videoId: 'JD-kMIpDfnY',
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
