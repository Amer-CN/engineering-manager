const fs = require("fs");
const path = require("path");

const colorFiles = [
  "src/components/features/contracts/contractsColors.ts",
  "src/components/features/costLedger/costLedgerColors.ts",
  "src/components/features/costLedger/printExportColors.ts",
  "src/components/features/dashboard/dashboardColors.ts",
  "src/components/features/hr/hrColors.ts",
  "src/components/features/invoices/invoicesPrintExportColors.ts",
  "src/components/features/labor/laborColors.ts",
  "src/components/features/projects/projectsColors.ts",
  "src/components/features/settlement/settlementColors.ts",
  "src/components/features/templates/templatesColors.ts",
  "src/utils/wageExportColors.ts"
];

for (const f of colorFiles) {
  const content = fs.readFileSync(f, "utf8");
  const lines = content.split(/\r?\n/);
  const hexMatches = content.match(/#[0-9a-fA-F]{6}/g) || [];
  const lineCount = lines.length;
  console.log(path.relative(process.cwd(), f) + ": " + hexMatches.length + " hex, " + lineCount + " lines");
  // Show unique hex values
  const unique = [...new Set(hexMatches)];
  console.log("  unique: " + unique.join(", "));
  console.log("");
}