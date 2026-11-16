# Telegram artwork uploads

Bot: @sarahs_artbot. Authorized Telegram user ID: 1019741898 (configured in wrangler.jsonc).

Automatic traces are disabled because Telegram API paths contain the bot token. Keep traces disabled in the Cloudflare dashboard too. Logs must never include request URLs, raw errors or secret values.

## Sarah's flow
Send a single photo, GIF or MP4 video in the bot's private chat with this caption:

`/upload Blue Horizon | Acrylic on canvas | 100 × 80 cm`

Or reply to the media with the command. JPEG, PNG, WebP, GIF and MP4 documents up to 8 MB are accepted. Telegram animations converted to MP4 remain looping animations on the website. Use H.264 MP4 (AAC audio if needed) for browser compatibility; MOV/HEVC is not supported and no transcoding is performed. Videos have a play indicator on the wall and playback controls in the fullscreen viewer. Changing artworks or closing the viewer stops playback. Use one artwork per message, not albums. Only the configured numeric Telegram user ID can upload. `/start` shows help to that user.

The bot commits image and updated artworks.json atomically to main, newest entry first. Telegram retries are deduplicated by update ID. Concurrent uploads retry against the latest branch head. No bot token or Telegram file URL appears on the public website. Uploaded artwork files and details are public in this repository. Pages deployment must succeed before the new artwork becomes visible; this is not instantaneous.

Titles must be at most **36 visible characters**, including spaces and emoji. The bot rejects longer titles before downloading or saving the media. Medium and dimensions after the first `|` do not count toward this limit. Existing artworks are unchanged.

## Unique artwork titles

Every /upload checks the currently published artwork manifest against the latest main-branch snapshot before downloading media. It repeats the check immediately before saving, and after every concurrent Git conflict. The title is the part before the first | in /upload; the physical filename and medium do not define a separate artwork name.

Titles match without regard to case, repeated whitespace or Unicode compatibility forms. If a normalized title is still in the gallery, the reply starts with **Upload rejected**, includes the existing upload timestamp when available, and explains that the artwork must be deleted or renamed first. It does not download or save the rejected media.

After /delete commits removal, a new Telegram message can upload that title again. Old upload deliveries remain blocked by the deletion ledger, so retries cannot restore deleted artwork. New saved entries include titleCheckedAt (UTC) and titleCheckedHead (the exact repository snapshot checked), alongside uploadedAt. Current manifest presence and atomic branch updates decide whether a title is in or out; historical media files in the repo do not reserve a deleted title.

Run node telegram/delete.test.mjs for duplicate-name checks, deletion/reuse, retries, pre-download rejection and concurrent upload races. Blog post titles are a separate namespace and keep their existing behaviour.

## Delete from the gallery

Send `/delete Artwork title` in the bot's private chat. Supply only the artwork title, without medium or dimensions. Matching uses the full title, ignoring letter case and repeated whitespace. Only Sarah's configured account can delete. Missing or duplicate titles cause no change.

Deletion removes the manifest entry from the homepage after Pages publishes. Original media files stay in the repository for recovery; this is not permanent erasure. A successful deletion also records its Telegram update ID in telegram/deletions.json, committed atomically with the manifest, so delivery retries cannot delete a later artwork that reuses a title. The ledger also retains the original upload ID and media path. Uploads check this ledger on every attempt, preventing a delayed original upload from republishing deleted artwork. Sending the media as a new message gives it a new upload ID and remains allowed. Concurrent repository changes are retried without discarding other uploads. Deleting the final artwork shows an empty gallery instead of demonstration images.

Run `node telegram/delete.test.mjs` to check success, no match, duplicate titles, command syntax, authorization, repeated delivery, concurrent uploads and deletion of the last artwork.

## Publish a blog article

Send a UTF-8 TXT or Markdown document in the bot's private chat with this caption:

/blog Inside my latest painting | Studio notes

Or reply to an existing document with that command. Title is required; category is optional. Only Sarah's configured account can publish. File limit: 256 KB and 60,000 characters. PDF, Word, HTML and binary documents are not supported. The document supplies the finished article: there is no AI rewriting or invented content, and no additional AI credential is required.

Use paragraphs, Markdown headings, bullet lists, blockquotes, bold text, inline code, fenced code and HTTP/HTTPS links. Raw HTML is escaped. Markdown image embedding, tables and arbitrary HTML are intentionally unsupported. A starter file is in examples/blog-template.md; replace its instructions with your own writing before sending it.

The newest gallery image is selected automatically as an optional article cover, using that artwork's title for its alt text. If there is no suitable image, the article uses the text-only layout. Videos are not used as cover images.

Each accepted article atomically creates its own /blog/title-updateid/index.html, updates blog/posts.json and the static blog index, and regenerates sitemap.xml. The homepage BLOG dropdown shows the latest five titles plus View all posts; it works on tap/keyboard and closes on Escape or outside click. The blog index and article bodies remain readable and crawlable without JavaScript.

The article template adds a canonical URL, descriptive title/meta description, Open Graph sharing metadata, published date, author, reading estimate and BlogPosting structured data. Descriptions come from the document's opening text. Search indexing, rankings and the exact Google snippet are not guaranteed. The bot replies with the URL after the Git commit succeeds; wait for GitHub Pages to deploy before opening it.

Repeated Telegram delivery does not duplicate a post. Same-title articles receive distinct URLs; concurrent publishing preserves all articles. Existing /upload and /delete commands still apply to gallery artworks only. Blog editing/deletion is not included.

Run node telegram/blog.test.mjs alongside the other bot tests. Merge the blog pages before deploying the bot. IMPORTANT: the Worker now imports blog.mjs. Upload BOTH worker.mjs and blog.mjs in a multipart Cloudflare deployment, with worker.mjs as main_module; Wrangler bundles the import automatically. Preserve all encrypted secrets and keep traces disabled.


## Activation
1. Create a new dedicated bot in Telegram through @BotFather using /newbot. Do not reuse a bot serving another application.
2. Sarah's numeric Telegram user ID is configured as 1019741898.
3. Create a fine-grained GitHub access token scoped ONLY to this repository, with Contents read/write. It must be permitted to update main, and the organization must approve it if required. A user token write triggers branch-based Pages publishing; do not substitute an Actions GITHUB_TOKEN.
4. In Cloudflare Workers create/deploy this module with wrangler.jsonc. Add encrypted secrets BotFathertoken, GitHubtoken and WEBHOOK_SECRET (legacy BOT_TOKEN and GITHUB_TOKEN names also work). Generate WEBHOOK_SECRET as a long random string of letters, digits, underscores or hyphens. Never commit these values or paste them into issues.
5. From this directory run `npx wrangler deploy` after configuring the secrets (or deploy through the Cloudflare dashboard). Required secrets must be present before enabling Telegram.
6. Register the bot's setWebhook through Telegram's API with url `https://YOUR-WORKER.workers.dev/telegram`, secret_token equal to WEBHOOK_SECRET, allowed_updates `["message"]`, and max_connections `1`. Use a private local script or secure API client; avoid tokens in shell history, browser address bars or screenshots. Check getWebhookInfo for delivery errors.
7. Test one upload from Sarah, confirm its GitHub commit and successful Pages deployment, and check https://sarahwadmore.com/. Test an unauthorized user: no commit should be created.

The photo uploader is active on Cloudflare and has completed a real upload. GIF/video changes require merging the gallery PR and deploying its Worker module before testing. Run `node telegram/worker.test.mjs` from the repository root for media detection and mocked webhook tests. Browser playback and real GIF/video uploads remain acceptance checks.
