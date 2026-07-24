# CPM Toolkit

A small, static, self-contained website: a free client-side XER health-check
tool plus three digital products (templates and a reference sheet) for P6
schedulers and planners.

Deliberately separate from any Critical Path Partners branding.

## Structure

- `index.html`, `assets/` — the site itself. Static, no build step, no backend.
- `vendor/lens-parser/` — a vendored subset of the MIT-licensed
  [cpp-lens-parser](https://github.com/danafitkowski/cpp-lens-parser), used to
  parse `.xer` files entirely client-side. See `vendor/lens-parser/LICENSE`.
- `products/` — the source for the three sellable digital products
  (`build_lookahead.py`, `build_checklist.py`, `build_cheatsheet.py` generate
  the `.xlsx`/`.pdf` files sold on the site; the generated files themselves
  are also committed here so they can be uploaded straight to a storefront).

## Running locally

Any static file server works, e.g.:

```
python3 -m http.server 8420
```

Then open `http://localhost:8420`.

## Status

Checkout is not wired up yet. The three product cards are disabled
("Checkout coming soon") until a Lemon Squeezy (or similar) store exists and
its buy-links are pasted into `index.html`. See the three `<button class="btn
btn-outline" disabled>` elements.
