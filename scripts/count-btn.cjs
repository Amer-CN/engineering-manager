const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'components');

function* walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== '__tests__' && e.name !== 'node_modules') {
      yield* walkDir(full);
    } else if (e.isFile() && e.name.endsWith('.tsx')) {
      yield full;
    }
  }
}

let totalMatches = 0;
let totalFiles = 0;

// Check subdirs
for (const entry of fs.readdirSync(SRC, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name !== '__tests__') {
    for (const fp of walkDir(path.join(SRC, entry.name))) {
      if (fp.includes(path.join('ui', 'Button', 'Button'))) continue;
      const content = fs.readFileSync(fp, 'utf8');
      
      // Only test regex 1: <button ... className="...btn..."
      const r1 = /<button\b([^>]*?\bclassName="([^"]*\bbtn\b[^"]*)")/g;
      const m1 = [...content.matchAll(r1)];
      
      // Regex 2: <button ... className={`...btn...`}
      const r2 = /<button\b([^>]*?\bclassName=\{`([^`]*\bbtn\b[^`]*)`\})/g;
      const m2 = [...content.matchAll(r2)];
      
      const total = m1.length + m2.length;
      if (total > 0) {
        totalFiles++;
        totalMatches += total;
        console.log(`${path.relative(ROOT, fp)}: ${total} (str:${m1.length} tpl:${m2.length})`);
      }
    }
  }
}

// Also root level files
for (const entry of fs.readdirSync(SRC, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.tsx')) {
    const fp = path.join(SRC, entry.name);
    if (fp.includes(path.join('ui', 'Button', 'Button'))) continue;
    const content = fs.readFileSync(fp, 'utf8');
    const r1 = /<button\b([^>]*?\bclassName="([^"]*\bbtn\b[^"]*)")/g;
    const r2 = /<button\b([^>]*?\bclassName=\{`([^`]*\bbtn\b[^`]*)`\})/g;
    const total = [...content.matchAll(r1)].length + [...content.matchAll(r2)].length;
    if (total > 0) {
      totalFiles++;
      totalMatches += total;
      console.log(`${path.relative(ROOT, fp)}: ${total}`);
    }
  }
}

console.log(`\nTotal: ${totalFiles} files, ${totalMatches} matches`);