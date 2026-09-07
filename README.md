# lofi & chill

A quiet study desk with a Pomodoro timer, inline YouTube lofi radio, and locally generated ambient sounds.

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
- Focus mode hides ambient controls and keeps the radio player visible. Exit focus mode to adjust ambient sounds.
- Ambient volumes are remembered, but playback always requires a click. Browser storage is optional; the app still works if it is unavailable.

## Radio integration

Radio playback uses the official YouTube privacy-enhanced iframe. Pressing Play radio mounts the player on this page with `autoplay=1`, `playsinline=1`, and visible native controls. No popup or navigation is part of the app's play action. If browser autoplay is blocked, the listener can press play inside the embedded video. Stop radio unmounts it and stops playback. Changing stations replaces the old player.

The videos are Lofi Girl's official broadcasts:

- Lofi: https://www.youtube.com/watch?v=jfKfPfyJRdk
- Synthwave: https://www.youtube.com/watch?v=MVPTGNGiI-4

Provider documentation: https://developers.google.com/youtube/player_parameters

The original laut.fm widget deliberately opens a separate window. Its terms (§6.9) prohibit third-party inline audio streams, so it has been replaced rather than bypassed: https://laut.fm/pages/terms_and_conditions

The embed is kept visible (at least 200px high), including in focus mode. YouTube's branding, volume controls, and advertising remain intact. Only explicit source/provider links can navigate away. Playback requests are made after a listener clicks; preferences do not auto-start music. Referrer policy permits the origin information required by YouTube embeds. An iframe load event confirms document loading, not successful audio playback; station outages, region restrictions, and browser blocking remain provider-dependent. The app does not download, extract, proxy, or redistribute music.

Connecting shares connection information with YouTube. Google privacy policy: https://policies.google.com/privacy

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
