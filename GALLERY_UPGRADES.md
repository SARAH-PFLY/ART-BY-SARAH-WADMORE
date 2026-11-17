# Gallery experience and performance

This change adds desktop/mobile image zoom and pan, touch swiping and a one-time swipe hint, tab-local gallery position recovery, a single next-image preload, an editable enquiry draft, featured artwork control, responsive previews and image fades.

## Browsing and data

The DATA button cycles Auto → Saver → Full. Auto respects the browser's Save-Data flag and slow-2g/2g connections when available. Saver pauses/unloads gallery video previews, prevents next-original preloading and requests the smallest listed image preview. It does not block an original explicitly opened by the visitor. Reduced-motion preferences disable fades and video autoplay.

Normal browsing uses responsive image srcset/sizes candidates and lazily loads tiles after the first three. The existing still-image collection has new 360/800-pixel JPEG previews; original files and existing metadata are unchanged. Future Telegram image uploads save distinct smaller/larger Telegram variants when available. Original-only uploads remain supported when Telegram supplies no usable preview.

Fullscreen always opens the original. After it loads, normal mode may fetch just the next non-animated still image at low priority. Closing the viewer, changing artworks, hiding the tab or enabling Saver cancels pending preloading. This is a bandwidth tradeoff; it is disabled in Saver.

Zoom controls, wheel, double-click/double-tap and pinch support 1×–4× viewing. Drag/pan is clamped to the image; a zoomed drag cannot trigger next/previous navigation. Escape resets zoom first, then closes the viewer. Video controls and native Telegram fullscreen keep their existing behavior.

Gallery position uses sessionStorage, keyed to the visible artwork, not an account. Feature order is applied to a copy of the manifest, leaving newest-first storage order intact. Explicit ?art= links open their requested artwork.

## Featured artwork

Sarah can send:

    /feature Exact artwork title
    /feature id:UPLOAD_ID
    /feature off

Only her configured private Telegram account can set/clear the featured artwork. The manifest stores at most one featured flag. Uploads and edits preserve it; deleting that artwork naturally returns the gallery to newest-first. Retry IDs are recorded in telegram/features.json so an old command cannot undo a later choice.

## Enquiries

The viewer's Enquire button opens an editable message containing the title and direct artwork link. Visitors can copy it, then open the existing @sarahs_artbot through a short artwork-specific start link.

The bot shows the artwork, asks for a question and explains that the visitor's Telegram name/username and message go to Sarah's configured account. A visitor must reply to that prompt before anything is forwarded. Only enquiry replies can use this public flow; upload/edit/delete/feature permissions stay private. Questions are limited to 10–1,500 characters, prompts expire in one hour and a KV-backed best-effort limit allows three starts per visitor per UTC day. The limit is not a strict distributed abuse-control service. A missing/unlisted artwork cannot start an enquiry. Enquiries are not saved in the public Git repository.

Editing the website's draft does not automatically insert it into Telegram. The visitor can copy/paste the draft or simply reply with a question; the bot adds the artwork title/link itself. Neither the website nor the bot automatically publishes a social post.

## Validation

    node --loader ./telegram/test-cloudflare-loader.mjs --test telegram/*.test.mjs tests/native-share.test.cjs

The Node Cloudflare loader is the existing minimal test stub; these tests exercise bot logic with mocked external services, not a live Durable Object or a message to Sarah.

For the browser checks, install Playwright outside the repository or as a local development dependency, set PLAYWRIGHT_MODULE if needed and optionally CHROME_EXECUTABLE to an installed Chrome. Then:

    node tests/gallery-experience.browser.cjs

This starts its own localhost server and uses intercepted artwork metadata. Desktop/mobile checks cover featured order, full originals, preload requests, zoom/pan/pinch/swipe, enquiry links, saved position, responsive preview choice, Saver behavior, reduced motion and horizontal overflow. External services are blocked; real Telegram enquiries and physical-device gestures remain acceptance checks.

## Release

Merge the website and preview assets first. Then deploy the Worker with these modules together:

* worker.mjs
* blog.mjs
* upgrades.mjs
* thumbnails.mjs
* editing.mjs
* featuring.mjs
* enquiries.mjs
* bulk.mjs
* bulk-object.mjs

Use the existing Wrangler config and preserve encrypted secrets, ART_DRAFTS and BULK_SESSIONS. There is no new Durable Object migration or binding. The PR does not deploy or merge production changes. Until the Worker is deployed, new /feature and enquiry commands are not active.
