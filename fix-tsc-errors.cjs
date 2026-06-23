const fs = require("fs");

// Fix ContractPreviewModal.tsx
{
  const f = "src/components/features/contracts/ContractPreviewModal.tsx";
  let content = fs.readFileSync(f, "utf8");
  // The <a> was partially converted. Fix it:
  // Change <a href=... to <Button as="a" href=...
  content = content.replace(
    "<a href={previewFile.data}",
    "<Button as=\"a\" href={previewFile.data}"
  );
  // The closing </a> was already changed to </Button> by the previous script
  // But let me verify - the issue is <a> tag not having a matching close
  // Actually the <a> was changed to <Button as="a" but the closing is </Button> which is correct
  // The error says "Expected corresponding JSX closing tag for 'a'" which means
  // the <a> was not changed to <Button> - let me check again
  fs.writeFileSync(f, content, "utf8");
  console.log("ContractPreviewModal.tsx: fixed <a> to <Button as=\"a\"");
}

// Fix SettlementItemsTable.tsx
{
  const f = "src/components/features/settlement/SettlementItemsTable.tsx";
  let content = fs.readFileSync(f, "utf8");
  // Fix Button tags that are not properly closed
  // Line 34: <Button ... >... 下载模板</button> - missing proper close
  // The issue is the buttons were replaced but </button> was not changed to </Button>
  content = content.replace(
    "下载模板</button>",
    "下载模板</Button>"
  );
  content = content.replace(
    "上传模板</button>",
    "上传模板</Button>"
  );
  content = content.replace(
    "导入其他表</button>",
    "导入其他表</Button>"
  );
  // Fix line 38: extra " before >
  content = content.replace(
    "variant=\"secondary\" size=\"sm\" \">+",
    "variant=\"secondary\" size=\"sm\">+"
  );
  // Also remove btn btn-sm from the button tags that were already converted
  content = content.replace("btn btn-sm bg-white", "bg-white");
  content = content.replace("btn btn-sm bg-primary-50", "bg-primary-50");
  content = content.replace("btn btn-sm bg-emerald-50", "bg-emerald-50");
  fs.writeFileSync(f, content, "utf8");
  console.log("SettlementItemsTable.tsx: fixed");
}

console.log("Done");