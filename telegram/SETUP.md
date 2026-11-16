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

## Guided emoji uploads and publishing status

Sarah can send one photo, GIF or H.264 MP4 without a caption. The bot replies with a force-reply prompt; reply to that prompt with one to three title emojis. The artwork publishes using the title prefix "#streetartist #SarahPFLY Wadmore " and notes "👁 · 🌼🌸🌺". Different artworks need different title emojis because duplicate title protection still applies. /xxx and manual /upload remain available for custom titles and notes.

Guided prompts expire after one hour. Reply /cancel to a prompt to cancel it. Each prompt is linked to its own original media message, so replying to one prompt cannot publish a different pending photo. Only Sarah's authorized account can use this flow. ART_DRAFTS is a dedicated Workers KV binding; drafts retain Telegram media references for at most one hour, not downloaded media.

Send /status to compare saved artwork/blog lists with the live website. The reply distinguishes LIVE, SAVED/pending, PUBLISHING when Pages confirms a build, and FAILED when the latest repository commit has an errored Pages build. Network or API failures are reported as unverified rather than success. This is an on-demand check, not a background notification.

## Artwork social preview pages

Uploads atomically create /art/UPLOAD_ID/index.html alongside media and artworks.json. Each page contains static Open Graph/Twitter metadata with the artwork title, notes and image URL. Video pages use video metadata rather than inventing a poster image. Browsers open the artwork in the existing gallery; crawlers can read metadata without JavaScript. Share controls use these URLs; the old ?art= links still work. Platform caching controls when previews refresh.

Gallery deletion also removes the associated social preview page. It still retains the original media and Git history. Deploy worker.mjs, blog.mjs AND upgrades.mjs together, preserving ART_DRAFTS and all encrypted secrets. Run node --test telegram/worker.test.mjs telegram/delete.test.mjs telegram/blog.test.mjs telegram/miniapp.test.mjs telegram/upgrades.test.mjs.

## Smaller gallery images

The homepage prefers each entry's thumbnail; fullscreen, downloads and social image metadata retain the original src. Existing still images have JPEG gallery previews bounded to 720 × 1080 pixels, with aspect ratio preserved. Width/height metadata reserves the correct gallery space while loading. A missing thumbnail falls back to the original.

Future Telegram image uploads reuse a smaller Telegram photo variant (prefer the largest available up to 800 px wide), or a document's Telegram thumbnail when supplied. The bot saves that JPEG under artworks/thumbnails/ in the same atomic commit as the original and manifest. If Telegram provides no usable thumbnail or its download fails, the original upload still succeeds and the gallery uses the original. Animated GIF uploads can use a static gallery preview while the original animation opens in fullscreen. Videos retain their existing looping previews.

Deploy worker.mjs, blog.mjs, upgrades.mjs AND thumbnails.mjs together. Keep existing bindings and secrets. Run node --test telegram/worker.test.mjs telegram/delete.test.mjs telegram/blog.test.mjs telegram/thumbnails.test.mjs.

## Bulk images (maximum 20)
Send /bulk to use Sarah's default template, /bulk 🌷🔥🌻 to change title emojis, or /bulk /upload Title | Notes for a custom batch. Send up to 20 images in individual messages or two Telegram albums of up to 10, then /done. Each image uses the common base title with 01–20 appended directly, without an added space. Base titles remain at most 36 visible characters; the internal numbered title may reach 38. Notes after | do not count. Batch captions do not override the base; change it when starting /bulk.
Use /bulkstatus for collection/processing counts. /cancel stops remaining items (an in-flight save can finish). Use full numbered titles with /delete. Duplicate title checks still apply across batches, so change title emojis for a new batch. Each image retains its Telegram update ID for retry deduplication.
BULK_SESSIONS is a per-author SQLite Durable Object. Collection is persisted synchronously, avoiding lost album items. /done schedules one image per durable alarm; transient failures retry automatically up to the platform retry limit, and /done resumes a paused batch. Collection expires after two hours. Completion means all items were processed, not all accepted: inspect each Saved/rejected reply.
Deploy worker.mjs, blog.mjs, upgrades.mjs, thumbnails.mjs, bulk.mjs and bulk-object.mjs together. Preserve all existing bindings/secrets and apply the bulk-v1 new_sqlite_classes migration once. Local Node tests use a minimal cloudflare:workers loader stub; they test batch logic and existing webhook behavior, not the deployed SQLite/alarm runtime:
node --loader ./telegram/test-cloudflare-loader.mjs --test telegram/bulk.test.mjs telegram/worker.test.mjs telegram/delete.test.mjs telegram/blog.test.mjs

## Edit artwork titles and notes
Send /edit Current title | New title | New notes. Match the full current title (including emoji and batch number), or use id:UPLOAD_ID instead. Matching ignores case and repeated whitespace. Leave the new title empty to keep it; omit the notes field to keep notes; include an empty notes field to clear notes. Additional | fields join as notes. Edited titles allow at most 38 visible characters and notes at most 800 characters.
The bot atomically updates the manifest, artwork social preview page and an edit-delivery ledger. Media src, thumbnail, original upload time, gallery order and upload ID remain unchanged. Duplicate normalized titles, ambiguous targets, missing artwork and conflicting edits are rejected. Telegram retries cannot replay an older edit over a newer edit. Only Sarah's authorized private chat can edit.
Examples:
/edit Old title | New title
/edit Current title | | Replacement notes
/edit id:166307900 | New title | Notes
Deploy editing.mjs alongside the other Worker modules. Run node --loader ./telegram/test-cloudflare-loader.mjs --test telegram/editing.test.mjs telegram/worker.test.mjs telegram/delete.test.mjs telegram/blog.test.mjs.
