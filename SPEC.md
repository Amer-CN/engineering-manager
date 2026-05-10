# 工程项目管理系统 - 项目规格说明书

## 1. 项目概述

### 项目名称
**工程管家** - 工程项目管理系统

### 项目目标
为小型工程团队（1-10人）提供一站式的工程项目管理解决方案，实现项目进度、团队人员、工程材料、工程预算、工程图纸的集中管理。

### 目标用户
- 小型工程团队负责人
- 包工头/项目经理
- 工程监理人员
- 自由职业工程顾问

## 2. 技术架构

### 前端框架
- **Electron**: 跨平台桌面应用框架
- **React 18**: 用户界面框架
- **TypeScript**: 类型安全的开发语言
- **TailwindCSS**: 现代化样式框架

### 数据存储
- **SQLite**: 轻量级本地数据库（免费、无需安装数据库服务器）
  - *注：实际实现使用 JSON 文件存储，详见 CLAUDE.md*
- **文件存储**: 本地文件系统（用于图纸上传）

### 开发工具
- **Node.js**: JavaScript 运行时
- **Vite**: 现代化构建工具
- **electron-builder**: 桌面应用打包工具

## 3. 功能模块

### 3.1 项目管理
- 创建、编辑、删除工程项目
- 项目基本信息（名称、描述、地址、开工/竣工日期）
- 项目状态跟踪（筹备中、进行中、已完成、已归档）
- 项目搜索和筛选

### 3.2 任务进度管理
- 为项目创建任务清单
- 任务分配给团队成员
- 任务优先级（高、中、低）
- 任务状态（待处理、进行中、已完成）
- 任务进度百分比
- 任务截止日期提醒

### 3.3 团队人员管理
- 添加/编辑/删除团队成员
- 成员角色（项目经理、工程师、施工员、监理等）
- 成员联系方式
- 成员参与的项目记录

### 3.4 材料设备管理
 - 材料/设备清单
- 材料分类（主材、辅材、设备、工具）
- 库存数量管理
- 采购记录
- 使用记录

### 3.5 预算费用管理
- 项目预算设定
- 费用分类（人工费、材料费、设备费、其他费用）
- 费用记录（日期、金额、类别、备注）
- 预算执行跟踪
- 费用统计报表

### 3.6 图纸管理
- 图纸上传（支持图片格式：jpg、png、pdf）
- 图纸分类（建筑图、结构图、电气图、给排水图等）
- 图纸关联项目
- 图纸预览功能
- 图纸备注说明

### 3.7 数据统计
- 项目概览仪表盘
- 各项目进度对比
- 费用支出趋势
- 任务完成率统计

## 4. 用户界面设计

### 整体风格
- 现代简约风格，蓝色主色调
- 清晰的信息层级
- 友好的操作体验
- 响应速度快

### 导航结构
```
├── 首页（仪表盘）
├── 项目管理
│   ├── 项目列表
│   └── 项目详情
├── 任务管理
├── 人员管理
├── 材料管理
├── 预算管理
├── 图纸管理
└── 设置
```

### 色彩方案
- 主色：#2563EB（蓝色）
- 辅助色：#10B981（绿色-成功）、#F59E0B（橙色-警告）、#EF4444（红色-危险）
- 背景色：#F3F4F6（浅灰）
- 文字色：#1F2937（深灰）

## 5. 数据模型

### 项目 (Project)
```
{
  id: number
  name: string
  description: string
  address: string
  startDate: date
  endDate: date
  status: 'planning' | 'in_progress' | 'completed' | 'archived'
  budget: number
  createdAt: datetime
  updatedAt: datetime
}
```

### 任务 (Task)
```
{
  id: number
  projectId: number
  title: string
  description: string
  assigneeId: number
  priority: 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'completed'
  progress: number (0-100)
  dueDate: date
  createdAt: datetime
  updatedAt: datetime
}
```

### 人员 (Member)
```
{
  id: number
  name: string
  role: string
  phone: string
  email: string
  createdAt: datetime
}
```

### 材料 (Material)
```
{
  id: number
  projectId: number
  name: string
  category: string
  unit: string
  quantity: number
  price: number
  createdAt: datetime
}
```

### 费用 (Expense)
```
{
  id: number
  projectId: number
  amount: number
  category: string
  description: string
  date: date
  createdAt: datetime
}
```

### 图纸 (Drawing)
```
{
  id: number
  projectId: number
  name: string
  category: string
  filePath: string
  remarks: string
  createdAt: datetime
}
```

## 6. 开发计划

### 第一阶段：项目搭建（已完成框架）
- [x] 项目初始化
- [x] 开发环境配置
- [x] 基础组件库搭建

### 第二阶段：核心功能开发
- [ ] 首页仪表盘
- [ ] 项目管理模块
- [ ] 任务管理模块
- [ ] 人员管理模块
- [ ] 材料管理模块
- [ ] 预算管理模块
- [ ] 图纸管理模块

### 第三阶段：打包发布
- [ ] 应用图标定制
- [ ] Windows 安装包打包
- [ ] Mac 安装包打包

## 7. 预期成果

交付一个可运行的桌面应用程序，功能包括：
- ✅ 完整的项目管理功能
- ✅ 任务进度跟踪
- ✅ 团队人员管理
- ✅ 材料设备台账
- ✅ 预算费用统计
- ✅ 图纸文件管理
- ✅ 数据统计仪表盘

## 8. 成本说明

- 开发工具：免费（VS Code、Node.js）
- 框架：免费（Electron、React）
- 数据库：免费（SQLite）
- 发布：免费（electron-builder）
- **总成本：0元**

---

*文档版本：1.0*
*创建日期：2026-04-28*
*注：此文档为原始规划，实际实现可能有所不同。最新技术架构请参考 CLAUDE.md*
