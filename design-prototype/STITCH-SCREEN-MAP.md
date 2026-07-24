# Stitch 导出屏 ↔ 屏名 ↔ 落地目标 映射索引

> 来源：Stitch 项目「Stitch AI Butler」zip 导出，已解压于
> `design-prototype/stitch-export/unzipped/stitch_stitch_ai_butler/<folder>/`
> 每屏含 `code.html`（精确结构，注意用的是 Stitch 自家 Material token，落地要翻译成本项目 token + lucide 图标）+ `screen.png`（可读图核对）。
> 用法：按「落地组件」找到真实文件，`Read screen.png` 看目标视觉 + `Read code.html` 抽结构，再外科式贴合。
> 主题：paper=暖白纸 / graphite=石墨黑 / 未标=中性通用。

## AI 管家（首页 · 招牌）
| 文件夹 | 屏名 | 落地组件 | 优先级 |
|---|---|---|---|
| `ai_1` | AI 管家主页 · Paper | `features/agent/AgentWelcome.tsx` | ⭐ 已贴合 |
| `ai_paper_2` | AI · 实时对话 | `features/agent/AgentDashboard.tsx` + `MessageBubble` + `AgentComposer` | ⭐ A 进行中 |
| `ai_paper_1` | AI · 逾期发票汇总（富结果卡） | `features/agent/RichToolResult.tsx` | ⭐ 已贴合 |
| `ai_3` | 工程管家 Workspace（含 AI 的外壳态） | 应用外壳（Sidebar/TitleBar/StatusBar） | 参考 |

## 应用外壳 / 全局态
| 文件夹 | 屏名 | 落地组件 | 优先级 |
|---|---|---|---|
| `k` | 命令面板 ⌘K | `components/CommandPalette.tsx` | ✅ 已接线 |
| `_3` | 通知面板 | 通知组件（待定位） | 中 |
| `_4` | 全局交互组件展示页 · 纸白 | UI 组件库总览（参考） | 参考 |
| `_30` | 表单校验与组件态 | Input/FormField 态 | 参考 |
| `_36` | 通用空状态 | `ui/EmptyState.tsx` | 中 |
| `_11` | 无访问权限 | 权限拦截态（RequirePermission） | 低 |

## 入场（登录 / 启动 / 锁屏）
| 文件夹 | 屏名 | 落地组件 | 优先级 |
|---|---|---|---|
| `_28` | 登录 | `components/Login.tsx` | 高（待你定大窗/小窗） |
| `_38` | 登录（变体） | 同上（备选） | 备选 |
| `_14` | 启动 | `components/SplashScreen.tsx` | 中 |
| `_22` | 启动中（loading） | `SplashScreen`（loading 态） | 中 |
| `_15` | 已锁定（锁屏） | 锁屏组件 | 中 |

## 项目管理
| 文件夹 | 屏名 | 落地组件 | 优先级 |
|---|---|---|---|
| `_12` | 投资组合概览（驾驶舱） | `Projects.tsx` + `ProjectsHeroBanner` | ⭐ B 已部分去漂移 |
| `_6` | 项目管理（列表） | `Projects.tsx` | 高 |
| `_29` | 项目详情 · 张家口冬奥场馆 | 项目详情 6-Tab 指挥中心 | ⭐ B 目标 |

## 合同管理
| 文件夹 | 屏名 | 落地组件 | 优先级 |
|---|---|---|---|
| `_18` | 合同管理（看板） | `ContractPage.tsx` | 高 |
| `_9` | 合同详情 | 合同详情子页 | 中 |
| `_23` | 新建合同（抽屉） | 合同新建抽屉（可引 shadcn sheet） | 中 |

## 财务（发票 / 成本 / 结算）
| 文件夹 | 屏名 | 落地组件 | 优先级 |
|---|---|---|---|
| `_19` | 发票管理 | `InvoicePage.tsx` | ⭐ B 目标 |
| `ocr` | 发票录入（OCR） | 发票录入表单 + OCR | 中 |
| `_1` | 成本台账 | `CostLedger.tsx` | 高 |
| `_10` | 结算办理 | `Settlement.tsx` | 高 |
| `_20` | 结算编制（表单） | 结算编制表单 | 中 |

## 单位 / 人事 / 工人
| 文件夹 | 屏名 | 落地组件 | 优先级 |
|---|---|---|---|
| `_25` | 单位管理 | `Partners.tsx` | 高 |
| `_13` | 人事管理 | `HRManagement.tsx` | 高 |
| `_31` | 人员档案详情页 | 人员档案详情 | 中 |
| `_16` | 工人管理 | `LaborManagement.tsx` | 高 |

## 资产（仓库 / 图纸）
| 文件夹 | 屏名 | 落地组件 | 优先级 |
|---|---|---|---|
| `_37` | 仓库管理 | `Inventory.tsx` | 高 |
| `_33` | 图纸画廊 | 图纸管理（缩略图网格） | 中 |
| `_5` | 图纸查看器 | 图纸查看器（graphite） | 中 |
| `_35` | Precision Archival System（归档） | 图纸/归档相关（待核） | 低 |

## 模板 / 语音知识库
| 文件夹 | 屏名 | 落地组件 | 优先级 |
|---|---|---|---|
| `_24` | 模板管理 | `Templates.tsx` | 中 |
| `_26` | 模板编辑器 | 模板编辑器 | 中 |
| `_21` | 录音转写工作台 | `features/knowledge/SpeechKnowledgePage.tsx` | 中 |
| `_32` | 知识库检索与阅读 | 知识库检索页 | 中 |

## 用户 / 系统设置
| 文件夹 | 屏名 | 落地组件 | 优先级 |
|---|---|---|---|
| `_7` | 用户管理 | Users 页 | 中 |
| `_34` | 系统设置（总） | `features/settings/` 外壳 | 中 |
| `_17` | 设置 · 外观 | 外观设置子页 | 中 |
| `ai_2` | 设置 · AI 能力 | `features/settings/AiCapabilitySection.tsx` | 中 |
| `_8` | 设置 · 数据与存储 | 数据与存储子页 | 中 |
| `_2` | 设置 · 关于与帮助 | 关于与帮助子页 | 低 |
| `_27` | Precision Engineering Systems · Workspace | 工作台/外壳（参考） | 参考 |

## 设计系统看板（非落地屏）
| 文件夹 | 内容 | 用途 |
|---|---|---|
| `precision_instrument/DESIGN.md` | Stitch 生成的设计系统文档 | 对照 token |
| `stitch_stitch_ai_butler/DESIGN.md` | 项目级 designMd | 对照 token |
| `stitch_brief.md` | 早期 brief | 存档 |

---
**缺口**：设置「通知与偏好」子页 Stitch 未生成（真实 app 有此子页，落地时用现有组件即可，无需 Stitch）。
