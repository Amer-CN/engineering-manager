const fs = require("fs");
const f = "src/components/SettingsSqliteSection.tsx";
let content = fs.readFileSync(f, "utf8");

const oldBtn = "<button\n                onClick={onRemigrate}\n                disabled={migrating || !isDataSparse}\n                className={`${isDataSparse ? 'btn btn-primary' : 'btn btn-secondary'} ${!isDataSparse ? 'opacity-50 cursor-not-allowed' : ''}`}\n              >\n                <ButtonLoader loading={migrating} loadingText=\"AI 正在同步...\">\n                  <><Icon name=\"RefreshCw\" size={16} /> {isDataSparse ? 'AI 同步数据' : '重新优化存储'}</>\n                </ButtonLoader>\n              </button>";

const newBtn = "<Button\n                variant={isDataSparse ? 'primary' : 'secondary'}\n                onClick={onRemigrate}\n                disabled={migrating || !isDataSparse}\n                className={!isDataSparse ? 'opacity-50 cursor-not-allowed' : undefined}>\n                <ButtonLoader loading={migrating} loadingText=\"AI 正在同步...\">\n                  <><Icon name=\"RefreshCw\" size={16} /> {isDataSparse ? 'AI 同步数据' : '重新优化存储'}</>\n                </ButtonLoader>\n              </Button>";

if (content.includes(oldBtn)) {
  content = content.replace(oldBtn, newBtn);
} else {
  console.log("WARNING: old button not found, trying line-by-line approach");
}

if (!content.includes("import { Button }")) {
  const lines = content.split("\n");
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) lastImport = i;
  }
  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, "import { Button } from '../ui/Button'");
    content = lines.join("\n");
  }
}

fs.writeFileSync(f, content, "utf8");
console.log("SettingsSqliteSection.tsx done");
