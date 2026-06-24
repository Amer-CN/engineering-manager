import fs from 'fs';
import path from 'path';

const ROOT = 'E:\\测试';
const readFile = (p) => fs.readFileSync(path.join(ROOT, p), 'utf-8');
const writeFile = (p, content) => fs.writeFileSync(path.join(ROOT, p), content, 'utf-8');
const countAsAny = (c) => (c.match(/\bas any\b/g) || []).length;

// These files had `as any` replaced with `as unknown` which broke things
// Revert them back to `as any` - the cost is too high
const revertFiles = [
  // auditFieldFormat.tsx - needs to access .old and .new on unknown objects
  'src/components/features/audit/auditFieldFormat.tsx',
  // HRDashboard.tsx - formatter
  'src/components/features/hr/HRDashboard.tsx',
  // StaffFormModal.tsx - partial form data
  'src/components/features/hr/StaffFormModal.tsx',
  // LaborDashboard.tsx - formatter
  'src/components/features/labor/LaborDashboard.tsx',
  // AboutSection.tsx - window access
  'src/components/features/settings/AboutSection.tsx',
  // SettlementDashboard.tsx
  'src/components/features/settlement/SettlementDashboard.tsx',
  // SettlementProjectActions.tsx
  'src/components/features/settlement/SettlementProjectActions.tsx',
  // RolePermissionsTab.tsx - permissions array
  'src/components/RolePermissionsTab.tsx',
  // Users.tsx - auth context
  'src/components/Users.tsx',
  // authContextHelpers.ts
  'src/hooks/authContextHelpers.ts',
  // useDataPath.ts
  'src/hooks/useDataPath.ts',
  // useMembersEditHandlers.ts
  'src/hooks/useMembersEditHandlers.ts',
  // useMembersPage.ts
  'src/hooks/useMembersPage.ts',
  // useProjectsLoaders.ts
  'src/hooks/useProjectsLoaders.ts',
  // api-adapter.ts
  'src/services/api-adapter.ts',
  // companyQuery.ts
  'src/services/companyQuery.ts',
  // fileService.ts
  'src/services/fileService.ts',
  // authStore.ts
  'src/store/authStore.ts',
  // Error.ts
  'src/types/common/Error.ts',
  // wage-export.ts
  'src/utils/wage-export.ts',
  // useStaffFormActions.ts
  'src/components/features/hr/useStaffFormActions.ts',
  // useStaffAttendanceActions.ts
  'src/components/features/hr/useStaffAttendanceActions.ts',
  // useMembersBatch.ts
  'src/hooks/useMembersBatch.ts',
  // SettlementImportModal.tsx
  'src/components/features/settlement/SettlementImportModal.tsx',
];

let totalReverted = 0;

for (const f of revertFiles) {
  try {
    const before = readFile(f);
    const after = before.replace(/\bas unknown\b/g, 'as any');
    const bCount = countAsAny(before);
    const aCount = countAsAny(after);
    if (aCount > bCount) {
      writeFile(f, after);
      console.log(`${f}: reverted ${aCount - bCount} back to 'as any'`);
      totalReverted += aCount - bCount;
    }
  } catch (e) {
    console.log(`${f}: ${e.message}`);
  }
}

// Special fixes for files that need specific types:

// ContractDashboard.tsx - recharts formatter needs `as any` for recharts compatibility
let cd = readFile('src/components/ContractDashboard.tsx');
cd = cd.replace(
  "((value: number) => [`${value ?? 0} 份`, ''] as [string, string])",
  "((value: number) => [`${value ?? 0} 份`, ''] as [string, string]) as any"
);
writeFile('src/components/ContractDashboard.tsx', cd);

// ContractPage.tsx - exportContracts expects specific types
let cp = readFile('src/components/ContractPage.tsx');
cp = cp.replace("r.value as string", "r.value as any");
writeFile('src/components/ContractPage.tsx', cp);

// Invoices.tsx - showToast type mismatch
let inv = readFile('src/components/Invoices.tsx');
inv = inv.replace("showToast as (msg: string) => void", "showToast as any");
writeFile('src/components/Invoices.tsx', inv);

// WageRecordsTab.tsx - File path
let wrt = readFile('src/components/features/wages/WageRecordsTab.tsx');
wrt = wrt.replace("(file as File & { path?: string }).path", "(file as any).path");
writeFile('src/components/features/wages/WageRecordsTab.tsx', wrt);

console.log(`\nTotal reverted: ${totalReverted}`);
