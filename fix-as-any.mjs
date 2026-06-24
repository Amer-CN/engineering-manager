import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = 'E:\\测试';
const readFile = (p) => fs.readFileSync(path.join(ROOT, p), 'utf-8');
const writeFile = (p, content) => fs.writeFileSync(path.join(ROOT, p), content, 'utf-8');
const countAsAny = (c) => (c.match(/\bas any\b/g) || []).length;
let totalSaved = 0;

function fixFile(relPath, fixer) {
  const before = readFile(relPath);
  const after = fixer(before);
  const bCount = countAsAny(before);
  const aCount = countAsAny(after);
  if (bCount !== aCount) {
    writeFile(relPath, after);
    console.log(`${relPath}: ${bCount} → ${aCount} (saved ${bCount - aCount})`);
    totalSaved += bCount - aCount;
  } else {
    console.log(`${relPath}: no change`);
  }
}

// ====== Fix 1: App.tsx (9 → 0) ======
fixFile('src/App.tsx', (c) => {
  // Add WebViewWindow type + getWebview helper after last import
  const helper = `\ntype WebViewWindow = Window & { chrome?: { webview?: { postMessage: (msg: string) => void } } };\nconst getWebview = () => (window as WebViewWindow).chrome?.webview;\n`;
  if (!c.includes('getWebview')) {
    const lastImportIdx = c.lastIndexOf('\nimport ');
    const endOfImportLine = c.indexOf('\n', lastImportIdx + 1);
    c = c.slice(0, endOfImportLine + 1) + helper + c.slice(endOfImportLine + 1);
  }
  // Replace all (window as any).chrome?.webview patterns
  c = c.replace(/\(window as any\)\.chrome\?\.webview\?\.postMessage\(JSON\.stringify\(\{ action: 'startResize', edge: '([^']+)' \}\)\)/g,
    "getWebview()?.postMessage(JSON.stringify({ action: 'startResize', edge: '$1' }))");
  c = c.replace(/const webview = \(window as any\)\.chrome\?\.webview/g, 'const webview = getWebview()');
  return c;
});

// ====== Fix 2: TitleBar.tsx (3 → 0) ======
fixFile('src/components/TitleBar.tsx', (c) => {
  // Add helper type if not present
  if (!c.includes('WebViewWindow')) {
    const lastImportIdx = c.lastIndexOf('\nimport ');
    const endOfImportLine = c.indexOf('\n', lastImportIdx + 1);
    const helper = `\ntype WebViewWindow = Window & { chrome?: { webview?: { postMessage: (msg: string) => void } }; electronAPI?: { [key: string]: (...args: any[]) => any } };\nconst getWebview = () => (window as WebViewWindow).chrome?.webview;\nconst getElectronAPI = () => (window as WebViewWindow).electronAPI;\n`;
    c = c.slice(0, endOfImportLine + 1) + helper + c.slice(endOfImportLine + 1);
  }
  c = c.replace(/\(window as any\)\.electronAPI/g, 'getElectronAPI()');
  c = c.replace(/\(window as any\)\.chrome\?\.webview/g, 'getWebview()');
  return c;
});

// ====== Fix 3: PartnerForm.tsx (9 → 0) ======
fixFile('src/components/features/partners/PartnerForm.tsx', (c) => {
  // All are (partner as any).fieldName patterns — Partner interface has these fields
  c = c.replace(/\(partner as any\)\./g, 'partner.');
  return c;
});

// ====== Fix 4: SettlementList.tsx (7 → 0) ======
fixFile('src/components/features/settlement/SettlementList.tsx', (c) => {
  // Settlement interface has subType?, settlementDate?, files? — cast to proper type
  // Replace (item as any) with (item as Settlement)
  c = c.replace(/\(item as any\)/g, '(item as Settlement)');
  return c;
});

// ====== Fix 5: invoices/constants.ts (8 → 0) ======
fixFile('src/components/features/invoices/constants.ts', (c) => {
  // taxRate: 0.09 as any -> use InvoiceTaxRate
  c = c.replace(/taxRate: 0\.09 as any/g, 'taxRate: 0.09 as InvoiceTaxRate');
  c = c.replace(/type: 'invoice_in' as any/g, "type: 'invoice_in' as InvoiceType");
  // editingInvoice patterns - Invoice interface has these fields
  c = c.replace(/\(editingInvoice as any\)\./g, 'editingInvoice.');
  return c;
});

// ====== Fix 6: Members.tsx (4 → 0) ======
fixFile('src/components/Members.tsx', (c) => {
  // These are function type mismatches - handlers don't match exact types
  c = c.replace(/onSubmit=\{handleSubmitStaff as any\}/g, 'onSubmit={handleSubmitStaff as MembersPageProps["onSubmit"]}');
  c = c.replace(/onSubmit=\{handleSubmitWorker as any\}/g, 'onSubmit={handleSubmitWorker as MembersPageProps["onSubmit"]}');
  c = c.replace(/onEdit=\{\(selectedMember\.memberType === 'worker' \? handleEditWorker : handleEditStaff\) as any\}/g,
    'onEdit={(selectedMember.memberType === "worker" ? handleEditWorker : handleEditStaff) as MembersPageProps["onEdit"]}');
  c = c.replace(/onDelete=\{handleDeleteMember as any\}/g, 'onDelete={handleDeleteMember as MembersPageProps["onDelete"]}');
  return c;
});

// ====== Fix 7: costLedger/config.tsx (6 → 0) ======
fixFile('src/components/features/costLedger/config.tsx', (c) => {
  // Add CostLedgerCategoryWithMeta local type
  if (!c.includes('CostLedgerCategoryWithMeta')) {
    const helper = `\ntype CostLedgerCategoryWithMeta = { code: string; name: string; isEnabled?: boolean; isBuiltin?: boolean; level1?: string; [key: string]: unknown };\n`;
    const firstImportIdx = c.indexOf('\nimport ');
    const endOfImportLine = c.indexOf('\n', firstImportIdx + 1);
    c = c.slice(0, endOfImportLine + 1) + helper + c.slice(endOfImportLine + 1);
  }
  c = c.replace(/\(c as any\)\.isEnabled/g, '(c as CostLedgerCategoryWithMeta).isEnabled');
  c = c.replace(/\(c as any\)\.isBuiltin/g, '(c as CostLedgerCategoryWithMeta).isBuiltin');
  c = c.replace(/\(c as any\)\.level1/g, '(c as CostLedgerCategoryWithMeta).level1');
  // .find(... ) as any
  c = c.replace(/dynamicCategories\.find\(c => c\.code === code\) as any/g, 
    'dynamicCategories.find(c => c.code === code) as CostLedgerCategoryWithMeta | undefined');
  return c;
});

// ====== Fix 8: useMemberOperations.ts (6 → 0) ======
fixFile('src/components/features/members/useMemberOperations.ts', (c) => {
  c = c.replace(/const d = data as any/g, 'const d = data as Record<string, unknown>');
  c = c.replace(/submitFileData as any/g, 'submitFileData as Parameters<typeof processFileFields>[0]');
  c = c.replace(/\(data as any\)\.safetyTrainingFile/g, '(data as Record<string, unknown>).safetyTrainingFile');
  c = c.replace(/\(data as any\)\.healthReportFile/g, '(data as Record<string, unknown>).healthReportFile');
  c = c.replace(/\(data as any\)\.specialCertificateFile/g, '(data as Record<string, unknown>).specialCertificateFile');
  return c;
});

// ====== Fix 9: ContractFormModal.tsx (5 → 0) ======
fixFile('src/components/features/contracts/ContractFormModal.tsx', (c) => {
  // editingContract as any -> as AgreementContract (which has agreementType, paymentMethod not in base)
  c = c.replace(/const agreementContract = editingContract as any/g, 'const agreementContract = editingContract as AgreementContract');
  c = c.replace(/\(editingContract as any\)\.paymentMethod/g, '(editingContract as IncomeContract | ExpenseContract).paymentMethod');
  c = c.replace(/\(updateData as any\)\[key\]/g, '(updateData as Record<string, unknown>)[key]');
  c = c.replace(/e\.target\.value as any\b/g, 'e.target.value as ContractFormData["status"]');
  return c;
});

// ====== Fix 10: useStaffFormActions.ts (3 → 0) ======
fixFile('src/components/features/hr/useStaffFormActions.ts', (c) => {
  c = c.replace(/dirtyConfigs as any/g, 'dirtyConfigs as Parameters<typeof processFileFields>[1]');
  c = c.replace(/\(result as any\)\?\.data\?\.id/g, '(result as { data?: { id?: number } })?.data?.id');
  return c;
});

console.log(`\nTotal saved so far: ${totalSaved}`);
