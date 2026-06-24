import fs from 'fs';
import path from 'path';

const ROOT = 'E:\\测试';
const readFile = (p) => fs.readFileSync(path.join(ROOT, p), 'utf-8');
const writeFile = (p, content) => fs.writeFileSync(path.join(ROOT, p), content, 'utf-8');

// Fix invoices/constants.ts - expand import
let constants = readFile('src/components/features/invoices/constants.ts');
constants = constants.replace(
  "import type { InvoiceType } from '@/types'",
  "import type { InvoiceType, InvoiceTaxRate, InvoiceKind, Invoice, PaymentRecord } from '@/types'"
);
writeFile('src/components/features/invoices/constants.ts', constants);
console.log('Fixed invoices/constants.ts');

// Fix ContractFormModal.tsx line 144
let cfm = readFile('src/components/features/contracts/ContractFormModal.tsx');
let cfmLines = cfm.split('\n');
console.log('CFM line 144:', cfmLines[143]);
// The status cast is wrong - it's casting to ContractStatus but expecting PaymentMethod
// Fix: e.target.value as typeof formData.status was wrong replacement
// Actually line 143 had `e.target.value as any` for paymentMethod select
// and line 150 had `e.target.value as any` for status select
// The error says ContractStatus is not assignable to PaymentMethod - so the casts got swapped
// Let me check both lines
console.log('CFM line 143:', cfmLines[142]);
console.log('CFM line 150:', cfmLines[149]);
writeFile('src/components/features/contracts/ContractFormModal.tsx', cfm);

// Fix LaborWorkerList.tsx - workerId undefined
let lwl = readFile('src/components/features/labor/LaborWorkerList.tsx');
let lwlLines = lwl.split('\n');
console.log('LWL line 126:', lwlLines[125]);

// Fix useMemberOperations.ts - cast needs unknown first
let umo = readFile('src/components/features/members/useMemberOperations.ts');
// Line 83 and 145: data as Record<string, unknown> needs unknown first
umo = umo.replace(
  /const d = data as Record<string, unknown>/g,
  'const d = data as unknown as Record<string, unknown>'
);
writeFile('src/components/features/members/useMemberOperations.ts', umo);
console.log('Fixed useMemberOperations.ts');

// Fix SettlementForm.tsx - files and items issues
let sfm = readFile('src/components/features/settlement/SettlementForm.tsx');
let sfmLines = sfm.split('\n');
console.log('SF line 54:', sfmLines[53]);
console.log('SF line 56:', sfmLines[55]);
console.log('SF line 58:', sfmLines[57]);

// Fix SettlementList.tsx - optional chaining
let sl = readFile('src/components/features/settlement/SettlementList.tsx');
let slLines = sl.split('\n');
console.log('SL line 64:', slLines[63]);
console.log('SL line 66:', slLines[65]);
console.log('SL line 75:', slLines[74]);

// Fix useSettlementHandlers.ts
let ush = readFile('src/components/features/settlement/useSettlementHandlers.ts');
let ushLines = ush.split('\n');
console.log('USH line 154:', ushLines[153]);
console.log('USH line 161:', ushLines[160]);

// Fix AttendanceTab.tsx - AttendanceRow -> AttendanceRecord
let at = readFile('src/components/features/wages/AttendanceTab.tsx');
// The import might have been added but the rename didn't work
if (at.includes('AttendanceRow') && !at.includes('as AttendanceRow')) {
  at = at.replace(/AttendanceRow/g, 'AttendanceRecord');
}
writeFile('src/components/features/wages/AttendanceTab.tsx', at);
console.log('Fixed AttendanceTab.tsx');
