# 前端组件树盘点（工程管家）

> 生成基线：`bbddc22f` · 日期：2026-08-22
> 数据源：`src/components/`（356 个 .tsx 文件）、`src/store/`、`src/constants/`、`src/types/`

## 目录

1. [组件目录结构](#组件目录结构)
2. [UI 基础组件库（35 个）](#ui-基础组件库35-个)
3. [功能模块组件（321 个 / 20 模块）](#功能模块组件321-个--20-模块)
4. [状态管理（Zustand Store）](#状态管理zustand-store)
5. [常量定义](#常量定义)
6. [类型定义](#类型定义)

---

## 组件目录结构

```
src/components/
├── ui/                    # 基础组件库（35 个 .tsx）
├── DataTable/             # 通用数据表
└── features/              # 业务功能模块（321 个 .tsx）
    ├── agent/             # AI 助手（15 个）
    ├── audit/             # 审计日志（1 个）
    ├── contracts/         # 合同管理（6 个）
    ├── costLedger/        # 成本台账（22 个）
    ├── dashboard/         # 仪表盘（3 个）
    ├── drawings/          # 图纸管理（3 个）
    ├── hr/                # 人事管理（17 个）
    ├── inventory/         # 库存管理（7 个）
    ├── invoices/          # 发票管理（11 个）
    ├── knowledge/         # 知识库（3 个）
    ├── labor/             # 劳务管理（8 个）
    ├── members/           # 成员管理（29 个）
    ├── partners/          # 合作伙伴（9 个）
    ├── payroll/          # 工资发放（3 个）
    ├── projects/          # 项目管理（17 个）
    ├── reports/           # 报告生成（3 个）
    ├── settings/          # 设置（21 个）
    ├── settlement/        # 结算管理（11 个）
    ├── splash/            # 启动页
    ├── templates/         # 模板管理（8 个）
    ├── users/             # 用户管理（2 个）
    ├── voice/             # 语音转写（8 个）
    ├── wages/             # 工资管理（23 个）
    └── writing/            # 写作中心（6 个）
```

---

## UI 基础组件库（35 个）

| 组件 | 文件 | 说明 |
|------|------|------|
| Badge | `ui/Badge/Badge.tsx` | 徽章标签 |
| Button | `ui/Button/Button.tsx` | 按钮（硬性约束：所有按钮必须用此组件） |
| ButtonLoader | `ui/ButtonLoader.tsx` | 按钮加载状态 |
| Card | `ui/Card/Card.tsx` | 卡片容器（硬性约束：页面卡片必须用此组件） |
| ConfirmDialog | `ui/ConfirmDialog/ConfirmDialog.tsx` | 确认对话框 |
| CountUp | `ui/CountUp.tsx` | 数字滚动动画 |
| Drawer | `ui/Drawer.tsx` | 抽屉面板 |
| DropZone | `ui/DropZone.tsx` | 拖拽上传区 |
| DropdownMenu | `ui/DropdownMenu/DropdownMenu.tsx` | 下拉菜单 |
| EmptyState | `ui/EmptyState.tsx` | 空状态 |
| FilterBar | `ui/FilterBar.tsx` | 筛选栏 |
| FormStepper | `ui/FormStepper.tsx` | 表单步骤器 |
| HeroBanner | `ui/HeroBanner.tsx` | 英雄横幅 |
| HoverScrollbar | `ui/HoverScrollbar.tsx` | 悬停滚动条 |
| Icon | `ui/Icon.tsx` | 图标 |
| Input | `ui/Input/Input.tsx` | 输入框 |
| Loading | `ui/Loading/Loading.tsx` | 加载中 |
| Modal | `ui/Modal/Modal.tsx` | 模态框 |
| MonthPicker | `ui/MonthPicker.tsx` | 月份选择器 |
| NoAccessState | `ui/NoAccessState.tsx` | 无权限状态 |
| OCRRecognitionFeedback | `ui/OCRRecognitionFeedback.tsx` | OCR 识别反馈 |
| PageContainer | `ui/PageContainer.tsx` | 页面容器（硬性约束：所有页面必须用此组件包裹） |
| PageHeader | `ui/PageHeader.tsx` | 页面头部 |
| Pagination | `ui/Pagination/Pagination.tsx` | 分页 |
| SectionHeader | `ui/SectionHeader.tsx` | 区块标题 |
| Select | `ui/Select/Select.tsx` | 下拉选择 |
| SimpleBarChart | `ui/SimpleBarChart.tsx` | 简单柱状图 |
| Spinner | `ui/Spinner.tsx` | 旋转加载器 |
| StatCard | `ui/StatCard.tsx` | 统计卡片 |
| Tabs | `ui/Tabs/Tabs.tsx` | 标签页 |
| Textarea | `ui/Textarea/Textarea.tsx` | 文本域 |
| Toast | `ui/Toast/ToastProvider.tsx` + `index.tsx` | 全局通知 |
| Tooltip | `ui/Tooltip/Tooltip.tsx` | 悬浮提示 |
| command | `ui/command.tsx` | 命令面板 |
| dialog | `ui/dialog.tsx` | 对话框（shadcn/ui 风格） |

**硬性约束**（违反则 build 失败）：
- 所有页面必须用 `<PageContainer>` 包裹
- 所有按钮必须用 `<Button>`
- 所有卡片必须用 `<Card>`
- 使用 `slate-*` 色阶，禁止 `gray-*`
- 文字尺寸用 `text-caption`/`text-micro`，禁止任意值字号

---

## 功能模块组件（321 个 / 20 模块）

### Agent AI 助手（15 个）

| 组件 | 说明 |
|------|------|
| AgentDashboard | Agent 主面板 |
| AgentComposer | 消息输入框 |
| AgentWelcome | 欢迎页 |
| AgentTopBar | 顶部栏 |
| AgentOverlays | 覆盖层 |
| AgentSearch | 搜索功能 |
| ConversationHistory | 对话历史侧栏 |
| ConversationHistoryItem | 历史条目 |
| MessageBubble | 消息气泡 |
| MessageActions | 消息操作栏 |
| MarkdownRenderer | Markdown 渲染器 |
| RichToolResult | 工具结果展示 |
| KnowledgeSourceCard | 知识来源卡片 |
| SuggestionChips | 建议词芯片 |
| Mascot | 吉祥物 |

### 审计日志（1 个）

| 组件 | 说明 |
|------|------|
| auditFieldFormat | 审计字段格式化 |

### 合同管理（6 个）

| 组件 | 说明 |
|------|------|
| ContractKanban | 看板视图 |
| ContractDetailModal | 详情弹窗 |
| ContractFormModal | 表单弹窗 |
| ContractPreviewModal | 预览弹窗 |
| contractPageColumns | 列定义 |

### 成本台账（22 个）

| 组件 | 说明 |
|------|------|
| CostLedgerDashboard | 台账仪表盘 |
| CostLedgerTab | 标签页容器 |
| CostLedgerTable | 数据表 |
| CostLedgerList | 列表视图 |
| CostLedgerGrid | 网格视图 |
| CostLedgerRow | 行组件 |
| CostLedgerForm | 表单 |
| CostLedgerSpreadsheet | 电子表格（Univer Sheet） |
| CostLedgerFilterBar | 筛选栏 |
| CostLedgerListToolbar | 列表工具栏 |
| CostLedgerBatchBar | 批次工具栏 |
| CostLedgerProjectDetail | 项目详情 |
| CostLedgerAnalytics | 分析视图 |
| CostLedgerImportModal | 导入弹窗 |
| CostLedgerCompareModal | 对比弹窗 |
| CategoryManager | 分类管理器 |
| CategoryManagerGroupList | 分类分组列表 |
| CategoryManagerL2Row | 二级分类行 |
| CategoryPicker | 分类选择器 |
| ChannelInput | 渠道输入 |
| ColumnFilter | 列筛选 |
| DateFilterTree | 日期筛选树 |
| EditableCell | 可编辑单元格 |
| FileUploader | 文件上传 |
| GridStates | 网格状态 |
| InvoiceLinker | 发票关联 |
| LearningRulesView | 学习规则视图 |
| config | 配置 |
| univerEngine | Univer 引擎集成 |
| importComponents/ | 导入子组件 |

### 仪表盘（3 个）

| 组件 | 说明 |
|------|------|
| DashboardCharts | 图表 |
| DashboardStatsCard | 统计卡片 |
| CountUp | 数字滚动 |

### 图纸管理（3 个）

| 组件 | 说明 |
|------|------|
| DrawingsGallery | 图纸画廊 |
| DrawingViewer | 查看器 |
| drawingsColumns | 列定义 |

### 人事管理（17 个）

| 组件 | 说明 |
|------|------|
| HRDashboard | 人事仪表盘 |
| StaffList | 员工列表 |
| StaffListRow | 员工行 |
| StaffFormModal | 员工表单弹窗 |
| StaffAttendance | 员工考勤 |
| StaffAttendanceDashboard | 考勤仪表盘 |
| StaffAttendanceRow | 考勤行 |
| StaffPayrollTable | 工资表 |
| StaffPayrollRow | 工资行 |
| StaffPayrollToolbar | 工资工具栏 |
| DepartmentManager | 部门管理 |
| PositionEditor | 岗位编辑器 |
| BatchDeptAssignModal | 批量分配部门弹窗 |
| AttendanceTimeline | 考勤时间线 |
| SalaryHistoryModal | 薪资历史弹窗 |
| config | 配置 |
| staffListColumns / staffAttendanceColumns | 列定义 |

### 库存管理（7 个）

| 组件 | 说明 |
|------|------|
| InventoryStats | 统计 |
| ItemList | 物料列表 |
| ItemForm | 物料表单 |
| MaterialList | 材料列表 |
| MaterialForm | 材料表单 |
| TransList | 交易列表 |
| TransForm | 交易表单 |

### 发票管理（11 个）

| 组件 | 说明 |
|------|------|
| InvoiceList | 发票列表 |
| InvoiceForm | 发票表单 |
| InvoiceFormFields | 表单字段 |
| InvoiceFilters | 筛选 |
| InvoiceStats | 统计 |
| InvoiceOCRBlock | OCR 区块 |
| FilePreviewModal | 文件预览弹窗 |
| PaymentList | 收付款列表 |
| PaymentForm | 收付款表单 |
| PaymentFileUpload | 收付款文件上传 |
| PaymentStats | 收付款统计 |

### 知识库（3 个 + glass-integration）

| 组件 | 说明 |
|------|------|
| KnowledgeHomePage | 知识库首页（3D 玻璃文件夹轮播） |
| KnowledgeLibrary | 知识库列表 |
| KnowledgeDocumentDrawer | 文档抽屉 |
| glass-integration/ | 3D 玻璃效果子模块 |

### 劳务管理（8 个）

| 组件 | 说明 |
|------|------|
| LaborDashboard | 劳务仪表盘 |
| LaborWorkerList | 工人列表 |
| LaborWorkerRow | 工人行 |
| LaborWorkerFilterPopup | 筛选弹窗 |
| LaborTeamManager | 班组管理 |
| TeamWageModal | 班组工资弹窗 |
| WorkerWageModal | 工人工资弹窗 |
| WorkerWageHistoryModal | 工资历史弹窗 |

### 成员管理（29 个）

| 组件 | 说明 |
|------|------|
| MemberList | 成员列表 |
| MemberForm | 成员表单 |
| MemberFormLayout | 表单布局 |
| MemberDetail | 成员详情 |
| MemberDetailParts | 详情组件 |
| MemberDetailSections | 详情分区 |
| MemberCard / MemberCardInfo / MemberCardMedia | 卡片组件 |
| MemberFilters | 筛选 |
| MemberWorkerSection | 工人区 |
| WorkerForm / WorkerPoolForm | 工人表单 |
| WorkerDetailCards | 工人详情卡片 |
| WorkerSection / WorkerSectionTabs / WorkerSectionModals | 工人区组件 |
| WorkerPickerModal / WorkerPickerAdvancedPanel / WorkerPickerItem | 工人选择器 |
| WorkerImportModal / WorkerImportPhase / workerImportHelpers | 工人导入 |
| TeamWorkerModal | 班组工人弹窗 |
| LeaveModal | 离职弹窗 |
| StaffForm | 员工表单 |
| StaffManagementTab | 员工管理标签 |
| FormUploadWidgets | 表单上传组件 |

### 合作伙伴（9 个）

| 组件 | 说明 |
|------|------|
| PartnerList | 列表 |
| PartnerForm / PartnerFormFields | 表单 |
| PartnerSelect | 选择器 |
| PartnerFileUploadField | 文件上传字段 |
| FileDropZone | 拖拽上传区 |
| BusinessLicenseOCRBlock | 营业执照 OCR |
| SupervisorList / SupervisorForm | 监管单位列表/表单 |

### 工资发放（3 个）

| 组件 | 说明 |
|------|------|
| PayrollPage | 工资发放页 |
| PayrollTable | 工资表 |
| PayrollSummaryBar | 汇总栏 |

### 项目管理（17 个）

| 组件 | 说明 |
|------|------|
| ProjectList | 项目列表 |
| ProjectTable | 项目表格 |
| ProjectCard | 项目卡片 |
| ProjectForm | 项目表单 |
| ProjectDetail | 项目详情 |
| ProjectDetailTabs | 详情标签页 |
| ProjectStats | 项目统计 |
| ProjectInsights | 项目洞察 |
| ProjectTimeline | 项目时间线 |
| ProjectFilters | 筛选 |
| ProjectCommandCenter / ProjectCommandCenterDetail | 指挥中心 |
| PortfolioAnalysis | 组合分析 |
| ProjectKnowledgeTab | 项目知识标签 |
| MembersTab / AddMemberModal | 成员标签/添加弹窗 |
| AlertBar | 警告栏 |
| ProjectsHeroBanner | 英雄横幅 |

### 报告生成（3 个）

| 组件 | 说明 |
|------|------|
| ReportsIndex | 报告首页 |
| ReportGeneratorModal | 生成弹窗 |
| ReportResultPanel | 结果面板 |

### 设置（21 个）

| 组件 | 说明 |
|------|------|
| SettingsNav | 导航 |
| SettingsSearch | 搜索 |
| AccountSection | 账户 |
| ChangePasswordCard | 修改密码 |
| AppearanceSection | 外观 |
| PreferencesSection | 偏好 |
| DataPathSection / DataStorageSection | 数据路径/存储 |
| AiProviderSection | AI 提供商 |
| AiCapabilitySection | AI 能力 |
| GpuToggle | GPU 开关 |
| AboutSection / AboutHelpSection | 关于/帮助 |
| DevToolsSection | 开发者工具 |
| SqliteHealthCheck / SqliteTableSummary | SQLite 健康/表摘要 |
| SettingsPiiKeySection / PiiReencryptSection | PII 密钥/重加密 |
| ShortcutsReference | 快捷键 |
| SettingsChangelog | 更新日志 |

### 结算管理（11 个）

| 组件 | 说明 |
|------|------|
| SettlementDashboard | 仪表盘 |
| SettlementList | 列表 |
| SettlementForm | 表单 |
| SettlementItemsTable | 条目表 |
| SettlementImportModal | 导入弹窗 |
| SettlementProjectCard / SettlementProjectDetail | 项目卡片/详情 |
| SettlementPrintTemplate | 打印模板 |
| FileUploadSection | 文件上传 |
| config | 配置 |

### 模板管理（8 个）

| 组件 | 说明 |
|------|------|
| TemplateDashboard | 仪表盘 |
| TemplateList / TemplateCard | 列表/卡片 |
| TemplateForm | 表单 |
| TemplateGenerate | 生成 |
| TemplatePreview | 预览 |
| TemplateSelectorModal | 选择弹窗 |
| config | 配置 |

### 用户管理（2 个）

| 组件 | 说明 |
|------|------|
| ProjectAuthorizationsTab | 项目授权标签 |
| userListColumns | 列定义 |

### 语音转写（8 个）

| 组件 | 说明 |
|------|------|
| VoiceTranscribePage | 语音转写页 |
| AudioRecorder | 录音器 |
| AudioInputCard | 音频输入卡 |
| TranscriptionWorkspace | 转写工作区 |
| TranscriptionParams | 转写参数 |
| TranscriptEditor | 校对编辑器 |
| SttJobList | 任务列表 |

### 工资管理（23 个）

| 组件 | 说明 |
|------|------|
| WageProjectList / WageProjectCard | 项目列表/卡片 |
| WageTableTab / WageDetailTable / WageDetailRow | 工资表/详情表/行 |
| WageRecordsTab / WageDetailTab | 记录标签/详情标签 |
| WageStatsTab / WageSummaryTab | 统计/汇总标签 |
| WageBatchViews | 批量视图 |
| WageCycleDetail | 周期详情 |
| WageDetailToolbar | 工具栏 |
| WagePaymentRecords | 付款记录 |
| OverdueBanner | 欠薪横幅 |
| AttendanceTab / AttendanceImportModal / AttendanceImportBody | 考勤标签/导入 |
| BankReceiptBatch / BankReceiptDropZone / BankReceiptMatchConfirm / BankReceiptParseStatus | 银行回单组件 |
| FileImportDialog / DropZone | 文件导入 |

### 写作中心（6 个）

| 组件 | 说明 |
|------|------|
| WritingIndex | 首页 |
| WritingWizard | 向导 |
| WritingEditor | 编辑器 |
| WritingDraftPanel | 起草面板 |
| EditorToolbar | 编辑器工具栏 |
| WritingExportMenu | 导出菜单 |

---

## 状态管理（Zustand Store）

| Store | 文件 | 说明 |
|-------|------|------|
| authStore | `store/authStore.ts` | 认证状态（JWT / 用户信息 / 登录登出） |
| editionStore | `store/editionStore.ts` | 版本特性开关（个人版/企业版） |
| statusStore | `store/statusStore.ts` | 全局状态（加载/错误） |
| toastStore | `store/toastStore.ts` | 全局通知 |

---

## 常量定义

| 文件 | 说明 |
|------|------|
| `constants/animations.ts` | 动画常量 |
| `constants/attendance.ts` | 考勤常量 |
| `constants/auditLog.ts` | 审计日志常量 |
| `constants/changelog.ts` | 更新日志 |
| `constants/date.ts` | 日期常量 |
| `constants/index.ts` | 统一导出 |
| `constants/member.ts` | 成员常量 |
| `constants/settingsIndex.ts` | 设置索引 |
| `constants/snapshots.ts` | 快照常量 |
| `constants/table.ts` | 表格常量 |

---

## 类型定义

| 文件 | 说明 |
|------|------|
| `types/electron.d.ts` | 核心类型定义（Project/Member/Worker/Invoice 等 50+ 接口） |
| `types/permissions.ts` | 权限码定义（与后端 Common.GetDefaultPermissions 对齐） |
| `types/agent.ts` | Agent 消息/工具类型 |
| `types/router.ts` | 路由类型 |
| `types/guards.ts` | 类型守卫 |
| `types/common/Result.ts` | 统一结果类型 |
| `types/common/Error.ts` | 错误类型 |

---

## 组件规模统计

| 模块 | 组件数 | 占比 |
|------|--------|------|
| members | 29 | 8.1% |
| costLedger | 22 | 6.1% |
| settings | 21 | 5.8% |
| wages | 23 | 6.4% |
| projects | 17 | 4.7% |
| hr | 17 | 4.7% |
| agent | 15 | 4.2% |
| invoices | 11 | 3.1% |
| settlement | 11 | 3.1% |
| partners | 9 | 2.5% |
| labor | 8 | 2.2% |
| voice | 8 | 2.2% |
| templates | 8 | 2.2% |
| inventory | 7 | 1.9% |
| contracts | 6 | 1.7% |
| writing | 6 | 1.7% |
| dashboard | 3 | 0.8% |
| knowledge | 3 | 0.8% |
| drawings | 3 | 0.8% |
| payroll | 3 | 0.8% |
| reports | 3 | 0.8% |
| users | 2 | 0.6% |
| audit | 1 | 0.3% |
| ui | 35 | 9.8% |
| **总计** | **356** | **100%** |

---

*文档结束。*
