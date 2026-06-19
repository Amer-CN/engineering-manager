const fs = require('fs');
const path = require('path');

// 测试一个具体文件看看
const fp = path.join(__dirname, '..', 'src', 'components', 'ContractFormModal.tsx');
// 实际路径在 features/contracts/ 下
const fp2 = path.join(__dirname, '..', 'src', 'components', 'features', 'contracts', 'ContractFormModal.tsx');

for (const f of [fp, fp2]) {
  if (!fs.existsSync(f)) { console.log('NOT FOUND:', f); continue; }
  const content = fs.readFileSync(f, 'utf8');
  const oldR = /<button\b([^>]*?\bclassName="([^"]*\bbtn\b[^"]*)")/g;
  const newR = /<(?:button|motion\.button)\b([^>]*?\bclassName="([^"]*\bbtn\b[^"]*)")/g;
  console.log(f);
  console.log('  old regex:', [...content.matchAll(oldR)].length);
  console.log('  new regex:', [...content.matchAll(newR)].length);
}