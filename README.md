# CPM Toolkit

A small, static, self-contained website: a free client-side XER health-check
tool, plus the storefront for the Lookahead Generator desktop app.

Deliberately separate from any Critical Path Partners branding.

## Structure

- `index.html`, `assets/` — the site itself. Static, no build step, no backend.
- `vendor/lens-parser/` — a vendored subset of the MIT-licensed
  [cpp-lens-parser](https://github.com/danafitkowski/cpp-lens-parser), used to
  parse `.xer` files entirely client-side. See `vendor/lens-parser/LICENSE`.
- `products/` — RETIRED. Six static template products were built here and then
  audited against Dana's canonical skills in `~/.claude/skills/`; all six came
  back CONTRADICTS (34 ban violations, 74 divergences), and five of them could
  not work as static files at all because the canonical tools compute from an
  XER. They are kept only for reference and must not be sold. See
  `Downloads/CPM Toolkit - Product Audit vs Canonical Skills - 2026-07-25.html`.
  The real product is the Lookahead Generator app, built in the separate
  PRIVATE repo `~/Projects/lookahead-generator`, which wraps the canonical
  builder unchanged.
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
