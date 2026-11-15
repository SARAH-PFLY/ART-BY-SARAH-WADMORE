# Telegram artwork uploads

## Sarah's flow
Send a single photo in the bot's private chat with this caption:

`/upload Blue Horizon | Acrylic on canvas | 100 × 80 cm`

Or reply to a photo with the command. JPEG, PNG and WebP documents up to 8 MB are accepted. Use one artwork per message, not albums. Only the configured numeric Telegram user ID can upload. `/start` shows help to that user.

The bot commits image and updated artworks.json atomically to main, newest entry first. Telegram retries are deduplicated by update ID. Concurrent uploads retry against the latest branch head. No bot token or Telegram file URL appears on the public website. Uploaded artwork files and details are public in this repository. Pages deployment must succeed before the new artwork becomes visible; this is not instantaneous.

## Activation
1. Create a new dedicated bot in Telegram through @BotFather using /newbot. Do not reuse a bot serving another application.
2. Obtain Sarah's numeric Telegram user ID (not her @username).
3. Create a fine-grained GitHub access token scoped ONLY to this repository, with Contents read/write. It must be permitted to update main, and the organization must approve it if required. A user token write triggers branch-based Pages publishing; do not substitute an Actions GITHUB_TOKEN.
4. In Cloudflare Workers create/deploy this module with wrangler.jsonc. Add encrypted secrets BOT_TOKEN, GITHUB_TOKEN, SARAH_USER_ID and WEBHOOK_SECRET. Generate WEBHOOK_SECRET as a long random string of letters, digits, underscores or hyphens. Never commit these values or paste them into issues.
5. From this directory run `npx wrangler deploy` after configuring the secrets (or deploy through the Cloudflare dashboard). Required secrets must be present before enabling Telegram.
6. Register the bot's setWebhook through Telegram's API with url `https://YOUR-WORKER.workers.dev/telegram`, secret_token equal to WEBHOOK_SECRET, allowed_updates `["message"]`, and max_connections `1`. Use a private local script or secure API client; avoid tokens in shell history, browser address bars or screenshots. Check getWebhookInfo for delivery errors.
7. Test one upload from Sarah, confirm its GitHub commit and successful Pages deployment, and check https://sarahwadmore.com/. Test an unauthorized user: no commit should be created.

This PR does not activate a bot, deploy a Worker, register a webhook or create credentials. No live end-to-end test has run. Code syntax and command/authentication smoke checks were run during implementation. GitHub API and Telegram integration still require a live acceptance test.
