# 工程管家 - 工程业务管理系统

**[官方网站](https://engineering-manager-website.pages.dev/)** · [GitHub Releases](https://github.com/Amer-CN/engineering-manager/releases)

## 📖 项目介绍

**工程管家** 是一款专为工程公司和施工团队设计的桌面应用程序，帮助您高效管理项目、合同、发票、人员、材料、结算等核心业务。

## ✨ 功能一览

- 📊 **仪表盘** - 项目总览、合同统计、发票提醒、结算摘要
- 🏗️ **项目管理** - 创建项目、健康度评分、收支对比、成本分析、指挥中心 Bento 网格
- 📝 **合同管理** - 收入 / 支出 / 其他协议（6 种子类型）、结算金额、收款统计、看板首页
- 🧾 **发票管理** - 4 种票种（纸/电 × 普/专）、收票→付款、开票→回款、状态跟踪
- 🚜 **结算管理** - 6 种细分类别、自动核验付款+发票、Excel 模板/灵活导入
- 📄 **模板管理** - Word/Excel 模板上传、变量填充生成、7 种分类（合同/结算/用印/用款/红头/函件/其他）
- 🏛️ **人事管理** - 管理人员档案、部门架构、考勤日历（时间线+画笔模式）、月薪薪酬、薪资历史
- 👷 **工人管理** - 4-Tab架构（看板/工人库/班组管理/工资管理），全局工人信息库（双表分离），Excel导入
- 📦 **仓库管理** - 物料库、出入库记录、项目材料台账
- 🏢 **单位管理** - 合作单位、监管单位、纳税资质、联网查询
- 💰 **工资管理** - 工人日薪制（日薪×出勤+奖金-扣款）、考勤打卡（画笔日历）、银行回单 PDF 自动解析、发放记录归档
- 📊 **成本台账** - 真实资金流追踪（含灰色支出/垫资/股东融资），双入口角色分离，二级分类系统，Excel 级列筛选
- 🤖 **AI 智能助手** - Agent 对话、智能数据引擎、SQLite 智能管理
- 👤 **用户与权限** - 头像弹出菜单、角色权限矩阵编辑、操作日志审计
- 🔒 **屏幕锁定** - 一键锁屏防窥屏，需密码解锁后继续操作

## 🛠️ 技术栈

- **C# (.NET 8) + ASP.NET Core Minimal API** - 后端 API 服务
- **Dapper + Microsoft.Data.Sqlite** - 轻量 ORM + 数据库访问
- **WinForms + WebView2** - 桌面窗口（内嵌浏览器内核显示 React 前端）
- **React 18 + TypeScript 5** - 类型安全的 UI 开发
- **Vite 8** - 极速构建工具
- **TailwindCSS** - 实用优先的样式框架
- **framer-motion** - 全站交互动画引擎
- **recharts** - 声明式数据可视化图表库
- **lucide-react** - SVG 图标库（80+ 图标）
- **SQLite** - 本地数据持久化（engineering.db）
- **百度OCR** - 在线 OCR 识别（身份证/发票/银行卡等 9 种）

## 🚀 运行项目

### 环境要求

- .NET 8 SDK
- Node.js 18+
- Windows 系统

### 安装依赖

```bash
npm install
cd EngineeringManager.Api && dotnet restore
```

### 开发模式运行

双击运行 `工程管家.bat`，或手动执行：

```bash
# 终端 1：启动 C# 后端（自动同步前端 dist/ 到输出目录）
cd EngineeringManager.Api && dotnet run

# 终端 2：启动 React 前端（热更新开发）
npm run dev
```

> 修改前端代码后，执行 `npx vite build` 重新构建，然后 `dotnet run` 会通过 csproj 中的 `SyncFrontendDist` Target 自动将 `dist/` 同步到 C# 输出目录。

### 打包桌面应用

```bash
build-installer.bat
```

打包完成后，安装包位于 `release/EngineeringManager-Setup-<版本号>.exe`（例：`release/EngineeringManager-Setup-0.82.1.exe`）。

## 📝 使用说明

1. 首次使用需要先创建项目
2. 在项目中可以管理合同、发票、人员、材料等
3. 所有数据保存在本地（SQLite），无需担心数据安全
4. 默认管理员账号：`admin`（首次登录时**强制修改密码**）

## 📚 文档索引

- **[AGENTS.md](./AGENTS.md)** — 项目架构、技术栈、模块说明、开发指南（AI 辅助开发入口）
- **[设计系统](./AGENTS.md#-ui-规范)** — 完整设计系统（色彩、字体、间距、动画、组件规范）
- **[CHANGELOG.md](./CHANGELOG.md)** — 版本历史（v1.0.0 → 最新）
- **[docs/](./docs/)** — 架构决策（ARCHITECTURE）、数据库设计（DATABASE_DESIGN）、模块详解（MODULES）、安全修复计划（P0-FIX-PLAN）、冒烟测试（SMOKE-TEST）、历史交接（handoff/）

## 📄 许可证

本项目采用 [MIT License](./LICENSE) 开源，**全部代码（含企业版功能）永久免费开放**。

企业版与个人版的区别在于**服务**而非代码授权：企业版提供部署实施、数据迁移、
技术支持与云同步服务。自行编译使用不收取任何费用。
