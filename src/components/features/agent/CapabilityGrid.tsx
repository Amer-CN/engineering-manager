/**
 * CapabilityGrid — 能力模块卡
 *
 * 展示 AI 助手可操作的各业务模块，按权限过滤
 * 点击 navigate 到对应模块
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { usePermission } from '@/hooks/usePermission'
import { staggerContainer, sectionVariant } from '@/constants/animations'
import { navigateTo } from './types'

interface Capability {
  icon: string
  title: string
  desc: string
  pageId: string
  permission: string
  iconBg: string
}

const CAPABILITIES: Capability[] = [
  {
    icon: 'FolderKanban', title: '项目管理', desc: '查看项目进度、状态、材料等信息',
    pageId: 'projects', permission: 'projects:read', iconBg: 'bg-blue-50 text-blue-600',
  },
  {
    icon: 'FileText', title: '合同管理', desc: '收入合同、支出合同、协议管理',
    pageId: 'contracts', permission: 'contracts:read', iconBg: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: 'Receipt', title: '发票管理', desc: '收票付款、开票回款全流程',
    pageId: 'invoices', permission: 'invoices:read', iconBg: 'bg-teal-50 text-teal-600',
  },
  {
    icon: 'ClipboardList', title: '结算办理', desc: '结算单编制与审核',
    pageId: 'settlement', permission: 'settlement:read', iconBg: 'bg-amber-50 text-amber-600',
  },
  {
    icon: 'Wallet', title: '成本台账', desc: '真实项目成本追踪与核算',
    pageId: 'costLedger', permission: 'costLedger:read', iconBg: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: 'Package', title: '仓库管理', desc: '物料采购、出入库管理',
    pageId: 'inventory', permission: 'inventory:read', iconBg: 'bg-orange-50 text-orange-600',
  },
  {
    icon: 'UserCog', title: '人事管理', desc: '人员档案、考勤、薪酬',
    pageId: 'hr', permission: 'hr:read', iconBg: 'bg-violet-50 text-violet-600',
  },
  {
    icon: 'HardHat', title: '工人管理', desc: '农民工班组、档案、工资',
    pageId: 'labor', permission: 'labor:read', iconBg: 'bg-rose-50 text-rose-600',
  },
]

const CapabilityGrid: React.FC = () => {
  const { can } = usePermission()
  const visible = CAPABILITIES.filter(c => can(c.permission as any))

  if (visible.length === 0) return null

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Icon name="LayoutGrid" size={16} className="text-slate-400" />
        能力模块
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visible.map(cap => (
          <motion.div
            key={cap.pageId}
            variants={sectionVariant}
            whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.06)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigateTo(cap.pageId)}
            className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-white shadow-sm cursor-pointer transition-shadow"
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${cap.iconBg}`}>
              <Icon name={cap.icon} size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">{cap.title}</p>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{cap.desc}</p>
            </div>
            <Icon name="ChevronRight" size={16} className="flex-shrink-0 text-slate-300 mt-1.5" />
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}

export default CapabilityGrid
