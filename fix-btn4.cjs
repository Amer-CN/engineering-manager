const fs = require("fs");
const f = process.argv[2];
if (!f) { console.error("Usage: <file>"); process.exit(1); }

let content = fs.readFileSync(f, "utf8");
const original = content;
const hasButtonImport = /import\s+\{\s*Button\s*\}/.test(content) || /import\s+Button\s+from/.test(content);

const V_MAP = { "btn-primary": "primary", "btn-secondary": "secondary", "btn-success": "success", "btn-warning": "warning", "btn-danger": "danger", "btn-info": "info", "btn-ghost": "ghost", "btn-outline": "outline" };
const S_MAP = { "btn-sm": "sm", "btn-lg": "lg" };

// Find <button ...>...</button> blocks that contain btn btn- in className
// Use regex that spans lines: <button[\s\S]*?className="[^"]*btn btn-[^"]*"[\s\S]*?>
// But this is greedy, so we need to be careful

// Better: find each <button, then manually find tag end, check for btn btn-, find matching close
function findTagEnd(content, start) {
  let depth = 0, inQuote = false, qChar = "";
  for (let j = start; j < content.length; j++) {
    const ch = content[j];
    if (inQuote) { if (ch === qChar) inQuote = false; continue; }
    if (ch === '"' || ch === "'") { inQuote = true; qChar = ch; continue; }
    if (ch === "{") { depth++; continue; }
    if (ch === "}") { if (depth > 0) depth--; continue; }
    if (ch === ">" && depth === 0) return j;
  }
  return -1;
}

function findMatchingClose(content, afterOpen) {
  let depth = 1, pos = afterOpen;
  while (pos < content.length && depth > 0) {
    const no = content.indexOf("<button", pos);
    const nc = content.indexOf("</button>", pos);
    if (nc === -1) return -1;
    if (no !== -1 && no < nc) { depth++; pos = no + 7; }
    else { depth--; if (depth === 0) return nc; pos = nc + 9; }
  }
  return -1;
}

function replaceBtnClasses(className) {
  const classes = className.split(/\s+/).filter(Boolean);
  let variant = "", size = "";
  const rest = [];
  for (const c of classes) {
    if (V_MAP[c]) variant = V_MAP[c];
    else if (S_MAP[c]) size = S_MAP[c];
    else rest.push(c);
  }
  if (!variant) return null;
  let r = "variant=\"" + variant + "\"";
  if (size) r += " size=\"" + size + "\"";
  if (rest.length > 0) r += " className=\"" + rest.join(" ") + "\"";
  return r;
}

let result = [];
let i = 0;

while (i < content.length) {
  const btnIdx = content.indexOf("<button", i);
  if (btnIdx === -1) { result.push(content.substring(i)); break; }
  
  const tagEnd = findTagEnd(content, btnIdx + 7);
  if (tagEnd === -1) { result.push(content.substring(i, btnIdx + 7)); i = btnIdx + 7; continue; }
  
  const openTag = content.substring(btnIdx, tagEnd + 1);
  
  // Check if this button has btn btn- class
  const clsMatch = openTag.match(/className="([^"]*)"/);
  const hasBtnClass = clsMatch && clsMatch[1].match(/btn btn-/);
  
  if (!hasBtnClass) {
    result.push(content.substring(i, btnIdx + 7));
    i = btnIdx + 7;
    continue;
  }
  
  // Replace className with variant/size
  const newAttrs = replaceBtnClasses(clsMatch[1]);
  if (!newAttrs) { result.push(content.substring(i, btnIdx + 7)); i = btnIdx + 7; continue; }
  
  // Get other attributes
  let otherAttrs = openTag
    .replace(/<button/, "")
    .replace(/className="[^"]*"/, "")
    .replace(/>$/, "")
    .trim();
  
  // Find matching close
  const closeIdx = findMatchingClose(content, tagEnd + 1);
  if (closeIdx === -1) { result.push(content.substring(i, btnIdx + 7)); i = btnIdx + 7; continue; }
  
  const inner = content.substring(tagEnd + 1, closeIdx);
  
  // Build replacement
  const attrs = [];
  if (otherAttrs) attrs.push(otherAttrs);
  attrs.push(newAttrs);
  
  result.push("<Button " + attrs.join(" ") + ">" + inner + "</Button>");
  i = closeIdx + 9;
}

let newContent = result.join("");

// Add Button import
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
    const nl = original.includes("\r\n") ? "\r\n" : "\n";
    newContent = lines.join(nl);
  }
}

fs.writeFileSync(f, newContent, "utf8");
console.log(f + ": " + (newContent !== original ? "OK" : "no changes"));