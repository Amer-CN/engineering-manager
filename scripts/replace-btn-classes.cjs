/**
 * replace-btn-classes.cjs
 * 将 CSS btn 类替换为 Button 组件
 * 
 * 用法: node scripts/replace-btn-classes.cjs
 * 先备份: node scripts/replace-btn-classes.cjs --backup
 * 预览: node scripts/replace-btn-classes.cjs --dry-run
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'components');
const BACKUP_DIR = path.join(__dirname, '..', '.btn-backup');

const VARIANT_MAP = {
  'btn-primary': 'primary',
  'btn-secondary': 'secondary',
  'btn-danger': 'danger',
  'btn-ghost': 'ghost',
  'btn-warning': 'warning',
  'btn-success': 'success',
};

const isDryRun = process.argv.includes('--dry-run');
const shouldBackup = process.argv.includes('--backup');

// 收集所有 tsx 文件
function collectFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!e.name.startsWith('__') && e.name !== 'node_modules' && e.name !== 'Button') {
        results.push(...collectFiles(full));
      }
    } else if (e.name.endsWith('.tsx') && e.name !== 'Button.tsx') {
      results.push(full);
    }
  }
  return results;
}

function hasBtnClass(text) {
  // 检测 className 中包含 btn 的 <button 或 <a 标签
  return /<[ab].*?className="[^"]*\bbtn\b[^"]*"/.test(text);
}

function parseBtnClasses(classStr) {
  const classes = classStr.split(/\s+/).filter(Boolean);
  let variant = null;
  let size = null;
  const extra = [];
  for (const cls of classes) {
    const v = VARIANT_MAP[cls];
    if (v) { variant = v; continue; }
    if (cls === 'btn-sm') { size = 'sm'; continue; }
    if (cls === 'btn-lg') { size = 'lg'; continue; }
    if (cls === 'btn' || cls === 'btn-disabled') continue;
    if (cls.startsWith('disabled:') || cls === 'opacity-50' || cls === 'cursor-not-allowed') continue;
    extra.push(cls);
  }
  return { variant, size, extra };
}

function getRelativeImport(fromFile) {
  const fromDir = path.dirname(fromFile);
  const btnPath = path.join(ROOT, 'src', 'components', 'ui', 'Button', 'Button');
  let rel = path.relative(fromDir, btnPath).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // 只处理 className="..." 固定字符串（不处理模板字面量）
  const btnPattern = /<button\b([^>]*?)className="([^"]*)"([^>]*)>/g;
  const matches = [];
  let m;
  while ((m = btnPattern.exec(content)) !== null) {
    const classStr = m[2];
    if (!/\bbtn\b/.test(classStr)) continue;
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      fullMatch: m[0],
      beforeClass: m[1],
      classStr,
      afterClass: m[3],
    });
  }

  if (matches.length === 0) return 0;

  // 从后往前替换
  for (const match of matches.reverse()) {
    const { variant, size, extra } = parseBtnClasses(match.classStr);
    
    // 构建新属性
    let newAttrs = (match.beforeClass + ' ' + match.afterClass).trim().replace(/\s+/g, ' ');
    // 移除 className 属性
    newAttrs = newAttrs.replace(/\bclassName="[^"]*"/g, '').trim();
    // 移除 disabled:opacity-50 等（Button 自带）
    newAttrs = newAttrs.replace(/\bdisabled:opacity-50\b/g, '').trim();
    newAttrs = newAttrs.replace(/\bdisabled:cursor-not-allowed\b/g, '').trim();
    newAttrs = newAttrs.replace(/\s+/g, ' ').trim();

    // 构建 props
    let props = '';
    if (variant) props += ` variant="${variant}"`;
    if (size) props += ` size="${size}"`;
    if (extra.length > 0) props += ` className="${extra.join(' ')}"`;

    // 如果没 variant，默认 primary
    if (!variant) props = ` variant="primary"${props}`;

    const replacement = `<Button ${newAttrs}${props}>`;
    content = content.slice(0, match.start) + replacement + content.slice(match.end);
  }

  // 替换对应的 </button> → </Button>
  // 统计新增的 <Button 数量
  const origBtnCount = (original.match(/<Button\b/g) || []).length;
  const newBtnCount = (content.match(/<Button\b/g) || []).length;
  const added = newBtnCount - origBtnCount;

  if (added > 0) {
    // 从后往前替换 </button>，只替换文件中非 <Button 对应的 </button>
    let count = 0;
    const positions = [];
    let idx = content.length;
    while (count < added && idx > 0) {
      idx = content.lastIndexOf('</button>', idx - 1);
      if (idx === -1) break;
      positions.push(idx);
      count++;
    }
    for (const pos of positions) {
      content = content.slice(0, pos) + '</Button>' + content.slice(pos + '</button>'.length);
    }
  }

  // 添加 import
  const hasImport = content.includes("from './ui/Button/Button'") || 
                    content.includes('from "@/components/ui/Button/Button"') ||
                    content.includes("from '../../ui/Button/Button'") ||
                    content.includes("from '../../../ui/Button/Button'");
  
  if (!hasImport) {
    const importRegex = /^import\s+.+['"]\s*;?\s*$/gm;
    const allImports = [...content.matchAll(importRegex)];
    if (allImports.length > 0) {
      const last = allImports[allImports.length - 1];
      const insertAt = last.index + last[0].length;
      const rel = getRelativeImport(filePath);
      const importLine = `\nimport { Button } from '${rel}'`;
      content = content.slice(0, insertAt) + importLine + content.slice(insertAt);
    }
  }

  if (content !== original) {
    if (!isDryRun) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    return matches.length;
  }
  return 0;
}

// === MAIN ===
const files = collectFiles(SRC).filter(f => {
  const c = fs.readFileSync(f, 'utf8');
  // 只处理包含 btn class 且不含 Button 导出的文件
  return hasBtnClass(c);
});

console.log(`Found ${files.length} files with btn classes.`);
if (isDryRun) console.log('(DRY RUN — no files will be modified)\n');
if (shouldBackup && !isDryRun) {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const bf = path.join(BACKUP_DIR, rel);
    const bd = path.dirname(bf);
    if (!fs.existsSync(bd)) fs.mkdirSync(bd, { recursive: true });
    fs.copyFileSync(f, bf);
  }
  console.log(`Backed up ${files.length} files to ${BACKUP_DIR}`);
}

let totalReplacements = 0;
let totalFiles = 0;

for (const f of files) {
  const count = processFile(f);
  if (count > 0) {
    totalFiles++;
    totalReplacements += count;
    const rel = path.relative(ROOT, f);
    console.log(`  ${isDryRun ? '~' : '✓'} ${rel} (${count} buttons)`);
  }
}

console.log(`\nDone: ${totalFiles} files, ${totalReplacements} buttons replaced.`);
if (isDryRun) console.log('(Dry run — run without --dry-run to apply)');