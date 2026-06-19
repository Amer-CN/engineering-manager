# 微信公众号文章上传 — 问题诊断与修复指南

## 背景

我们在用 md2wechat CLI 把 Markdown 文章上传到微信公众号草稿箱。流程是：

1. `md2wechat convert` 生成 HTML
2. `md2wechat test-draft <html> <cover>` 上传 HTML 到草稿箱

## 问题

上传成功后，在微信公众号后台预览文章，发现**文章内容被包在 ` ```html ``` ` 代码块里**，显示的是原始 HTML 源码，而不是渲染后的富文本格式。

文章开头显示 ` ```html `，结尾显示 ` ``` `，正文内容全是 HTML 标签源码。

## 根因分析

微信公众号的富文本编辑器不支持直接粘贴原始 HTML。当 `test-draft` 命令上传 HTML 文件时，微信 API 把 HTML 内容当成了纯文本，然后用 ` ```html ``` ` 代码块包裹显示。

**核心问题**：`test-draft` 不是正确的上传方式。

## 正确方案

应该使用 `md2wechat convert` 命令的 `--draft` 参数，让 CLI 通过 API 模式直接创建草稿：

```bash
md2wechat convert article.md --draft --cover cover.jpg
```

这会让 CLI 调用微信公众号 API 创建草稿，内容会被正确渲染为富文本格式。

## 当前阻塞

`--draft` 参数需要 API 模式，而 API 模式需要 `md2wechat_key`：

```
API conversion failed: API returned error code 401: Invalid API Key format.
Supported prefixes: wme_, wme2_, wmt_.
```

当前配置里 `api.md2wechat_key` 是占位符 `your_md2wechat_api_key`，没有填入真实的 Key。

## 获取 API Key 的方式

根据 md2wechat 文档和 GitHub 仓库（geekjourneyx/md2wechat-skill）：

1. 关注「极客杰尼」公众号
2. 备注「API咨询」联系作者
3. 或者加入微信交流群获取

## 需要做的事

1. **获取 md2wechat API Key**（联系作者或加入交流群）
2. **更新配置文件** `~/.config/md2wechat/config.yaml`，填入 `api.md2wechat_key`
3. **验证**：`md2wechat config validate`
4. **测试上传**：`md2wechat convert <article.md> --draft --cover <cover.png>`
5. 确认微信公众号后台预览正常（不再有 ` ```html ``` ` 代码块）

## 相关文件

| 文件 | 说明 |
|------|------|
| `~/.config/md2wechat/config.yaml` | CLI 配置文件，需要填入 API Key |
| `E:\测试\scripts\ai-theme-convert.cjs` | AI prompt → Agnes LLM → HTML 的转换脚本 |
| `E:\测试\articles-daily\` | 每日资讯文章目录 |
| `E:\测试\articles-weekly\` | 每周周报文章目录 |
| `E:\测试\articles-novel\` | 小说文章目录 |
| `E:\测试\default-cover.png` | 默认封面图 |
| `E:\测试\.env` | 环境变量（含 WECHAT_APPID/WECHAT_SECRET/AGNES_API_KEY） |

## 微信公众号凭证

- AppID: wx4ae704784d24bac2
- Secret: 见 .env 文件
- 已在 config.yaml 中配置好

## 参考文档

- GitHub: https://github.com/geekjourneyx/md2wechat-skill
- 配置指南: https://raw.githubusercontent.com/geekjourneyx/md2wechat-skill/main/docs/CONFIG.md
- 常见问题: https://raw.githubusercontent.com/geekjourneyx/md2wechat-skill/main/docs/FAQ.md
