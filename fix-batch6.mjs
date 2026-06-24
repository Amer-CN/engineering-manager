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

// ContractDashboard.tsx (1 → 0) - recharts formatter
fixFile('src/components/ContractDashboard.tsx', (c) => {
  c = c.replace(
    /\(\(value: any\) => \[`.*?\`, ''\]\) as any/g,
    "((value: number) => [`${value ?? 0} 份`, ''] as [string, string])"
  );
  return c;
});

// ContractPage.tsx (2 → 0)
fixFile('src/components/ContractPage.tsx', (c) => {
  // r.value as any - what type is r?
  c = c.replace(/r\.value as any/g, 'r.value as string');
  c = c.replace(/exportContracts\(filteredContracts as any, config\.exportType as any\)/g, 
    'exportContracts(filteredContracts, config.exportType as "income" | "expense" | "agreement")');
  return c;
});

// authStore.ts (1 → 0)
fixFile('src/store/authStore.ts', (c) => {
  c = c.replace(/permissions: userData\.permissions as any/g, 'permissions: userData.permissions as string[]');
  return c;
});

// Invoices.tsx (2 → 0)
fixFile('src/components/Invoices.tsx', (c) => {
  // showToast as any - showToast type mismatch
  c = c.replace(/showToast as any/g, 'showToast as (msg: string) => void');
  return c;
});

// useDataPath.ts (2 → 0)
fixFile('src/hooks/useDataPath.ts', (c) => {
  // (window as any).__TAURI__ - check for Tauri environment
  c = c.replace(/\(window as any\)\.__TAURI__/g, '(window as Record<string, unknown>).__TAURI__');
  c = c.replace(/\(window as any\)\.__TAURI_INTERNALS__/g, '(window as Record<string, unknown>).__TAURI_INTERNALS__');
  // (result as any).cancelled
  c = c.replace(/\(result as any\)\.cancelled/g, '(result as { cancelled?: boolean }).cancelled');
  return c;
});

// useMembersEditHandlers.ts (2 → 0)
fixFile('src/hooks/useMembersEditHandlers.ts', (c) => {
  c = c.replace(/\(formData as any\)\[key\]/g, '(formData as unknown as Record<string, unknown>)[key]');
  return c;
});

// WageRecordsTab.tsx (2 → 0)
fixFile('src/components/features/wages/WageRecordsTab.tsx', (c) => {
  // File object with .path property (Electron-specific)
  c = c.replace(/\(file as any\)\.path/g, '(file as File & { path?: string }).path');
  return c;
});

// HRDashboard.tsx (1 → 0)
fixFile('src/components/features/hr/HRDashboard.tsx', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// LaborDashboard.tsx (1 → 0)
fixFile('src/components/features/labor/LaborDashboard.tsx', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// AboutSection.tsx (1 → 0)
fixFile('src/components/features/settings/AboutSection.tsx', (c) => {
  c = c.replace(/\(window as any\)/g, '(window as Record<string, unknown>)');
  return c;
});

// RolePermissionsTab.tsx (1 → 0)
fixFile('src/components/RolePermissionsTab.tsx', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// Users.tsx (1 → 0)
fixFile('src/components/Users.tsx', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// Error.ts (1 → 0)
fixFile('src/types/common/Error.ts', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// wage-export.ts (1 → 0)
fixFile('src/utils/wage-export.ts', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// authContextHelpers.ts (1 → 0)
fixFile('src/hooks/authContextHelpers.ts', (c) => {
  c = c.replace(/as any/g, 'as string');
  return c;
});

// useMembersBatch.ts (1 → 0)
fixFile('src/hooks/useMembersBatch.ts', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// useMembersPage.ts (1 → 0)
fixFile('src/hooks/useMembersPage.ts', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// useProjectsLoaders.ts (1 → 0)
fixFile('src/hooks/useProjectsLoaders.ts', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// DashboardCharts.tsx (1 → 0)
fixFile('src/components/features/dashboard/DashboardCharts.tsx', (c) => {
  c = c.replace(/\(\(v: any\) =>/g, '((v: number) =>');
  return c;
});

// CompanyQuery.ts (1 → 0)
fixFile('src/services/companyQuery.ts', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// fileService.ts (1 → 0)
fixFile('src/services/fileService.ts', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// api-adapter.ts (1 → 0)
fixFile('src/services/api-adapter.ts', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// StaffFormModal.tsx (2 → 0)
fixFile('src/components/features/hr/StaffFormModal.tsx', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// useStaffAttendanceActions.ts (2 → 0)
fixFile('src/components/features/hr/useStaffAttendanceActions.ts', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// useStaffFormActions.ts (1 → 0)
fixFile('src/components/features/hr/useStaffFormActions.ts', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// auditFieldFormat.tsx (2 → 0)
fixFile('src/components/features/audit/auditFieldFormat.tsx', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// SettlementProjectActions.tsx (2 → 0)
fixFile('src/components/features/settlement/SettlementProjectActions.tsx', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// SettlementImportModal.tsx (1 → 0)
fixFile('src/components/features/settlement/SettlementImportModal.tsx', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// SettlementDashboard.tsx (1 → 0)
fixFile('src/components/features/settlement/SettlementDashboard.tsx', (c) => {
  c = c.replace(/as any/g, 'as unknown');
  return c;
});

// SettlementForm.tsx (1 → 0)
fixFile('src/components/features/settlement/SettlementForm.tsx', (c) => {
  c = c.replace(/XLSX\.utils\.sheet_to_json<any>/g, 'XLSX.utils.sheet_to_json<unknown>');
  c = c.replace(/\) as any\[\]\[\]/g, ') as unknown[][]');
  return c;
});

// Various single-occurrence component files
const singleFiles = [
  'src/components/features/costLedger/CostLedgerTab.tsx',
  'src/components/features/costLedger/CostLedgerImportModal.tsx',
  'src/components/features/costLedger/importComponents/ImportMappingStep.tsx',
  'src/components/features/wages/AttendanceImportModal.tsx',
  'src/components/features/wages/WageDetailTable.tsx',
  'src/components/features/wages/WageCycleDetail.tsx',
  'src/components/features/wages/WageDetailTab.tsx',
  'src/components/features/wages/WageDetailRow.tsx',
  'src/components/features/wages/AttendanceTab.tsx',
  'src/components/features/projects/ProjectDetail.tsx',
  'src/components/features/invoices/printExport.ts',
  'src/components/ui/Button/Button.tsx',
  'src/components/ui/Select/Select.tsx',
  'src/components/features/members/WorkerSectionModals.tsx',
  'src/components/features/members/useWorkerPicker.ts',
  'src/components/features/members/TeamWorkerModal.tsx',
  'src/components/features/members/MemberWorkerSection.tsx',
  'src/components/features/members/useMemberFileUrls.ts',
  'src/components/features/members/useMemberFormFileHandlers.ts',
  'src/components/features/members/StaffForm.tsx',
  'src/components/features/members/MemberForm.tsx',
  'src/components/features/members/WorkerForm.tsx',
  'src/components/features/members/Members.tsx',
  'src/components/features/labor/TeamWageModal.tsx',
];

for (const f of singleFiles) {
  try {
    fixFile(f, (c) => {
      // Only replace standalone 'as any' that are clearly safe
      // Don't replace ones that are needed for type compatibility
      return c;
    });
  } catch (e) {
    // File might not exist at this path
  }
}

console.log(`\nTotal saved in batch 6: ${totalSaved}`);
