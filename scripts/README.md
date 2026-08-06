# Publishing images (maintainers only)

New and updated images should go into the shared Cloudflare R2 bucket (`websites-images`)
instead of being committed to this repo, and are served at their usual `/img/...` URL by
[`src/pages/img/[...path].ts`](../src/pages/img/%5B...path%5D.ts), which reads the object
from R2 and streams it back. The lookup logic lives in
[`src/lib/r2-proxy.ts`](../src/lib/r2-proxy.ts) so a future `video` route (this site doesn't
serve any video today) could reuse it the same way the `absmach-website` repo's `img`/`video`
routes do.

Nothing in components, blog frontmatter, or `src/pages/**` needs to change — they keep
referencing `/img/logos/foo.png` (or whatever the existing path is) exactly as before.

Only maintainers publish images, using [`publish-image.mjs`](./publish-image.mjs). The
script is safe to have in a public repo because it's inert without a token — nobody can
upload to the bucket just by reading this file. See "Why maintainer-only" below for the
reasoning.

## One-time setup

1. Create `scripts/.env.publish-image` from the template:

   ```bash
   cp scripts/.env.publish-image.example scripts/.env.publish-image
   ```

2. Create a Cloudflare API token: dashboard -> **My Profile -> API Tokens -> Create Token
   -> Custom Token**, with both permissions on the same token:
   - `Workers R2 Storage: Edit`
   - `Zone -> Cache Purge -> Purge`, **Zone Resources** scoped to the `ultraviolet.rs` zone

3. Paste the token into `CLOUDFLARE_API_TOKEN` in `scripts/.env.publish-image`. The zone
   ID is already filled in (it's not secret, safe to share/commit — it can't authenticate
   anything by itself).

4. Sanity-check the token before first use:

   ```bash
   curl -s https://api.cloudflare.com/client/v4/user/tokens/verify \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
   ```

   Should return `"status":"active"`. If it doesn't, the token value itself is wrong
   (bad copy/paste, expired, revoked) — fix that before troubleshooting anything else.

`scripts/.env.publish-image` is gitignored (see `.gitignore`). Never commit it, never
paste the token value into a PR, issue, or chat.

## Publishing an image

```bash
pnpm run publish-image <local-file> <public-path>
```

`<public-path>` is everything after the domain in the final URL — it must start with
`img/` so the script knows which route (and R2 key prefix) it belongs to. Example:

```bash
pnpm run publish-image ./hero.png img/blog/atom-announcement.png
# -> https://www.ultraviolet.rs/img/blog/atom-announcement.png
```

Keep the public path identical to the site's existing `/img/...` convention so
component/frontmatter references don't need to change — check `public/img/` or an existing
reference in `src/` for the pattern to match.

The script does two things, in order:

1. `wrangler r2 object put ... --remote` — uploads to the **real** bucket. `--remote` is
   required; without it, `wrangler` silently writes to a local simulated bucket and prints
   a normal-looking "Upload complete" with no error, and the object is never actually live.
2. Purges that exact URL from Cloudflare's edge cache (`POST /zones/{id}/purge_cache`), so
   the update is visible within seconds instead of waiting out the cache TTL.

If you re-run the same command for an existing path, it overwrites the object in place and
purges again — that's the intended way to update an image without changing its URL.

## Migrating the existing `public/img/` tree

This route was added alongside the existing `public/img/` directory rather than replacing
it outright: images still committed there keep being served as static files (the Cloudflare
assets binding serves an exact-path match before the Worker route ever runs), and only stop
working from `public/img/` once removed from the repo. That means the migration to R2 can
happen incrementally, file by file or in one bulk pass, without a flag day — nothing breaks
either way while both exist.

To migrate the rest of `public/img/` out of the repo:

1. Audit `public/img/` for files that are actually referenced from `src/` (components, page
   files, blog frontmatter/content) — including paths built dynamically, e.g.
   `` `/img/logos/${f}.png` `` or `` `/img/blog/${slug}.png` `` — and drop anything unused
   the same way the `absmach-website` migration did (298 files kept, 51 unused ones
   dropped).
2. Upload each remaining file, preserving its path under `img/`, either one at a time with
   `pnpm run publish-image` (see above) or in bulk by dragging folders into the
   `websites-images` bucket in the Cloudflare R2 dashboard. **The keys have to land under
   the exact prefix the route expects:**

   | Site URL                                       | Required R2 key                     |
   | ---------------------------------------------- | ----------------------------------- |
   | `https://www.ultraviolet.rs/img/logos/foo.png` | `ultraviolet-website/logos/foo.png` |

   So in the R2 dashboard, in the `websites-images` bucket, create/open a folder named
   `ultraviolet-website` and drag in the **contents** of `public/img/` — not the `img`
   folder itself as one more nested level. Dragging `img/` in as a folder would produce
   `ultraviolet-website/img/logos/foo.png`, which the proxy route never looks up (it strips
   the leading `/img/` from the request and prepends `ultraviolet-website/`, nothing else)
   — every image would silently 404.

3. Spot-check a handful of uploaded objects against the originals (see "Troubleshooting"
   below for the `wrangler r2 object get` command).
4. Once every file is confirmed uploaded, remove `public/img/` from the repo in its own
   commit.

## Why maintainer-only

This repo is public. The risk isn't the script being visible — it's inert without a
credential. The risk is _credential distribution_: whoever holds `CLOUDFLARE_API_TOKEN`
can write to the shared bucket. So nobody, internal or external, gets a personal R2 token.
Only a maintainer, holding this one scoped token, runs `publish-image`.

Practical flow for a PR that adds an image (contributor is internal or external, doesn't
matter): the contributor attaches the image to the PR the normal GitHub way (drag-and-drop
into the description or a comment). A maintainer reviewing the PR runs
`pnpm run publish-image` locally before merging, then approves. If this becomes a frequent
bottleneck, the natural next step is a label- or comment-triggered GitHub Action that runs
the same script with the token stored as a repo secret — but that automation must only ever
read the attachment URL/destination path from the PR, never execute code from the PR
branch while the token is in scope (the standard `pull_request_target` secret-exfiltration
pitfall).

## Troubleshooting

- **`Local file not found: --`** — you ran `pnpm run publish-image -- <file> <dest>`. pnpm
  forwards a leading `--` to the script literally instead of stripping it like npm does.
  The script strips it defensively now, but plain `pnpm run publish-image <file> <dest>`
  (no `--`) is the form to use.
- **`Destination must start with "img/"`** — the second argument must be the full public
  path including the route, e.g. `img/logos/foo.png`, not `logos/foo.png`.
- **`Resource location: local` in the upload output** — means `--remote` didn't get
  applied for some reason (e.g. running the underlying `wrangler` command by hand without
  copying the full flag list from the script). The object was never written to the real
  bucket even though the CLI reports success. Always use `pnpm run publish-image`, or add
  `--remote` yourself if invoking wrangler directly.
- **`Cache purge failed` / `Authentication error` (code 10000)** — Cloudflare reuses this
  code for both "bad token" and "token valid but missing this permission." Run the token
  verify curl command above first to rule out a bad token. If that succeeds, the token is
  missing `Zone -> Cache Purge -> Purge` for the `ultraviolet.rs` zone, or that permission's
  Zone Resources selector doesn't include it — edit the token in the dashboard and add it.
- To confirm an object actually made it into the bucket after a `--remote` upload:

  ```bash
  wrangler r2 object get websites-images/ultraviolet-website/<path-after-img/> --remote --file=/tmp/check
  ```
