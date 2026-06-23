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

function extractBtnClasses(classStr) {
  const classes = classStr.split(/\s+/).filter(Boolean);
  let variant = null;
  let size = null;
  const rest = [];
  for (const cls of classes) {
    // Handle template literal case: `${isSparse ? 'btn btn-primary' : 'btn btn-secondary'}`
    // Extract individual btn classes
    const parts = cls.match(/btn-[a-z_]+/g);
    if (parts) {
      for (const p of parts) {
        if (VARIANT_MAP[p]) variant = VARIANT_MAP[p];
        else if (SIZE_MAP[p]) size = SIZE_MAP[p];
      }
    }
    if (!parts && !cls.startsWith('btn-')) rest.push(cls);
  }
  return { variant, size, rest };
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let content = original;
  
  const hasButtonImport = /import\s+\{\s*Button\s*\}/.test(content) || /import\s+Button\s+from/.test(content);
  
  // Strategy: find all className="...btn btn-X..." patterns, possibly spanning multiple lines
  // First, normalize: find <button followed by className="btn btn-..."> with possible newlines
  // Use a regex that matches across lines for the opening tag
  const btnTagRegex = /<button\b([\s\S]*?)className="([^"]*btn btn-[^"]*)"([\s\S]*?)>/g;
  
  let match;
  const replacements = [];
  
  while ((match = btnTagRegex.exec(content)) !== null) {
    const [fullMatch, before, className, after] = match;
    const { variant, size, rest } = extractBtnClasses(className);
    
    if (!variant) continue;
    
    // Find matching </button>
    const openEnd = match.index + fullMatch.length;
    let depth = 1;
    let pos = openEnd;
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
          const inner = content.substring(openEnd, nextClose);
          
          // Build attributes from before/after
          const allAttrs = (before + ' ' + after).trim();
          const parts = allAttrs.split(/\s+/).filter(Boolean);
          
          // Build replacement
          const attrs = [];
          for (const p of parts) {
            if (p.startsWith('variant=') || p.startsWith('size=') || p.startsWith('className=')) continue;
            attrs.push(p);
          }
          attrs.push(`variant="${variant}"`);
          if (size) attrs.push(`size="${size}"`);
          if (rest.length > 0) attrs.push(`className="${rest.join(' ')}"`);
          
          replacements.push({
            start: match.index,
            end: nextClose + 9,
            replacement: `<Button ${attrs.join(' ')}>${inner}</Button>`
          });
        }
        pos = nextClose + 9;
      }
    }
  }
  
  if (replacements.length === 0) return 0;
  
  // Apply in reverse
  for (let i = replacements.length - 1; i >= 0; i--) {
    content = content.substring(0, replacements[i].start) + replacements[i].replacement + content.substring(replacements[i].end);
  }
  
  // Add import
  if (!hasButtonImport) {
    const lines = content.split('\n');
    let lastImportLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s/.test(lines[i])) lastImportLine = i;
    }
    if (lastImportLine >= 0) {
      const dir = path.dirname(filePath);
      const target = path.join('src', 'components', 'ui', 'Button');
      let rel = path.relative(dir, target).replace(/\\/g, '/');
      if (!rel.startsWith('.')) rel = './' + rel;
      lines.splice(lastImportLine + 1, 0, `import { Button } from '${rel}'`);
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
    console.log(`  ${rel}: ${count}`);
  }
}

console.log(`\nDone: ${totalFiles} files, ${totalFixed} replacements`);
