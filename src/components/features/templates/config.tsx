import React from 'react'
import { TemplateCategory, TemplateVariable } from '../../../types/electron'

export interface CategoryConfig {
  label: string
  icon: string
  fileType: 'docx' | 'xlsx' | 'both'
  description: string
  defaultVariables: TemplateVariable[]
}

export const categoryConfig: Record<TemplateCategory, CategoryConfig> = {
  contract:           { label: '合同模板',    icon: 'FileText',        fileType: 'docx', description: '收入/支出/劳务/材料合同模板',
    defaultVariables: [
      { key: 'partyA',          label: '甲方',               type: 'text',    defaultValue: '', required: true },
      { key: 'partyB',          label: '乙方',               type: 'text',    defaultValue: '', required: true },
      { key: 'contractName',    label: '合同名称',           type: 'text',    defaultValue: '', required: true },
      { key: 'contractAmount',  label: '合同金额（元）',     type: 'number',  defaultValue: '', required: true },
      { key: 'purchaseContent', label: '采购/工程内容',      type: 'text',    defaultValue: '', required: true },
      { key: 'paymentMethod',   label: '付款方式',           type: 'select',  defaultValue: 'by_progress', required: true,
        options: ['一次性付清', '按月支付', '按进度支付', '按阶段支付'] },
      { key: 'signedDate',      label: '签订日期',           type: 'date',    defaultValue: '', required: false },
      { key: 'startDate',       label: '开始日期',           type: 'date',    defaultValue: '', required: false },
      { key: 'endDate',         label: '结束日期',           type: 'date',    defaultValue: '', required: false },
      { key: 'otherTerms',      label: '其他条款',           type: 'text',    defaultValue: '', required: false },
    ],
  },
  settlement:         { label: '结算模板',    icon: 'ClipboardList',   fileType: 'xlsx', description: '材料/分包/劳务/机械结算模板',
    defaultVariables: [
      { key: 'settlementName',  label: '结算名称',           type: 'text',    defaultValue: '', required: true },
      { key: 'partyA',          label: '甲方',               type: 'text',    defaultValue: '', required: true },
      { key: 'partyB',          label: '乙方',               type: 'text',    defaultValue: '', required: true },
      { key: 'settlementAmount',label: '结算金额（元）',     type: 'number',  defaultValue: '', required: true },
      { key: 'settlementDate',  label: '结算日期',           type: 'date',    defaultValue: '', required: false },
      { key: 'periodStart',     label: '结算周期开始',       type: 'date',    defaultValue: '', required: false },
      { key: 'periodEnd',       label: '结算周期结束',       type: 'date',    defaultValue: '', required: false },
      { key: 'remarks',         label: '备注',               type: 'text',    defaultValue: '', required: false },
      { key: 'otherTerms',      label: '其他条款',           type: 'text',    defaultValue: '', required: false },
    ],
  },
  seal_application:   { label: '用印申请',    icon: 'Stamp',           fileType: 'docx', description: '公章/合同章/财务章用印申请',
    defaultVariables: [
      { key: 'applicant',       label: '申请人',             type: 'text',    defaultValue: '', required: true },
      { key: 'department',      label: '申请部门',           type: 'text',    defaultValue: '', required: true },
      { key: 'sealType',        label: '用印类型',           type: 'select',  defaultValue: '公章', required: true,
        options: ['公章', '合同章', '财务章', '法人章', '部门章'] },
      { key: 'documentName',    label: '文件名称',           type: 'text',    defaultValue: '', required: true },
      { key: 'purpose',         label: '用印用途',           type: 'text',    defaultValue: '', required: true },
      { key: 'copies',          label: '份数',               type: 'number',  defaultValue: '1', required: true },
      { key: 'applyDate',       label: '申请日期',           type: 'date',    defaultValue: '', required: false },
    ],
  },
  fund_application:   { label: '用款申请',    icon: 'Receipt',         fileType: 'docx', description: '工程款/材料款/备用金申请',
    defaultVariables: [
      { key: 'applicant',       label: '申请人',             type: 'text',    defaultValue: '', required: true },
      { key: 'department',      label: '申请部门',           type: 'text',    defaultValue: '', required: true },
      { key: 'amount',          label: '申请金额（元）',     type: 'number',  defaultValue: '', required: true },
      { key: 'usage',           label: '资金用途',           type: 'text',    defaultValue: '', required: true },
      { key: 'payee',           label: '收款方',             type: 'text',    defaultValue: '', required: true },
      { key: 'account',         label: '收款账号',           type: 'text',    defaultValue: '', required: false },
      { key: 'applyDate',       label: '申请日期',           type: 'date',    defaultValue: '', required: false },
    ],
  },
  official_document:  { label: '红头文件',    icon: 'ScrollText',      fileType: 'docx', description: '公司/项目部正式行文模板',
    defaultVariables: [
      { key: 'title',           label: '标题',               type: 'text',    defaultValue: '', required: true },
      { key: 'documentNo',      label: '文号',               type: 'text',    defaultValue: '', required: true },
      { key: 'department',      label: '发文部门',           type: 'text',    defaultValue: '', required: true },
      { key: 'docDate',         label: '日期',             type: 'date',    defaultValue: '', required: false },
      { key: 'mainRecipient',   label: '主送',               type: 'text',    defaultValue: '', required: false },
      { key: 'cc',              label: '抄送',               type: 'text',    defaultValue: '', required: false },
    ],
  },
  letter:             { label: '函件',        icon: 'Mail',            fileType: 'docx', description: '联系函/通知函/催告函模板',
    defaultVariables: [
      { key: 'sender',          label: '发函方',             type: 'text',    defaultValue: '', required: true },
      { key: 'recipient',       label: '收函方',             type: 'text',    defaultValue: '', required: true },
      { key: 'letterDate',      label: '日期',             type: 'date',    defaultValue: '', required: false },
      { key: 'subject',         label: '事由',               type: 'text',    defaultValue: '', required: true },
      { key: 'content',         label: '函件内容',           type: 'text',    defaultValue: '', required: false },
    ],
  },
  other:              { label: '其他',        icon: 'File',            fileType: 'both', description: '其他通用文档模板',
    defaultVariables: [],
  },
}

export const categoryColors: Record<TemplateCategory, string> = {
  contract:           'text-violet-600 bg-violet-50 border-violet-200',
  settlement:         'text-emerald-600 bg-emerald-50 border-emerald-200',
  seal_application:   'text-amber-600 bg-amber-50 border-amber-200',
  fund_application:   'text-blue-600 bg-blue-50 border-blue-200',
  official_document:  'text-red-600 bg-red-50 border-red-200',
  letter:             'text-sky-600 bg-sky-50 border-sky-200',
  other:              'text-slate-500 bg-slate-100 border-slate-200',
}
