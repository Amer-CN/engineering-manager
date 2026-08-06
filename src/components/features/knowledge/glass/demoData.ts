/**
 * 轮播演示数据（M2 静态落地用；M3 接入真实 API 后删除）
 *
 * 工程语境文案，6 个文件夹 × 3 文档，覆盖工程公司知识库常见分类。
 */

import type { FolderItem } from './types'

export const DEMO_FOLDERS: FolderItem[] = [
  {
    id: 'f1',
    title: '安全生产资料',
    englishTitle: 'SAFETY',
    period: '2026 · 上半年',
    progress: 92,
    memberCount: 6,
    category: '安全',
    documents: [
      { id: 'f1-d1', title: '年度安全交底记录汇总', code: 'SAF-2026-01', priority: '高', status: '已完成', date: '2026-01-15', assignee: '王强' },
      { id: 'f1-d2', title: '特种作业人员持证台账', code: 'SAF-2026-02', priority: '中', status: '进行中', date: '2026-02-03', assignee: '李敏' },
      { id: 'f1-d3', title: '隐患排查整改闭环报告', code: 'SAF-2026-03', priority: '低', status: '未开始', date: '2026-03-28', assignee: '赵磊' },
    ],
  },
  {
    id: 'f2',
    title: '合同与往来文件',
    englishTitle: 'CONTRACTS',
    period: '2026 · Q1-Q2',
    progress: 78,
    memberCount: 4,
    category: '合同',
    documents: [
      { id: 'f2-d1', title: '总包施工合同补充协议', code: 'CTR-2026-07', priority: '高', status: '已完成', date: '2026-02-18', assignee: '陈静' },
      { id: 'f2-d2', title: '分包结算争议往来函件', code: 'CTR-2026-08', priority: '中', status: '进行中', date: '2026-04-09', assignee: '刘洋' },
      { id: 'f2-d3', title: '材料采购合同台账', code: 'CTR-2026-09', priority: '低', status: '未开始', date: '2026-05-12', assignee: '周芳' },
    ],
  },
  {
    id: 'f3',
    title: '图纸与变更单',
    englishTitle: 'DRAWINGS',
    period: '项目 A 施工期',
    progress: 65,
    memberCount: 5,
    category: '技术',
    documents: [
      { id: 'f3-d1', title: '结构专业施工图会审纪要', code: 'DWG-A-014', priority: '高', status: '进行中', date: '2026-03-02', assignee: '孙工' },
      { id: 'f3-d2', title: '幕墙深化设计变更单', code: 'DWG-A-015', priority: '中', status: '已完成', date: '2026-03-20', assignee: '郑涛' },
      { id: 'f3-d3', title: '机电管线综合图审意见', code: 'DWG-A-016', priority: '低', status: '待评审', date: '2026-06-01', assignee: '吴丹' },
    ],
  },
  {
    id: 'f4',
    title: '人员与考勤档案',
    englishTitle: 'HR',
    period: '2026 年度',
    progress: 84,
    memberCount: 3,
    category: '人事',
    documents: [
      { id: 'f4-d1', title: '在册管理人员花名册', code: 'HR-2026-01', priority: '中', status: '已完成', date: '2026-01-10', assignee: '冯雪' },
      { id: 'f4-d2', title: '农民工实名制考勤汇总', code: 'HR-2026-02', priority: '高', status: '进行中', date: '2026-04-25', assignee: '钱进' },
      { id: 'f4-d3', title: '技能证书到期提醒表', code: 'HR-2026-03', priority: '低', status: '未开始', date: '2026-05-30', assignee: '冯雪' },
    ],
  },
  {
    id: 'f5',
    title: '结算与支付凭证',
    englishTitle: 'SETTLEMENT',
    period: '2026 · Q2',
    progress: 45,
    memberCount: 4,
    category: '财务',
    documents: [
      { id: 'f5-d1', title: '月度工程款支付申请表', code: 'STL-2026-05', priority: '高', status: '进行中', date: '2026-05-08', assignee: '杨帆' },
      { id: 'f5-d2', title: '分包结算初审意见', code: 'STL-2026-06', priority: '中', status: '待评审', date: '2026-06-15', assignee: '朱琳' },
      { id: 'f5-d3', title: '农民工工资发放汇总表', code: 'STL-2026-07', priority: '低', status: '未开始', date: '2026-06-28', assignee: '杨帆' },
    ],
  },
  {
    id: 'f6',
    title: '会议纪要与沟通',
    englishTitle: 'MOM',
    period: '2026 · 上半年',
    progress: 95,
    memberCount: 2,
    category: '沟通',
    documents: [
      { id: 'f6-d1', title: '监理例会纪要（第 12 期）', code: 'MOM-12', priority: '中', status: '已完成', date: '2026-04-18', assignee: '何伟' },
      { id: 'f6-d2', title: '业主协调会行动项跟踪', code: 'MOM-13', priority: '高', status: '进行中', date: '2026-05-22', assignee: '何伟' },
      { id: 'f6-d3', title: '设计交底答疑记录', code: 'MOM-14', priority: '低', status: '已完成', date: '2026-06-10', assignee: '许敏' },
    ],
  },
]
