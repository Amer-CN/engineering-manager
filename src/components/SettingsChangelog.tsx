import React from 'react'
import { Icon } from './ui/Icon'

function renderMarkdownInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    return part
  })
}

const versions = [
  { v: 'v2.6.3', date: '2026-05-13', items: ['工人管理数据管线修复：loadData 改为 getProjectWorkers 接通 db.workers/db.projectWorkers，工人库列表+班组计数恢复', '三Tab统一：班组管理/工人库/工资管理 内联为同级Tab，工资管理不再跳转独立页面', '班组工人管理：TeamWorkerModal 查看/编辑/调组/移除班组内工人，TeamCard 新增管理工人入口', 'WorkerPickerModal 批量设置：班组/工种/日工资一键应用到全部已选，新增 defaultTeamId 预设', '工人库简化表单：WorkerPoolForm 仅身份字段+OCR 识别，走 createWorker/updateWorker', '薪资历史回填迁移：migrateSalaryHistoryBackfill 为已有 staff 自动创建初始 salaryHistory'] },
  { v: 'v2.6.2', date: '2026-05-13', items: ['考勤时间线子页面：按年分组+年度汇总+年份筛选+月份卡片网格，点击进入日历画笔模式', '薪资历史系统：db.salaryHistory 集合 + IPC 4通道 + 弹窗管理，新建成员自动创建，薪酬按月份匹配对应薪资', '入职日期感知考勤：日历入职前日期灰色不可操作，月中入职薪酬永远按比例计算', '薪酬守卫松耦合：未打考勤自动跳过而非阻止生成', '考勤详情删除按钮：AttendanceDetail 顶栏新增删除按钮', '入职日期修复：考勤/薪酬/看板 createdAt→entryDate', '薪酬表格奖金列→补助列', '职位编辑器精简'] },
  { v: 'v2.6.1', date: '2026-05-13', items: ['考勤 UX 重设计：摘要列表优先+AttendanceDetail 子页面，删除/清空/批量删除，入职守卫，生成默认考勤', '薪酬流水线守卫：考勤就绪指示器，未就绪禁用生成，逐人 try/catch 报告成功/失败', '看板增强：今日在岗 KPI + 月度薪酬实际值（节省/超出提示）', 'Bug 修复：薪酬计算出错（读错字段）、OCR 自动填入失效（字段名不匹配）、考勤保存失败无提示、未入职可打考勤', '共享常量提取：src/constants/attendance.ts — HR 和工人模块统一导入'] },
  { v: 'v2.6.0', date: '2026-05-12', items: ['人事管理模块：新建顶级模块 /hr，5 个 Tab（看板/人员档案/考勤管理/薪酬管理/部门管理），月薪制薪酬', '部门管理系统：db.departments 独立数据表，CRUD + 人数统计 + 删除守卫，人员新增 departmentId/position 字段', '工人管理模块：原员工管理改名工人管理 /labor，仅保留工人/班组/导入功能，旧 /members 路由保留兼容', '工资管理降级：侧边栏隐藏，通过工人管理模块入口访问', 'Bug 修复：图纸上传后界面不显示（React state 同引用 bailout）+ IPC handler 数组引用突变'] },
  { v: 'v2.5.0', date: '2026-05-12', items: ['全局工人信息库：db.workers（纯身份）+ db.projectWorkers（用工关系）双表分离，一个工人可跨多项目', 'WorkerPickerModal：班组管理新增"从工人库添加"，搜索+批量勾选+逐行编辑工种日工资', '导入去重增强：身份证号自动检测 db.workers，已存在蓝色标记，跳过 Worker 创建仍可创建 ProjectWorker', '5 步自动迁移脚本：旧 Member(worker)→Worker+ProjectWorker，含工资/考勤回填+审计标记，幂等跳过', '10 个新 IPC 通道 + 工资计算双路径（staff/worker）+ 考勤 generateDefaultsV2'] },
  { v: 'v2.4.0', date: '2026-05-12', items: ['工人 Excel 批量导入：智能列映射+预览+进度条+去重+预设记忆', '工人列表卡片改为9列表格（姓名/身份证号/班组/工种/日工资/状态/操作）', 'Bug 修复：添加工人/编辑班组/工人调组按钮弹出模态框；导入拖拽无反应'] },
  { v: 'v2.3.0', date: '2026-05-12', items: ['任务模块完整移除：删除 Tasks.tsx / useTasks.ts / tasks.ts IPC，模块从未实际使用', 'Dashboard 重设计：任务区域替换为发票+结算摘要（Hero待办结算/KPI/发票状态饼图/最近发票）', '项目详情 7→6 Tab，指挥中心任务进度→发票概览，成本结构数据管线修复', '健康度评分公式调整：4 维→3 维（预算 40%+合同 30%+发票 30%）'] },
  { v: 'v2.2.3', date: '2026-05-12', items: ['成本台账导出 Excel：工具栏「导出Excel」按钮，按筛选结果导出 10 列 xlsx，列宽优化', '成本台账打印：工具栏「打印」按钮，新窗口 A4 横版表格+底部收支汇总', '凭证附件预览：图片弹窗大图预览，非图片文件调用系统默认程序打开'] },
  { v: 'v2.2.2', date: '2026-05-11', items: ['表格行悬停高亮统一：全站 16 处 <tr> 列表从硬编码 hover:bg-slate-50 替换为 table-row-hover CSS 类，通过 var(--row-hover-opacity) 自定义属性驱动', '系统设置新增悬停强度调节：外观主题卡片新增滑块（10%-100%，步长 5），实时调节所有数据表格行悬停淡蓝高亮的透明度', '新增 useRowHoverOpacity hook：读写 localStorage + 同步 CSS 变量到 document.documentElement，默认 60%'] },
  { v: 'v2.2.1', date: '2026-05-11', items: ['成本台账列表合计行固定底部：CostLedgerList 改用 flex 列布局替代 `h-full`（CSS 百分比高度在 flex item 内无法解析），CostLedgerTab/CostLedgerProjectDetail 包装层加 `flex flex-col` 传递 flex 链，表格区 `flex-1 overflow-auto` 自行滚动，合计行自然沉底', '支出分类标签两行显示：CostLedgerAnalytics 饼图图例 `truncate` → `line-clamp-2`（外裹 `flex-1 min-w-0` 防 -webkit-box 塌缩）；CostLedgerList 分类列 `truncate` on td → `line-clamp-2` on inner span（避免 -webkit-box 覆盖 table-cell）', 'Dashboard 支出分类柱状图 X 轴刻度两行显示：自定义 `CategoryTick` 组件，SVG `<tspan>` 拆分 >4 字分类名，`interval={0}` 强制全显示，`dy={6}` 文字置轴线下方，`bottom` margin 扩至 32'] },
  { v: 'v2.2.0', date: '2026-05-11', items: ['日期列筛选年月树形折叠：新增 DateFilterTree 组件（188 行），年→月→日三级层级，分组复选框三态，折叠箭头；搜索时自动切平铺模式；快捷按钮保留', '成本台账金额列筛选精度修复：Math.round → toFixed(2)，保留分位精度', 'ColumnFilter 日期逻辑提取为 DateFilterTree，自身从 428→245 行通过 400 行硬上限'] },
  { v: 'v2.1.0', date: '2026-05-11', items: ['成本台账筛选系统全面升级：7列表头统一为搜索+勾选 Excel 风格，ColumnFilter 重构为通用 CheckMeta 模式，分类筛选联动一级/二级切换，备注列补筛选，Dashboard/ProjectDetail 英文标签修复'] },
  { v: 'v2.0.0', date: '2026-05-11', items: ['成本台账一二级分类全面重构：支出 5 组 18 码（业务费/直接工程费/现场管理费/对公服务及前期投入费/财务及其他费）+ 收入 4 组 7 码（投资款/项目回款/退款/其他收入）；CATEGORY_HIERARCHY 新增 direction 字段；CategoryPicker 从扁平下拉→一级→二级联动选择器；CategoryManager 重写为双级管理 UI（一级分组卡片+二级子项列表+新建/编辑/删除）；CostLedgerList 筛选下拉按一级分组 optgroup 显示；CostLedgerCategory 类型新增 level1? 字段；getLevel1Groups(direction)/getLevel1GroupsMerged(categories,direction) 方向感知；getLevel1ForCode 优先 DB level1→回退 hierarchy；ensureCategories() 自动迁移旧扁平分类到新层级'] },
  { v: 'v1.21.3', date: '2026-05-11', items: ['成本台账分类层级切换：新增 CATEGORY_HIERARCHY 常量（18二级→5一级），CostLedgerList 工具栏新增二级/一级分段按钮，getCategoryDisplayLabel/getLevel1Color 辅助函数，localStorage 持久化偏好，一级模式带分组色点', 'SettingsChangelog.tsx 语法修复（}→},）'] },
  { v: 'v1.21.2', date: '2026-05-11', items: ['版本自动迭代系统加固：PreToolUse hook 确保在 neat-freak 清理前读取最新内容', '版本号全局同步：修复 6 处版本引用不一致', 'Settings 更新日志显示修复：数组缩进从约 500 空格修正为 18 空格', '表格列间距优化：cell padding px-2→px-3', '表头标签优化：对方→往来单位/个人', '项目详情页分类管理修复：管理分类按钮正常弹出', '成本台账分类管理修复：编辑内置分类后名称正确更新，新增自定义分类出现在筛选框'] },
  { v: 'v1.21.1', date: '2026-05-11', items: ['check-rules 硬违规清零：7→0，子组件提取 8 文件 + hook 提取 3 个', 'ContractPage 822→405：提取 contractConfig + ContractFormModal', 'SettlementForm 714→314：提取 SettlementItemsTable + SettlementImportModal', 'Members 756→368：提取 useMemberOperations + useTeamOps', 'InvoiceForm 564→325：提取 useInvoiceAmounts + 复用 FileDropZone', 'ContractPage 遗留导入清理（ISSUE-001）', 'EmptyState 组件去重合并（ISSUE-002）', 'EmptyState 组件按 DESIGN.md 规范新建', 'Inter 字体栈修复', 'WorkerSection React.lazy 懒加载'] },
  { v: 'v1.21.0', date: '2026-05-10', items: ['新增自定义分类管理：db.costLedgerCategories集合+5IPC，内置12种种子，用户可增删改', '新增CategoryManager分类管理弹窗：双Tab+行内编辑+内置不可删+恢复默认', '新增useCostLedgerCategories hook：分类统一加载+方向过滤', '新增备注列：CostLedgerList表头10列', '优化列表列宽：基于熊会对账775行Excel实测，border-collapse线框连续，金额font-mono右对齐', '优化CategoryPicker+Analytics动态颜色', '表头标签：对方→往来单位/个人', '修复管理分类按钮在项目详情页无响应'] },
  { v: 'v1.20.1', date: '2026-05-10', items: ['成本台账模块实现：新增 13 文件 + 修改 15 文件 + 删除 Expenses.tsx，级联删除扩展至 8 集合，v1.20.0'] },
  { v: 'v1.20.0', date: '2026-05-10', items: ['成本台账模块：追踪真实项目成本（含灰色支出/垫资/多开发票回流），双入口模式，9支出+2收入分类', '级联删除扩展至8个关联集合', '旧成本管理模块Expenses.tsx删除（432行零数据）'] },
  { v: 'v1.19.1', date: '2026-05-10', items: ['自动版本迭代修复：neat-freak PostToolUse hook 版本判定逻辑优化'] },
  { v: 'v1.19.0', date: '2026-05-10', items: ['自动版本迭代升级：auto-version-on-neat-freak.js 从硬编码 patch 改为自动检测 major/minor/patch 级别（关键词匹配 + 统计启发）'] },
  { v: 'v1.18.0', date: '2026-05-08', items: ['侧边栏重构：系统设置和用户管理从导航菜单移除，头像弹出菜单收纳四入口（DropdownMenu类Windows开始菜单风格）', '锁定屏幕：LockScreen全屏毛玻璃遮罩+密码验证，锁屏/解锁均记审计日志', '审计日志修复：actionConfig未知操作类型兜底，防止lock/unlock审计记录导致白屏'] },
  { v: 'v1.17.1', date: '2026-05-08', items: ['修复PostToolUse hook不支持if字段的bug', 'CLAUDE.md从64.8KB压缩至18.8KB（289行）', 'bump-version.js新增双格式摘要提取（regex+indexOf）'] },
  { v: 'v1.17.0', date: '2026-05-07', items: ['模板系统实用化改造：服务端变量自动检测、TemplateSelectorModal、ContractPage/SettlementProjectDetail集成从模板生成入口'] },
  { v: 'v1.16.1', date: '2026-05-07', items: ['bump-version.js全面修复：上下文感知精确匹配、去重逻辑、--msg参数', 'Settings.tsx更新日志渲染修复（renderMarkdownInline+22条归一化）', 'CHANGELOG.md格式规范化：补全6处缺失分隔符，同步目标从5处扩展到6处'] },
  { v: 'v1.16.0', date: '2026-05-07', items: ['模板管理独立模块：从合同管理分离为顶级路由，7种分类', '模板变量系统：text/number/date/select四种类型，{{key}}→值替换+实时预览', '结算看板重设计：对标项目管理改为看板首页+项目结算详情', '合同管理简化：Contracts视图从4种精简为3种'] },
  { v: 'v1.15.0', date: '2026-05-07', items: ['合同管理重构：看板首页+子页面模式（对标项目管理）', '结算办理全面重设计：6种细分+材料明细表+Excel导入+多文件上传+状态流转+办理核验', '审计日志可读化：详情弹窗三列对比表格+金额格式化+状态翻译', '发票统计重设计：开票/收票合并入总数，新增专票税额/普票税额', '回款/付款统计重设计：笔数合并入总数，新增剩余未收/未付', '收支对比数据修复：barData改paymentRecords'] },
  { v: 'v1.14.0', date: '2026-05-07', items: ['付款凭证预览修复+关联单位下拉显示全部合作单位', '审计日志配额溢出修复：去details+上限3000+启动清理', '发票状态标签按收票/开票区分+加载时自动同步回写DB', '合同Word预览（mammoth转HTML嵌入iframe）+发票税额手动编辑'] },
  { v: 'v1.13.0', date: '2026-05-06', items: ['工资模块架构重构：对标Projects→ProjectDetail模式，Dashboard→WageCycleDetail（3 Tab）', '工资发放记录：新增paidAmount/paidDate字段，差额自动计算', '首页项目卡片：WageProjectCard+WageProjectList按项目汇总'] },
  { v: 'v1.12.1', date: '2026-05-06', items: ['表头sticky固定：发票/回款/费用/图纸四个列表统一sticky定位', 'App.tsx页面动画改为纯opacity（修复transform导致sticky全局失效）', '发票页固定头部+嵌套滚动三层布局', '图纸管理卡片→列表视图（6列Table）', '旧支付记录数据补全（recordDate/createdAt）'] },
  { v: 'v1.12.0', date: '2026-05-06', items: ['发票票种细化4类：纸质普票/纸质专票/电子普票/电子专票', '收付款术语统一：收票→付款、开票→回款', '数据库安全加固：initDatabase()异常不再覆写真实数据', '金额显示全局formatMoney()确保2位小数（53处替换）'] },
  { v: 'v1.11.1', date: '2026-05-06', items: ['neat-freak PostToolUse hook：收尾时自动触发版本迭代', 'bump-version.js补全CLAUDE.md版本引用自动同步'] },
  { v: 'v1.11.0', date: '2026-05-06', items: ['动画性能深度优化：页面切换去scale、浮动光斑改CSS keyframes、spring刚度降低', '版本自动迭代系统：CHANGELOG.md、bump-version.js脚本、patch/minor/major分级', 'Settings关于页版本号+更新日志同步'] },
  { v: 'v1.10.0', date: '2026-05-06', items: ['全站交互动画系统：Sidebar入场+layoutId激活态滑动、Login入场stagger', 'Dashboard CountUp数字滚动动画（useSpring）', '数据可视化：recharts animationDuration+入场动画', '全局组件hover/press反馈：Button/Card/Badge/ProgressBar/DropdownMenu', 'Toast图标emoji→lucide-react SVG+spring入场'] },
  { v: 'v1.9.2', date: '2026-05-06', items: ['侧边栏配色蓝色→深slate色系（匹配Logo品牌色）', '修复单位管理白屏（Partners缺Icon导入）', '注册BadgeCheck/Shield/AlertCircle等图标'] },
  { v: 'v1.9.1', date: '2026-05-06', items: ['UI收尾：子页面模态框标准化、ContractDashboard Bento网格+recharts重设计', 'Inventory/WorkerSection spring-animated Tab栏', 'InvoiceList/Filters原始SVG→lucide Icon', 'Login移动端Logo→深色渐变'] },
  { v: 'v1.9.0', date: '2026-05-06', items: ['项目管理8文件全面重设计：Bento网格布局、健康度环形图', '投资组合概览横幅：深色渐变+4 KPI', '告警区：逾期任务/预算超支/收款率低自动检测', 'recharts全面替代手工SVG：RadialBarChart+BarChart+PieChart', '项目卡片健康环：SVG环形进度条'] },
  { v: 'v1.8.0', date: '2026-05-06', items: ['管理人员卡片→表格（7列）+状态下拉直切', '批量删除考勤/工资表/工资记录（三Tab各加复选框列+全选）', '离职员工可入项目、考勤/工资含离职+项目经理', '状态筛选兜底（老数据无status默认active）'] },
  { v: 'v1.7.0', date: '2026-05-06', items: ['全站设计语言统一：gray→slate色系（27文件682处）', '主题系统：Settings→外观主题（浅色/深色），darkMode: class', 'Dashboard重设计：Hero深色渐变横幅、KPI StatCard模式、recharts图表', 'Spring Tab栏：Contracts/WageManagement/Partners spring药丸按钮', '侧边栏重设计：固定宽度、深色渐变Logo区、圆角药丸导航项+左侧激活指示条'] },
  { v: 'v1.6.0', date: '2026-05-05', items: ['考勤每日状态系统：dailyStatus字段+5种状态+画笔模式日历（Shift批量，右键循环）', '项目成员多对多：db.projectMembers关联表、MembersTab添加/移除UI'] },
  { v: 'v1.5.2', date: '2026-05-05', items: ['DB全面防御：ensureDatabaseFields()覆盖全部26个集合', 'seedDefaultRoles启动崩溃修复+6个.bat启动脚本修复', 'getProjectPartners API+settlements.ts/attendance.ts守卫补齐', 'OCR网络检查URL修复'] },
  { v: 'v1.5.1', date: '2026-05-05', items: ['文件存储projectName参数bug：4个文件间参数张冠李戴修复', 'Toast系统全局化：11页面从本地Toast→useToastContext()，Portal渲染', '文件名去Date.now()随机后缀+图纸DWG/DXF支持'] },
  { v: 'v1.5.0', date: '2026-05-05', items: ['权限系统重设计：15资源×7操作矩阵+角色权限编辑器+侧边栏按权限过滤', '操作日志系统接通：IPC持久化（上限10000条）+用户身份关联', '用户管理独立：从Settings剥离，Users.tsx Tab系统', '路由守卫：users/settings加RequireAdmin/RequirePermission'] },
  { v: 'v1.4.1', date: '2026-05-05', items: ['文件读取回退链修复：readFile/deleteFile对null projectName漏搜未分类/'] },
  { v: 'v1.4.0', date: '2026-05-05', items: ['PageContainer组件：统一页面宽度入口（wide/narrow/full三种变体）', '17页面统一max-w-[1400px]（Dashboard 1600px、Settings双列网格）'] },
  { v: 'v1.3.2', date: '2026-05-04', items: ['社保公积金计算逻辑修复：个人部分仅在companyCoversSocial=false时扣除', '考勤附件支持：图片/xlsx/PDF上传+批量保存'] },
  { v: 'v1.3.1', date: '2026-05-04', items: ['MemberDetail照片读取补传projectName+file-service null projectName回退修复'] },
  { v: 'v1.3.0', date: '2026-05-04', items: ['工资管理模块全面重写：考勤系统+计算引擎+4 Tab UI', '工人日薪制×出勤天数、管理人员月薪制（≤4天全勤）', 'db.wages/db.attendances持久化'] },
  { v: 'v1.2.2', date: '2026-05-04', items: ['员工管理5 bug修复：MemberForm props不匹配+WorkerSection TeamFormModal未渲染', 'readUploadedFile未import+TeamFormModal JSX作用域外导致启动白屏'] },
  { v: 'v1.2.1', date: '2026-05-03', items: ['项目名作为第一层目录（uploads/<项目名>/）+文件读取三级回退', '合同PDF预览白屏修复（contract-file://协议中文路径支持）'] },
  { v: 'v1.2.0', date: '2026-05-03', items: ['文件存储全面改造：base64→磁盘文件+中文分目录分类', '统一IPC文件通道：file:save/file:read/file:delete', 'engineering.json从18MB瘦身至1.4MB'] },
  { v: 'v1.1.0', date: '2026-05-02', items: ['Toast系统：Context模式+AnimatePresence堆叠动画', '登录页双列重设计：品牌区+表单卡片', '全站emoji→lucide-react SVG图标（48文件）+侧边栏独立组件化'] },
  { v: 'v1.0.2', date: '2026-05-02', items: ['8个核心组件升级（Button/Input/Modal/Card/Badge/Select/Pagination/Table）+6个新组件（DropdownMenu/Tabs/Tooltip/ProgressBar/FormField/Loading）'] },
  { v: 'v1.0.1', date: '2026-05-02', items: ['Tasks.tsx 40+处编码损坏修复+Login.tsx localStorage→AuthContext', 'API密钥从MEMORY.md移除+IPC handler 34个冗余产物清理'] },
  { v: 'v1.0.0', date: '2026-05-01', items: ['初始版本：Electron 28+React 18+TypeScript 5+Vite 5+TailwindCSS', '核心模块：项目管理/合同管理/发票管理/员工管理/仓库管理/单位管理'] },
]

interface Props { onClose: () => void }

const SettingsChangelog: React.FC<Props> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
    <div className="relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="sticky top-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl px-6 py-4 border-b border-slate-200 dark:border-slate-700 rounded-t-2xl flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Icon name="Clock" size={18} /> 更新日志</h3>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Icon name="X" size={18} /></button>
      </div>
      <div className="px-6 py-5 space-y-6">
        {versions.map(ver => (
          <div key={ver.v}>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-bold bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 rounded-md">{ver.v}</span>
              <span className="text-xs text-slate-400">{ver.date}</span>
            </div>
            <ul className="space-y-1.5">
              {ver.items.map((item, i) => (
                <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                  <span className="text-slate-300 dark:text-slate-600 mt-0.5 flex-shrink-0">•</span>
                  <span>{renderMarkdownInline(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default SettingsChangelog
