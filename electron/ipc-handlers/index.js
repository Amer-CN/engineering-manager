/**
 * IPC 处理器汇总
 *
 * 导入并注册所有业务模块的 IPC 处理器
 */
// 配置管理
import './config';
// 用户认证
import './auth';
import './roles';
// 项目管理
import './projects';
// 成员管理（包含农民工班组、调动记录）
import './members';
// 全局工人信息库 + 项目用工关系
import './workers';
// 材料与费用
import './materials';
// 合作单位（包含地区、监管单位）
import './partners';
// 合同管理（收入合同、支出合同）
import './contracts';
// 结算办理（包含合同模板）
import './settlements';
// 模板管理
import './templates';
// 图纸管理
import './drawings';
// 部门管理
import './departments';
// 进销存
import './inventory';
// 统一文件服务
import './files';
// 发票管理
import './invoices';
// 统计
import './stats';
// 考勤管理
import './attendance';
import './attendance-batch-import';
// 工资管理
import './wages';
// 成本台账
import './cost-ledger';
import './cost-ledger-categories';
import './cost-ledger-batches';
import './cost-ledger-match-rules';
// 审计日志
import './audit';
// 快照管理
import './snapshots';
// 薪资历史
import './salary-history';
import './wage-history';
// OCR（百度在线识别，通过主进程代理 HTTP 请求）
import './ocr';
// SQLite 状态管理（可选功能，查询/启用/迁移）
import './sqlite-status';
