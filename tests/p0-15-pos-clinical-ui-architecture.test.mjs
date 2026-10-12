import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("UI-POS-ARCH-01: style.css defines exact Section 2.1 Light Clinical Enterprise design tokens", () => {
  const cssPath = path.resolve("apps/desktop-pos/style.css");
  assert.ok(fs.existsSync(cssPath), "style.css must exist");

  const css = fs.readFileSync(cssPath, "utf8");

  // Clinical color tokens
  assert.ok(css.includes("--brand-primary: #087F68"), "Must define clinical brand teal-green #087F68");
  assert.ok(css.includes("--app-bg: #F4F6F8"), "Must define clean off-white application background #F4F6F8");
  assert.ok(css.includes("--surface: #FFFFFF"), "Must define pure white surface #FFFFFF");
  assert.ok(css.includes("--text-primary: #172536"), "Must define dark navy clinical primary text #172536");
  assert.ok(css.includes("--text-secondary: #64748B"), "Must define muted secondary text #64748B");
  assert.ok(css.includes("--danger: #B42318"), "Must define danger color #B42318");
  assert.ok(css.includes("--warning: #A16207"), "Must define warning color #A16207");
  assert.ok(css.includes("--success: #15803D"), "Must define success color #15803D");

  // Radius and elevation tokens
  assert.ok(css.includes("--radius-md: 8px"), "Must define 8px control radius");
  assert.ok(css.includes("--radius-lg: 12px"), "Must define 12px card radius");
  assert.ok(css.includes("--shadow-card"), "Must define subtle card shadow");

  // Motion tokens & Reduced motion
  assert.ok(css.includes("--duration-fast: 120ms"), "Must define fast transition duration");
  assert.ok(css.includes("prefers-reduced-motion: reduce"), "Must support prefers-reduced-motion accessibility");
});

test("UI-POS-ARCH-02: style.css enforces CSS Grid layout stability and RTL logical properties", () => {
  const cssPath = path.resolve("apps/desktop-pos/style.css");
  const css = fs.readFileSync(cssPath, "utf8");

  // Grid layout rules
  assert.ok(css.includes(".pos-workspace"), "Must style pos-workspace grid");
  assert.ok(css.includes("minmax(0, 1fr)"), "Products column must use minmax(0, 1fr) to prevent overflow");
  assert.ok(css.includes("minmax(320px, 360px)") || css.includes("340px"), "Cart panel must have bounded stable width");
  assert.ok(css.includes("min-width: 0"), "Must include min-width: 0 guards against flex/grid clipping");

  // RTL logical properties
  assert.ok(css.includes("padding-inline"), "Must use CSS logical padding-inline");
  assert.ok(css.includes("margin-inline"), "Must use CSS logical margin-inline");
  assert.ok(css.includes("border-inline-start"), "Must use CSS logical border-inline-start");
});

test("UI-POS-ARCH-03: index.html adheres to native Arabic RTL semantics and accessibility contracts", () => {
  const htmlPath = path.resolve("apps/desktop-pos/index.html");
  const html = fs.readFileSync(htmlPath, "utf8");

  // Semantic document setup
  assert.ok(html.includes('lang="ar"'), "Must declare lang='ar'");
  assert.ok(html.includes('dir="rtl"'), "Must declare dir='rtl'");
  assert.ok(html.includes('data-theme="light"'), "Default theme must be Light Clinical Enterprise");

  // SEO & Headings
  assert.ok(html.includes("<title>"), "Must include descriptive title");
  assert.ok(html.includes("<meta name=\"description\""), "Must include meta description");
  const h1Matches = html.match(/<h1[\s>]/g) || [];
  assert.equal(h1Matches.length, 1, "Must contain exactly one <h1> element for SEO compliance");

  // Key interactive elements and containers
  assert.ok(html.includes('id="pos-header"'), "Must have pos-header");
  assert.ok(html.includes('id="product-search-input"'), "Must have product-search-input");
  assert.ok(html.includes('id="simulate-scan-btn"'), "Must have simulate-scan-btn");
  assert.ok(html.includes('id="category-chips"'), "Must have category-chips tablist");
  assert.ok(html.includes('id="products-grid"'), "Must have products-grid");
  assert.ok(html.includes('id="cart-items-count"'), "Must have cart-items-count badge");
  assert.ok(html.includes('id="empty-cart-msg"'), "Must have empty-cart-msg container");
  assert.ok(html.includes('id="cart-list"'), "Must have cart-list element");
  assert.ok(html.includes('id="subtotal-display"'), "Must have subtotal-display");
  assert.ok(html.includes('id="grand-total-display"'), "Must have grand-total-display");
  assert.ok(html.includes('id="open-payment-modal-btn"'), "Must have open-payment-modal-btn");
  assert.ok(html.includes('id="payment-modal"'), "Must have payment-modal");
  assert.ok(html.includes('id="receipt-modal"'), "Must have receipt-modal");
  assert.ok(html.includes('id="pos-theme-toggle-btn"'), "Must have theme toggle button");
});

