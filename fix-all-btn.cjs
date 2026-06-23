const fs = require('fs');
const path = require('path');

const VARIANT_MAP = {
  'btn-primary': 'primary',
  'btn-secondary': 'secondary',
  'btn-success': 'success',
  'btn-warning': 'warning',
  'btn-danger': 'danger',
  'btn-info': 'info',
  'btn-ghost': 'ghost',
  'btn-outline': 'outline',
};

const SIZE_MAP = {
  'btn-sm': 'sm',
  'btn-lg': 'lg',
};

function extractBtnClasses(className) {
  const classes = className.split(/\s+/).filter(Boolean);
  let variant = null;
  let size = null;
  const rest = [];
  for (const cls of classes) {
    if (VARIANT_MAP[cls]) variant = VARIANT_MAP[cls];
    else if (SIZE_MAP[cls]) size = SIZE_MAP[cls];
    else rest.push(cls);
  }
  return { variant, size, rest };
}

function getButtonImportPath(filePath) {
  const dir = path.dirname(filePath);
  const target = path.join('src', 'components', 'ui', 'Button');
  let rel = path.relative(dir, target).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  // Handle case where file is in same dir as ui/
  rel = rel.replace(/\/$/, '');
  return rel;
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let content = original;
  
  // Check if already has Button import
  const hasButtonImport = /import\s+\{\s*Button\s*\}/.test(content) || /import\s+Button\s+from/.test(content);
  
  // Find all <button ... className="btn btn-X ...">...</button>
  // Use a simpler approach: find opening tags, then find matching close
  const btnOpenRegex = /<button(\s[^>]*)className="([^"]*btn btn-[^"]*)"([^>]*)>/g;
  
  let match;
  const found = [];
  while ((match = btnOpenRegex.exec(content)) !== null) {
    const { variant, size, rest } = extractBtnClasses(match[2]);
    if (variant) {
      found.push({ index: match.index, full: match[0], before: match[1], after: match[3], variant, size, rest });
    }
  }
  
  if (found.length === 0) return 0;
  
  // For each found button, find matching </button>
  const replacements = [];
  for (const btn of found) {
    const openTagEnd = btn.index + btn.full.length;
    let depth = 1;
    let pos = openTagEnd;
    while (pos < content.length && depth > 0) {
      const nextOpen = content.indexOf('<button', pos);
      const nextClose = content.indexOf('</button>', pos);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 7;
      } else {
        depth--;
        if (depth === 0) {
          const inner = content.substring(openTagEnd, nextClose);
          const attrs = [];
          const trimmedBefore = btn.before.trim();
          const trimmedAfter = btn.after.trim();
          if (trimmedBefore) attrs.push(trimmedBefore);
          attrs.push(`variant="${btn.variant}"`);
          if (btn.size) attrs.push(`size="${btn.size}"`);
          if (btn.rest.length > 0) attrs.push(`className="${btn.rest.join(' ')}"`);
          if (trimmedAfter) attrs.push(trimmedAfter);
          
          replacements.push({
            start: btn.index,
            end: nextClose + 9,
            replacement: `<Button ${attrs.join(' ')}>${inner}</Button>`
          });
        }
        pos = nextClose + 9;
      }
    }
  }
  
  if (replacements.length === 0) return 0;
  
  // Apply in reverse order
  for (let i = replacements.length - 1; i >= 0; i--) {
    content = content.substring(0, replacements[i].start) + replacements[i].replacement + content.substring(replacements[i].end);
  }
  
  // Add Button import if needed
  if (!hasButtonImport) {
    const importPath = getButtonImportPath(filePath);
    // Find last import line
    const lines = content.split('\n');
    let lastImportLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s/.test(lines[i])) lastImportLine = i;
    }
    if (lastImportLine >= 0) {
      lines.splice(lastImportLine + 1, 0, `import { Button } from '${importPath}'`);
      content = lines.join('\n');
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  return replacements.length;
}

function scanDir(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(scanDir(full));
    else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) files.push(full);
  }
  return files;
}

const allFiles = scanDir('src');
let totalFixed = 0;
let totalFiles = 0;

for (const file of allFiles) {
  const count = processFile(file);
  if (count) {
    totalFiles++;
    totalFixed += count;
    const rel = path.relative(process.cwd(), file);
    console.log(`  ${rel}: ${count} btn->Button`);
  }
}

console.log(`\nDone: ${totalFiles} files, ${totalFixed} replacements`);
