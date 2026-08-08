# L-WINDOW-AUDIT.md — L 窗口审查发现（M-FIX9 W4/W5）

## 1. [发现项] WagePaymentRecords 回单查看断链（W4a）

**症状**：`src/components/features/wages/WagePaymentRecords.tsx:110`「查看回单」按钮调
`openExternalFile({ category: 'bank_receipts', subCategory: '', fileName: bankReceiptPath, projectName: undefined })`。

**后端路径解析**（`EngineeringManager.Api/Endpoints/FileEndpoints.cs:258-264`）：
```
var dir = Path.Combine(baseDir, category);       // baseDir = {data}/uploads
var path = Path.Combine(dir, fileName);          // → {data}/uploads/bank_receipts/{fileName}
```
→ 实际按 `{data}/uploads/bank_receipts/` 定位。

**K-2 保存约定**（`src/services/fileService.ts:24` + `tauri-bridge.ts:291`）：
```
WAGE_BANK_RECEIPT: { category: 'wages', subCategory: 'bank-receipts' }
→ 保存/读取在 {data}/uploads/wages/bank-receipts/{fileName}
```

**结论**：读侧 category='bank_receipts' 定位 `{data}/uploads/bank_receipts/`（不存在），
后端 `File.Exists(path)` 为 false → 返回 `Common.NotFound("文件不存在")`（404）。
**确凿断链**：WagePaymentRecords 的「查看回单」按钮点击必然 404。
L-1 自认「桥接层原样透传不篡改（调用方问题，不在本任务范围）」。

**处置**：只报告不修（纪律 1）。修复方向（R9）：WagePaymentRecords.tsx:110 的
category 改 `'wages'` + subCategory `'bank-receipts'`，或复用 fileService.WAGE_BANK_RECEIPT。
顺带确认 BankReceiptBatch.tsx:63 用 `category: 'wages', subCategory: 'bank-receipts'`（正确，唯一正确调用方）。
**R9 联动（M-FIX11 U6）**：举证测试 `EngineeringManager.Tests/Endpoints/MFix10BreakChainTests.cs`
类注释已加 `// R9-TODO`——R9 修复 category 后必须同步改写该测试（否则永久锁定错误行为），
并移除其反向对照断言依赖。本文件 §1 即该断链的持久证据。

## 2. open-external 白名单审计（W4b）

白名单原文（`FileEndpoints.cs:26-33`）：
```
.pdf .doc .docx .xls .xlsx .ppt .pptx .txt .csv .rtf   // 文档
.jpg .jpeg .png .gif .bmp .webp .tif .tiff .svg        // 图片
```
显式排除 .bat/.exe/.cmd/.ps1/.vbs/.js/.scr/.com/.msi（注释 P0-3）。

- **路径穿越**：`IsPathSafe`（FileEndpoints.cs:13-17）用 `Path.GetFullPath` 归一化后
  校验 `StartsWith(baseResolved)`；`fileName` 的 `../`、绝对路径、变体分隔符全被拦。
- **执行任意程序**：`IsOpenableExtension` 在 `Process.Start(UseShellExecute=true)` 前拦截，
  非白名单扩展名直接 `Common.Fail`。可执行扩展名不在白名单 → 无法被 shell 执行。
- **残余风险（低危，登记不修）**：`.svg` 在图片白名单内，可含内嵌脚本；若系统默认
  程序是浏览器渲染 SVG 可能 XSS。但 UseShellExecute 是「用户自己点击本地文件」的既定
  能力（需登录 + 文件已在 uploads 内），非远程执行面。
- **结论**：白名单 + IsPathSafe 双保险，**无法构造路径穿越或执行任意程序**（本地 shell
  启动仅限白名单文档/图片，且需登录 + 文件已在数据目录）。

## 3. L-2 控制符清理字节验证（W4c）

```
$ git show 9b696d9:docs/handoff/R16-R17-handoff.md | wc -c   → 4604
$ git show 8ac5d7a:docs/handoff/R16-R17-handoff.md | wc -c   → 4610
```
−6 字节（ESC/NUL/BS/FF 控制符剥离），与 L-2 commit message「剥离 6 字节」一致 ✓。
可见内容逐字节不变（diff 无 +/- 文本行，仅二进制控制符差异）。

## 4. W5 澄清：GetDefaultPermissions 谁有 wages:update

`EngineeringManager.Api/Common.cs`（行号）：
- `127` admin：含 `wages:update`（"wages:create","wages:read","wages:update","wages:delete"）
- `137-141` manager：**无** wages:update（只有 wages:read）
- `145` accountant：含 `wages:update`（"wages:create","wages:read","wages:update",...）
- `150` worker：无（只有 wages:read）

**结论**：默认角色里 **admin + accountant 有 wages:update**。T4(e) 威胁模型**不是人为造出来**
——accountant 是真实可用的非 admin 越权主体。测试注释「accountant 默认集不含 wages:update
→ 显式给全」**写错**（默认集含），测试里的 `UPDATE roles SET permissions=...` 是冗余但无害
（每测试独立库 Guid.NewGuid，见 ApiTestBase.cs:21，不污染共享角色）。

## 5. M-FIX8 错误测量自省（W2 关联）

M-FIX8 报告的「ad4ce22 带 -warnaserror build 红 → 849 假数」是**错误测量**：
- ad4ce22 不带 -warnaserror（K/L 环境）= **862/859/3**（W2a clean 实测）
- 167f03a 带 -warnaserror = **862/859/3**（W2b clean 实测，T1 已修 CS8619/CS8604）
- fix9 tip = **868/865/3**（W2c clean 实测，+6 = T2 四例 + T4(e) 两例）
- 跳过恒 3：M4ThirdRound.UploadAudio_CancelledMidStream（[Fact(Skip=)]）+ 
  SttE2ETests.E2E_MultiSpeaker + E2E_SingleSpeaker（[SttE2EFact]，RUN_STT_E2E≠1）
- **13 例差额（862−849）全部由 M-FIX8 错误测量造成**（带 --filter 排除 E2E + 编译失败缓存），
  非用例增减。849 作废，862 为真值。
