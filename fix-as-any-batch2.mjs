import fs from 'fs';
import path from 'path';

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

// WorkerForm.tsx (14 → 0)
fixFile('src/components/features/members/WorkerForm.tsx', (c) => {
  c = c.replace(/^const FileUploadArea = _FileUploadArea as any.*$/m, 'const FileUploadArea = _FileUploadArea;');
  c = c.replace(/^const SmallFileUpload = _SmallFileUpload as any.*$/m, 'const SmallFileUpload = _SmallFileUpload;');
  c = c.replace(/onFileChange=\{onFileChange as any\}/g, 'onFileChange={onFileChange}');
  c = c.replace(/\(onFileChange as any\)\(/g, 'onFileChange(');
  c = c.replace(/setFormData as any/g, 'setFormData');
  c = c.replace(/\(\(e: any\) => \(onFileChange as any\)\(/g, '((e: React.ChangeEvent<HTMLInputElement>) => onFileChange(');
  return c;
});

// MemberForm.tsx (10 → 0)
fixFile('src/components/features/members/MemberForm.tsx', (c) => {
  c = c.replace(/\(formData as any\)\[key\]/g, '(formData as Record<string, unknown>)[key]');
  c = c.replace(/handleDrop as any/g, 'handleDrop');
  c = c.replace(/handleFileChange as any/g, 'handleFileChange');
  c = c.replace(/handleDeleteFile as any/g, 'handleDeleteFile');
  return c;
});

// useWorkerImport.ts (9 → 0)
fixFile('src/components/features/members/useWorkerImport.ts', (c) => {
  c = c.replace(/rows\[headerRow\] as any\[\]/g, 'rows[headerRow] as string[]');
  c = c.replace(/\(r as any\[\]\)\.some\(\(c: any\)/g, '(r as unknown[]).some((c: unknown)');
  c = c.replace(/\)\) as any\[\]\[\]/g, ')) as string[][]');
  c = c.replace(/XLSX\.utils\.sheet_to_json<any>\(/g, 'XLSX.utils.sheet_to_json<string[]>(');
  c = c.replace(/\) as any\[\]\[\]/g, ') as string[][]');
  c = c.replace(/;\(rowData as any\)\[field\.key\]/g, ';(rowData as Record<string, string>)[field.key]');
  c = c.replace(/updateWorker\(update as any\)/g, 'updateWorker(update as Parameters<API["updateWorker"]>[0])');
  c = c.replace(/\(r as any\)\./g, '(r as Record<string, unknown>).');
  return c;
});

// StaffForm.tsx (5 → 0)
fixFile('src/components/features/members/StaffForm.tsx', (c) => {
  c = c.replace(/^const FileUploadArea = _FileUploadArea as any.*$/m, 'const FileUploadArea = _FileUploadArea;');
  c = c.replace(/onDragOver as any/g, 'onDragOver');
  c = c.replace(/onDragLeave as any/g, 'onDragLeave');
  c = c.replace(/onDrop as any/g, 'onDrop');
  c = c.replace(/onFileChange as any/g, 'onFileChange');
  c = c.replace(/\(\(\) => onDeleteFile\('contractFile', setFormData\)\) as any/g, '(() => onDeleteFile("contractFile", setFormData))');
  c = c.replace(/refs\.contractInputRef as any/g, 'refs.contractInputRef');
  c = c.replace(/\(\(e: any\) => onFileChange\(e as any/g, '((e: React.ChangeEvent<HTMLInputElement>) => onFileChange(e');
  // catch remaining trailing `as any` after closing paren
  c = c.replace(/\) as any\b/g, ')');
  c = c.replace(/\(formData as any\)\[key\]/g, '(formData as Record<string, string | number>)[key]');
  return c;
});

// importLogic.ts (5 → 0)
fixFile('src/components/features/costLedger/importComponents/importLogic.ts', (c) => {
  c = c.replace(/\(r as any\)\._matchedDir/g, '(r as { _matchedDir?: string })._matchedDir');
  c = c.replace(/\(r as any\)\._matchedCode/g, '(r as { _matchedCode?: string })._matchedCode');
  c = c.replace(/\(r as any\)\._originalCode/g, '(r as { _originalCode?: string })._originalCode');
  return c;
});

// PaymentList.tsx (3 → 0)
fixFile('src/components/features/invoices/PaymentList.tsx', (c) => {
  c = c.replace(/record\.recordDate \|\| \(record as any\)\.date/g, 'record.recordDate || (record as PaymentRecord & { date?: string }).date');
  c = c.replace(/\(record as any\)\.invoiceInfos/g, '(record as PaymentRecord & { invoiceInfos?: { invoiceNo: string; invoiceName: string; invoiceAmount: number }[] }).invoiceInfos');
  return c;
});

// WorkerSection.tsx (3 → 0)
fixFile('src/components/features/members/WorkerSection.tsx', (c) => {
  c = c.replace(/getWorkerTypeLabel\(item\.workerType as any\)/g, 'getWorkerTypeLabel(item.workerType as WorkerType)');
  c = c.replace(/\(item as any\)\.bankAccount/g, 'item.bankAccount');
  c = c.replace(/\(item as any\)\.workerId/g, '(item as ProjectWorker).workerId');
  return c;
});

// memberFormTypes.ts (3 → 0)
fixFile('src/components/features/members/memberFormTypes.ts', (c) => {
  c = c.replace(/value as any\b/g, 'value as T[keyof T]');
  c = c.replace(/\(member as any\)\.idCard/g, '(member as Member).idCard');
  c = c.replace(/\(member as any\)\.bankAccount/g, '(member as Member).bankAccount');
  c = c.replace(/\(member as any\)\.bankName/g, '(member as Member).bankName');
  return c;
});

// CostLedgerAnalytics.tsx (3 → 0)
fixFile('src/components/features/costLedger/CostLedgerAnalytics.tsx', (c) => {
  c = c.replace(/categories as any/g, 'categories as Parameters<typeof getCategoryColor>[1]');
  c = c.replace(/\(\(v: any\) => formatMoney\(v \?\? 0\)\) as any/g, '((v: number) => formatMoney(v ?? 0))');
  return c;
});

// ImportMappingComponents.tsx (3 → 0)
fixFile('src/components/features/costLedger/importComponents/ImportMappingComponents.tsx', (c) => {
  c = c.replace(/as any\b/g, 'as unknown');
  return c;
});

console.log(`\nTotal saved in batch 2: ${totalSaved}`);
