import fs from 'fs';
import path from 'path';

const ROOT = 'E:\\测试';
const readFile = (p) => fs.readFileSync(path.join(ROOT, p), 'utf-8');
const writeFile = (p, content) => fs.writeFileSync(path.join(ROOT, p), content, 'utf-8');

// AboutSection.tsx - window cast issue
let about = readFile('src/components/features/settings/AboutSection.tsx');
about = about.replace(
  /\(window as Record<string, unknown>\)/g,
  '(window as unknown as Record<string, unknown>)'
);
writeFile('src/components/features/settings/AboutSection.tsx', about);
console.log('Fixed AboutSection.tsx');

// WageRecordsTab.tsx - string | undefined not assignable to string
let wrt = readFile('src/components/features/wages/WageRecordsTab.tsx');
wrt = wrt.replace(
  /\(file as any\)\.path\)/g,
  '(file as any).path ?? "")'
);
writeFile('src/components/features/wages/WageRecordsTab.tsx', wrt);
console.log('Fixed WageRecordsTab.tsx');

// authContextHelpers.ts - permissions type mismatch
let ach = readFile('src/hooks/authContextHelpers.ts');
let achLines = ach.split('\n');
console.log('authContextHelpers.ts line 18:', achLines[17]);
// The issue: permissions: string[] is being cast to string (the 'as string' we added)
// Need to revert to 'as any'
ach = ach.replace(/as string\b/g, 'as any');
writeFile('src/hooks/authContextHelpers.ts', ach);
console.log('Fixed authContextHelpers.ts');

// useDataPath.ts - window as Record<string, unknown> cast
let udp = readFile('src/hooks/useDataPath.ts');
udp = udp.replace(
  /\(window as Record<string, unknown>\)/g,
  '(window as unknown as Record<string, unknown>)'
);
writeFile('src/hooks/useDataPath.ts', udp);
console.log('Fixed useDataPath.ts');

// useMembersEditHandlers.ts - formData as unknown as Record results in {}
// The issue is Record<string, unknown> values are unknown, but code does .startsWith and assigns to string
// Need to keep as any for the dynamic property access
let umeh = readFile('src/hooks/useMembersEditHandlers.ts');
umeh = umeh.replace(
  /\(formData as unknown as Record<string, unknown>\)/g,
  '(formData as any)'
);
writeFile('src/hooks/useMembersEditHandlers.ts', umeh);
console.log('Fixed useMembersEditHandlers.ts');

// authStore.ts - permissions: string[] not assignable to Permission[]
let authStore = readFile('src/store/authStore.ts');
authStore = authStore.replace(
  /permissions: userData\.permissions as string\[\]/g,
  'permissions: userData.permissions as any'
);
writeFile('src/store/authStore.ts', authStore);
console.log('Fixed authStore.ts');

console.log('\nDone with final fixes');
