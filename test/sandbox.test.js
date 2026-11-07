// test/sandbox.test.js
"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const spawnSync = require("child_process").spawnSync;
const vm = require("vm");

const rootDir = path.join(__dirname, "..");
const sourceHintsPath = path.join(rootDir, "src", "hints.js");
const scenariosPath = path.join(__dirname, "sandbox-scenarios.js");
const indexEntry = path.join(rootDir, "index.js");
const serverEntry = path.join(rootDir, "server.js");
const indexEsmEntry = path.join(rootDir, "index.mjs");
const serverEsmEntry = path.join(rootDir, "server.mjs");

function loadSourceHints() {
  const source = fs.readFileSync(sourceHintsPath, "utf8");
  const sandbox = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(source + "\n;this.__hints = hints;", sandbox);
  return sandbox.__hints;
}

function runSandboxCase(scenario) {
  const sandboxDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "hint-errors-sandbox-"),
  );
  const fileName = scenario.fileName || "case.js";
  const fixturePath = path.join(sandboxDir, fileName);
  const entries = {
    index: indexEntry,
    server: serverEntry,
    "index-esm": indexEsmEntry,
    "server-esm": serverEsmEntry,
  };
  const entry = entries[scenario.entryPoint] || indexEntry;
  const env = { ...process.env, ...(scenario.env || {}), HINT_ENTRY: entry };
  const source = scenario.fixture;

  try {
    fs.writeFileSync(fixturePath, source, "utf8");
    const result = spawnSync(process.execPath, [fixturePath], {
      cwd: sandboxDir,
      env,
      encoding: "utf8",
      timeout: 10000,
    });
    return {
      ...result,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      sandboxDir,
    };
  } finally {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  }
}

function assertHintRendered(stdout, hint, label) {
  for (const line of String(hint).split("\n")) {
    if (line.trim()) {
      assert.ok(stdout.includes(line), `${label}: missing hint line ${line}`);
    }
  }
}

test("sandbox manifest covers every source hint exactly once", () => {
  assert.ok(fs.existsSync(scenariosPath), "sandbox scenario manifest is required");
  const { DOCUMENTED_HINT_SCENARIOS } = require(scenariosPath);
  const sourceHints = loadSourceHints();
  assert.strictEqual(DOCUMENTED_HINT_SCENARIOS.length, sourceHints.length);
  assert.strictEqual(
    new Set(DOCUMENTED_HINT_SCENARIOS.map((scenario) => scenario.id)).size,
    sourceHints.length,
    "sandbox scenario ids must be unique",
  );
  assert.deepStrictEqual(
    Array.from(DOCUMENTED_HINT_SCENARIOS, (scenario) => String(scenario.hint)),
    Array.from(sourceHints, (entry) => String(entry.hint)),
  );
});

test("sandbox cases run in temporary directories and clean up", () => {
  const { DOCUMENTED_HINT_SCENARIOS } = require(scenariosPath);
  const scenario = DOCUMENTED_HINT_SCENARIOS[0];
  const result = runSandboxCase(scenario);
  assert.strictEqual(result.status, 1);
  assertHintRendered(result.stdout, scenario.hint, scenario.id);
  assert.ok(!fs.existsSync(result.sandboxDir));
});

test("sandbox matrix renders every documented hint through the public entry", () => {
  const { DOCUMENTED_HINT_SCENARIOS } = require(scenariosPath);
  for (const scenario of DOCUMENTED_HINT_SCENARIOS) {
    const result = runSandboxCase(scenario);
    assert.strictEqual(result.status, 1, scenario.id);
    assertHintRendered(result.stdout, scenario.hint, scenario.id);
  }
});

test("sandbox natural process cases preserve runtime behavior", () => {
  const { NATURAL_SCENARIOS } = require(scenariosPath);
  for (const scenario of NATURAL_SCENARIOS) {
    const result = runSandboxCase(scenario);
    assert.strictEqual(result.status, scenario.status ?? 1, scenario.id);
    for (const text of scenario.stdoutIncludes || []) {
      assert.ok(result.stdout.includes(text), `${scenario.id}: missing stdout ${text}`);
    }
    for (const alternatives of scenario.stdoutIncludesAny || []) {
      assert.ok(
        alternatives.some((text) => result.stdout.includes(text)),
        `${scenario.id}: missing one of stdout ${alternatives.join(" / ")}`,
      );
    }
    for (const text of scenario.stdoutExcludes || []) {
      assert.ok(!result.stdout.includes(text), `${scenario.id}: unexpected stdout ${text}`);
    }
    for (const text of scenario.stderrExcludes || []) {
      assert.ok(!result.stderr.includes(text), `${scenario.id}: unexpected stderr ${text}`);
    }
  }
});
