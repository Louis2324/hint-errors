// test/docs-playground.test.js
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(rootDir, "docs", "index.html"), "utf8");
const playgroundHtml = fs.readFileSync(
  path.join(rootDir, "docs", "playground.html"),
  "utf8",
);
const app = fs.readFileSync(path.join(rootDir, "docs", "app.js"), "utf8");

function loadScenarioData() {
  const marker = "var PLAYGROUND_SCENARIOS = ";
  const start = app.indexOf(marker);
  assert.notStrictEqual(
    start,
    -1,
    "docs/app.js should declare the playground scenario table",
  );
  const end = app.indexOf("];", start);
  assert.notStrictEqual(end, -1, "playground scenarios should be closed with ];");
  return vm.runInNewContext(app.slice(start + marker.length, end + 1));
}

test("docs gallery links to a standalone playground after the gallery", () => {
  const galleryEnd = html.indexOf('id="galleryEmpty"');
  const playgroundLink = html.indexOf(
    'class="btn btn-primary" href="playground.html"',
  );
  assert.notStrictEqual(galleryEnd, -1);
  assert.ok(playgroundLink > galleryEnd, "playground CTA should follow the gallery");
  assert.match(html, /Try it yourself/i);
  assert.match(html, /<a href="playground\.html">Try it yourself<\/a>/);
  assert.match(html, /class="sidebar-cta" href="playground\.html"/);
  assert.ok(
    html.indexOf('href="#errors" data-nav') <
      html.indexOf('class="sidebar-cta"'),
    "playground route should sit after Error Gallery in the docs sidebar",
  );
  assert.ok(
    html.indexOf('class="sidebar-cta"') <
      html.indexOf('href="#production" data-nav'),
    "playground route should sit before Production Safety in the docs sidebar",
  );
  assert.doesNotMatch(html, /id="pgCode"/);
  assert.doesNotMatch(html, /Interactive playground/);
});

test("standalone playground exposes the editor and output contract", () => {
  for (const id of [
    "pgScenario",
    "pgCode",
    "pgRun",
    "pgReset",
    "pgLineNumbers",
    "pgCodeHighlight",
    "pgRawResult",
    "pgResult",
  ]) {
    assert.match(playgroundHtml, new RegExp('id="' + id + '"'));
  }
  assert.match(playgroundHtml, /aria-live="polite"/);
  assert.match(playgroundHtml, /safe browser simulation/i);
  assert.match(playgroundHtml, /Try it yourself/i);
  assert.match(playgroundHtml, /href="playground\.html" aria-current="page"/);
  assert.match(playgroundHtml, /raw Node\.js output/i);
  assert.match(playgroundHtml, /before hint-errors/i);
  assert.match(playgroundHtml, /hint-errors output/i);
  assert.ok(
    playgroundHtml.indexOf('id="pgRawResult"') <
      playgroundHtml.indexOf('id="pgResult"'),
    "raw output should appear above cleaned output",
  );
  assert.match(playgroundHtml, /class="playground-page"/);
  assert.match(playgroundHtml, /app\.js/);
});

test("playground scenarios have the required editable error shape", () => {
  const scenarios = loadScenarioData();
  assert.ok(scenarios.length >= 4, "expected representative playground scenarios");
  const ids = new Set();
  for (const scenario of scenarios) {
    assert.ok(scenario.id && scenario.label && scenario.code);
    assert.ok(scenario.error && scenario.error.type && scenario.error.message);
    assert.ok(!ids.has(scenario.id), `duplicate playground scenario: ${scenario.id}`);
    ids.add(scenario.id);
  }
});

test("playground source retains safe escaping and ordered hint lookup", () => {
  assert.match(app, /function escapeHtml\s*\(/);
  assert.match(app, /HINTS_DATA[\s\S]*?forEach/);
  assert.match(app, /escapeHtml\(.*message|escapeHtml\(.*hint/);
});
