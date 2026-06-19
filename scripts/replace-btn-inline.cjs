/**
 * replace-btn-inline.cjs — 将 btn CSS 类替换为 Button 组件等价的 Tailwind 原子类
 * 不改标签名，只替换 className 字符串
 * 
 * 用法: node scripts/replace-btn-inline.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// btn variant → Button 组件 variantStyles 中对应的 Tailwind 类
const VARIANT_MAP = {
  'btn-primary': 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow-md',
  'btn-secondary': 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 shadow-sm',
  'btn-danger': 'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 shadow-sm hover:shadow-md',
  'btn-ghost': 'bg-transparent text-slate-600 hover:bg-slate-100',
  'btn-warning': 'bg-warning-500 text-white hover:bg-warning-600 active:bg-warning-700 shadow-sm hover:shadow-md',
  'btn-success': 'bg-success-600 text-white hover:bg-success-700 active:bg-success-800 shadow-sm hover:shadow-md',
};

// btn size → Button 组件 sizeStyles 中对应的 Tailwind 类
const SIZE_MAP = {
  'btn-sm': 'px-3 py-1.5 text-sm gap-1.5',
  'btn-lg': 'px-6 py-3 text-lg gap-2',
};

// btn 基类 → Button 组件 baseClasses 中对应的 Tailwind 类
const BTN_BASE = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 ease-out';

function collectFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!e.name.startsWith('__') && e.name !== 'node_modules') {
        results.push(...collectFiles(full));
      }
    } else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

function transformClassName(classStr) {
  if (!classStr || !/\bbtn\b/.test(classStr)) return null;
  
  const classes = classStr.split(/\s+/).filter(Boolean);
  let hasBtn = false;
  const resultTailwind = [];
  
  for (const cls of classes) {
    if (cls === 'btn') { hasBtn = true; continue; }
    const v = VARIANT_MAP[cls];
    if (v) { hasBtn = true; resultTailwind.push(v); continue; }
    const s = SIZE_MAP[cls];
    if (s) { hasBtn = true; resultTailwind.push(s); continue; }
    if (cls === 'btn-disabled') { hasBtn = true; continue; }
    resultTailwind.push(cls);
  }
  
  if (!hasBtn) return null;
  
  // 去重
  const seen = new Set();
  const deduped = [];
  for (const cls of resultTailwind) {
    if (!seen.has(cls)) {
      seen.add(cls);
      deduped.push(cls);
    }
  }
  
  return deduped.join(' ');
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let result = content;
  const rel = path.relative(ROOT, filePath);
  
  // 处理 className="..." 中的 btn 类
  result = result.replace(/className="([^"]*)"/g, (match, classStr) => {
    const transformed = transformClassName(classStr);
    if (transformed) return `className="${transformed}"`;
    return match;
  });
  
  // 处理 className={`...`} 中的 btn 类——只处理无 JSX 表达式的纯字符串模板
  result = result.replace(/className=\{`([^`$]*\bbtn\b[^`$]*)`\}/g, (match, classStr) => {
    const transformed = transformClassName(classStr);
    if (transformed) return `className={\`${transformed}\`}`;
    return match;
  });
  
  if (result !== original) {
    fs.writeFileSync(filePath, result, 'utf8');
    return true;
  }
  return false;
}

// === MAIN ===
const files = collectFiles(path.join(ROOT, 'src'))
  .filter(f => !f.includes('\\node_modules\\') && !f.includes('/node_modules/'))
  .filter(f => {
    const c = fs.readFileSync(f, 'utf8');
    return /\bbtn\b/.test(c);
  });

console.log(`Found ${files.length} files with btn classes.`);

let count = 0;
for (const f of files) {
  if (processFile(f)) {
    count++;
    console.log(`  ✓ ${path.relative(ROOT, f)}`);
  }
}

console.log(`\nDone: ${count} files transformed.`);