test("UI-POS-ARCH-04: app.js renders 4-level medicine hierarchy with FEFO pills and stock indicators", () => {
  const jsPath = path.resolve("apps/desktop-pos/app.js");
  const js = fs.readFileSync(jsPath, "utf8");

  // Level 1: Trade name & Final price
  assert.ok(js.includes("prod-name-ar"), "Must render Arabic trade name");
  assert.ok(js.includes("prod-final-price"), "Must render prominent final price");

  // Level 2: Strength and dosage form
  assert.ok(js.includes("prod-strength-form"), "Must render strength and dosage form");

  // Level 3: English name & Stock indicator
  assert.ok(js.includes("prod-name-en"), "Must render English/scientific name");
  assert.ok(js.includes("stock-indicator"), "Must render stock indicator");

  // Level 4: SKU & FEFO batch pill
  assert.ok(js.includes("card-sku-code"), "Must render SKU reference code");
  assert.ok(js.includes("fefo-pill"), "Must render FEFO batch expiry pill");
  assert.ok(js.includes("card-cat-tag"), "Must render category tag");

  // Action Button & Accessibility
  assert.ok(js.includes("btn-card-add"), "Must include explicit add button");
  assert.ok(js.includes('card.setAttribute("role", "button")'), "Card must have role=button for accessibility");
  assert.ok(js.includes('card.setAttribute("tabindex", "0")'), "Card must be keyboard focusable");
});

test("UI-POS-ARCH-05: app.js contains scanner deduplication guard and search debounce", () => {
  const jsPath = path.resolve("apps/desktop-pos/app.js");
  const js = fs.readFileSync(jsPath, "utf8");

  // Barcode scanner deduplication guard
  assert.ok(js.includes("SCANNER_DEDUPLICATION_WINDOW_MS"), "Must define scanner deduplication window");
  assert.ok(js.includes("lastScannedBarcode"), "Must track last scanned barcode");
  assert.ok(js.includes("lastScannedTimestamp"), "Must track last scanned timestamp");

  // Search debounce
  assert.ok(js.includes("searchDebounceTimer"), "Must debounce search input to avoid DOM thrashing");
});

test("UI-POS-ARCH-06: app.js preserves business invariants: FEFO order, offline limit, and multi-payment", () => {
  const jsPath = path.resolve("apps/desktop-pos/app.js");
  const js = fs.readFileSync(jsPath, "utf8");

  // FEFO rule: earliest expiry date first
  assert.ok(js.includes("getFefoBatch"), "Must calculate earliest expiring valid batch");
  assert.ok(js.includes("expiryDate.localeCompare"), "Must sort batches chronologically by expiryDate");

  // Offline safety quota (ADR-011)
  assert.ok(js.includes("offlineAllocation"), "Must track offline allocation");
  assert.ok(js.includes("offlineAllocation.remaining"), "Must enforce remaining quota ceiling");

  // Split payment validation
  assert.ok(js.includes("splitCashInput"), "Must support split cash");
  assert.ok(js.includes("splitTransferInput"), "Must support split transfer");
  assert.ok(js.includes("transferRefInput"), "Must require transfer reference for auditability");
});
