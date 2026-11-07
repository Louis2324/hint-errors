// test/sandbox-scenarios.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.join(__dirname, "..");

function loadSourceHints() {
  const source = fs.readFileSync(path.join(rootDir, "src", "hints.js"), "utf8");
  const sandbox = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(source + "\n;this.__hints = hints;", sandbox);
  return sandbox.__hints;
}

function representativeMessage(match) {
  if (typeof match === "string") return match;
  return match.source.split("|")[0].replace(/\\\./g, ".");
}

const DOCUMENTED_HINT_SCENARIOS = loadSourceHints().map((entry, index) => {
  const message = representativeMessage(entry.match);
  return {
    id: "documented-hint-" + String(index + 1).padStart(2, "0"),
    entryPoint: "index",
    type: "Error",
    message,
    hint: entry.hint,
    fixture:
      "require(process.env.HINT_ENTRY);\n" +
      "throw new Error(" +
      JSON.stringify(message) +
      ");\n",
  };
});

const NATURAL_SCENARIOS = [
  {
    id: "natural-type-error",
    entryPoint: "index",
    fixture:
      "require(process.env.HINT_ENTRY);\n" +
      "const user = undefined;\n" +
      "console.log(user.name);\n",
    stdoutIncludesAny: [
      [
        "Cannot read properties of undefined",
        "Cannot read property 'name' of undefined",
      ],
    ],
    stdoutIncludes: ["You're trying to access a property"],
  },
  {
    id: "natural-unhandled-rejection",
    entryPoint: "index",
    fixture:
      "require(process.env.HINT_ENTRY);\n" +
      'Promise.reject(new Error("sandbox rejection marker"));\n',
    stdoutIncludes: ["sandbox rejection marker", "Double-check the line"],
  },
  {
    id: "natural-server-termination",
    entryPoint: "server",
    fixture:
      "require(process.env.HINT_ENTRY);\n" +
      "setInterval(() => {}, 1000);\n" +
      'throw new Error("sandbox server marker");\n',
    stdoutIncludes: ["sandbox server marker", "Double-check the line"],
    stderrExcludes: ["sandbox server marker"],
  },
  {
    id: "natural-esm-index",
    entryPoint: "index-esm",
    fileName: "case.mjs",
    fixture:
      'import { pathToFileURL } from "node:url";\n' +
      "const { addHint } = await import(pathToFileURL(process.env.HINT_ENTRY).href);\n" +
      'console.log("SANDBOX_ESM_INDEX " + typeof addHint);\n' +
      'throw new Error("sandbox esm index marker");\n',
    stdoutIncludes: ["SANDBOX_ESM_INDEX function", "sandbox esm index marker"],
  },
  {
    id: "natural-esm-server",
    entryPoint: "server-esm",
    fileName: "case.mjs",
    fixture:
      'import { pathToFileURL } from "node:url";\n' +
      "const { addHint } = await import(pathToFileURL(process.env.HINT_ENTRY).href);\n" +
      'console.log("SANDBOX_ESM_SERVER " + typeof addHint);\n' +
      'setInterval(() => {}, 1000);\n' +
      'throw new Error("sandbox esm server marker");\n',
    stdoutIncludes: ["SANDBOX_ESM_SERVER function", "sandbox esm server marker"],
    stderrExcludes: ["sandbox esm server marker"],
  },
  {
    id: "natural-syntax-error",
    entryPoint: "index",
    fixture:
      "require(process.env.HINT_ENTRY);\n" +
      'new Function("const =");\n',
    stdoutIncludes: ["Unexpected token", "Node hit something it didn't expect"],
  },
  {
    id: "natural-range-error",
    entryPoint: "index",
    fixture:
      "require(process.env.HINT_ENTRY);\n" +
      "new Array(-1);\n",
    stdoutIncludes: ["Invalid array length", "invalid length"],
  },
  {
    id: "natural-uri-error",
    entryPoint: "index",
    fixture:
      "require(process.env.HINT_ENTRY);\n" +
      'decodeURIComponent("%");\n',
    stdoutIncludes: ["URI malformed", "invalid URI"],
  },
  {
    id: "natural-assertion-error",
    entryPoint: "index",
    fixture:
      "require(process.env.HINT_ENTRY);\n" +
      'require("node:assert").strictEqual(1, 2);\n',
    stdoutIncludes: ["Expected values to be strictly equal", "strictly equal"],
  },
  {
    id: "natural-missing-file",
    entryPoint: "index",
    fixture:
      "require(process.env.HINT_ENTRY);\n" +
      'require("node:fs").readFileSync("missing-sandbox-file.txt");\n',
    stdoutIncludes: ["ENOENT: no such file or directory", "file or folder"],
  },
  {
    id: "natural-missing-module",
    entryPoint: "index",
    fixture:
      "require(process.env.HINT_ENTRY);\n" +
      'require("./module-that-does-not-exist");\n',
    stdoutIncludes: ["Cannot find module", "can't find the module"],
  },
  {
    id: "custom-high-priority",
    entryPoint: "index",
    fixture:
      "const { addHint } = require(process.env.HINT_ENTRY);\n" +
      'addHint({ match: "SANDBOX_CUSTOM_HIGH", hint: "SANDBOX_CUSTOM_HIGH_HINT" });\n' +
      'throw new Error("SANDBOX_CUSTOM_HIGH failure");\n',
    stdoutIncludes: ["SANDBOX_CUSTOM_HIGH_HINT"],
  },
  {
    id: "custom-low-priority",
    entryPoint: "index",
    fixture:
      "const { addHint } = require(process.env.HINT_ENTRY);\n" +
      'addHint({ match: "SANDBOX_CUSTOM_LOW", hint: "SANDBOX_CUSTOM_LOW_HINT" }, { priority: "low" });\n' +
      'throw new Error("SANDBOX_CUSTOM_LOW failure");\n',
    stdoutIncludes: ["SANDBOX_CUSTOM_LOW_HINT"],
  },
  {
    id: "production-disabled",
    entryPoint: "index",
    env: { NODE_ENV: "production" },
    fixture:
      "require(process.env.HINT_ENTRY);\n" +
      'throw new Error("SANDBOX_PRODUCTION_DISABLED_MARKER");\n',
    stdoutIncludes: ["NODE_ENV=production detected", "disabled by default"],
    stdoutExcludes: ["SANDBOX_PRODUCTION_DISABLED_MARKER"],
  },
  {
    id: "production-forced",
    entryPoint: "index",
    env: { NODE_ENV: "production", HINT_ERRORS_FORCE: "1" },
    fixture:
      "require(process.env.HINT_ENTRY);\n" +
      'throw new Error("SANDBOX_PRODUCTION_FORCED_MARKER");\n',
    stdoutIncludes: ["SANDBOX_PRODUCTION_FORCED_MARKER", "Double-check the line"],
  },
  {
    id: "preexisting-once-listener",
    entryPoint: "index",
    fixture:
      'process.once("uncaughtException", (err) => console.log("SANDBOX_ONCE " + err.message));\n' +
      "require(process.env.HINT_ENTRY);\n" +
      'throw new Error("SANDBOX_ONCE_MARKER");\n',
    stdoutIncludes: ["SANDBOX_ONCE_MARKER", "SANDBOX_ONCE SANDBOX_ONCE_MARKER"],
  },
  {
    id: "large-piped-output",
    entryPoint: "index",
    fixture:
      "require(process.env.HINT_ENTRY);\n" +
      'throw new Error("' + "x".repeat(20000) + ' SANDBOX_LARGE_OUTPUT_END");\n',
    stdoutIncludes: ["SANDBOX_LARGE_OUTPUT_END"],
  },
];

module.exports = { DOCUMENTED_HINT_SCENARIOS, NATURAL_SCENARIOS };
