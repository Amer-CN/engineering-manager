const fs = require("fs");
const f = process.argv[2];
if (!f) { console.error("Usage: <file>"); process.exit(1); }

let content = fs.readFileSync(f, "utf8");
const original = content;
const hasButtonImport = /import\s+\{\s*Button\s*\}/.test(content) || /import\s+Button\s+from/.test(content);

const V_MAP = { "btn-primary": "primary", "btn-secondary": "secondary", "btn-success": "success", "btn-warning": "warning", "btn-danger": "danger", "btn-info": "info", "btn-ghost": "ghost", "btn-outline": "outline" };
const S_MAP = { "btn-sm": "sm", "btn-lg": "lg" };

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

// Extract className value from an opening tag string
function extractClassName(tagStr) {
  // Find className= handling both quotes and template literals
  const clsIdx = tagStr.indexOf("className=");
  if (clsIdx < 0) return null;
  
  const afterEq = clsIdx + 10; // length of "className="
  if (afterEq >= tagStr.length) return null;
  
  const firstChar = tagStr[afterEq];
  
  if (firstChar === '"' || firstChar === "'") {
    // Simple string: className="..."
    const endQuote = tagStr.indexOf(firstChar, afterEq + 1);
    if (endQuote < 0) return null;
    return tagStr.substring(afterEq + 1, endQuote);
  }
  
  if (firstChar === "{") {
    // Template literal or expression: className={`...`} or className={...}
    // Find matching }
    let depth = 0, start = afterEq;
    for (let j = start; j < tagStr.length; j++) {
      if (tagStr[j] === "{") depth++;
      else if (tagStr[j] === "}") {
        depth--;
        if (depth === 0) {
          // Extract content between { and }
          const inner = tagStr.substring(start + 1, j);
          // If it starts with `, it is a template literal
          if (inner.startsWith("`") && inner.endsWith("`")) {
            return inner.slice(1, -1); // Remove backticks
          }
          return inner;
        }
      }
    }
    return null;
  }
  
  return null;
}

function parseBtnClasses(className) {
  if (!className) return null;
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

// Get all attributes except className from the opening tag
function getOtherAttrs(tagStr) {
  // Remove <button at the start
  let s = tagStr.replace(/<button\s*/, "");
  // Remove the className attribute (handle all forms)
  // Strategy: find "className=" and remove everything until the end of its value
  const clsIdx = s.indexOf("className=");
  if (clsIdx >= 0) {
    const afterEq = clsIdx + 10;
    const firstChar = s[afterEq];
    let endIdx = -1;
    if (firstChar === '"' || firstChar === "'") {
      endIdx = s.indexOf(firstChar, afterEq + 1);
      if (endIdx >= 0) endIdx += 1; // include closing quote
    } else if (firstChar === "{") {
      let depth = 0;
      for (let j = afterEq; j < s.length; j++) {
        if (s[j] === "{") depth++;
        else if (s[j] === "}") { depth--; if (depth === 0) { endIdx = j + 1; break; } }
      }
    }
    if (endIdx >= 0) {
      s = s.substring(0, clsIdx) + s.substring(endIdx);
    }
  }
  // Remove trailing >
  s = s.replace(/>$/, "");
  return s.trim();
}

let result = [];
let i = 0;

while (i < content.length) {
  const btnIdx = content.indexOf("<button", i);
  if (btnIdx === -1) { result.push(content.substring(i)); break; }
  
  const tagEnd = findTagEnd(content, btnIdx + 7);
  if (tagEnd === -1) { result.push(content.substring(i, btnIdx + 7)); i = btnIdx + 7; continue; }
  
  const openTag = content.substring(btnIdx, tagEnd + 1);
  
  // Extract and check className
  const clsValue = extractClassName(openTag);
  const btnAttrs = parseBtnClasses(clsValue);
  
  if (!btnAttrs) {
    result.push(content.substring(i, btnIdx + 7));
    i = btnIdx + 7;
    continue;
  }
  
  const closeIdx = findMatchingClose(content, tagEnd + 1);
  if (closeIdx === -1) { result.push(content.substring(i, btnIdx + 7)); i = btnIdx + 7; continue; }
  
  const inner = content.substring(tagEnd + 1, closeIdx);
  const otherAttrs = getOtherAttrs(openTag);
  
  const attrs = [];
  if (otherAttrs) attrs.push(otherAttrs);
  attrs.push(btnAttrs);
  
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
    const nl = content.includes("\r\n") ? "\r\n" : "\n";
    newContent = lines.join(nl);
  }
}

fs.writeFileSync(f, newContent, "utf8");
console.log(f + ": " + (newContent !== original ? "OK" : "no changes"));