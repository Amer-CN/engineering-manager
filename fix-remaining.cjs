const fs = require('fs');
const path = require('path');

function getButtonImport(content, filePath) {
  const hasButtonImport = /import\s+\{\s*Button\s*\}/.test(content) || /import\s+Button\s+from/.test(content);
  if (hasButtonImport) return content;
  const dir = path.dirname(filePath);
  const target = path.join('src', 'components', 'ui', 'Button');
  let rel = path.relative(dir, target).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  const lines = content.split('\n');
  let lastImportLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) lastImportLine = i;
  }
  if (lastImportLine >= 0) {
    lines.splice(lastImportLine + 1, 0, `import { Button } from '${rel}'`);
  }
  return lines.join('\n');
}

// === Fix ContractPreviewModal.tsx ===
{
  const f = 'src/components/features/contracts/ContractPreviewModal.tsx';
  let content = fs.readFileSync(f, 'utf8');
  // <a href=... download=... className="btn btn-primary btn-sm">下载文件</a>
  // -> <Button as="a" variant="primary" size="sm" href=... download=...>下载文件</Button>
  content = content.replace(
    /<a href=\{previewFile\.data\}\n\s+download=\{`合同附件\.\$\{previewFile\.type === 'pdf' \? 'pdf' : previewFile\.type === 'word' \? 'docx' : 'xlsx'\}`\}\n\s+className="btn btn-primary btn-sm">下载文件<\/a>/,
    '<Button as="a" variant="primary" size="sm" href={previewFile.data}\n                download={`合同附件.${previewFile.type === \'pdf\' ? \'pdf\' : previewFile.type === \'word\' ? \'docx\' : \'xlsx\'}`}>下载文件</Button>'
  );
  content = getButtonImport(content, f);
  fs.writeFileSync(f, content, 'utf8');
  console.log('ContractPreviewModal.tsx done');
}

// === Fix MemberDetail.tsx ===
{
  const f = 'src/components/features/members/MemberDetail.tsx';
  let content = fs.readFileSync(f, 'utf8');
  // Line: <button onClick={onEdit} className={`btn btn-sm ${isWorker ? 'btn-warning' : 'btn-primary'}`}>编辑</button>
  content = content.replace(
    /<button onClick=\{onEdit\} className=\{`btn btn-sm \$\{isWorker \? 'btn-warning' : 'btn-primary'\}`\}>编辑<\/button>/,
    '{onEdit && (\n              <Button\n                onClick={onEdit}\n                variant={isWorker ? \'warning\' : \'primary\'}\n                size="sm">编辑</Button>\n            )}'
  );
  // Fix: <Button ... className="btn">关闭</Button> -> remove className="btn"
  content = content.replace(
    /<Button onClick=\{onClose\} variant="secondary" size="sm" className="btn">关闭<\/Button>/,
    '<Button onClick={onClose} variant="secondary" size="sm">关闭</Button>'
  );
  fs.writeFileSync(f, content, 'utf8');
  console.log('MemberDetail.tsx done');
}

// === Fix SettlementItemsTable.tsx ===
{
  const f = 'src/components/features/settlement/SettlementItemsTable.tsx';
  let content = fs.readFileSync(f, 'utf8');
  // <button type="button" onClick={onDownloadTemplate} className="btn btn-sm bg-white text-slate-600 ...">
  content = content.replace(
    /<button type="button" onClick=\{onDownloadTemplate\} className="btn btn-sm bg-white text-slate-600 hover:bg-slate-100 border border-slate-300"><Icon name="Download" size=\{14\} \/> 下载模板<\/button>/,
    '<Button type="button" variant="outline" size="sm" onClick={onDownloadTemplate} className="bg-white text-slate-600 hover:bg-slate-100 border border-slate-300"><Icon name="Download" size={14} /> 下载模板</Button>'
  );
  content = content.replace(
    /<button type="button" onClick=\{onUploadTemplate\} className="btn btn-sm bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200"><Icon name="Upload" size=\{14\} \/> 上传模板<\/button>/,
    '<Button type="button" variant="primary" size="sm" onClick={onUploadTemplate} className="bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200"><Icon name="Upload" size={14} /> 上传模板</Button>'
  );
  content = content.replace(
    /<button type="button" onClick=\{onImportExcel\} className="btn btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"><Icon name="File" size=\{14\} \/> 导入其他表<\/button>/,
    '<Button type="button" variant="success" size="sm" onClick={onImportExcel} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"><Icon name="File" size={14} /> 导入其他表</Button>'
  );
  // Fix: <Button ... className="btn">+ 添加明细</Button>
  content = content.replace(
    /<Button type="button" onClick=\{onAdd\} variant="secondary" size="sm" className="btn">\+ 添加明细<\/Button>/,
    '<Button type="button" onClick={onAdd} variant="secondary" size="sm">+ 添加明细</Button>'
  );
  content = getButtonImport(content, f);
  fs.writeFileSync(f, content, 'utf8');
  console.log('SettlementItemsTable.tsx done');
}

// === Fix ImportFileStep.tsx ===
{
  const f = 'src/components/features/costLedger/importComponents/ImportFileStep.tsx';
  let content = fs.readFileSync(f, 'utf8');
  // <label className="btn btn-primary cursor-pointer">
  content = content.replace(
    /<label className="btn btn-primary cursor-pointer">/,
    '<label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors">'
  );
  content = getButtonImport(content, f);
  fs.writeFileSync(f, content, 'utf8');
  console.log('ImportFileStep.tsx done');
}

console.log('All remaining fixes done');
