/**
 * IPC 处理器汇总
 * 
 * 导入并注册所有业务模块的 IPC 处理器
 */

// 配置管理
import './config'

// 用户认证
import './auth'

// 项目管理
import './projects'

// 成员管理（包含农民工班组、调动记录）
import './members'

// 任务管理
import './tasks'

// 材料与费用
import './materials'

// 合作单位（包含地区、监管单位）
import './partners'

// 合同管理（收入合同、支出合同）
import './contracts'

// 结算办理（包含合同模板）
import './settlements'

// 模板管理
import './templates'

// 图纸管理
import './drawings'

// 进销存
import './inventory'

// 统一文件服务
import './files'

// 发票管理
import './invoices'

// 统计
import './stats'

// 考勤管理
import './attendance'

// 工资管理
import './wages'

// 成本台账
import './cost-ledger'

// 审计日志
import './audit'
