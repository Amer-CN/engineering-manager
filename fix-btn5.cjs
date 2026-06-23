const fs = require("fs");
const f = process.argv[2];
if (!f) { console.error("Usage: <file>"); process.exit(1); }

let content = fs.readFileSync(f, "utf8");
const original = content;
const hasButtonImport = /import\s+\{\s*Button\s*\}/.test(content) || /import\s+Button\s+from/.test(content);

const V_MAP = { "btn-primary": "primary", "btn-secondary": "secondary", "btn-success": "success", "btn-warning": "warning", "btn-danger": "danger", "btn-info": "info", "btn-ghost": "ghost", "btn-outline": "outline" };
const S_MAP = { "btn-sm": "sm", "btn-lg": "lg" };

function parseTagAttrs(tagStr) {
  // Parse attributes from an opening tag string like: <button\n  onClick={...}\n  className="..."
  // Returns { attrs: [{name, value}], hasBtnClass: bool, variant: str, size: str, restClassName: str }
  const attrs = [];
  // Simple regex for attr="value" or attr={value}
  const attrRegex = /(\w[\w-]*)=("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|{(?:[^{}]|\{[^{}]*\})*})/g;
  let m;
  let variant = "", size = "", restClassName = "";
  let classNameValue = null;
  
  while ((m = attrRegex.exec(tagStr)) !== null) {
    const name = m[1];
    const value = m[2];
    attrs.push({ name, value });
    
    if (name === "className") {
      classNameValue = value;
    }
  }
  
  // Analyze className for btn btn- classes
  if (classNameValue) {
    // Extract string content from className="..." or className={`...`}
    let clsStr = classNameValue;
    if (clsStr.startsWith("`") || clsStr.startsWith("'") || clsStr.startsWith('"')) {
      clsStr = clsStr.slice(1, -1);
    }
    // For template literals like: `${cond ? "btn btn-primary" : "btn btn-secondary"} ...`
    // Extract all btn- classes
    const btnClasses = clsStr.match(/btn-[a-z_]+/g) || [];
    const otherClasses = clsStr.replace(/btn-[a-z_]+/g, "").trim().split(/\s+/).filter(Boolean);
    
    for (const bc of btnClasses) {
      if (V_MAP[bc]) variant = V_MAP[bc];
      else if (S_MAP[bc]) size = S_MAP[bc];
    }
    restClassName = otherClasses.join(" ");
  }
  
  return { attrs, variant, size, restClassName, hasBtn: variant !== "" };
}

function findButtonBlocks(content) {
  // Find all <button ...>...</button> blocks
  const blocks = [];
  let pos = 0;
  
  while (pos < content.length) {
    const openIdx = content.indexOf("<button", pos);
    if (openIdx === -1) break;
    
    // Find the end of the opening tag
    let tagEnd = -1, braceDepth = 0, inQuote = false, qChar = "";
    for (let j = openIdx + 7; j < content.length; j++) {
      const ch = content[j];
      if (inQuote) { if (ch === qChar || (ch === "\\" && j + 1 < content.length)) { if (ch === "\\") j++; continue; } inQuote = false; continue; }
      if (ch === '"' || ch === "'") { inQuote = true; qChar = ch; continue; }
      if (ch === "{") { braceDepth++; continue; }
      if (ch === "}") { if (braceDepth > 0) braceDepth--; continue; }
      if (ch === ">" && braceDepth === 0) { tagEnd = j; break; }
    }
    
    if (tagEnd === -1) { pos = openIdx + 7; continue; }
    
    // Find matching </button>
    let depth = 1, searchPos = tagEnd + 1;
    let closeIdx = -1;
    while (searchPos < content.length && depth > 0) {
      const no = content.indexOf("<button", searchPos);
      const nc = content.indexOf("</button>", searchPos);
      if (nc === -1) break;
      if (no !== -1 && no < nc) { depth++; searchPos = no + 7; }
      else { depth--; if (depth === 0) closeIdx = nc; searchPos = nc + 9; }
    }
    
    if (closeIdx === -1) { pos = openIdx + 7; continue; }
    
    const openTag = content.substring(openIdx, tagEnd + 1);
    const inner = content.substring(tagEnd + 1, closeIdx);
    
    blocks.push({
      openIdx,
      openTag,
      inner,
      closeIdx,
      fullEnd: closeIdx + 9
    });
    
    pos = closeIdx + 9;
  }
  
  return blocks;
}

const blocks = findButtonBlocks(content);
let modified = false;

// Process blocks in reverse order
for (let bi = blocks.length - 1; bi >= 0; bi--) {
  const block = blocks[bi];
  const parsed = parseTagAttrs(block.openTag);
  
  if (!parsed.hasBtn) continue;
  
  // Build new attributes
  const newAttrs = [];
  for (const attr of parsed.attrs) {
    if (attr.name === "className") continue; // Will be replaced
    newAttrs.push(attr.name + "=" + attr.value);
  }
  newAttrs.push("variant=\"" + parsed.variant + "\"");
  if (parsed.size) newAttrs.push("size=\"" + parsed.size + "\"");
  if (parsed.restClassName) newAttrs.push("className=\"" + parsed.restClassName + "\"");
  
  const replacement = "<Button " + newAttrs.join(" ") + ">" + block.inner + "</Button>";
  content = content.substring(0, block.openIdx) + replacement + content.substring(block.fullEnd);
  modified = true;
}

// Add Button import
if (modified && !hasButtonImport) {
  const lines = content.split(/\r?\n/);
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
    content = lines.join(nl);
  }
}

fs.writeFileSync(f, content, "utf8");
console.log(f + ": " + (modified ? "OK (" + blocks.filter(b => parseTagAttrs(b.openTag).hasBtn).length + " buttons)" : "no changes"));