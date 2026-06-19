/**
 * replace-page-container-simple.cjs
 * 将包含 max-w-[1400px] + mx-auto 的 <div> 替换为 <PageContainer>
 * 
 * 用法: node scripts/replace-page-container-simple.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'components');
const isDryRun = process.argv.includes('--dry-run');

// 需要排除的复杂文件（有 motion.div 或特殊布局类）
const COMPLEX_FILES = [
  'ContractDashboard.tsx',
  'ContractPage.tsx',
  'Invoices.tsx',
  'Settings.tsx',
  'SettlementProjectDetail.tsx',
];

function collectFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!e.name.startsWith('__') && e.name !== 'node_modules' && e.name !== 'ui') {
        results.push(...collectFiles(full));
      }
    } else if (e.name.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

function processFile(filePath) {
  const basename = path.basename(filePath);
  if (COMPLEX_FILES.includes(basename)) return 0;
  if (basename === 'PageContainer.tsx') return 0;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let fileChanged = false;

  // 匹配 <div ... className="...max-w-[1400px]...mx-auto..." ...>
  // 要求同时包含 max-w-[1400px] 和 mx-auto
  content = content.replace(/<div\b((?:[^>]|"[^"]*")*?)className="([^"]*max-w-\[1400px\][^"]*mx-auto[^"]*)"((?:[^>]|"[^"]*")*)>/g, (match, before, classStr, after) => {
    fileChanged = true;
    
    // 提取非标准类
    const classes = classStr.split(/\s+/).filter(Boolean);
    const toRemove = ['p-6', 'max-w-[1400px]', 'mx-auto'];
    const extraClasses = classes.filter(c => !toRemove.includes(c));
    
    const extraStr = extraClasses.length > 0 ? ` className="${extraClasses.join(' ')}"` : '';
    const attrs = (before + ' ' + after).trim();
    
    return `<PageContainer ${attrs}${extraStr}>`;
  });

  // 替换对应的 </div> → </PageContainer>
  if (fileChanged) {
    const openCount = (content.match(/<PageContainer\b/g) || []).length;
    let closed = 0;
    let pos = 0;
    while (closed < openCount && pos < content.length) {
      const idx = content.indexOf('</div>', pos);
      if (idx === -1) break;
      content = content.slice(0, idx) + '</PageContainer>' + content.slice(idx + '</div>'.length);
      closed++;
      pos = idx + '</PageContainer>'.length;
    }
  }

  // 添加 import
  if (fileChanged && !hasImport(content)) {
    const importRegex = /^import\s+.+from\s+['"][^'"]+['"]\s*;?\s*$/gm;
    const allImports = [...content.matchAll(importRegex)];
    if (allImports.length > 0) {
      const last = allImports[allImports.length - 1];
      const insertAt = last.index + last[0].length;
      const rel = getRelativeImport(filePath);
      content = content.slice(0, insertAt) + `\nimport PageContainer from '${rel}'` + content.slice(insertAt);
    }
  }

  if (content !== original) {
    if (!isDryRun) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    return 1;
  }
  return 0;
}

function hasImport(content) {
  return content.includes("from './ui/PageContainer'") ||
         content.includes('from "@/components/ui/PageContainer"') ||
         content.includes("from '../../ui/PageContainer'") ||
         content.includes("from '../../../ui/PageContainer'");
}

function getRelativeImport(fromFile) {
  const fromDir = path.dirname(fromFile);
  const target = path.join(ROOT, 'src', 'components', 'ui', 'PageContainer');
  let rel = path.relative(fromDir, target).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

// === MAIN ===
const files = collectFiles(SRC);
console.log(`Processing ${files.length} files...`);
if (isDryRun) console.log('(DRY RUN)\n');

let count = 0;
for (const f of files) {
  const c = processFile(f);
  if (c > 0) {
    count++;
    console.log(`  ${isDryRun ? '~' : '✓'} ${path.relative(ROOT, f)}`);
  }
}

console.log(`\nDone: ${count} files.`);