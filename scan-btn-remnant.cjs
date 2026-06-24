const fs = require("fs");
const path = require("path");
function walk(d) {
  let r = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) r = r.concat(walk(f));
    else if (e.name.endsWith(".tsx") && !e.name.endsWith(".test.tsx")) r.push(f);
  }
  return r;
}

const files = walk("src");
const results = [];
for (const f of files) {
  const c = fs.readFileSync(f, "utf8");
  const lines = c.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/className="btn"/.test(lines[i])) {
      results.push(path.relative(process.cwd(), f) + ":" + (i+1) + ": " + lines[i].trim().substring(0, 120));
    }
  }
}

console.log("Total: " + results.length);
results.forEach(r => console.log("  " + r));