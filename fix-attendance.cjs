const fs = require('fs');
const f = 'src/components/AttendanceDetail.tsx';
let lines = fs.readFileSync(f, 'utf8').split('\n');
let result = [];
let i = 0;
let hasButtonImport = false;

while (i < lines.length) {
  const line = lines[i];
  if (line.includes("import { Button }") || line.includes("import Button")) hasButtonImport = true;

  // Fix 1: 返回 button (line ~169, with duplicate Icon lines)
  if (line.includes('<button onClick={onBack} className="btn btn-ghost')) {
    result.push('  <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-1">');
    result.push('    <Icon name="ChevronLeft" size={18} /><span className="text-sm">返回</span>');
    result.push('  </Button>');
    while (i < lines.length && !lines[i].trim().startsWith('</button>')) i++;
    i++;
    continue;
  }

  // Fix 2: 删除 button (lines ~182-191)
  if (line.includes('<button onClick={async () => {') && i+1 < lines.length && lines[i+1]?.includes('confirm')) {
    result.push('            <Button variant="danger" size="sm" onClick={async () => {');
    i++;
    while (i < lines.length) {
      if (lines[i].includes('className="btn btn-danger btn-sm">')) {
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('</button>')) {
          result.push('    ' + lines[i].trimStart());
          i++;
        }
        result.push('  </Button>');
        i++;
        break;
      }
      result.push('  ' + lines[i].trimStart());
      i++;
    }
    continue;
  }

  // Fix 3: 保存 button (line ~193)
  if (line.includes('<button onClick={handleSave}') && line.includes('className="btn btn-primary')) {
    result.push('  <Button variant="primary" onClick={handleSave} disabled={saving} className="text-sm px-5 py-2">');
    i++;
    while (i < lines.length && !lines[i].trim().startsWith('</button>')) {
      result.push('    ' + lines[i].trimStart());
      i++;
    }
    result.push('  </Button>');
    i++;
    continue;
  }

  result.push(line);
  i++;
}

if (!hasButtonImport) {
  for (let j = 0; j < result.length; j++) {
    if (result[j].includes("import { Tooltip }")) {
      result.splice(j + 1, 0, "import { Button } from './ui/Button'");
      break;
    }
  }
}

fs.writeFileSync(f, result.join('\n'), 'utf8');
console.log('AttendanceDetail.tsx done');
