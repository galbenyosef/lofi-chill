# lofi & chill

A quiet study desk with a Pomodoro timer, inline YouTube lofi radio, and a real rain recording and locally generated ambient sounds.

## Run locally

Use Node.js 24 or later (the test runner uses native TypeScript support).

```sh
npm ci
npm run dev
```

Open the local URL printed by the server, usually http://localhost:3000.

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The app uses React, TypeScript, Vinext/Vite, and the bundled Shadcn/Base UI controls. No application database, account, API key, or music server is required. The generated Sites/Cloudflare adapter supports the local development and production build; this repository has not been registered, pushed, or deployed to Sites.

## Study behavior

- Focus / short break / long break default to 25 / 5 / 15 minutes.
- Every fourth completed focus session offers a long break. Breaks start manually.
- Countdown uses an absolute deadline and refreshes when the tab becomes visible. A sleeping device may delay the visual completion message until it wakes.
- A gentle two-note chime plays once when a focus or break timer finishes. End sound toggles it; Test sound in timer settings previews it. Starting a timer unlocks browser audio. Sleeping devices may delay alerts until the page wakes; this is not an operating-system alarm.
- Pausing and resetting do not count as completed sessions. Session counts reset at local midnight.
- Durations and today's completed sessions are saved on this browser. Reloading starts a fresh, paused timer.
- Focus mode hides ambient controls and keeps the radio player visible. Exit focus mode to adjust ambient sounds.
- Ambient volumes are remembered, but playback always requires a click. Browser storage is optional; the app still works if it is unavailable.

## Radio integration
The station list uses these user-selected broadcasts:

- Lofi Girl — study: https://www.youtube.com/watch?v=rFZHOHl-L8A
- steezyasfuck — hip hop: https://www.youtube.com/watch?v=rPjez8z61rI
- Lofi Girl — synthwave: https://www.youtube.com/watch?v=4xDzrJKXOOY
- Lofi Girl — sleep/chill: https://www.youtube.com/watch?v=JD-kMIpDfnY

Provider documentation: https://developers.google.com/youtube/player_parameters