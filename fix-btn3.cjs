const fs = require("fs");
const f = process.argv[2];
if (!f) { console.error("Usage: <file>"); process.exit(1); }

let content = fs.readFileSync(f, "utf8");
const original = content;
const hasButtonImport = /import\s+\{\s*Button\s*\}/.test(content) || /import\s+Button\s+from/.test(content);

const V_MAP = { "btn-primary": "primary", "btn-secondary": "secondary", "btn-success": "success", "btn-warning": "warning", "btn-danger": "danger", "btn-info": "info", "btn-ghost": "ghost", "btn-outline": "outline" };
const S_MAP = { "btn-sm": "sm", "btn-lg": "lg" };

// Strategy: find className="btn btn-X btn-Y" and replace with variant="X" size="Y"
// Then change <button to <Button and </button> to </Button> ONLY for those buttons

// Step 1: Find all className="btn btn-..." occurrences and their positions
const clsRegex = /className="([^"]*btn btn-[^"]*)"/g;
let clsMatch;
const clsReplacements = [];
while ((clsMatch = clsRegex.exec(content)) !== null) {
  const classes = clsMatch[1].split(/\s+/).filter(Boolean);
  let variant = "", size = "";
  const rest = [];
  for (const c of classes) {
    if (V_MAP[c]) variant = V_MAP[c];
    else if (S_MAP[c]) size = S_MAP[c];
    else rest.push(c);
  }
  if (variant) {
    let replacement = "variant=\"" + variant + "\"";
    if (size) replacement += " size=\"" + size + "\"";
    if (rest.length > 0) replacement += " className=\"" + rest.join(" ") + "\"";
    clsReplacements.push({ idx: clsMatch.index, len: clsMatch[0].length, replacement });
  }
}

if (clsReplacements.length === 0) { console.log(f + ": no btn classes"); process.exit(0); }

// Apply className replacements in reverse
for (let i = clsReplacements.length - 1; i >= 0; i--) {
  const r = clsReplacements[i];
  content = content.substring(0, r.idx) + r.replacement + content.substring(r.idx + r.len);
}

// Step 2: Change <button to <Button and </button> to </Button> 
// ONLY for buttons that had btn btn- class
// We need to find the <button that contains the btn class in its opening tag
// Since we already replaced classNames, now we look for <button with variant=
// Actually simpler: just change ALL <button> to <Button> in this file since we're converting them all

// But we need to be careful - some <button> might not be btn- buttons (e.g., tab buttons)
// Let's find <button blocks that have variant= (meaning they were converted)
// Actually, let's just do it: for every <button that originally had btn btn-, we need to change it

// Better approach: find <button ...> where the tag contains variant=" (our replacement)
// Find all <button that have variant= in their opening tag
const btnOpenRegex = /<button(\s[\s\S]*?)variant="[^"]*"([\s\S]*?)>/g;
let newContent = "";
let lastIdx = 0;
let m;

// First collect all positions where <button should become <Button
const buttonPositions = []; // positions of <button that have variant=
const btnSimpleRegex = /<button/g;
let m2;
while ((m2 = btnSimpleRegex.exec(content)) !== null) {
  // Check if this <button has variant= in its tag
  const tagEnd = content.indexOf(">", m2.index);
  if (tagEnd === -1) continue;
  const tag = content.substring(m2.index, tagEnd + 1);
  if (tag.includes("variant=")) {
    buttonPositions.push(m2.index);
  }
}

// Also find </button> that correspond to these
// Simple approach: replace <button with <Button for those positions, and matching </button> with </Button>
// Since we already know which <button> have variant=, let's process the content

// Replace <button -> <Button for those positions (in reverse)
for (let i = buttonPositions.length - 1; i >= 0; i--) {
  content = content.substring(0, buttonPositions[i]) + "<Button" + content.substring(buttonPositions[i] + 7);
}

// Now find and replace </button> that match these <Button> blocks
// For each <Button (previously <button with variant=), find its matching </button>
for (let i = 0; i < buttonPositions.length; i++) {
  const start = buttonPositions[i];
  let depth = 1, pos = content.indexOf(">", start) + 1;
  while (pos < content.length && depth > 0) {
    const no = content.indexOf("<button", pos);
    const nc = content.indexOf("</button>", pos);
    if (nc === -1) break;
    if (no !== -1 && no < nc) { depth++; pos = no + 7; }
    else {
      depth--;
      if (depth === 0) {
        content = content.substring(0, nc) + "</Button>" + content.substring(nc + 9);
        break;
      }
      pos = nc + 9;
    }
  }
}

// Add Button import
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
console.log(f + ": " + (content !== original ? "OK" : "no changes"));