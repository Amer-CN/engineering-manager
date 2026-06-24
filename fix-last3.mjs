import fs from 'fs';
import path from 'path';

const ROOT = 'E:\\测试';
const readFile = (p) => fs.readFileSync(path.join(ROOT, p), 'utf-8');
const writeFile = (p, content) => fs.writeFileSync(path.join(ROOT, p), content, 'utf-8');

// Fix WageRecordsTab.tsx
let wrt = readFile('src/components/features/wages/WageRecordsTab.tsx');
wrt = wrt.replace(
  'if (file && (file as any).path ?? "") {',
  'if (file && (file as any).path) {'
);
wrt = wrt.replace(
  'onBankReceiptUpload((file as File & { path?: string }).path)',
  'onBankReceiptUpload((file as any).path)'
);
writeFile('src/components/features/wages/WageRecordsTab.tsx', wrt);
console.log('Fixed WageRecordsTab.tsx');

// Fix useMembersEditHandlers.ts
let umeh = readFile('src/hooks/useMembersEditHandlers.ts');
let umehLines = umeh.split('\n');
// Line 23: const val = (formData as any)[key]
// Line 24: if (val && !val.startsWith('data:')) ...
// The issue is that (formData as any)[key] should return `any`, not `{}`
// But tsc is inferring the return type from the context
// Let me check what formData type is
console.log('UMEH full context:');
for (let i = 18; i < 40; i++) console.log((i+1) + ': ' + umehLines[i]);
