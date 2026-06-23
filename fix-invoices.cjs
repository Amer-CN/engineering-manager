const fs = require('fs');
const f = 'src/components/Invoices.tsx';
let content = fs.readFileSync(f, 'utf8');

// Fix 1: Lines 44-48 - 重复检测 warning button (remove duplicate old lines)
content = content.replace(
  /  <Button variant="warning" className="flex items-center gap-2" onClick=\{\(\) => setShowDuplicates\(true\)\}>\n  <Icon name="AlertTriangle" size=\{16\} \/>\n  检测到 \{duplicateInvoices\.length\} 组重复发票\n  <\/Button>ateInvoices\.length\} 组重复发票\n  <\/button>/,
  '  <Button variant="warning" className="flex items-center gap-2" onClick={() => setShowDuplicates(true)}>\n    <Icon name="AlertTriangle" size={16} />\n    检测到 {duplicateInvoices.length} 组重复发票\n  </Button>'
);

// Fix 2: Lines 50-54 - 新建发票 button
content = content.replace(
  /  <button onClick=\{\(\) => \{ h\.setEditingPayment\(null\); h\.setShowPaymentModal\(true\) \}\} className="btn bg-amber-500 hover:bg-amber-600 text-white">\n  <span className="tex<Button variant="primary" onClick=\{\(\) => \{ h\.setEditingInvoice\(null\); h\.setShowInvoiceModal\(true\) \}\}>\n  <span className="text-xl">\+<\/span> 新建发票\n  <\/Button>e="text-xl">\+<\/span> 新建发票\n  <\/button>/,
  '  <Button variant="primary" onClick={() => { h.setEditingInvoice(null); h.setShowInvoiceModal(true) }}>\n    <span className="text-xl">+</span> 新建发票\n  </Button>'
);

// Fix 3: Lines 159-172 - 重复发票操作列 (查看/删除)
content = content.replace(
  /  <div cl<Button variant="secondary" size="sm" onClick=\{\(\) => \{\n  setShowDuplicates\(false\)\n  h\.handleEditInvoice\(inv\)\n  \}\}>\n  查看\n  <\/Button>m b<Button variant="danger" size="sm" onClick=\{\(\) => \{\n  h\.handleDeleteInvoice\(inv\.id\)\n  showToast\('已删除重复发票', 'success'\)\n  \}\}>\n  删除\n  <\/Button>n-sm btn-danger"\n  >\n  删除\n  <\/button>/,
  '        <div className="flex items-center gap-2">\n          <Button variant="secondary" size="sm" onClick={() => {\n            setShowDuplicates(false)\n            h.handleEditInvoice(inv)\n          }}>\n            查看\n          </Button>\n          <Button variant="danger" size="sm" onClick={() => {\n            h.handleDeleteInvoice(inv.id)\n            showToast(\'已删除重复发票\', \'success\')\n          }}>\n            删除\n          </Button>\n        </div>'
);

// Fix 4: Line 182 - 关闭 button at bottom
content = content.replace(
  /  <div className="px-6 py-4 border-t b<Button variant="secondary" onClick=\{\(\) => setShowDuplicates\(false\)\}>关闭<\/Button>sName="btn btn-secondary">关闭<\/button>/,
  '  <div className="px-6 py-4 border-t border-slate-200">\n    <Button variant="secondary" onClick={() => setShowDuplicates(false)}>关闭</Button>\n  </div>'
);

fs.writeFileSync(f, content, 'utf8');
console.log('Invoices.tsx done');
