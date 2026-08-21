// Capacitor's CLI, when run on Windows, writes local Swift Package Manager
// dependency paths (`.package(path: "...")`) using Windows-style backslashes,
// e.g. "..\..\..\node_modules\@capacitor\geolocation". That's not just the
// wrong path separator — inside a Swift string literal, `\.` and `\@` are
// invalid escape sequences, so Xcode fails to even parse the file.
//
// This script rewrites only the `path:` string values inside
// ios/App/CapApp-SPM/Package.swift to use forward slashes. It touches
// nothing else, and running it repeatedly is a no-op once the paths are
// already fixed.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageSwiftPath = join(__dirname, "..", "ios", "App", "CapApp-SPM", "Package.swift");

function fixLocalPackagePaths(source) {
  // The only `path:` keys Capacitor writes into this file are the local
  // package paths inside `.package(path: "...")` entries, so matching the
  // key directly (rather than trying to scope into the surrounding
  // `.package(...)` call) is both simpler and robust to formatting changes.
  return source.replace(
    /(path:\s*")([^"]*)(")/g,
    (_match, prefix, pathValue, suffix) => prefix + pathValue.replace(/\\/g, "/") + suffix,
  );
}

if (!existsSync(packageSwiftPath)) {
  console.log("[fix-capacitor-spm-paths] Package.swift not found, nothing to do.");
  process.exit(0);
}

const original = readFileSync(packageSwiftPath, "utf8");
const fixed = fixLocalPackagePaths(original);

if (fixed === original) {
  console.log("[fix-capacitor-spm-paths] Package.swift paths already use forward slashes.");
} else {
  writeFileSync(packageSwiftPath, fixed);
  console.log("[fix-capacitor-spm-paths] Fixed backslashes in Package.swift local package path(s).");
}
