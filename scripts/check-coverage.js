const fs = require('fs');
const path = require('path');

const covPath = 'coverage/coverage-final.json';
if (!fs.existsSync(covPath)) {
  console.log('No coverage-final.json found. Run coverage first: npx vitest run --coverage');
  process.exit(0);
}

const cov = JSON.parse(fs.readFileSync(covPath, 'utf8'));
const results = [];

for (const [file, data] of Object.entries(cov)) {
  const stmts = data.s;
  if (!stmts) continue;
  let total = 0, covered = 0;
  for (const [k, v] of Object.entries(stmts)) { total++; if (v > 0) covered++; }
  if (total === 0) continue;
  const pct = ((covered / total) * 100).toFixed(1);
  if (parseFloat(pct) < 50) {
    results.push({ file: path.basename(file), pct, covered, total });
  }
}

results.sort((a, b) => parseFloat(a.pct) - parseFloat(b.pct));
console.log('Files with < 50% coverage (sorted by coverage ascending):');
results.slice(0, 40).forEach(r => {
  console.log(`  ${r.pct}%  (${r.covered}/${r.total})  ${r.file}`);
});
