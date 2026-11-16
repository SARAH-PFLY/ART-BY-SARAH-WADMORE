# Native Telegram fullscreen

The artwork viewer's existing ⛶ button requests native Telegram Mini App fullscreen when opened inside Telegram. Press it again to exit. Closing the artwork viewer also requests exit from native fullscreen. Button positions, viewer padding and artwork dimensions are unchanged.

The integration uses `Telegram.WebApp.requestFullscreen()`, `exitFullscreen()`, `isFullscreen`, `fullscreenChanged` and `fullscreenFailed`. The methods require Bot API 8.0 support. SDK availability does not guarantee that a particular Telegram client/platform supports fullscreen: `UNSUPPORTED` produces an in-viewer message and calls Telegram's ordinary expand method. The site never opens an external browser to obtain fullscreen.

The top-level Mini App document owns the Telegram bridge. Same-origin radio content frames reuse that bridge, so fullscreen requests reach Telegram rather than stopping at the content iframe. Fullscreen state updates the displayed page's button label and refreshes viewport/safe-area values. Ordinary website visits continue using the browser Fullscreen API.

Official documentation: https://core.telegram.org/bots/webapps#initializing-mini-apps and https://core.telegram.org/bots/webapps#events-available-for-mini-apps.

Validation:

```sh
node --check assets/telegram-mini-app.js
node telegram/miniapp.test.mjs
node telegram/fullscreen.test.mjs
node telegram/radio.test.mjs
node telegram/gallery.test.mjs
node telegram/site.test.mjs
node telegram/blog.test.mjs
```

These tests use mocked Telegram/DOM APIs. They verify native enter/exit, state and failure events, older clients, frame bridge reuse, the actual viewer button and close handlers, and normal browser fallback. Real Telegram Desktop/Android/iOS fullscreen acceptance remains pending. No bot settings or Cloudflare Worker deployment are required for this frontend change; GitHub Pages publishes it after merge.
