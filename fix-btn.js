const fs = require("fs");
const f = process.argv[2];
if (!f) { console.log("Usage: node fix-btn.js <file>"); process.exit(1); }

let content = fs.readFileSync(f, "utf8");
const original = content;

// Step 1: Find all <button ...> blocks that contain btn btn- and replace them
// Use a state-machine approach
let result = [];
let i = 0;

while (i < content.length) {
  const btnIdx = content.indexOf("<button", i);
  if (btnIdx === -1) { result.push(content.substring(i)); break; }
  
  const closeIdx = content.indexOf(">", btnIdx);
  if (closeIdx === -1) { result.push(content.substring(i)); break; }
  
  const openTag = content.substring(btnIdx, closeIdx + 1);
  
  if (!openTag.includes("btn btn-")) {
    // Skip this <button
    result.push(content.substring(i, btnIdx + 7));
    i = btnIdx + 7;
    continue;
  }
  
  // Extract variant/size from className
  const clsMatch = openTag.match(/className="([^"]*)"/);
  let variant = "", size = "", restClasses = "";
  if (clsMatch) {
    const classes = clsMatch[1].split(/\s+/).filter(Boolean);
    const vMap = { "btn-primary": "primary", "btn-secondary": "secondary", "btn-success": "success", "btn-warning": "warning", "btn-danger": "danger", "btn-info": "info", "btn-ghost": "ghost", "btn-outline": "outline" };
    const sMap = { "btn-sm": "sm", "btn-lg": "lg" };
    const rest = [];
    for (const c of classes) {
      if (vMap[c]) variant = vMap[c];
      else if (sMap[c]) size = sMap[c];
      else rest.push(c);
    }
    restClasses = rest.length > 0 ? rest.join(" ") : "";
  }
  
  if (!variant) {
    result.push(content.substring(i, btnIdx + 7));
    i = btnIdx + 7;
    continue;
  }
  
  // Extract other attrs (before className and after className)
  const clsPos = openTag.indexOf("className=");
  const beforeCls = openTag.substring(7, clsPos >= 0 ? clsPos : openTag.length - 1).trim();
  let afterCls = "";
  if (clsPos >= 0) {
    const quoteStart = openTag.indexOf('"', clsPos);
    const quoteEnd = openTag.indexOf('"', quoteStart + 1);
    afterCls = openTag.substring(quoteEnd + 1).replace(/>$/, "").trim();
  }
  
  // Find matching </button>
  let depth = 1, pos = closeIdx + 1;
  while (pos < content.length && depth > 0) {
    const no = content.indexOf("<button", pos);
    const nc = content.indexOf("</button>", pos);
    if (nc === -1) break;
    if (no !== -1 && no < nc) { depth++; pos = no + 7; }
    else {
      depth--;
      if (depth === 0) {
        const inner = content.substring(closeIdx + 1, nc);
        const attrs = [];
        if (beforeCls) attrs.push(beforeCls);
        attrs.push("variant=\"" + variant + "\"");
        if (size) attrs.push("size=\"" + size + "\"");
        if (restClasses) attrs.push("className=\"" + restClasses + "\"");
        if (afterCls) attrs.push(afterCls);
        result.push("<Button " + attrs.join(" ") + ">" + inner + "</Button>");
        i = nc + 9;
        break;
      }
      pos = nc + 9;
    }
  }
  if (depth > 0) { result.push(content.substring(i, btnIdx + 7)); i = btnIdx + 7; }
}

const newContent = result.join("");

// Add Button import if changed
let finalContent = newContent;
if (finalContent !== original) {
  const hasImport = /import\s+\{\s*Button\s*\}/.test(finalContent) || /import\s+Button\s+from/.test(finalContent);
  if (!hasImport) {
    const lines = finalContent.split("\n");
    let lastImp = -1;
    for (let j = 0; j < lines.length; j++) if (/^import\s/.test(lines[j])) lastImp = j;
    if (lastImp >= 0) {
      const path = require("path");
      const dir = path.dirname(f);
      const target = path.join("src", "components", "ui", "Button");
      let rel = path.relative(dir, target).replace(/\\/g, "/");
      if (!rel.startsWith(".")) rel = "./" + rel;
      lines.splice(lastImp + 1, 0, "import { Button } from '" + rel + "'");
      finalContent = lines.join("\n");
    }
  }
}

fs.writeFileSync(f, finalContent, "utf8");
console.log(f + ": " + (finalContent !== original ? "OK" : "no changes"));