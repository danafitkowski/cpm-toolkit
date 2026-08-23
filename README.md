# CPM Toolkit

A small, static, self-contained website: a free client-side XER health-check
tool, plus the storefront for the Lookahead Generator desktop app and four
$4.99 worksheets and references.

Deliberately separate from any Critical Path Partners branding.

## Structure

- `index.html`, `assets/` — the site itself. Static, no build step, no backend.
- `vendor/lens-parser/` — a vendored subset of the MIT-licensed
  [cpp-lens-parser](https://github.com/danafitkowski/cpp-lens-parser), used to
  parse `.xer` files entirely client-side. See `vendor/lens-parser/LICENSE`.
- `products/` — REMOVED from this repo 2026-07-26. Six static template products
  were built here, then audited against Dana's canonical skills and all six came
  back CONTRADICTS. Because this repo is public they were downloadable from
  raw.githubusercontent.com even after being taken off the site, so they were
  deleted. A local copy is at `Downloads/CPM Toolkit - retired products backup`.
  Do not re-add product FILES to this repo, ever: the storefront (Gumroad)
  hosts the files. On 2026-08-23 four replacements were rebuilt correctly from
  the canonical skills and adversarially re-audited; their build scripts and
  outputs live in the separate PRIVATE local repo
  `~/Projects/cpm-toolkit-products`. The app is in the separate PRIVATE repo
  `~/Projects/lookahead-generator`.
- `checkout-links.js` — the one file to edit when checkout goes live
  (five keys: the app plus four worksheets).

## Running locally

Any static file server works, e.g.:

```
python3 -m http.server 8420
```

Then open `http://localhost:8420`.

## Status

Checkout is not wired up yet. The single product block shows "Checkout coming
soon" until the store listing is live.

To switch it on, paste the buy link into `checkout-links.js` under the
`lookahead-app` key. Any platform works (Gumroad, Payhip, a Stripe payment
link) because the site only ever needs a URL. Once the link is set, the block
automatically loses its "Launching soon" badge and gets a working "Buy now"
button.
