# Live radio and artwork controls

The header on the gallery, About page and journal has a GraffPUNKS radio on/off button. It uses the same HTTPS relay as the Crypto Moonboys pet game: `https://api.cryptomoonboys.com/radio/stream`. Playback starts only after a visitor presses the button. A failed stream offers RADIO RETRY.

One audio element stays in the top document. While radio is enabled, internal gallery/About/journal navigation uses a single same-origin content frame so audio is not recreated between pages. Further navigation reuses that frame even after radio is stopped. Opening, browsing and closing artworks keeps the audio alive. Original page content is hidden and its videos paused once the frame takes over. The top document owns history; the frame uses replacement navigation so Back/Forward do not encounter duplicate child entries. External HTTP(S) links from framed pages open in a separate tab with opener access disabled; Telegram can still handle them through its native link handler. Downloads and modified clicks keep their usual handling. Browser history, artwork share URLs and Telegram's Back button target the displayed page.

A refresh, closing the Mini App, leaving the site or operating-system media restrictions can interrupt playback. The site does not force autoplay after a reload. Native video sound may also interrupt radio on platforms with exclusive audio focus.

The artwork arrows retain their existing positions and the viewer retains its existing padding. The caption no longer intercepts pointer events; the controls are explicitly above the viewer. Telegram uses the current visible viewport height, including resize updates, instead of its potentially larger stable height. Video seeking remains native; use the existing arrows to move to the next or previous artwork.

## Checks

Run from the repository root:

```sh
node --check assets/radio.js
node --check assets/telegram-mini-app.js
node telegram/radio.test.mjs
node telegram/miniapp.test.mjs
node telegram/gallery.test.mjs
node telegram/site.test.mjs
node telegram/blog.test.mjs
```

The radio regression test mocks media playback and DOM objects. It checks one shared audio element, navigation/frame reuse, one top-level history entry per navigation, replacement child navigation during Back/Forward, outgoing link targeting/opener isolation, native link-handler compatibility, error/retry, stop, artwork URL synchronization, actual previous/next handlers through image/video entries and future journal radio assets. Mini App tests cover visible viewport changes, safe areas and native Back in the active frame.

Real Telegram desktop/Android/iOS acceptance is still required: tap each arrow under a long caption, navigate past a video, resize the Mini App, and keep radio playing through gallery → About → journal → gallery and artwork open/close. The local headless browser could not start in the managed environment, so these checks are not claimed as completed. A direct stream probe was also blocked with HTTP 403 in this environment; it did not establish live playback availability.

## Publishing

GitHub Pages publishes the static assets after merge. Deploy both `telegram/worker.mjs` and the updated `telegram/blog.mjs` to the existing artwork-upload Worker after merge, preserving its encrypted bindings. The shared journal template then includes radio assets in future Telegram-created posts and regenerated journal pages. No bot secrets or upload authorization changes are needed.
