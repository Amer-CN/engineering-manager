const fs = require("fs");

// Fix ContractPreviewModal.tsx - Button doesnt support "as" prop
// Change <Button as="a" ...> to <a> with Button-like styling
{
  const f = "src/components/features/contracts/ContractPreviewModal.tsx";
  let content = fs.readFileSync(f, "utf8");
  content = content.replace(
    "<Button as=\"a\" href={previewFile.data}\r\n                download={`合同附件.${previewFile.type === 'pdf' ? 'pdf' : previewFile.type === 'word' ? 'docx' : 'xlsx'}`}\r\n                variant=\"primary\" size=\"sm\">下载文件</Button>",
    "<a href={previewFile.data}\r\n                download={`合同附件.${previewFile.type === 'pdf' ? 'pdf' : previewFile.type === 'word' ? 'docx' : 'xlsx'}`}\r\n                className=\"inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors\">下载文件</a>"
  );
  // Remove the Button import since we are not using it
  content = content.replace("import { Button } from '../../ui/Button'\r\n", "");
  fs.writeFileSync(f, content, "utf8");
  console.log("ContractPreviewModal.tsx: fixed");
}

// Fix SettingsSqliteSection.tsx - wrong import path
{
  const f = "src/components/SettingsSqliteSection.tsx";
  let content = fs.readFileSync(f, "utf8");
  content = content.replace(
    "import { Button } from '../ui/Button'",
    "import { Button } from './ui/Button'"
  );
  fs.writeFileSync(f, content, "utf8");
  console.log("SettingsSqliteSection.tsx: fixed import path");
}

console.log("Done");