import React, { useState, useEffect } from 'react'
import { Icon } from './ui/Icon'
import { OCRConfig, OCRProvider, getProviderName as gpName } from '../services/ocr'
import { getAPI } from '@/services/api-adapter'
import { Button } from './ui/Button'
import { ConfirmDialog } from './ui/ConfirmDialog'

interface Props {
  ocrConfig: OCRConfig; setOcrConfig: (c: OCRConfig) => void
  ocrStatus: { online: boolean; provider: OCRProvider; configured: boolean } | null
  testingOCR: boolean
  /** 保存中（密钥落盘为异步请求） */
  savingOCR: boolean
  ocrMessage: { type: 'success' | 'error' | 'info'; text: string } | null
  onSave: () => void; onTest: () => void
  /** 清除后端已保存的密钥（组件内二次确认后调用） */
  onClearKeys: () => void
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
  { name: '企业工商信息查询', icon: 'Search', description: '输入公司名称查询工商注册信息', status: 'beta' },
]

export const SettingsOcrSection: React.FC<Props> = ({ ocrConfig, setOcrConfig, ocrStatus, testingOCR, savingOCR, ocrMessage, onSave, onTest, onClearKeys }) => {
  const [ocrStats, setOcrStats] = useState<{ idCard: number; invoice: number; bankCard: number; businessLicense: number; bankReceipt: number; permit: number; bankStatement: number; generalReceipt: number; companyQuery: number; lastReset: string } | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const res = await (await getAPI()).ocrGetStats()
        setOcrStats(res?.data || res)
      } catch (err) { console.warn('[SettingsOcr] 获取OCR统计失败:', err) }
    })()
  }, [])

  const totalCalls = ocrStats ? ocrStats.idCard + ocrStats.invoice + ocrStats.bankCard + ocrStats.businessLicense + ocrStats.bankReceipt + ocrStats.permit + ocrStats.bankStatement + ocrStats.generalReceipt + ocrStats.companyQuery : 0

  return (
  <div className="card">
    <div className="card-header">
      <h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2">
        <Icon name="Sparkles" size={20} className="text-[color:var(--accent)]" /> AI 智能识别
      </h2>
      <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-medium bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
        {OCR_FEATURES.filter(f => f.status === 'ready').length} 项可用
      </span>
    </div>
    <div className="card-body space-y-5">
      {/* 状态概览 */}
      <div className="flex items-center gap-3 p-3 bg-[color:var(--panel-2)] rounded-xl border border-[color:var(--border)]">
        <span className={`w-3 h-3 rounded-full ${ocrStatus?.online ? 'bg-success-500 animate-pulse' : 'bg-[color:var(--muted)]'}`}></span>
        <span className="text-sm font-medium">{ocrStatus?.online ? 'AI 服务在线' : 'AI 服务离线'}</span>
        <span className="text-[color:var(--border-strong)]">|</span>
        <span className="text-sm text-[color:var(--fg-2)]">当前模式: <span className="font-medium text-[color:var(--fg)]">{gpName(ocrStatus?.provider || 'offline')}</span></span>
        {ocrStatus?.configured === false && <><span className="text-[color:var(--border-strong)]">|</span><span className="text-sm text-warning-600 font-medium"><Icon name="AlertTriangle" size={14} className="inline" /> 未配置API</span></>}
      </div>

      {/* 支持的 OCR 功能列表 */}
      <div>
        <label className="label">支持的智能识别功能</label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {OCR_FEATURES.map((feature) => (
            <div key={feature.name} className={`p-3 rounded-xl border transition-all ${
              feature.status === 'ready' ? 'border-success-200 bg-success-50' :
              feature.status === 'beta' ? 'border-warning-200 bg-warning-50' :
              'border-[color:var(--border)] bg-[color:var(--panel-2)]'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  feature.status === 'ready' ? 'bg-success-100 text-success-600' :
                  feature.status === 'beta' ? 'bg-warning-100 text-warning-600' :
                  'bg-[color:var(--panel-2)] text-[color:var(--muted)]'
                }`}>
                  <Icon name={feature.icon} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[color:var(--fg)] truncate">{feature.name}</span>
                    {feature.status === 'ready' && <span className="text-xs text-success-600">✓</span>}
                    {feature.status === 'beta' && <span className="text-xs text-warning-600">测试版</span>}
                    {feature.status === 'coming' && <span className="text-xs text-[color:var(--muted)]">即将推出</span>}
                  </div>
                  <p className="text-xs text-[color:var(--muted)] mt-0.5 line-clamp-2">{feature.description}</p>
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
          <button onClick={() => setOcrConfig({ ...ocrConfig, provider: 'offline' })} className={`p-5 rounded-xl border-2 transition-all ${ocrConfig.provider === 'offline' ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] shadow-md' : 'border-[color:var(--border)] hover:border-[color:var(--border)] bg-[color:var(--card)]'}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[color:var(--panel-2)] flex items-center justify-center text-2xl">
                <Icon name="WifiOff" size={24} />
              </div>
              <div className="text-left">
                <div className="text-base font-semibold text-[color:var(--fg)]">本地离线</div>
                <div className="text-sm text-[color:var(--muted)]">无需网络，仅识别身份证号</div>
              </div>
            </div>
          </button>
          <button onClick={() => setOcrConfig({ ...ocrConfig, provider: 'baidu' })} className={`p-5 rounded-xl border-2 transition-all ${ocrConfig.provider === 'baidu' ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] shadow-md' : 'border-[color:var(--border)] hover:border-[color:var(--border)] bg-[color:var(--card)]'}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[color:var(--accent)] flex items-center justify-center text-[color:var(--on-accent)] text-xl">
                <Icon name="Sparkles" size={22} />
              </div>
              <div className="text-left">
                <div className="text-base font-semibold text-[color:var(--fg)]">AI 智能识别</div>
                <div className="text-sm text-[color:var(--muted)]">需要网络，支持全部识别功能</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 百度 OCR 配置 */}
      {ocrConfig.provider === 'baidu' && (
        <div className="space-y-4 p-5 rounded-xl border border-[color:var(--accent)] bg-[color:var(--accent-soft)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-[color:var(--accent)]">
              <Icon name="Sparkles" size={20} /> AI 智能识别配置
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">推荐</span>
          </div>

          <div className="rounded-lg p-4 bg-[color:var(--card)] border border-[color:var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[color:var(--fg-2)]">本月调用统计</p>
              {ocrStats && <span className="text-xs text-[color:var(--muted)]">{ocrStats.lastReset}</span>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-[color:var(--panel-2)] rounded-lg">
                <div className="text-lg font-bold text-[color:var(--accent)]">{ocrStats?.idCard ?? '--'}</div>
                <div className="text-xs text-[color:var(--muted)]">身份证</div>
              </div>
              <div className="text-center p-2 bg-[color:var(--panel-2)] rounded-lg">
                <div className="text-lg font-bold text-[color:var(--accent)]">{ocrStats?.invoice ?? '--'}</div>
                <div className="text-xs text-[color:var(--muted)]">发票</div>
              </div>
              <div className="text-center p-2 bg-[color:var(--panel-2)] rounded-lg">
                <div className="text-lg font-bold text-[color:var(--accent)]">{ocrStats?.bankCard ?? '--'}</div>
                <div className="text-xs text-[color:var(--muted)]">银行卡</div>
              </div>
              <div className="text-center p-2 bg-[color:var(--panel-2)] rounded-lg">
                <div className="text-lg font-bold text-[color:var(--accent)]">{ocrStats?.businessLicense ?? '--'}</div>
                <div className="text-xs text-[color:var(--muted)]">营业执照</div>
              </div>
              <div className="text-center p-2 bg-[color:var(--panel-2)] rounded-lg">
                <div className="text-lg font-bold text-[color:var(--accent)]">{ocrStats?.bankReceipt ?? '--'}</div>
                <div className="text-xs text-[color:var(--muted)]">银行回单</div>
              </div>
              <div className="text-center p-2 bg-[color:var(--panel-2)] rounded-lg">
                <div className="text-lg font-bold text-[color:var(--accent)]">{totalCalls}</div>
                <div className="text-xs text-[color:var(--muted)]">总计</div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">API Key</label>
              <input type="text" value={ocrConfig.baidu?.apiKey || ''} onChange={e => setOcrConfig({ ...ocrConfig, baidu: { ...ocrConfig.baidu, apiKey: e.target.value, secretKey: ocrConfig.baidu?.secretKey || '' } })} placeholder={ocrStatus?.configured ? '已配置，留空则保留原密钥' : '例 LnTxxxxxxxxxxxxxx'} className="input" />
            </div>
            <div>
              <label className="label">Secret Key</label>
              <input type="password" value={ocrConfig.baidu?.secretKey || ''} onChange={e => setOcrConfig({ ...ocrConfig, baidu: { ...ocrConfig.baidu, apiKey: ocrConfig.baidu?.apiKey || '', secretKey: e.target.value } })} placeholder={ocrStatus?.configured ? '已配置，留空则保留原密钥' : '例 8xxxxxxxxxxxxxxxxxxxxxx'} className="input" />
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={onSave} disabled={savingOCR} variant="primary">
          <Icon name="Save" size={16} /> {savingOCR ? '保存中...' : '保存配置'}
        </Button>
        <Button onClick={onTest} disabled={testingOCR}  variant="secondary">
          {testingOCR ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-2 border-[color:var(--border)] border-t-slate-600"></div>检测中...</>
          ) : (
            <><Icon name="RefreshCw" size={16} /> 检测连接</>
          )}
        </Button>
        {ocrStatus?.configured && (
          <Button onClick={() => setConfirmClear(true)} disabled={savingOCR} variant="secondary">
            <Icon name="Trash2" size={16} /> 清除已保存密钥
          </Button>
        )}
      </div>

      {/* 清除密钥二次确认 */}
      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => { setConfirmClear(false); onClearKeys() }}
        title="清除密钥"
        content="确定要清除已保存的百度 OCR 密钥吗？清除后 AI 识别将回退到本地离线模式，直到重新配置密钥。"
        confirmText="清除"
        confirmVariant="danger"
      />

      {/* 消息提示 */}
      {ocrMessage && (
        <div className={`rounded-xl p-4 ${
          ocrMessage.type === 'success' ? 'bg-success-50 border border-success-200 text-success-700' :
          ocrMessage.type === 'info' ? 'bg-[color:var(--panel-2)] border border-[color:var(--border)] text-[color:var(--fg-2)]' :
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
