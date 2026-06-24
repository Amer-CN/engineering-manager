import fs from 'fs';
import path from 'path';

const ROOT = 'E:\\测试';
const readFile = (p) => fs.readFileSync(path.join(ROOT, p), 'utf-8');
const writeFile = (p, content) => fs.writeFileSync(path.join(ROOT, p), content, 'utf-8');

// AboutSection.tsx - cast to string
let about = readFile('src/components/features/settings/AboutSection.tsx');
about = about.replace(
  /\(window as unknown as Record<string, unknown>\)\.__APP_VERSION__ \|\| '0\.75\.3'/g,
  "String((window as unknown as Record<string, unknown>).__APP_VERSION__ ?? '0.75.3')"
);
writeFile('src/components/features/settings/AboutSection.tsx', about);
console.log('Fixed AboutSection.tsx');

// WageRecordsTab.tsx - fix the ?? operator mixing and string | undefined
let wrt = readFile('src/components/features/wages/WageRecordsTab.tsx');
let wrtLines = wrt.split('\n');
console.log('WRT line 199:', wrtLines[198]);
console.log('WRT line 200:', wrtLines[199]);
// The issue: onBankReceiptUpload((file as any).path ?? "")
// This is: file && (file as any).path ?? "" — mixed && and ??
// Need parentheses
wrt = wrt.replace(
  /onBankReceiptUpload\(\(file as any\)\.path \?\? ""\)/g,
  'onBankReceiptUpload((file as any).path ?? "")'
);
// Actually the && and ?? mixing issue is on line 199
// Let me check what line 199 actually has
writeFile('src/components/features/wages/WageRecordsTab.tsx', wrt);

// useMembersEditHandlers.ts - need to keep 'as any' for the formData dynamic access
let umeh = readFile('src/hooks/useMembersEditHandlers.ts');
// Already changed to 'as any' but still has errors?
let umehLines = umeh.split('\n');
console.log('UMEH line 24:', umehLines[23]);
console.log('UMEH line 35:', umehLines[34]);

console.log('\nDone');
