# Telegram artwork uploads

Bot: @sarahs_artbot. Authorized Telegram user ID: 1019741898 (configured in wrangler.jsonc).

Automatic traces are disabled because Telegram API paths contain the bot token. Keep traces disabled in the Cloudflare dashboard too. Logs must never include request URLs, raw errors or secret values.

## Sarah's flow
Send a single photo, GIF or MP4 video in the bot's private chat with this caption:

`/upload Blue Horizon | Acrylic on canvas | 100 × 80 cm`

Or reply to the media with the command. JPEG, PNG, WebP, GIF and MP4 documents up to 8 MB are accepted. Telegram animations converted to MP4 remain looping animations on the website. Use H.264 MP4 (AAC audio if needed) for browser compatibility; MOV/HEVC is not supported and no transcoding is performed. Videos have a play indicator on the wall and playback controls in the fullscreen viewer. Changing artworks or closing the viewer stops playback. Use one artwork per message, not albums. Only the configured numeric Telegram user ID can upload. `/start` shows help to that user.

The bot commits image and updated artworks.json atomically to main, newest entry first. Telegram retries are deduplicated by update ID. Concurrent uploads retry against the latest branch head. No bot token or Telegram file URL appears on the public website. Uploaded artwork files and details are public in this repository. Pages deployment must succeed before the new artwork becomes visible; this is not instantaneous.

## Delete from the gallery

Send `/delete Artwork title` in the bot's private chat. Supply only the artwork title, without medium or dimensions. Matching uses the full title, ignoring letter case and repeated whitespace. Only Sarah's configured account can delete. Missing or duplicate titles cause no change.

Deletion removes the manifest entry from the homepage after Pages publishes. Original media files stay in the repository for recovery; this is not permanent erasure. A successful deletion also records its Telegram update ID in telegram/deletions.json, committed atomically with the manifest, so delivery retries cannot delete a later artwork that reuses a title. Concurrent repository changes are retried without discarding other uploads. Deleting the final artwork shows an empty gallery instead of demonstration images.

Run `node telegram/delete.test.mjs` to check success, no match, duplicate titles, command syntax, authorization, repeated delivery, concurrent uploads and deletion of the last artwork.

## Activation
1. Create a new dedicated bot in Telegram through @BotFather using /newbot. Do not reuse a bot serving another application.
2. Sarah's numeric Telegram user ID is configured as 1019741898.
3. Create a fine-grained GitHub access token scoped ONLY to this repository, with Contents read/write. It must be permitted to update main, and the organization must approve it if required. A user token write triggers branch-based Pages publishing; do not substitute an Actions GITHUB_TOKEN.
4. In Cloudflare Workers create/deploy this module with wrangler.jsonc. Add encrypted secrets BotFathertoken, GitHubtoken and WEBHOOK_SECRET (legacy BOT_TOKEN and GITHUB_TOKEN names also work). Generate WEBHOOK_SECRET as a long random string of letters, digits, underscores or hyphens. Never commit these values or paste them into issues.
5. From this directory run `npx wrangler deploy` after configuring the secrets (or deploy through the Cloudflare dashboard). Required secrets must be present before enabling Telegram.
6. Register the bot's setWebhook through Telegram's API with url `https://YOUR-WORKER.workers.dev/telegram`, secret_token equal to WEBHOOK_SECRET, allowed_updates `["message"]`, and max_connections `1`. Use a private local script or secure API client; avoid tokens in shell history, browser address bars or screenshots. Check getWebhookInfo for delivery errors.
7. Test one upload from Sarah, confirm its GitHub commit and successful Pages deployment, and check https://sarahwadmore.com/. Test an unauthorized user: no commit should be created.

The photo uploader is active on Cloudflare and has completed a real upload. GIF/video changes require merging the gallery PR and deploying its Worker module before testing. Run `node telegram/worker.test.mjs` from the repository root for media detection and mocked webhook tests. Browser playback and real GIF/video uploads remain acceptance checks.
