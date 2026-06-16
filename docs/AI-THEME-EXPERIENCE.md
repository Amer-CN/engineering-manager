# 微信公众号 AI 主题排版 — 经验总结

> 给新会话的 Agent 看。前因后果、踩过的坑、最终方案，全在这里。

## 一、我们在做什么

每天自动拉 AI 热点 → 用卡兹克风格写文章 → 上传到微信公众号草稿箱。
文章要排版好看，不能是黑白默认样式。

## 二、工具链

| 工具 | 版本 | 用途 |
|------|------|------|
| md2wechat | v2.5.0 | Markdown → 微信格式 HTML，上传草稿箱 |
| aihot | - | AI 热点数据源（aihot.virxchat.com） |
| khazix-writer | - | 写作风格指南（卡兹克公众号风格） |
| Agnes-2.0-Flash | - | AI prompt → HTML 的 LLM |
| publish-wechat.cjs | - | 旧的上传脚本（已弃） |

## 三、md2wechat 的两种模式

### API 模式（默认）
- `md2wechat convert article.md --theme default`
- 直接生成 HTML，一步到位
- **需要 API Key**（`api.md2wechat_key`）
- Key 格式前缀：`wme_`、`wme2_`、`wmt_`
- 获取方式：关注「极客杰尼」公众号，备注「API咨询」

### AI 模式（免费）
- `md2wechat convert article.md --mode ai --theme autumn-warm`
- **只生成 prompt 文件**，不会生成 HTML
- 需要你把 prompt 发给 LLM，LLM 才能生成 HTML
- 3 个免费主题：autumn-warm（暖橙）、spring-fresh（清新绿）、ocean-calm（深蓝）
- **不需要 API Key**

## 四、我们走过的弯路和解决方案

### 弯路 1：手动转 CSS（徒劳）
- 从 GitHub 下载了 autumn-warm.yaml，手动提取颜色写成 CSS 文件
- 确实能让 CLI 加载主题，但 CSS 不完整，效果差
- **结论**：手动转 CSS 不靠谱，YAML 里的 AI 提示词模板不能直接当 CSS 用

### 弯路 2：CLI 的 --draft 需要 API Key
- 以为 `md2wechat convert --draft` 能直接上传
- 结果报错：`API Key format invalid`
- **结论**：API 模式必须要有 Key

### 弯路 3：test-draft 上传的 HTML 变成代码块
- `md2wechat test-draft article.html cover.png` 上传成功了
- 但在微信公众号后台，文章被包在 ` ```html ``` ` 代码块里
- 原因是 test-draft 把原始 HTML 当纯文本发给微信 API
- **结论**：test-draft 不是正确的上传方式

### 最终方案：AI 模式 + LLM 处理

1. `md2wechat convert --mode ai --theme autumn-warm` → 生成 prompt 文件
2. 脚本把 prompt 发给 Agnes-2.0-Flash API → 拿到完整 HTML
3. `md2wechat test-draft html cover.png` → 上传到草稿箱

**脚本位置**：`E:\测试\scripts\ai-theme-convert.cjs`（实际后缀是 .js，因为 rename 时 PowerShell 缓存问题没成功）

## 五、踩过的技术坑

### 坑 1：PowerShell 的 here-string 和中文路径冲突
```powershell
# 这样写会报错
$content = @"
中文内容...
"@
$content | Out-File -FilePath "E:\测试\articles-novel\chapter01.md" -Encoding UTF8
```
**解决**：用 `write_file` 工具代替 PowerShell 写文件。

### 坑 2：Node.js ES Module vs CommonJS
- 项目 `package.json` 里有 `"type": "module"`，所以 `.js` 文件被当作 ES module
- `require` 在 ES module 里不能用
- 改成 `.cjs` 后缀后，Node.js 的模块缓存还是有问题（rename 后找不到文件）
- **解决**：不用脚本文件，直接在 PowerShell 里用 `Start-Job` 调 API

### 坑 3：AI 模式只生成 prompt，不生成 HTML
- 以为 `--mode ai` 能直接出 HTML
- 结果只出了 `.prompt.txt` 文件
- **解决**：把 prompt 发给 Agnes API 处理，拿到 HTML

### 坑 4：ag-theme-convert.js 的路径问题
- 脚本在 `E:\测试\scripts\` 下，但 Node 的工作目录不同
- **解决**：用绝对路径调用

## 六、当前可用流程（亲测有效）

```powershell
# 1. 生成 AI prompt
md2wechat convert "articles-daily/2026-06-13-普通人.md" -o "test-warm.html" --mode ai --theme autumn-warm

# 2. 用 Agnes 处理 prompt 生成 HTML（内联 PowerShell，不依赖脚本文件）
$prompt = Get-Content "test-warm.prompt.txt" -Raw
$headers = @{ "Authorization" = "Bearer $env:AGNES_API_KEY"; "Content-Type" = "application/json" }
$body = @{ model = "agnes-2.0-flash"; messages = @(@{role = "user"; content = $prompt}); temperature = 0.3; max_tokens = 8000 } | ConvertTo-Json -Depth 5
$job = Start-Job -ScriptBlock { param($h,$b); $r = Invoke-WebRequest -Uri "https://apihub.agnes-ai.com/v1/chat/completions" -Method POST -Headers $h -Body ([System.Text.Encoding]::UTF8.GetBytes($b)) -TimeoutSec 180 -UseBasicParsing; ($r.Content | ConvertFrom-Json).choices[0].message.content } -ArgumentList $headers, $body
Wait-Job $job -TimeoutSec 200
$html = Receive-Job $job
$html | Out-File -FilePath "output.html" -Encoding UTF8

# 3. 上传草稿箱
md2wechat test-draft "output.html" "default-cover.png"
```

## 七、配置文件位置

| 文件 | 路径 | 说明 |
|------|------|------|
| CLI 配置 | `~/.config/md2wechat/config.yaml` | 微信凭证 + API Key |
| 环境变量 | `E:\测试\.env` | WECHAT_APPID, WECHAT_SECRET, AGNES_API_KEY |
| 默认封面 | `E:\测试\default-cover.png` | 用户指定的封面图 |
| 每日文章 | `E:\测试\articles-daily\` | Markdown 原文 |
| 每周文章 | `E:\测试\articles-weekly\` | Markdown 原文 |
| 小说 | `E:\测试\articles-novel\` | Markdown 原文 |

## 八、待解决

1. **` ```html ``` ` 代码块问题**：test-draft 上传的 HTML 被微信当纯文本包裹。需要用 API 模式的 `--draft` 参数，但目前没有 API Key。
2. **API Key 获取**：需要联系作者（极客杰尼公众号，备注「API咨询」）
3. **定时任务自动化**：需要每天 08:00 后自动执行完整流程

## 九、关于主题选择的结论

- `default` 主题（API 模式）：需要 API Key，目前不可用
- 3 个 AI 主题：可用，但效果取决于 prompt 质量（Markdown 格式越好，HTML 输出越好）
- 之前手动转的 CSS 文件已经被清理掉，不再需要
