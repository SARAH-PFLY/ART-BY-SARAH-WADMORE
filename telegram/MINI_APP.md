# Sarah’s Art — Telegram Mini App

The same public website opens inside Telegram. No new bot, login or extra user-data storage is needed. Gallery, videos, About and journal remain ordinary web pages too.

## Rollout
1. Merge this PR and wait for GitHub Pages to publish /assets/telegram-mini-app.js and .css.
2. Deploy BOTH telegram/worker.mjs and telegram/blog.mjs to the existing Cloudflare Worker, preserving encrypted secrets and disabled automatic traces.
3. From the authorized private account, send /miniapp to @sarahs_artbot once. This sets the default bot menu to Open Gallery and returns a web_app launch button. Everyone can also send /app or /start to get the launch button. Upload/delete/blog remain private and restricted to Sarah.
4. Test from Telegram mobile and desktop: launch, scroll, artwork viewer, back to wall, About/journal navigation, external collection links and silent video previews.

Optional: in @BotFather → /mybots → @sarahs_artbot → Bot Settings → Configure Mini App, enable the Main Mini App with URL https://sarahwadmore.com/ for a profile launch button. This separate BotFather setting is not configured by the standard menu API. Do not advertise startapp deep links until it is configured.

## Behaviour
Official Telegram SDK; ready/expand; black native header/background; viewport and safe-area adjustments; native BackButton closes the artwork viewer first and returns subpages to the gallery. External links open through Telegram’s supported methods. The site falls back normally outside Telegram or if the SDK is unavailable.

Telegram-provided identity is not used to authorize publishing. Backend commands still check the webhook secret, private chat and configured numeric admin ID. Do not treat initDataUnsafe as verified identity if authenticated features are added later.

Validation: node telegram/miniapp.test.mjs checks browser fallback, safe areas, viewport and back navigation. Public launch/admin boundaries and existing upload, delete and blog suites passed. Real Telegram-client acceptance checks remain after deployment.
