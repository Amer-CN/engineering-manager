/**
 * replace-page-container.cjs
 * 将 <div ... className="...max-w-[1400px]...mx-auto...p-6..." ...> 替换为 <PageContainer ...>
 * 保留非标准 className（如 motion 动画、额外布局类）
 * 
 * 用法: node scripts/replace-page-container.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const isDryRun = process.argv.includes('--dry-run');

function collectFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!e.name.startsWith('__') && e.name !== 'node_modules') {
        results.push(...collectFiles(full));
      }
    } else if (e.name.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const rel = path.relative(ROOT, filePath);
  let fileChanged = false;

  // 匹配包含 max-w-[1400px] 的 className
  // 策略：找到 className 属性，检查是否包含 max-w-[1400px] 和 mx-auto
  // 如果有，替换整个 className 为 PageContainer 的默认类或保留非标准类
  
  // 模式 1: className="p-6 max-w-[1400px] mx-auto" → 直接替换
  // 模式 2: className="p-6 max-w-[1400px] mx-auto space-y-6" → 保留额外类
  // 模式 3: className="max-w-[1600px] mx-auto p-6" → PageContainer maxWidth="wide"
  // 模式 4: className="flex-1 flex flex-col overflow-hidden p-6 max-w-[1400px] mx-auto w-full" → 保留 flex 类
  
  // 匹配 className="..." 中包含 max-w-[1400px] 或 max-w-[1600px] 的
  content = content.replace(/className="([^"]*max-w-\[(?:1400|1600)px\][^"]*)"/g, (match, classStr) => {
    fileChanged = true;
    
    // 提取非标准类（不是 p-6/mx-auto/max-w 的类）
    const classes = classStr.split(/\s+/).filter(Boolean);
    const standardClasses = ['p-6', 'mx-auto', 'max-w-[1400px]', 'max-w-[1600px]'];
    const extraClasses = classes.filter(c => {
      if (standardClasses.includes(c)) return false;
      if (c.startsWith('max-w-')) return false;
      if (c.startsWith('px-') || c.startsWith('pt-') || c.startsWith('pb-')) return false;
      return true;
    });
    
    // 判断是 motion.div 还是普通 div
    // 这里只处理 className，标签名在外层处理
    
    if (extraClasses.length > 0) {
      return `className="${extraClasses.join(' ')}"`;
    }
    return 'className=""'; // 全部是标准类，替换为空的（PageContainer 自带 p-6）
  });

  // 匹配 className={`...`} 中包含 max-w-[1400px] 的模板字面量
  content = content.replace(/className=\{`([^`]*)`\}/g, (match, classStr) => {
    if (!classStr.includes('max-w-[1400px]') && !classStr.includes('max-w-[1600px]')) return match;
    fileChanged = true;
    
    const classes = classStr.split(/\s+/).filter(Boolean);
    const standardClasses = ['p-6', 'mx-auto', 'max-w-[1400px]', 'max-w-[1600px]'];
    const extraClasses = classes.filter(c => {
      if (standardClasses.includes(c)) return false;
      if (c.startsWith('max-w-')) return false;
      if (c.startsWith('px-') || c.startsWith('pt-') || c.startsWith('pb-')) return false;
      return true;
    });
    
    if (extraClasses.length > 0) {
      return `className={\`${extraClasses.join(' ')}\`}`;
    }
    return 'className=""';
  });

  // 替换标签名 <div → <PageContainer> 和 </div> → </PageContainer>
  // 只替换包含 max-w-[1400px] 的 div
  // 由于已经替换了 className，现在需要根据上下文判断哪些 div 需要替换
  // 策略：对于每个已替换的 className，找到它所在的 <div 标签

  // 添加 PageContainer import
  if (fileChanged && !content.includes("from './ui/PageContainer'") && !content.includes("from '@/components/ui/PageContainer'") && !content.includes("from '../../ui/PageContainer'") && !content.includes("from '../../../ui/PageContainer'")) {
    // 找到第一个 import 语句
    const firstImport = content.match(/^import\s+/m);
    if (firstImport) {
      // 找到最后一个 import 语句的结束位置
      const importRegex = /^import\s+.+from\s+['"][^'"]+['"]\s*;?\s*$/gm;
      const allImports = [...content.matchAll(importRegex)];
      if (allImports.length > 0) {
        const last = allImports[allImports.length - 1];
        const insertAt = last.index + last[0].length;
        const importLine = `\nimport PageContainer from './ui/PageContainer'`;
        content = content.slice(0, insertAt) + importLine + content.slice(insertAt);
      }
    }
  }

  if (content !== original) {
    if (!isDryRun) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    return true;
  }
  return false;
}

// === MAIN ===
const files = collectFiles(path.join(ROOT, 'src', 'components'))
  .filter(f => {
    const c = fs.readFileSync(f, 'utf8');
    return c.includes('max-w-[1400px]') || c.includes('max-w-[1600px]');
  });

console.log(`Found ${files.length} files with max-w-[1400px].`);
if (isDryRun) console.log('(DRY RUN — no files will be modified)\n');

let count = 0;
for (const f of files) {
  if (processFile(f)) {
    count++;
    console.log(`  ${isDryRun ? '~' : '✓'} ${path.relative(ROOT, f)}`);
  }
}

console.log(`\nDone: ${count} files.`);
if (isDryRun) console.log('(Dry run — run without --dry-run to apply)');