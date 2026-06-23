const fs = require("fs");
const f = process.argv[2];
if (!f) { console.error("Usage: <file>"); process.exit(1); }

let content = fs.readFileSync(f, "utf8");
const original = content;
const hasButtonImport = /import\s+\{\s*Button\s*\}/.test(content) || /import\s+Button\s+from/.test(content);

const V_MAP = { "btn-primary": "primary", "btn-secondary": "secondary", "btn-success": "success", "btn-warning": "warning", "btn-danger": "danger", "btn-info": "info", "btn-ghost": "ghost", "btn-outline": "outline" };
const S_MAP = { "btn-sm": "sm", "btn-lg": "lg" };

// Step 1: Find all <button ...> blocks and check for btn btn-
// Use a simple approach: find <button, then find the matching > (handling nested braces/quotes)
// Then find the matching </button>

function findButtonBlocks(content) {
  const blocks = [];
  let searchFrom = 0;
  
  while (true) {
    const openIdx = content.indexOf("<button", searchFrom);
    if (openIdx === -1) break;
    
    // Find the > that closes the opening tag
    let tagEnd = -1, depth = 0, inQuote = false, qChar = "";
    for (let j = openIdx + 7; j < content.length; j++) {
      const ch = content[j];
      if (inQuote) {
        if (ch === "\\" && j + 1 < content.length) { j++; continue; }
        if (ch === qChar) inQuote = false;
        continue;
      }
      if (ch === '"' || ch === "'") { inQuote = true; qChar = ch; continue; }
      if (ch === "{") { depth++; continue; }
      if (ch === "}") { if (depth > 0) depth--; continue; }
      if (ch === ">" && depth === 0) { tagEnd = j; break; }
    }
    
    if (tagEnd === -1) { searchFrom = openIdx + 7; continue; }
    
    const openTag = content.substring(openIdx, tagEnd + 1);
    
    // Check if this button has btn btn- in className
    // Only match className="..." (not template literals)
    const clsMatch = openTag.match(/className="([^"]*)"/);
    if (!clsMatch || !clsMatch[1].includes("btn btn-")) {
      searchFrom = openIdx + 7;
      continue;
    }
    
    // Find matching </button>
    let d = 1, p = tagEnd + 1;
    let closeIdx = -1;
    while (p < content.length && d > 0) {
      const no = content.indexOf("<button", p);
      const nc = content.indexOf("</button>", p);
      if (nc === -1) break;
      if (no !== -1 && no < nc) { d++; p = no + 7; }
      else { d--; if (d === 0) closeIdx = nc; p = nc + 9; }
    }
    
    if (closeIdx === -1) { searchFrom = openIdx + 7; continue; }
    
    blocks.push({ openIdx, tagEnd, closeIdx, openTag, inner: content.substring(tagEnd + 1, closeIdx) });
    searchFrom = closeIdx + 9;
  }
  
  return blocks;
}

const blocks = findButtonBlocks(content);

if (blocks.length === 0) {
  console.log(f + ": no changes");
  process.exit(0);
}

// Step 2: Replace each block (in reverse order to preserve indices)
for (let bi = blocks.length - 1; bi >= 0; bi--) {
  const block = blocks[bi];
  const openTag = block.openTag;
  
  // Parse className
  const clsMatch = openTag.match(/className="([^"]*)"/);
  const classes = clsMatch[1].split(/\s+/).filter(Boolean);
  let variant = "", size = "";
  const restClasses = [];
  for (const c of classes) {
    if (V_MAP[c]) variant = V_MAP[c];
    else if (S_MAP[c]) size = S_MAP[c];
    else restClasses.push(c);
  }
  
  if (!variant) continue;
  
  // Build new attributes: keep everything except className, add variant/size
  let newOpenTag = openTag;
  // Remove className="..."
  newOpenTag = newOpenTag.replace(/className="[^"]*"/, "");
  // Add variant and size before the closing >
  let attrs = " variant=\"" + variant + "\"";
  if (size) attrs += " size=\"" + size + "\"";
  if (restClasses.length > 0) attrs += " className=\"" + restClasses.join(" ") + "\"";
  // Insert before the closing >
  newOpenTag = newOpenTag.slice(0, -1) + attrs + ">";
  // Change <button to <Button
  newOpenTag = newOpenTag.replace("<button", "<Button");
  
  const replacement = newOpenTag + block.inner + "</Button>";
  content = content.substring(0, block.openIdx) + replacement + content.substring(block.closeIdx + 9);
}

// Step 3: Add Button import if needed
if (content !== original && !hasButtonImport) {
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
    const nl = original.includes("\r\n") ? "\r\n" : "\n";
    content = lines.join(nl);
  }
}

fs.writeFileSync(f, content, "utf8");
console.log(f + ": OK (" + blocks.length + " buttons)");