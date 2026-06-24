const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

// Find all .tsx files and check for btn btn-
function findFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(findFiles(full));
    else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")) {
      const content = fs.readFileSync(full, "utf8");
      if (/btn btn-/.test(content)) results.push(full);
    }
  }
  return results;
}

const files = findFiles("src");
console.log("Found " + files.length + " files with btn btn-");

let success = 0, failed = 0;
for (const file of files) {
  try {
    const result = execFileSync("node", ["fix-btn5.cjs", file], { encoding: "utf8", timeout: 15000 });
    console.log("  " + result.trim());
    success++;
  } catch (e) {
    console.error("  FAILED: " + path.relative(process.cwd(), file) + ": " + e.stderr);
    failed++;
  }
}

console.log("\nDone: " + success + " success, " + failed + " failed");