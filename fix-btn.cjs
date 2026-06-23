const fs = require("fs");
const f = process.argv[2];
if (!f) { console.log("Usage: node fix-btn.cjs <file>"); process.exit(1); }

let content = fs.readFileSync(f, "utf8");
const original = content;

// Variant/size maps
const V_MAP = { "btn-primary": "primary", "btn-secondary": "secondary", "btn-success": "success", "btn-warning": "warning", "btn-danger": "danger", "btn-info": "info", "btn-ghost": "ghost", "btn-outline": "outline" };
const S_MAP = { "btn-sm": "sm", "btn-lg": "lg" };

// Find all <button blocks with btn btn- class
let result = [];
let i = 0;
const hasButtonImport = /import\s+\{\s*Button\s*\}/.test(content) || /import\s+Button\s+from/.test(content);

while (i < content.length) {
  const btnIdx = content.indexOf("<button", i);
  if (btnIdx === -1) { result.push(content.substring(i)); break; }
  
  // Find the end of the opening tag: look for > that is NOT inside quotes or {}
  // Strategy: find first > that is preceded by " or space (end of attribute)
  let tagEnd = -1;
  let depth = 0;
  let inQuote = false;
  let quoteChar = "";
  for (let j = btnIdx + 7; j < content.length; j++) {
    const ch = content[j];
    if (inQuote) {
      if (ch === quoteChar) inQuote = false;
      continue;
    }
    if (ch === '"' || ch === "'") { inQuote = true; quoteChar = ch; continue; }
    if (ch === "{") { depth++; continue; }
    if (ch === "}") { depth--; continue; }
    if (ch === ">" && depth === 0) { tagEnd = j; break; }
  }
  
  if (tagEnd === -1) { result.push(content.substring(i, btnIdx + 7)); i = btnIdx + 7; continue; }
  
  const openTag = content.substring(btnIdx, tagEnd + 1);
  
  if (!openTag.includes("btn btn-")) {
    result.push(content.substring(i, btnIdx + 7));
    i = btnIdx + 7;
    continue;
  }
  
  // Extract className
  const clsMatch = openTag.match(/className="([^"]*)"/);
  if (!clsMatch) { result.push(content.substring(i, btnIdx + 7)); i = btnIdx + 7; continue; }
  
  const classes = clsMatch[1].split(/\s+/).filter(Boolean);
  let variant = "", size = "";
  const rest = [];
  for (const c of classes) {
    if (V_MAP[c]) variant = V_MAP[c];
    else if (S_MAP[c]) size = S_MAP[c];
    else rest.push(c);
  }
  
  if (!variant) { result.push(content.substring(i, btnIdx + 7)); i = btnIdx + 7; continue; }
  
  // Extract other attributes (everything except className="...")
  let otherAttrs = openTag
    .replace(/<button\s*/, "")
    .replace(/className="[^"]*"/, "")
    .replace(/>$/, "")
    .trim();
  
  // Find matching </button>
  let depth2 = 1, pos = tagEnd + 1;
  while (pos < content.length && depth2 > 0) {
    const no = content.indexOf("<button", pos);
    const nc = content.indexOf("</button>", pos);
    if (nc === -1) break;
    if (no !== -1 && no < nc) { depth2++; pos = no + 7; }
    else {
      depth2--;
      if (depth2 === 0) {
        const inner = content.substring(tagEnd + 1, nc);
        const attrs = [];
        if (otherAttrs) attrs.push(otherAttrs);
        attrs.push("variant=\"" + variant + "\"");
        if (size) attrs.push("size=\"" + size + "\"");
        if (rest.length > 0) attrs.push("className=\"" + rest.join(" ") + "\"");
        result.push("<Button " + attrs.join(" ") + ">" + inner + "</Button>");
        i = nc + 9;
        break;
      }
      pos = nc + 9;
    }
  }
  if (depth2 > 0) { result.push(content.substring(i, btnIdx + 7)); i = btnIdx + 7; }
}

let newContent = result.join("");

// Add Button import if needed and content changed
if (newContent !== original && !hasButtonImport) {
  const lines = newContent.split(/\r?\n/);
  let lastImp = -1;
  for (let j = 0; j < lines.length; j++) if (/^import\s/.test(lines[j])) lastImp = j;
  if (lastImp >= 0) {
    const path = require("path");
    const dir = path.dirname(f);
    const target = path.join("src", "components", "ui", "Button");
    let rel = path.relative(dir, target).replace(/\\/g, "/");
    if (!rel.startsWith(".")) rel = "./" + rel;
    lines.splice(lastImp + 1, 0, "import { Button } from '" + rel + "'");
    newContent = lines.join(content.includes("\r\n") ? "\r\n" : "\n");
  }
}

fs.writeFileSync(f, newContent, "utf8");
console.log(f + ": " + (newContent !== original ? "OK" : "no changes"));