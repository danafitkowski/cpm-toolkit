// Which products are on sale right now. This file does NOT hold buy URLs.
//
// A buy URL lives in exactly one place: the href on that product's "Buy now"
// link in index.html. Keeping it in the markup is what makes the page honest
// for a visitor with JavaScript blocked, and keeping it out of here is what
// stops the same URL existing in two places that can drift apart.
//
// One entry per product. The key must match the data-product attribute on the
// product block in index.html.
//
//   true  the product is on sale; the "Buy now" link in index.html stands.
//   null  the product is withdrawn; assets/app.js replaces that link with a
//         disabled "Checkout unavailable" button on page load.
//
// Deleting a key does the same thing as null. Any storefront works (Gumroad,
// Payhip, a Stripe payment link) because the site only ever needs a URL, and
// changing storefronts means editing the one href in index.html.
//
// assets/app.js also reports, to the browser console, a key here with no
// matching block in index.html, a block with no key here, a product marked
// on sale whose link carries no URL, and any URL accidentally pasted into
// this file.
window.CHECKOUT_AVAILABILITY = {
  'lookahead-app': true,
  'health-checklist': true,
  'xer-reference': true,
  'histogram-calculator': true,
  'threepoint-estimate': true,
};
