const fs = require('fs');
const f = 'src/components/Drawings.tsx';
let content = fs.readFileSync(f, 'utf8');

// Fix 1: Line 237 - actions column, garbled Button + old button
content = content.replace(
  /<div className="flex items-c<Button variant="ghost" size="sm" onClick=\{\(\) => handleEdit\(item\)\}>编辑<\/Button>me="btn b<Button variant="danger" size="sm" onClick=\{\(\) => handleDelete\(item\.id\)\}>删除<\/Button>e="btn btn-danger btn-sm">删除<\/button>/,
  '<div className="flex items-center gap-2">\n        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>编辑</Button>\n        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>删除</Button>'
);

// Fix 2: Lines 253-261 - subtitle with garbled Button
content = content.replace(
  /<p className="text-slat<Button variant="primary" className="px-6 py-3 flex items-center" onClick=\{\(\) => \{\n  resetForm\(\)\n  setShowModal\(true\)\n  \}\}>\n  <span className="text-xl mr-2">\+<\/span>\n  上传图纸\n  <\/Button>-xl mr-2">\+<\/span>\n  上传图纸\n  <\/button>/,
  '<p className="text-slate-500 text-sm">项目图纸文件的上传与管理</p>'
);

// Fix 3: Line 334 - EmptyState garbled
content = content.replace(
  /<EmptyState icon="Ruler" title="暂无图纸" des<Button variant="primary" className="px-6 py-3" onClick=\{\(\) => \{ resetForm\(\); setShowModal\(true\) \}\}>上传图纸<\/Button> btn-primary px-6 py-3">上传图纸<\/button>\}/,
  '<EmptyState icon="Ruler" title="暂无图纸" description="点击上方按钮上传图纸">\n    <Button variant="primary" className="px-6 py-3" onClick={() => { resetForm(); setShowModal(true) }}>上传图纸</Button>\n  </EmptyState>'
);

fs.writeFileSync(f, content, 'utf8');
console.log('Drawings.tsx done');
