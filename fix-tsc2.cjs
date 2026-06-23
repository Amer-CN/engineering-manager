const fs = require("fs");

// Fix Dashboard.tsx - motion.button doesnt support variant
{
  const f = "src/components/Dashboard.tsx";
  let content = fs.readFileSync(f, "utf8");
  // motion.button with variant="primary" - change to className approach
  content = content.replace(
    "className=\"btn btn-primary text-sm\">重试</motion.button>",
    "className=\"bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-lg transition-colors\">重试</motion.button>"
  );
  fs.writeFileSync(f, content, "utf8");
  console.log("Dashboard.tsx: fixed motion.button");
}

// Fix ContractPreviewModal.tsx - add Button import
{
  const f = "src/components/features/contracts/ContractPreviewModal.tsx";
  let content = fs.readFileSync(f, "utf8");
  // Add Button import after the last import line
  if (!content.includes("import { Button }")) {
    content = content.replace(
      "import { Icon } from './ui/Icon'",
      "import { Icon } from './ui/Icon'\nimport { Button } from '../ui/Button'"
    );
  }
  fs.writeFileSync(f, content, "utf8");
  console.log("ContractPreviewModal.tsx: added Button import");
}

// Fix SettingsSqliteSection.tsx - add Button import
{
  const f = "src/components/SettingsSqliteSection.tsx";
  let content = fs.readFileSync(f, "utf8");
  if (!content.includes("import { Button }")) {
    content = content.replace(
      "import { ButtonLoader } from '../ui/ButtonLoader'",
      "import { ButtonLoader } from '../ui/ButtonLoader'\nimport { Button } from '../ui/Button'"
    );
  }
  fs.writeFileSync(f, content, "utf8");
  console.log("SettingsSqliteSection.tsx: added Button import");
}

console.log("All tsc error fixes done");