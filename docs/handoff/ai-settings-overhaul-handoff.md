# AI 能力设置页改造 + 服务商配置擦除事故修复（2026-09-07 收口）

> 一次性交接快照，完成后不再维护，仅作历史记录。当前有效约定以 ../../AGENTS.md 为准。
> 分支 `feat/ai-settings-autosave`（本地未推送）。多并行会话共用该分支，本文只记录本会话域。

## 里程碑内容（4 笔提交）

- `8c57eaf6` 设置页改为带专属侧边栏的独立界面（settings 态隐藏主侧边栏，返回键恢复进入前页面）；服务商子页纯净化（温度/maxTokens/代理/OCR 区块只在列表态显示）
- `59dc14c4` 模型条目增加上下文长度：前后端 `ProviderModelEntry.ContextWindow` 可空字段 JSON 直通（无迁移），编辑弹窗支持 `256000`/`200K`/`1M` 简写，模型列表显示徽章
- `aaf8035f` 添加服务商表单增加接口协议三选一（默认 chat，与子页同款）。协议粒度拍板：**供应商级，不做模型级覆盖**（决策存档于 `.work/decisions/model-protocol-granularity.md`，gitignore）
- `8cc2fee5` 服务商配置擦除事故修复（见下）

## 事故记录：自定义服务商整体丢失（2026-09-07 20:49）

- **现象**：用户全部自定义服务商从设置页消失，`F:\Company Database\llm-config.dpapi.json` 被改写为 `Providers: []`，无备份可恢复。
- **根因**：`LlmConfigResolver.ResolveMulti()` 在 `UseBuiltIn=true` 时弃用整份持久化配置 → 重启/reload 后内存 providers 清空（温度/代理保留为覆盖值）→ 前端「整态自动保存」把空列表忠实写回磁盘。前端自动保存与后端加载逻辑各自合理，组合成数据丢失链。
- **修复**：加载忠实于文件（内置与否只影响 `ExpandMulti` 展开生效方）；`SaveMultiConfigAsync` 覆盖前写 `llm-config.dpapi.json.bak` 单代备份；3 个回归测试（隔离数据路径，G2 串行集合）。
- **教训**：「前端整态保存」类设计与「按状态条件加载」类逻辑必须配对审计——任何能让内存状态静默偏离磁盘真相的路径，都会被自动保存放大成不可逆写入。

## 遗留（接手者注意）

1. 用户需重启应用加载修复，并重新录入服务商数据（密钥不可恢复）。
2. ContextMeter（对话页容量指示器，写死 1M）待接激活模型 `contextWindow`——阻塞于并行会话在途文件（ContextMeter.tsx / agent-client.ts），其提交后可做。
3. `npm run check` 当前红灯：`writing/EditorToolbar.tsx` 413 行超 400 硬上限，归 writing 会话修。
4. `docs/FRONTEND-COMPONENTS-INVENTORY.md` 在途（并行会话），其中设置页组件条目待其解冻后补：Settings 专属侧边栏结构、主侧边栏 settings 态隐藏行为。

## 行数门禁现况（400 硬上限）

`AiProviderSection.tsx` 399、`aiProviderSettingsParts.tsx` 396、`settings/__tests__/AiProviderSection.test.tsx` 399——三处均贴死，改动前先读 `.work/HANDOFF-AI-settings-session.md` 的拆分建议。
