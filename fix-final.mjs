import fs from 'fs';
import path from 'path';

const ROOT = 'E:\\测试';

// Fix SettlementForm.tsx - add SettlementItem import
const sfPath = path.join(ROOT, 'src/components/features/settlement/SettlementForm.tsx');
let sf = fs.readFileSync(sfPath, 'utf-8');
if (!sf.includes("import type { SettlementItem")) {
  sf = sf.replace(
    /^(import .+ from .+;)$/m,
    "$1\nimport type { SettlementItem } from '@/types'"
  );
}
fs.writeFileSync(sfPath, sf, 'utf-8');
console.log('Fixed SettlementForm.tsx - added SettlementItem import');

// Fix AttendanceTab.tsx line 118 - projectWorkerId undefined
const atPath = path.join(ROOT, 'src/components/features/wages/AttendanceTab.tsx');
let at = fs.readFileSync(atPath, 'utf-8');
at = at.replace(
  /\(item as AttendanceRow\)\.projectWorkerId/g,
  '((item as AttendanceRow).projectWorkerId ?? 0)'
);
fs.writeFileSync(atPath, at, 'utf-8');
console.log('Fixed AttendanceTab.tsx - projectWorkerId');
