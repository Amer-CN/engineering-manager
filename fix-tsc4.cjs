const fs = require("fs");

// Fix ContractPreviewModal.tsx - add Button import
{
  const f = "src/components/features/contracts/ContractPreviewModal.tsx";
  let content = fs.readFileSync(f, "utf8");
  if (!content.includes("import { Button }")) {
    content = content.replace(
      "import { Icon } from '../../ui/Icon'",
      "import { Icon } from '../../ui/Icon'\r\nimport { Button } from '../../ui/Button'"
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
      "import ButtonLoader from './ui/ButtonLoader'",
      "import ButtonLoader from './ui/ButtonLoader'\r\nimport { Button } from '../ui/Button'"
    );
  }
  fs.writeFileSync(f, content, "utf8");
  console.log("SettingsSqliteSection.tsx: added Button import");
}

console.log("Done");