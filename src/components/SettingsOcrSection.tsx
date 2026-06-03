import React, { useState, useEffect } from 'react'
import { Icon } from './ui/Icon'
import { OCRConfig, OCRProvider, getProviderName as gpName } from '../services/ocr'
import { getAPI } from '@/services/api-adapter'

interface Props {
  ocrConfig: OCRConfig; setOcrConfig: (c: OCRConfig) => void
  ocrStatus: { online: boolean; provider: OCRProvider; configured: boolean } | null
  testingOCR: boolean
  ocrMessage: { type: 'success' | 'error' | 'info'; text: string } | null
  onSave: () => void; onTest: () => void
}

// 支持的 OCR 功能列表
const OCR_FEATURES = [
  { name: '身份证识别', icon: 'UserCheck', description: '自动识别姓名、身份证号、性别、民族、地址', status: 'ready' },
  { name: '增值税发票识别', icon: 'Receipt', description: '自动识别发票号码、金额、税率、销售方/购买方', status: 'ready' },
  { name: '银行卡识别', icon: 'CreditCard', description: '自动识别银行卡号、银行名称', status: 'ready' },
  { name: '营业执照识别', icon: 'Building2', description: '自动识别公司名称、统一社会信用代码、法人', status: 'ready' },
  { name: '银行回单识别', icon: 'FileText', description: '自动识别交易日期、金额、收付款方', status: 'ready' },
  { name: '开户许可证识别', icon: 'FileCheck', description: '自动识别开户许可证号、账号、开户行', status: 'beta' },
  { name: '银行单据识别', icon: 'ScrollText', description: '自动识别银行流水明细', status: 'beta' },
  { name: '通用票据识别', icon: 'FileJson', description: '自动识别票据文字内容', status: 'beta' },
  { name: '企业工商信息查询', icon: 'Search', description: '输入公司名称查询工商注册信息', status: 'coming' },
]

