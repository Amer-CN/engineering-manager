import fs from 'fs';
import path from 'path';

const ROOT = 'E:\\测试';

// Fix AttendanceTab.tsx
const atPath = path.join(ROOT, 'src/components/features/wages/AttendanceTab.tsx');
let at = fs.readFileSync(atPath, 'utf-8');
// Add AttendanceRow type alias after import
at = at.replace(
  "import type { Project, WorkerTeam, AttendanceRecord } from '@/types'",
  "import type { Project, WorkerTeam, AttendanceRecord } from '@/types'\ntype AttendanceRow = AttendanceRecord & { teamName?: string; projectWorkerId?: number }"
);
fs.writeFileSync(atPath, at, 'utf-8');
console.log('Added AttendanceRow type alias in AttendanceTab.tsx');

// Fix SettlementForm.tsx - spec is {} not string
const sfPath = path.join(ROOT, 'src/components/features/settlement/SettlementForm.tsx');
let sf = fs.readFileSync(sfPath, 'utf-8');
// The issue: spec: (item as unknown as Record<string, unknown>).spec || ''
// This results in type {} (unknown || string = unknown | string = {})
// Need to cast to string
sf = sf.replace(
  /spec: \(item as unknown as Record<string, unknown>\)\.spec \|\| ''/g,
  "spec: String((item as unknown as Record<string, unknown>).spec ?? '')"
);
fs.writeFileSync(sfPath, sf, 'utf-8');
console.log('Fixed SettlementForm.tsx spec type');
