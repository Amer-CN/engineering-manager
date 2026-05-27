import React from 'react'
import { Icon } from './ui/Icon'
import { OCRConfig, OCRProvider, getProviderName as gpName } from '../services/ocr'

interface Props {
  ocrConfig: OCRConfig; setOcrConfig: (c: OCRConfig) => void
  ocrStatus: { online: boolean; provider: OCRProvider; configured: boolean } | null
  testingOCR: boolean
  ocrMessage: { type: 'success' | 'error' | 'info'; text: string } | null
  onSave: () => void; onTest: () => void
}

export const SettingsOcrSection: React.FC<Props> = ({ ocrConfig, setOcrConfig, ocrStatus, testingOCR, ocrMessage, onSave, onTest }) => (
  <div className="card">
    <div className="card-header"><h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Icon name="Search" size={20} /> OCR文字识别设置</h2></div>
    <div className="card-body space-y-5">
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <span className={`w-3 h-3 rounded-full ${ocrStatus?.online ? 'bg-success-500 animate-pulse' : 'bg-slate-400'}`}></span>
        <span className="text-sm font-medium">{ocrStatus?.online ? '在线' : '离线'}</span>
        <span className="text-slate-300">|</span>
        <span className="text-sm text-slate-600">当前模式: <span className="font-medium text-slate-800">{gpName(ocrStatus?.provider || 'offline')}</span></span>
        {ocrStatus?.configured === false && <><span className="text-slate-300">|</span><span className="text-sm text-warning-600 font-medium"><Icon name="AlertTriangle" size={14} className="inline" /> 未配置API</span></>}
      </div>
      <div><label className="label">选择OCR模式</label>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setOcrConfig({ ...ocrConfig, provider: 'offline' })} className={`p-5 rounded-xl border-2 transition-all ${ocrConfig.provider === 'offline' ? 'border-primary-500 bg-primary-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl"><Icon name="WifiOff" size={24} /></div><div className="text-left"><div className="text-base font-semibold text-slate-800">本地离线</div><div className="text-sm text-slate-500">无需网络，仅识别身份证号</div></div></div></button>
          <button onClick={() => setOcrConfig({ ...ocrConfig, provider: 'baidu' })} className={`p-5 rounded-xl border-2 transition-all ${ocrConfig.provider === 'baidu' ? 'border-primary-500 bg-primary-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl"><Icon name="Globe" size={22} /></div><div className="text-left"><div className="text-base font-semibold text-slate-800">百度OCR</div><div className="text-sm text-slate-500">需要网络，识别全部信息</div></div></div></button>
        </div>
      </div>
      {ocrConfig.provider === 'baidu' && (
        <div className="space-y-4 p-5 rounded-xl border" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-soft)' }}>
          <div className="flex items-center justify-between"><div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--accent)' }}><Icon name="Globe" size={20} /> 百度OCR 配置</div><span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>推荐</span></div>
          <div className="rounded-lg p-4 space-y-2" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-soft)' }}><p className="text-sm" style={{ color: 'var(--fg)' }}><strong>免费额度：</strong>每天500次调用（个人用户）</p><p className="text-sm" style={{ color: 'var(--fg)' }}><strong>申请步骤：</strong></p><ol className="text-sm list-decimal list-inside space-y-1 ml-2" style={{ color: 'var(--fg-2)' }}><li>打开 <a href="https://console.bce.baidu.com/ocr" target="_blank" rel="noopener noreferrer" className="underline font-medium" style={{ color: 'var(--accent)' }}>百度智能云控制台</a></li><li>登录后搜索「身份证识别」或进入「文字识别服务」</li><li>领取免费资源包（个人认证免费）</li><li>创建应用，获取API Key 和Secret Key</li></ol></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="label">API Key</label><input type="text" value={ocrConfig.baidu?.apiKey || ''} onChange={e => setOcrConfig({ ...ocrConfig, baidu: { ...ocrConfig.baidu, apiKey: e.target.value, secretKey: ocrConfig.baidu?.secretKey || '' } })} placeholder="例 LnTxxxxxxxxxxxxxx" className="input-modern" /></div>
            <div><label className="label">Secret Key</label><input type="password" value={ocrConfig.baidu?.secretKey || ''} onChange={e => setOcrConfig({ ...ocrConfig, baidu: { ...ocrConfig.baidu, apiKey: ocrConfig.baidu?.apiKey || '', secretKey: e.target.value } })} placeholder="例 8xxxxxxxxxxxxxxxxxxxxxx" className="input-modern" /></div>
          </div>
          <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}><p className="text-sm font-medium mb-2" style={{ color: 'var(--fg)' }}>识别内容对比</p><div className="grid grid-cols-2 gap-4 text-sm"><div style={{ color: 'var(--fg-2)' }}><span className="font-medium">离线模式：</span><span style={{ color: 'var(--muted)' }}>仅身份证号</span></div><div style={{ color: 'var(--fg-2)' }}><span className="font-medium" style={{ color: 'var(--success)' }}>百度OCR：</span><span style={{ color: 'var(--success)' }}>姓名+身份证号+性别+民族+地址+出生日期</span></div></div></div>
        </div>
      )}
      <div className="flex flex-wrap gap-3"><button onClick={onSave} className="btn btn-primary"><Icon name="Save" size={16} /> 保存配置</button><button onClick={onTest} disabled={testingOCR} className="btn btn-secondary">{testingOCR ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600"></div>检测中...</> : <><Icon name="RefreshCw" size={16} /> 检测连接</>}</button></div>
      {ocrMessage && (<div className={`rounded-xl p-4 ${ocrMessage.type === 'success' ? 'bg-success-50 border border-success-200 text-success-700' : ocrMessage.type === 'info' ? 'bg-info-50 border border-info-200 text-info-700' : 'bg-danger-50 border border-danger-200 text-danger-700'}`}>{ocrMessage.text}</div>)}
      {ocrConfig.provider === 'offline' && (<div className="rounded-xl p-4" style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning-soft)' }}><p className="text-sm" style={{ color: 'var(--fg)' }}><Icon name="Lightbulb" size={16} className="inline" /> <strong>离线模式说明：</strong>无需网络即可使用，但只能识别身份证号，姓名、地址等信息需要手动输入。</p></div>)}
    </div>
  </div>
)
