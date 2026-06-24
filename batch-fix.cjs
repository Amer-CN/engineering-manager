const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

// Find all files with btn btn-
const output = execSync("rg -l 'btn btn-' src/", { encoding: "utf8" });
const files = output.trim().split(/\r?\n/).filter(Boolean);

console.log("Found " + files.length + " files with btn btn-");

let success = 0, failed = 0;
for (const file of files) {
  try {
    const rel = path.relative(process.cwd(), file);
    const result = execSync("node fix-btn5.cjs " + file, { encoding: "utf8", timeout: 10000 });
    console.log("  " + result.trim());
    success++;
  } catch (e) {
    console.error("  FAILED: " + file + ": " + e.message);
    failed++;
  }
}

console.log("\nDone: " + success + " success, " + failed + " failed");