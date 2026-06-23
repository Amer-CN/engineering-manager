const fs = require("fs");
const f = "src/components/SettingsSqliteSection.tsx";
let content = fs.readFileSync(f, "utf8");

const oldBtn = "<button\r\n                onClick={onRemigrate}\r\n                disabled={migrating || !isDataSparse}\r\n                className={`${isDataSparse ? 'btn btn-primary' : 'btn btn-secondary'} ${!isDataSparse ? 'opacity-50 cursor-not-allowed' : ''}`}\r\n              >\r\n                <ButtonLoader loading={migrating} loadingText=\"AI 正在同步...\">\r\n                  <><Icon name=\"RefreshCw\" size={16} /> {isDataSparse ? 'AI 同步数据' : '重新优化存储'}</>\r\n                </ButtonLoader>\r\n              </button>";

const newBtn = "<Button\r\n                variant={isDataSparse ? 'primary' : 'secondary'}\r\n                onClick={onRemigrate}\r\n                disabled={migrating || !isDataSparse}\r\n                className={!isDataSparse ? 'opacity-50 cursor-not-allowed' : undefined}>\r\n                <ButtonLoader loading={migrating} loadingText=\"AI 正在同步...\">\r\n                  <><Icon name=\"RefreshCw\" size={16} /> {isDataSparse ? 'AI 同步数据' : '重新优化存储'}</>\r\n                </ButtonLoader>\r\n              </Button>";

if (content.includes(oldBtn)) {
  content = content.replace(oldBtn, newBtn);
  console.log("Replaced button block");
} else {
  console.log("ERROR: old button block not found");
}

if (!content.includes("import { Button }")) {
  const lines = content.split(/\r?\n/);
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) lastImport = i;
  }
  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, "import { Button } from '../ui/Button'");
    content = lines.join("\r\n");
    console.log("Added Button import");
  }
}

fs.writeFileSync(f, content, "utf8");
console.log("SettingsSqliteSection.tsx done");
