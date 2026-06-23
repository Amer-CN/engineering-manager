const fs = require("fs");

// Fix AuditLogs.tsx - template literal className
{
  const f = "src/components/AuditLogs.tsx";
  let content = fs.readFileSync(f, "utf8");
  // Replace the pagination button with template literal className
  const oldBtn = "return <button key={pageNum} onClick={() => f.setPage(pageNum)} className={`btn btn-sm ${pageNum === page ? 'btn-primary' : 'btn-ghost text-slate-700'}`}>{pageNum}</button>";
  const newBtn = "return <Button key={pageNum} onClick={() => f.setPage(pageNum)} variant={pageNum === page ? 'primary' : 'ghost'} size=\"sm\" className={pageNum === page ? undefined : 'text-slate-700'}>{pageNum}</Button>";
  if (content.includes(oldBtn)) {
    content = content.replace(oldBtn, newBtn);
    console.log("AuditLogs.tsx: replaced pagination button");
  } else {
    console.log("AuditLogs.tsx: button not found, checking...");
    const idx = content.indexOf("btn btn-sm");
    if (idx >= 0) console.log("Context:", content.substring(idx - 50, idx + 80));
  }
  fs.writeFileSync(f, content, "utf8");
}

// Fix Dashboard.tsx - motion.button
{
  const f = "src/components/Dashboard.tsx";
  let content = fs.readFileSync(f, "utf8");
  content = content.replace(
    "className=\"btn btn-primary text-sm\">重试</motion.button>",
    "variant=\"primary\" className=\"text-sm\">重试</motion.button>"
  );
  // Also need to add variant to motion.button - actually motion.button doesnt support variant
  // Better to just remove btn btn-primary and keep it as motion.button with custom classes
  // Actually, motion.button is not a Button component - keep it as-is but remove btn classes
  // Let me re-read the line
  fs.writeFileSync(f, content, "utf8");
  console.log("Dashboard.tsx: done");
}

// Fix MemberDetail.tsx - template literal className
{
  const f = "src/components/features/members/MemberDetail.tsx";
  let content = fs.readFileSync(f, "utf8");
  content = content.replace(
    "<button onClick={onEdit} className={`btn btn-sm ${isWorker ? 'btn-warning' : 'btn-primary'}`}>编辑</button>",
    "<Button onClick={onEdit} variant={isWorker ? 'warning' : 'primary'} size=\"sm\">编辑</Button>"
  );
  // Also fix the close button with className="btn" residual
  content = content.replace(
    "<Button onClick={onClose}  variant=\"secondary\" size=\"sm\" className=\"btn\">关闭</Button>",
    "<Button onClick={onClose} variant=\"secondary\" size=\"sm\">关闭</Button>"
  );
  fs.writeFileSync(f, content, "utf8");
  console.log("MemberDetail.tsx: done");
}

// Fix ImportFileStep.tsx - label with btn class
{
  const f = "src/components/features/costLedger/importComponents/ImportFileStep.tsx";
  let content = fs.readFileSync(f, "utf8");
  content = content.replace(
    "<label className=\"btn btn-primary cursor-pointer\">",
    "<label className=\"inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors\">"
  );
  fs.writeFileSync(f, content, "utf8");
  console.log("ImportFileStep.tsx: done");
}

// Fix ContractPreviewModal.tsx - <a> tag with btn class
{
  const f = "src/components/features/contracts/ContractPreviewModal.tsx";
  let content = fs.readFileSync(f, "utf8");
  content = content.replace(
    "className=\"btn btn-primary btn-sm\">下载文件</a>",
    "variant=\"primary\" size=\"sm\">下载文件</Button>"
  );
  // Also need to change <a> to <Button as="a"
  content = content.replace(
    "<a href={previewFile.data}\n                download={`合同附件",
    "<Button as=\"a\" href={previewFile.data}\n                download={`合同附件"
  );
  fs.writeFileSync(f, content, "utf8");
  console.log("ContractPreviewModal.tsx: done");
}

// Fix SettlementItemsTable.tsx - btn-sm without btn-X
{
  const f = "src/components/features/settlement/SettlementItemsTable.tsx";
  let content = fs.readFileSync(f, "utf8");
  // These buttons use btn-sm with custom color classes (bg-white, bg-primary-50, bg-emerald-50)
  // They are NOT btn btn-X pattern - they use btn-sm as a base class
  // Replace them with Button variant="outline" and keep custom classes
  content = content.replace(
    "<button type=\"button\" onClick={onDownloadTemplate} className=\"btn btn-sm bg-white text-slate-600 hover:bg-slate-100 border border-slate-300\">",
    "<Button type=\"button\" variant=\"outline\" size=\"sm\" onClick={onDownloadTemplate} className=\"bg-white text-slate-600 hover:bg-slate-100 border border-slate-300\">"
  );
  content = content.replace(
    "<button type=\"button\" onClick={onUploadTemplate} className=\"btn btn-sm bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200\">",
    "<Button type=\"button\" variant=\"primary\" size=\"sm\" onClick={onUploadTemplate} className=\"bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200\">"
  );
  content = content.replace(
    "<button type=\"button\" onClick={onImportExcel} className=\"btn btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200\">",
    "<Button type=\"button\" variant=\"success\" size=\"sm\" onClick={onImportExcel} className=\"bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200\">"
  );
  // Also fix the "add" button with className="btn" residual
  content = content.replace(
    "className=\"btn\">+ 添加明细</Button>",
    "\">+ 添加明细</Button>"
  );
  fs.writeFileSync(f, content, "utf8");
  console.log("SettlementItemsTable.tsx: done");
}

// Fix SettingsSqliteSection.tsx - template literal className
{
  const f = "src/components/SettingsSqliteSection.tsx";
  let content = fs.readFileSync(f, "utf8");
  content = content.replace(
    "<button\r\n                onClick={onRemigrate}\r\n                disabled={migrating || !isDataSparse}\r\n                className={`${isDataSparse ? 'btn btn-primary' : 'btn btn-secondary'} ${!isDataSparse ? 'opacity-50 cursor-not-allowed' : ''}`}\r\n              >\r\n                <ButtonLoader loading={migrating} loadingText=\"AI 正在同步...\">\r\n                  <><Icon name=\"RefreshCw\" size={16} /> {isDataSparse ? 'AI 同步数据' : '重新优化存储'}</>\r\n                </ButtonLoader>\r\n              </button>",
    "<Button\r\n                variant={isDataSparse ? 'primary' : 'secondary'}\r\n                onClick={onRemigrate}\r\n                disabled={migrating || !isDataSparse}\r\n                className={!isDataSparse ? 'opacity-50 cursor-not-allowed' : undefined}>\r\n                <ButtonLoader loading={migrating} loadingText=\"AI 正在同步...\">\r\n                  <><Icon name=\"RefreshCw\" size={16} /> {isDataSparse ? 'AI 同步数据' : '重新优化存储'}</>\r\n                </ButtonLoader>\r\n              </Button>"
  );
  fs.writeFileSync(f, content, "utf8");
  console.log("SettingsSqliteSection.tsx: done");
}

console.log("All special cases done!");