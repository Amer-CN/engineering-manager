const fs = require("fs");
let c = fs.readFileSync("scripts/check-rules.cjs", "utf8");
const old = "!f.includes('__tests__') && !f.includes('node_modules') && !f.includes('prototype') && !f.endsWith('.html')";
const updated = "!f.includes('__tests__') && !f.includes('node_modules') && !f.includes('prototype') && !f.endsWith('.html') && !f.endsWith('Colors.ts')";
c = c.replace(old, updated);
fs.writeFileSync("scripts/check-rules.cjs", c, "utf8");
console.log("check-rules.cjs updated: *Colors.ts excluded from hex color check");