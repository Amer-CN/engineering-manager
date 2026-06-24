import fs from 'fs';
import path from 'path';

const ROOT = 'E:\\测试';
const p = path.join(ROOT, 'src/components/features/settlement/SettlementForm.tsx');
let c = fs.readFileSync(p, 'utf-8');
c = c.replace(
  "import { Settlement as SettlementData, Project, Partner } from '../../../types/electron'",
  "import { Settlement as SettlementData, SettlementItem, Project, Partner } from '../../../types/electron'"
);
fs.writeFileSync(p, c, 'utf-8');
console.log('Added SettlementItem to existing import');
