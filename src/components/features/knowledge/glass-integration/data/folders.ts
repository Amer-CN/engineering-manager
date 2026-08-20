import { FolderItem } from '../types';

export const INITIAL_FOLDERS: FolderItem[] = [
  {
    id: 'f1',
    title: '项目文档',
    englishTitle: 'Corporate',
    period: '2025 · Q2',
    progress: 87,
    memberCount: 4,
    highlightColor: 'emerald',
    category: '核心文档',
    description: '包含企业季度核心战略规划、项目验收文档与合规评估标准',
    documents: [
      { id: 'd1', title: '需求评审会', code: 'WXB-2025-001', priority: '高', status: '进行中', date: '2025-05-24 18:00', assignee: 'Brandon' },
      { id: 'd2', title: '用户调研分析', code: 'WXB-2025-002', priority: '中', status: '进行中', date: '今天 14:00', assignee: 'Alex' },
      { id: 'd3', title: '竞品功能梳理', code: 'WXB-2025-003', priority: '中', status: '已完成', date: '明天 09:30', assignee: 'Sarah' },
    ]
  },
  {
    id: 'f2',
    title: '需求评审',
    englishTitle: 'Unclassified',
    period: 'Jan 01 - Mar 31',
    progress: 92,
    memberCount: 4,
    highlightColor: 'emerald',
    category: '产品规范',
    description: '业务团队对齐需求范围，明确核心目标与验收标准',
    documents: [
      { id: 'd4', title: '交互流程设计', code: 'WXB-2025-004', priority: '高', status: '进行中', date: '今天 10:00', assignee: 'Brandon' },
      { id: 'd5', title: '原型评审总结', code: 'WXB-2025-005', priority: '中', status: '进行中', date: '今天 16:30', assignee: 'Elena' },
    ]
  },
  {
    id: 'f3',
    title: '产品设计',
    englishTitle: 'Training',
    period: 'Apr 01 - Jun 30',
    progress: 78,
    memberCount: 4,
    highlightColor: 'cyan',
    category: 'UI/UX',
    description: '3D 玻璃拟态视觉风格指南、交互组件规范与高保真原型',
    documents: [
      { id: 'd6', title: '设计系统 2.0 升级', code: 'WXB-2025-006', priority: '高', status: '已完成', date: '2025-05-18', assignee: 'Kevin' },
      { id: 'd7', title: '3D 文件夹组件走查', code: 'WXB-2025-007', priority: '高', status: '进行中', date: '2025-05-20', assignee: 'Brandon' },
    ]
  },
  {
    id: 'f4',
    title: '开发实现',
    englishTitle: 'Compliance',
    period: 'May 10 - Jul 15',
    progress: 65,
    memberCount: 5,
    highlightColor: 'emerald',
    category: '技术架构',
    description: '前端 Canvas 3D 渲染优化、WebGL/CSS 3D 转换与无限循环算法',
    documents: [
      { id: 'd8', title: '核心 Loop 算法重构', code: 'WXB-2025-008', priority: '高', status: '已完成', date: '2025-05-22', assignee: 'David' },
      { id: 'd9', title: '触摸拖拽与惯性滑动', code: 'WXB-2025-009', priority: '中', status: '进行中', date: '2025-05-23', assignee: 'Brandon' },
    ]
  },
  {
    id: 'f5',
    title: '测试验证',
    englishTitle: 'Templates',
    period: 'Jun 01 - Aug 30',
    progress: 84,
    memberCount: 2,
    highlightColor: 'amber',
    category: '质量保证',
    description: '性能压测、跨浏览器适配性测试与 60FPS 动画帧率走查',
    documents: [
      { id: 'd10', title: ' Safari/Chrome 兼容性测试', code: 'WXB-2025-010', priority: '中', status: '已完成', date: '2025-05-25', assignee: 'Lisa' },
    ]
  },
  {
    id: 'f6',
    title: '部署上线',
    englishTitle: 'Sales',
    period: 'Jul 01 - Sep 30',
    progress: 45,
    memberCount: 3,
    highlightColor: 'purple',
    category: '运维部署',
    description: 'Cloud Run 容器化构建与 CDN 静态资源加速发布',
    documents: [
      { id: 'd11', title: ' Docker 镜像构建', code: 'WXB-2025-011', priority: '高', status: '未开始', date: '2025-06-01', assignee: 'DevOps' },
    ]
  },
  {
    id: 'f7',
    title: '签署归档',
    englishTitle: 'Licenses',
    period: 'Aug 01 - Oct 31',
    progress: 95,
    memberCount: 5,
    highlightColor: 'emerald',
    category: '法务合规',
    description: '开源许可证审计、知识产权登记与最终归档文件包',
    documents: [
      { id: 'd12', title: ' Apache 2.0 协议归档', code: 'WXB-2025-012', priority: '低', status: '已完成', date: '2025-05-01', assignee: 'Legal' },
    ]
  },
  {
    id: 'f8',
    title: '项目总结',
    englishTitle: 'Audit',
    period: 'Sep 01 - Nov 30',
    progress: 30,
    memberCount: 4,
    highlightColor: 'blue',
    category: '复盘总结',
    description: '项目 ROI 分析、团队协作复盘与下一阶段产品规划',
    documents: [
      { id: 'd13', title: ' Q2 复盘报告Draft', code: 'WXB-2025-013', priority: '低', status: '未开始', date: '2025-06-30', assignee: 'Brandon' },
    ]
  },
  {
    id: 'f9',
    title: '知识库模版',
    englishTitle: 'Knowledge Base',
    period: '2025 · Full Year',
    progress: 90,
    memberCount: 6,
    highlightColor: 'emerald',
    category: '共享资源',
    description: '团队内部可复用的 UI 模版、代码组件与流程文档',
    documents: [
      { id: 'd14', title: ' 3D 拟态效果 CSS 规范', code: 'WXB-2025-014', priority: '中', status: '已完成', date: '2025-04-15', assignee: 'Kevin' },
    ]
  }
];
