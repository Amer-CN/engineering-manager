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
