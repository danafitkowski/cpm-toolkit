# CPM Toolkit

A small, static, self-contained website: a free client-side XER health-check
tool, plus the storefront for the Lookahead Generator desktop app.

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
  Do not re-add them. The real product is the Lookahead Generator app, in the
  separate PRIVATE repo `~/Projects/lookahead-generator`.
- `checkout-links.js` — the one file to edit when checkout goes live.

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
