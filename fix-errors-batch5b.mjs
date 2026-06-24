import fs from 'fs';
import path from 'path';

const ROOT = 'E:\\测试';
const readFile = (p) => fs.readFileSync(path.join(ROOT, p), 'utf-8');
const writeFile = (p, content) => fs.writeFileSync(path.join(ROOT, p), content, 'utf-8');

// Fix ContractFormModal.tsx line 144 - wrong cast
let cfm = readFile('src/components/features/contracts/ContractFormModal.tsx');
cfm = cfm.replace(
  /paymentMethod: e\.target\.value as typeof formData\.status/g,
  'paymentMethod: e.target.value as typeof formData.paymentMethod'
);
writeFile('src/components/features/contracts/ContractFormModal.tsx', cfm);
console.log('Fixed ContractFormModal.tsx');

// Fix LaborWorkerList.tsx - workerId undefined
let lwl = readFile('src/components/features/labor/LaborWorkerList.tsx');
lwl = lwl.replace(
  /\(w as Member & \{ workerId\?: number \}\)\.workerId\)/g,
  '((w as Member & { workerId?: number }).workerId ?? 0)'
);
writeFile('src/components/features/labor/LaborWorkerList.tsx', lwl);
console.log('Fixed LaborWorkerList.tsx');

// Fix SettlementForm.tsx - various type issues
let sfm = readFile('src/components/features/settlement/SettlementForm.tsx');
let sfmLines = sfm.split('\n');
// Line 54: files possibly undefined, items possibly undefined
// Need to add non-null assertions or fallbacks
sfmLines[53] = sfmLines[53].replace(
  'files: settlement.files?.length > 0 ? settlement.files',
  'files: (settlement.files?.length ?? 0) > 0 ? settlement.files!'
);
sfmLines[55] = sfmLines[55].replace(
  'items: settlement.items?.map(item => ({',
  'items: settlement.items?.map(item => ({'
);
// spec: (item as Record<string, unknown>).spec needs unknown first
sfmLines[57] = sfmLines[57].replace(
  '(item as Record<string, unknown>)',
  '(item as unknown as Record<string, unknown>)'
);
sfm = sfmLines.join('\n');
writeFile('src/components/features/settlement/SettlementForm.tsx', sfm);
console.log('Fixed SettlementForm.tsx');

// Fix SettlementList.tsx - warnings possibly undefined
let sl = readFile('src/components/features/settlement/SettlementList.tsx');
sl = sl.replace(
  /\(item as SettlementData & \{ warnings\?: string\[\] \}\)\.warnings && \(item as SettlementData & \{ warnings\?: string\[\] \}\)\.warnings\.length > 0/g,
  '(item as SettlementData & { warnings?: string[] }).warnings && (item as SettlementData & { warnings?: string[] }).warnings!.length > 0'
);
sl = sl.replace(
  /\(item as SettlementData & \{ warnings\?: string\[\] \}\)\.warnings\.map/g,
  '(item as SettlementData & { warnings?: string[] }).warnings!.map'
);
// item.files?.length - needs ! assertion since we already checked
sl = sl.replace(
  /\(\(item as Settlement\)\.files\?\.length \?\? 0\)/g,
  '((item as Settlement).files?.length ?? 0)'
);
writeFile('src/components/features/settlement/SettlementList.tsx', sl);
console.log('Fixed SettlementList.tsx');

// Fix useSettlementHandlers.ts
let ush = readFile('src/components/features/settlement/useSettlementHandlers.ts');
// fileList is possibly undefined - need non-null assertion after the check
let ushLines = ush.split('\n');
// The pattern is: const fileList = settlement.files?.length > 0 ? settlement.files : []
// Then fileList.length and fileList.forEach
// The ternary should result in a definite type, but TS sees the result as possibly undefined
ushLines[153] = ushLines[153].replace(
  'const fileList = settlement.files?.length > 0 ? settlement.files',
  'const fileList = (settlement.files?.length ?? 0) > 0 ? settlement.files!'
);
ush = ushLines.join('\n');
writeFile('src/components/features/settlement/useSettlementHandlers.ts', ush);
console.log('Fixed useSettlementHandlers.ts');
