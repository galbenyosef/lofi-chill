# lofi & chill

A quiet study desk with a Pomodoro timer, official laut.fm radio, and locally generated ambient sounds.

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
- Pausing and resetting do not count as completed sessions. Session counts reset at local midnight.
- Durations and today's completed sessions are saved on this browser. Reloading starts a fresh, paused timer.
- Focus mode hides the mixer while audio continues. Exit focus mode to adjust or stop it.
- Ambient volumes are remembered, but playback always requires a click. Browser storage is optional; the app still works if it is unavailable.

## Radio integration

The app loads the **official laut.fm iframe**, only after the listener clicks Connect radio. The player keeps its own play, volume, branding, and advertising controls. No direct stream scraping, audio proxy, downloading, redistribution, or ad removal is implemented.

Station choices:

- https://laut.fm/lofi
- https://laut.fm/loungetunes

Integration source: https://laut.fm/widgets/configurator/player_for/lofi

laut.fm explicitly provides this widget for embedding. Free listening is ad-supported; it is not a claim that the music is public domain or licensed for reuse. Provider availability and future terms may change. A persistent station link provides a fallback if an embed or stream is blocked. An iframe load event only indicates that its document loaded; it cannot confirm that audio is playing.

Connecting shares connection information with laut.fm. The interface explains this before connection. Provider privacy information: https://laut.fm/datenschutz

## Ambient audio

`lib/ambient.ts` synthesizes stereo noise using the Web Audio API. Low-pass filtering gives the rain and brown-noise textures; a slow filter modulation gives ocean hush. These are synthetic soundscapes, not field recordings. No external sound files or music samples are used. Volume changes fade smoothly.

## Git workflow

Use focused Conventional Commits, for example:

- `feat: add a study feature`
- `fix: correct timer behavior`
- `test: cover session transitions`
- `docs: explain local setup`
- `chore: update tooling`

Keep changes reviewable, run the relevant checks, and commit each important change separately. Push only when the repository owner chooses to.

## Validation notes

Timer regression tests cover background elapsed time, pause/resume, completion deduplication, long-break cadence, reset, mode changes, and stored-value validation. Lint checks application code; generated `components/ui` and `hooks/use-mobile.ts` are excluded from lint and remain covered by TypeScript.

Supporting browsers can expose `get_focus_session` and `control_focus_session` through the optional document WebMCP API. No compatible validation context was available during implementation, so these tools have not been runtime verified. Radio audio and visual browser QA also require a manual check; the build and HTTP response do not verify third-party audio playback.
