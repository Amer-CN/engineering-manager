const fs = require('fs');
const f = 'src/components/ContractTemplates.tsx';
let content = fs.readFileSync(f, 'utf8');

// Fix 1: Lines 187-190 - PageHeader subtitle with garbled add button
content = content.replace(
  /  <PageHeader title="合同模板" subtitle="管理合同模板，快速生<Button variant="primary" onClick=\{\(\) => \{ resetForm\(\); setShowModal\(true\) \}\}>\n  <span className="text-xl">\+<\/span> 添加模板\n  <\/Button>e="text-xl">\+<\/span> 添加模板\n  <\/button>/,
  '  <PageHeader title="合同模板" subtitle="管理合同模板，快速生成合同文档">\n    <Button variant="primary" onClick={() => { resetForm(); setShowModal(true) }}>\n      <span className="text-xl">+</span> 添加模板\n    </Button>\n  </PageHeader>'
);

// Fix 2: Lines 253-262 - Template card action buttons
content = content.replace(
  /  <div className="flex items-center gap-<Button variant="primary" size="sm" className="flex-1" onClick=\{\(\) => handleGenerate\(template\)\}>\n  <Icon name="File" size=\{14\} \/> 生成合同\n  <\/Button>="F<Button variant="secondary" size="sm" onClick=\{\(\) => handleEdit\(template\)\}>\n  编辑\n  <\/Button>eco<Button variant="danger" size="sm" onClick=\{\(\) => handleDelete\(template\.id\)\}>\n  删除\n  <\/Button>n-danger btn-sm"\n  >\n  删除\n  <\/button>/,
  '        <div className="flex items-center gap-2 flex-wrap">\n          <Button variant="primary" size="sm" className="flex-1" onClick={() => handleGenerate(template)}>\n            <Icon name="File" size={14} /> 生成合同\n          </Button>\n          <Button variant="secondary" size="sm" onClick={() => handleEdit(template)}>\n            编辑\n          </Button>\n          <Button variant="danger" size="sm" onClick={() => handleDelete(template.id)}>\n            删除\n          </Button>\n        </div>'
);

// Fix 3: Lines 269 - EmptyState garbled
content = content.replace(
  /  <EmptyState icon="FileText" title="暂无合同模板" descr<Button variant="primary" onClick=\{\(\) => \{ resetForm\(\); setShowModal\(true\) \}\}>添加模板<\/Button>sName="btn btn-primary">添加模板<\/button>\}/,
  '  <EmptyState icon="FileText" title="暂无合同模板" description="创建合同模板以快速生成合同文档">\n    <Button variant="primary" onClick={() => { resetForm(); setShowModal(true) }}>添加模板</Button>\n  </EmptyState>'
);

// Fix 4: Line 288 - Modal cancel button
content = content.replace(
  /  t<Button variant="secondary" onClick=\{\(\) => \{ setShowGenerateModal\(false\); setSelectedTemplate\(null\) \}\}>取消<\/Button>sName="btn btn-secondary">取消<\/button>/,
  '    <Button variant="secondary" onClick={() => { setShowGenerateModal(false); setSelectedTemplate(null) }}>取消</Button>'
);

// Fix 5: Remove duplicate Button import (line 3 and line 17)
// Keep only the first one
let lines = content.split('\n');
let firstButtonImport = -1;
let duplicates = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("import { Button } from './ui/Button'")) {
    if (firstButtonImport === -1) {
      firstButtonImport = i;
    } else {
      duplicates.push(i);
    }
  }
}
// Remove duplicates in reverse order
for (let i = duplicates.length - 1; i >= 0; i--) {
  lines.splice(duplicates[i], 1);
}
content = lines.join('\n');

fs.writeFileSync(f, content, 'utf8');
console.log('ContractTemplates.tsx done');