export const SettingsOcrSection: React.FC<Props> = ({ ocrConfig, setOcrConfig, ocrStatus, testingOCR, ocrMessage, onSave, onTest }) => {
  const [ocrStats, setOcrStats] = useState<{ idCard: number; invoice: number; bankCard: number; businessLicense: number; bankReceipt: number; permit: number; bankStatement: number; generalReceipt: number; companyQuery: number; lastReset: string } | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await (await getAPI()).ocrGetStats()
        setOcrStats(res?.data || res)
      } catch {}
    })()
  }, [])

  const totalCalls = ocrStats ? ocrStats.idCard + ocrStats.invoice + ocrStats.bankCard + ocrStats.businessLicense + ocrStats.bankReceipt + ocrStats.permit + ocrStats.bankStatement + ocrStats.generalReceipt + ocrStats.companyQuery : 0

  return (
  <div className="card">
    <div className="card-header">
      <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
        <Icon name="Sparkles" size={20} className="text-primary-600" /> AI 智能识别
      </h2>
      <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-medium bg-primary-100 text-primary-700">
        {OCR_FEATURES.filter(f => f.status === 'ready').length} 项可用
      </span>
    </div>
    <div className="card-body space-y-5">
      {/* 状态概览 */}
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <span className={`w-3 h-3 rounded-full ${ocrStatus?.online ? 'bg-success-500 animate-pulse' : 'bg-slate-400'}`}></span>
        <span className="text-sm font-medium">{ocrStatus?.online ? 'AI 服务在线' : 'AI 服务离线'}</span>
        <span className="text-slate-300">|</span>
        <span className="text-sm text-slate-600">当前模式: <span className="font-medium text-slate-800">{gpName(ocrStatus?.provider || 'offline')}</span></span>
        {ocrStatus?.configured === false && <><span className="text-slate-300">|</span><span className="text-sm text-warning-600 font-medium"><Icon name="AlertTriangle" size={14} className="inline" /> 未配置API</span></>}
      </div>

      {/* 支持的 OCR 功能列表 */}
      <div>
        <label className="label">支持的智能识别功能</label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {OCR_FEATURES.map((feature) => (
            <div key={feature.name} className={`p-3 rounded-xl border transition-all ${
              feature.status === 'ready' ? 'border-success-200 bg-success-50' :
              feature.status === 'beta' ? 'border-amber-200 bg-amber-50' :
              'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  feature.status === 'ready' ? 'bg-success-100 text-success-600' :
                  feature.status === 'beta' ? 'bg-amber-100 text-amber-600' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  <Icon name={feature.icon} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 truncate">{feature.name}</span>
                    {feature.status === 'ready' && <span className="text-xs text-success-600">✓</span>}
                    {feature.status === 'beta' && <span className="text-xs text-amber-600">测试版</span>}
                    {feature.status === 'coming' && <span className="text-xs text-slate-400">即将推出</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* OCR 模式选择 */}
      <div>
        <label className="label">选择识别模式</label>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setOcrConfig({ ...ocrConfig, provider: 'offline' })} className={`p-5 rounded-xl border-2 transition-all ${ocrConfig.provider === 'offline' ? 'border-primary-500 bg-primary-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                <Icon name="WifiOff" size={24} />
              </div>
              <div className="text-left">
                <div className="text-base font-semibold text-slate-800">本地离线</div>
                <div className="text-sm text-slate-500">无需网络，仅识别身份证号</div>
              </div>
            </div>
          </button>
          <button onClick={() => setOcrConfig({ ...ocrConfig, provider: 'baidu' })} className={`p-5 rounded-xl border-2 transition-all ${ocrConfig.provider === 'baidu' ? 'border-primary-500 bg-primary-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl">
                <Icon name="Sparkles" size={22} />
              </div>
              <div className="text-left">
                <div className="text-base font-semibold text-slate-800">AI 智能识别</div>
                <div className="text-sm text-slate-500">需要网络，支持全部识别功能</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 百度 OCR 配置 */}
      {ocrConfig.provider === 'baidu' && (
        <div className="space-y-4 p-5 rounded-xl border border-primary-200 bg-primary-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-primary-700">
              <Icon name="Sparkles" size={20} /> AI 智能识别配置
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-700">推荐</span>
          </div>

          <div className="rounded-lg p-4 bg-white border border-primary-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-700">本月调用统计</p>
              {ocrStats && <span className="text-xs text-slate-400">{ocrStats.lastReset}</span>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-lg font-bold text-primary-600">{ocrStats?.idCard ?? '--'}</div>
                <div className="text-xs text-slate-500">身份证</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-lg font-bold text-primary-600">{ocrStats?.invoice ?? '--'}</div>
                <div className="text-xs text-slate-500">发票</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-lg font-bold text-primary-600">{ocrStats?.bankCard ?? '--'}</div>
                <div className="text-xs text-slate-500">银行卡</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-lg font-bold text-primary-600">{ocrStats?.businessLicense ?? '--'}</div>
                <div className="text-xs text-slate-500">营业执照</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-lg font-bold text-primary-600">{ocrStats?.bankReceipt ?? '--'}</div>
                <div className="text-xs text-slate-500">银行回单</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-lg font-bold text-primary-600">{totalCalls}</div>
                <div className="text-xs text-slate-500">总计</div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">API Key</label>
              <input type="text" value={ocrConfig.baidu?.apiKey || ''} onChange={e => setOcrConfig({ ...ocrConfig, baidu: { ...ocrConfig.baidu, apiKey: e.target.value, secretKey: ocrConfig.baidu?.secretKey || '' } })} placeholder="例 LnTxxxxxxxxxxxxxx" className="input" />
            </div>
            <div>
              <label className="label">Secret Key</label>
              <input type="password" value={ocrConfig.baidu?.secretKey || ''} onChange={e => setOcrConfig({ ...ocrConfig, baidu: { ...ocrConfig.baidu, apiKey: ocrConfig.baidu?.apiKey || '', secretKey: e.target.value } })} placeholder="例 8xxxxxxxxxxxxxxxxxxxxxx" className="input" />
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-3">
        <button onClick={onSave} className="btn btn-primary">
          <Icon name="Save" size={16} /> 保存配置
        </button>
        <button onClick={onTest} disabled={testingOCR} className="btn btn-secondary">
          {testingOCR ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600"></div>检测中...</>
          ) : (
            <><Icon name="RefreshCw" size={16} /> 检测连接</>
          )}
        </button>
      </div>

      {/* 消息提示 */}
      {ocrMessage && (
        <div className={`rounded-xl p-4 ${
          ocrMessage.type === 'success' ? 'bg-success-50 border border-success-200 text-success-700' :
          ocrMessage.type === 'info' ? 'bg-info-50 border border-info-200 text-info-700' :
          'bg-danger-50 border border-danger-200 text-danger-700'
        }`}>
          {ocrMessage.text}
        </div>
      )}

      {/* 离线模式说明 */}
      {ocrConfig.provider === 'offline' && (
        <div className="rounded-xl p-4 bg-warning-50 border border-warning-200">
          <p className="text-sm text-warning-800">
            <Icon name="Lightbulb" size={16} className="inline" /> <strong>离线模式说明：</strong>无需网络即可使用，但只能识别身份证号，其他功能需要切换到 AI 智能识别模式。
          </p>
        </div>
      )}
    </div>
  </div>
  )
}
