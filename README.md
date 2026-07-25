# CPM Toolkit

A small, static, self-contained website: a free client-side XER health-check
tool plus six digital products (templates and a reference sheet) for P6
schedulers and planners.

Deliberately separate from any Critical Path Partners branding.

## Structure

- `index.html`, `assets/` — the site itself. Static, no build step, no backend.
- `vendor/lens-parser/` — a vendored subset of the MIT-licensed
  [cpp-lens-parser](https://github.com/danafitkowski/cpp-lens-parser), used to
  parse `.xer` files entirely client-side. See `vendor/lens-parser/LICENSE`.
- `products/` — the source for the six sellable digital products. Each
  `build_*.py` generates the `.xlsx`/`.pdf` sold on the site; the generated
  files are committed here too so they can be uploaded straight to a
  storefront. `_excel_com_test.py` opens every workbook in real Excel via COM
  and scans for formula errors.
- `checkout-links.js` — the one file to edit when checkout goes live.

## Running locally

Any static file server works, e.g.:

```
python3 -m http.server 8420
```

Then open `http://localhost:8420`.

## Status

Checkout is not wired up yet. All six product cards show "Checkout coming
soon" until a storefront exists.

To switch checkout on, paste the buy links into `checkout-links.js`, one per
product key. Any platform works (Gumroad, Payhip, Lemon Squeezy, a plain
Stripe payment link) because the site only ever needs a URL. Each product
whose link is filled in automatically loses its "Launching soon" badge and
gets a working "Buy now" button; products left as `null` are untouched.
