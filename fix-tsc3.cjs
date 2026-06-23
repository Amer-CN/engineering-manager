const fs = require("fs");

// Fix Dashboard.tsx - motion.button with variant
{
  const f = "src/components/Dashboard.tsx";
  let content = fs.readFileSync(f, "utf8");
  content = content.replace(
    "variant=\"primary\" className=\"text-sm\">重试</motion.button>",
    "className=\"bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-lg transition-colors\">重试</motion.button>"
  );
  fs.writeFileSync(f, content, "utf8");
  console.log("Dashboard.tsx: fixed");
}

// Fix ContractPreviewModal.tsx - check import
{
  const f = "src/components/features/contracts/ContractPreviewModal.tsx";
  let content = fs.readFileSync(f, "utf8");
  // Check if Button import exists
  if (!content.includes("import { Button }")) {
    // Add after Icon import
    content = content.replace(
      "import { Icon } from './ui/Icon'",
      "import { Icon } from './ui/Icon'\nimport { Button } from '../ui/Button'"
    );
  }
  // Also check if the <a> was properly changed to <Button as="a"
  if (content.includes("<a href={previewFile.data}")) {
    content = content.replace(
      "<a href={previewFile.data}",
      "<Button as=\"a\" href={previewFile.data}"
    );
  }
  fs.writeFileSync(f, content, "utf8");
  console.log("ContractPreviewModal.tsx: fixed");
}

// Fix SettingsSqliteSection.tsx - check import
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
  console.log("SettingsSqliteSection.tsx: fixed");
}

console.log("Done");