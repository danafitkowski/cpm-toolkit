# CPM Toolkit

A small, static, self-contained website: a free client-side XER health-check
tool, plus the storefront for the Lookahead Generator desktop app and four
$4.99 worksheets and references.

Deliberately separate from any Critical Path Partners branding.

## Structure

- `index.html`, `assets/` — the site itself. Static, no build step, no backend.
- `contact.html`, `thank-you.html` — contact form and its confirmation page. The
  form posts to Web3Forms, which emails the message on and redirects to
  `thank-you.html`. No backend here either.
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
- `checkout-links.js` — one flag per product saying whether it is on sale
  (five keys: the app plus four worksheets). It holds no URLs. See Checkout
  below.

## Running locally

Any static file server works, e.g.:

```
python3 -m http.server 8420
```

Then open `http://localhost:8420`.

## Checkout

Two different things, kept in two different places, each written down once.

**Where a buy URL lives.** On that product's `data-buy-button` link in
`index.html`, in the `href`, and nowhere else. That is the only copy. Keeping
it in the markup is what makes the page honest for a visitor with JavaScript
off, blocked, or broken: they get a real, working link to every product that is
actually on sale. Any storefront works (Gumroad, Payhip, a Stripe payment link)
because the site only ever needs a URL.

**Where availability lives.** In `checkout-links.js`, one entry per product,
keyed by the `data-product` attribute on the product block. `true` means on
sale; `null`, `false`, or a missing key means withdrawn.

`assets/app.js` reads those flags on page load and only ever takes a product
away. A withdrawn product's link is replaced with a disabled "Checkout
unavailable" button. Nothing switches a product on, because the markup already
carries the link. That is the whole reason a product with no listing yet is
authored as a disabled button rather than as a link.

All five products are on sale today: the app plus the four worksheets.

### The guard

`assets/app.js` derives both sides from what is actually there, the
`data-product` blocks in `index.html` and the keys in `checkout-links.js`, and
writes a console error for each of these:

1. A key in `checkout-links.js` with no matching `data-product` block.
2. A `data-product` block with no key in `checkout-links.js`.
3. A product marked on sale whose buy control carries no URL.
4. A URL pasted into `checkout-links.js`, which is what a second copy of a buy
   URL looks like on its way in.

The guard keeps no list of its own. It reads the product keys out of both files
at run time and compares them, so adding a sixth product and forgetting the
other file is reported rather than shipped.

### Recipes

To change a buy URL: edit that one `href` in `index.html`.

To withdraw a product: set its key to `null` in `checkout-links.js`. The link
becomes a disabled button on the next page load.

To add a product before its listing exists:

1. Give the new block a `data-product` key in `index.html`.
2. Author its buy control as
   `<button class="btn btn-outline" data-buy-button disabled>Checkout unavailable</button>`,
   because there is no URL to link to yet.
3. Add the same key to `checkout-links.js`, set to `null`.
4. When the listing goes live, replace that button with a real
   `<a class="btn btn-outline" data-buy-button href="..." target="_blank" rel="noopener">Buy now</a>`
   and set the key to `true`.

## Indexing

`sitemap.xml` lists the two pages worth finding in a search result: the home
page and `contact.html`. `thank-you.html` is deliberately absent and carries
`<meta name="robots" content="noindex, follow">`, because it is only ever the
redirect after the contact form is submitted. `robots.txt` leaves it crawlable
on purpose: a page blocked in `robots.txt` is one a crawler can never read the
noindex tag on.

`assets/build_og_image.py` regenerates `assets/og-image.png`. Run it from
`assets/`. It records every string passed to `draw.text` and checks each one for
template wording and for running past the right margin, so a line added to the
card later is checked without anyone updating a list.
