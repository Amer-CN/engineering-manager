import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { useTheme } from '../hooks/useTheme'
import { OCRConfig, OCRProvider, setOCRConfig, getOCRConfig, checkOCRStatus, getProviderName, saveOCRConfig, initialConfig, initializeBuiltInConfig } from '../services/ocr'

interface SettingsProps {
  refresh?: () => void
}

// 渲染含 **bold** 标记的字符串为 React 节点
function renderMarkdownInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

const Settings: React.FC<SettingsProps> = ({ refresh }) => {
  const { theme, setTheme } = useTheme()
  const [dataPath, setDataPath] = useState('')
  const [defaultPath, setDefaultPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [ocrConfig, setOcrConfig] = useState<OCRConfig>(initialConfig)
  const [ocrStatus, setOcrStatus] = useState<{ online: boolean; provider: OCRProvider; configured: boolean } | null>(null)
  const [testingOCR, setTestingOCR] = useState(false)
  const [ocrMessage, setOcrMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  useEffect(() => {
    loadConfig()
    // 初始化时加载预置OCR配置
    initializeBuiltInConfig().then(() => {
      loadOCRConfig()
    })
  }, [])

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI.getConfig()
      if (result.success && result.data) {
        setDataPath(result.data.dataPath)
        setDefaultPath(result.data.defaultPath)
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeDataPath = async () => {
    setMigrating(true)
    setMessage(null)
    try {
      const result = await window.electronAPI.setDataPath('__select_folder__')
      if (result.success) {
        setDataPath((await window.electronAPI.getDataPath()))
        setMessage({ type: 'success', text: result.message || '数据路径已更新' })
        refresh?.()
      } else {
        setMessage({ type: 'error', text: result.message || '修改失败' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '修改失败' })
    } finally {
      setMigrating(false)
    }
  }

  const handleResetToDefault = async () => {
    if (!confirm('确定要将数据路径恢复为默认位置吗？\n数据将被复制到新位置。')) {
      return
    }
    setMigrating(true)
    setMessage(null)
    try {
      const result = await window.electronAPI.setDataPath(defaultPath)
      if (result.success) {
        setDataPath((await window.electronAPI.getDataPath()))
        setMessage({ type: 'success', text: '已恢复为默认路径' })
        refresh?.()
      } else {
        setMessage({ type: 'error', text: result.message || '修改失败' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '修改失败' })
    } finally {
      setMigrating(false)
    }
  }

  // 加载OCR配置
  const loadOCRConfig = async () => {
    try {
      const saved = getOCRConfig()
      setOcrConfig(saved)
      const status = await checkOCRStatus()
      setOcrStatus(status)
    } catch (error) {
      console.error('加载OCR配置失败:', error)
    }
  }

    // 保存OCR配置
  const handleSaveOCRConfig = () => {
    // 使用持久化保存函数    saveOCRConfig(ocrConfig)
    // 同时更新内存中的配置
    setOCRConfig(ocrConfig)
    setOcrMessage({ type: 'success', text: 'OCR配置已保存' })
    loadOCRConfig()
  }

  // 测试OCR连接
  const handleTestOCR = async () => {
    setTestingOCR(true)
    setOcrMessage(null)
    try {
      const status = await checkOCRStatus()
      if (status.online) {
        setOcrMessage({ type: 'success', text: `网络连接正常，当前使用${getProviderName(status.provider)}识别` })
      } else {
        setOcrMessage({ type: 'info', text: '当前离线，将使用本地Tesseract.js识别' })
      }
    } catch (error: any) {
      setOcrMessage({ type: 'error', text: `检测失费 ${error.message}` })
    } finally {
      setTestingOCR(false)
    }
  }

  const getProviderName = (provider: OCRProvider) => {
    switch (provider) {
      case 'baidu': return '百度OCR'
      case 'offline': return '本地离线'
      default: return provider
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-700 border-t-primary-600"></div>
          <span className="text-slate-500">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="max-w-[1400px] mx-auto p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">系统设置</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">管理应用程序设置</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* 数据存储设置 */}
          <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Icon name="FolderKanban" size={20} /> 数据存储设置
          </h2>
        </div>
        <div className="card-body space-y-4">
          {/* 当前路径 */}
          <div>
            <label className="label">当前数据存储路径</label>
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-200 font-mono break-all border border-slate-200">
              {dataPath}
            </div>
          </div>

          {/* 默认路径 */}
          <div>
            <label className="label">默认路径</label>
            <div className="bg-primary-50 rounded-lg p-3 text-sm text-primary-700 font-mono break-all border border-primary-100">
              {defaultPath}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleChangeDataPath}
              disabled={migrating}
              className="btn btn-primary"
            >
              {migrating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  迁移中..
                </>
              ) : (
                <><Icon name="FolderKanban" size={16} />更改数据存储位置</>
              )}
            </button>

            {dataPath !== defaultPath && (
              <button
                onClick={handleResetToDefault}
                disabled={migrating}
                className="btn btn-secondary"
              >
                <Icon name="RotateCcw" size={16} /> 恢复默认路径
              </button>
            )}
          </div>

          {/* 提示信息 */}
          <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
            <p className="text-sm text-warning-800 font-medium">
              <Icon name="Lightbulb" size={16} className="inline" /> 提示</p>
            <ul className="text-sm text-warning-700 mt-2 space-y-1">
              <li>•更改数据路径会将所有数据（包括上传的文件）复制到新位置</li>
              <li>•建议将数据存储在非系统盘（如 D:\工程管家数据），便于重装系统后恢复</li>
              <li>•换设备时，只需复制整个数据文件夹到新设备即可</li>
            </ul>
          </div>

          {/* 消息提示 */}
          {message && (
            <div className={`rounded-xl p-4 ${
              message.type === 'success'
                ? 'bg-success-50 border border-success-200 text-success-700'
                : 'bg-danger-50 border border-danger-200 text-danger-700'
            }`}>
              <Icon name={message.type === 'success' ? 'Edit3' : 'HelpCircle'} size={16} className="inline" />{message.text}
            </div>
          )}
          </div>
        </div>
      </div>

        {/* 右列 */}
        <div className="space-y-6">
          {/* OCR识别设置 */}
          <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Icon name="Search" size={20} /> OCR文字识别设置
          </h2>
        </div>
        <div className="card-body space-y-5">
          {/* OCR状态*/}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${ocrStatus?.online ? 'bg-success-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <span className="text-sm font-medium">{ocrStatus?.online ? '在线' : '离线'}</span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-sm text-slate-600">
              当前模式: <span className="font-medium text-slate-800">{getProviderName(ocrStatus?.provider || 'offline')}</span>
            </span>
            {ocrStatus?.configured === false && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-sm text-warning-600 font-medium"><Icon name="AlertTriangle" size={14} className="inline" /> 未配置API</span>
              </>
            )}
          </div>

          {/* OCR模式选择 */}
          <div>
            <label className="label">选择OCR模式</label>
            <div className="grid grid-cols-2 gap-4">
              {/* 离线模式 */}
              <button
                onClick={() => setOcrConfig({ ...ocrConfig, provider: 'offline' })}
                className={`p-5 rounded-xl border-2 transition-all ${
                  ocrConfig.provider === 'offline'
                    ? 'border-primary-500 bg-primary-50 shadow-md'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white'
                }`}
              >
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

              {/* 百度OCR */}
              <button
                onClick={() => setOcrConfig({ ...ocrConfig, provider: 'baidu' })}
                className={`p-5 rounded-xl border-2 transition-all ${
                  ocrConfig.provider === 'baidu'
                    ? 'border-primary-500 bg-primary-50 shadow-md'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl">
                    <Icon name="Globe" size={22} />
                  </div>
                  <div className="text-left">
                    <div className="text-base font-semibold text-slate-800">百度OCR</div>
                    <div className="text-sm text-slate-500">需要网络，识别全部信息</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 百度OCR配置 */}
          {ocrConfig.provider === 'baidu' && (
            <div className="space-y-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-800 font-semibold">
                  <Icon name="Globe" size={20} /> 百度OCR 配置
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">推荐</span>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-blue-800">
                  <strong>免费额度：</strong>每天500次调用（个人用户）                </p>
                <p className="text-sm text-blue-800">
                  <strong>申请步骤：</strong>
                </p>
                <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1 ml-2">
                  <li>打开 <a href="https://console.bce.baidu.com/ocr" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium hover:text-blue-800">百度智能云控制台</a></li>
                  <li>登录后搜索「身份证识别」或进入「文字识别服务。</li>
                  <li>领取免费资源包（个人认证免费？</li>
                  <li>创建应用，获取API Key 和Secret Key</li>
                </ol>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">API Key</label>
                  <input
                    type="text"
                    value={ocrConfig.baidu?.apiKey || ''}
                    onChange={(e) => setOcrConfig({
                      ...ocrConfig,
                      baidu: { ...ocrConfig.baidu, apiKey: e.target.value, secretKey: ocrConfig.baidu?.secretKey || '' }
                    })}
                    placeholder="例 LnTxxxxxxxxxxxxxx"
                    className="input-modern"
                  />
                </div>
                <div>
                  <label className="label">Secret Key</label>
                  <input
                    type="password"
                    value={ocrConfig.baidu?.secretKey || ''}
                    onChange={(e) => setOcrConfig({
                      ...ocrConfig,
                      baidu: { ...ocrConfig.baidu, apiKey: ocrConfig.baidu?.apiKey || '', secretKey: e.target.value }
                    })}
                    placeholder="例 8xxxxxxxxxxxxxxxxxxxxxx"
                    className="input-modern"
                  />
                </div>
              </div>

              {/* 识别效果对比 */}
              <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">识别内容对比？</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-slate-600">
                    <span className="font-medium text-slate-700">离线模式：</span>
                    <span className="text-slate-500">仅身份证号（姓名需手动输入）</span>
                  </div>
                  <div className="text-slate-600">
                    <span className="font-medium text-green-700">百度OCR：</span>
                    <span className="text-green-600">姓名+身份证号+性别+民族+地址+出生日期</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSaveOCRConfig}
              className="btn btn-primary"
            >
              <Icon name="Save" size={16} /> 保存配置
            </button>
            <button
              onClick={handleTestOCR}
              disabled={testingOCR}
              className="btn btn-secondary"
            >
              {testingOCR ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600"></div>
                  检测中...
                </>
              ) : (
                <><Icon name="RefreshCw" size={16} /> 检测连接</>
              )}
            </button>
          </div>

          {/* OCR消息提示 */}
          {ocrMessage && (
            <div className={`rounded-xl p-4 ${
              ocrMessage.type === 'success'
                ? 'bg-success-50 border border-success-200 text-success-700'
                : ocrMessage.type === 'info'
                ? 'bg-info-50 border border-info-200 text-info-700'
                : 'bg-danger-50 border border-danger-200 text-danger-700'
            }`}>
              {ocrMessage.type === 'success' && <Icon name="Edit3" size={16} className="inline" />}
              {ocrMessage.type === 'info' && <Icon name="Info" size={16} className="inline" />}
              {ocrMessage.type === 'error' && <Icon name="HelpCircle" size={16} className="inline" />}
              {ocrMessage.text}
            </div>
          )}

          {/* 提示信息 */}
          {ocrConfig.provider === 'offline' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800">
                <Icon name="Lightbulb" size={16} className="inline" /> <strong>离线模式说明：</strong>无需网络即可使用，但只能识别身份证号，姓名、地址等信息需要手动输入。              </p>
            </div>
          )}
          </div>
        </div>
      </div>

        {/* 左列续 */}
        <div className="space-y-6">
          {/* 外观主题 */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Icon name="Palette" size={20} /> 外观主题
              </h2>
            </div>
            <div className="card-body">
              <p className="text-sm text-slate-600 mb-4">
                选择您喜欢的界面主题，浅色和深色两种可选。
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    theme === 'light'
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Icon name="Sun" size={22} className="text-amber-500" />
                    </div>
                    <div className="text-left">
                      <div className="text-base font-semibold text-slate-800">浅色模式</div>
                      <div className="text-sm text-slate-500">明亮清爽</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
                      <Icon name="Moon" size={22} className="text-slate-200" />
                    </div>
                    <div className="text-left">
                      <div className="text-base font-semibold text-slate-800">深色模式</div>
                      <div className="text-sm text-slate-500">护眼舒适</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* 开发工具 */}
          <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Icon name="Wrench" size={20} /> 开发工具</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-slate-600 mb-4">
            打开开发者控制台查看日志和调试信息，用于排查问题。          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                try {
                  await window.electronAPI.openDevTools()
                } catch (e) {
                  console.log('快捷键提示 Ctrl+Shift+I')
                }
              }}
              className="btn btn-secondary"
            >
              <Icon name="Monitor" size={16} />打开控制台            </button>
            <span className="text-sm text-slate-400 self-center">
              或按 <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono border border-slate-200">Ctrl+Shift+I</kbd>
            </span>
          </div>
          </div>
        </div>

          {/* 关于 */}
          <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Icon name="Info" size={20} /> 关于
          </h2>
        </div>
        <div className="card-body">
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex items-center justify-center text-white text-3xl shadow-lg shadow-slate-500/20">
                <Icon name="HardHat" size={32} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">工程管家</p>
                <p className="text-slate-500 dark:text-slate-400">Version 1.23.1</p>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300">工程项目管理系统 · 本地数据存储</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowChangelog(true)}
                className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
              >
                <Icon name="Clock" size={14} /> 更新日志
              </button>
            </div>
          </div>
          </div>
        </div>

        {/* 更新日志浮窗 */}
        {showChangelog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowChangelog(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl px-6 py-4 border-b border-slate-200 dark:border-slate-700 rounded-t-2xl flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Icon name="Clock" size={18} /> 更新日志
                </h3>
                <button onClick={() => setShowChangelog(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <Icon name="X" size={18} />
                </button>
              </div>
              <div className="px-6 py-5 space-y-6">
                {[
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                { v: 'v1.21.0', date: '2026-05-10', items: ['新增自定义分类管理：db.costLedgerCategories集合+5IPC，内置12种种子，用户可增删改', '新增CategoryManager分类管理弹窗：双Tab+行内编辑+内置不可删+恢复默认', '新增useCostLedgerCategories hook：分类统一加载+方向过滤', '新增备注列：CostLedgerList表头10列', '优化列表列宽：基于熊会对账775行Excel实测，border-collapse线框连续，金额font-mono右对齐', '优化CategoryPicker+Analytics动态颜色', '表头标签：对方→往来单位/个人', '修复管理分类按钮在项目详情页无响应'] },
{ v: 'v1.20.1', date: '2026-05-10', items: ['成本台账模块实现：新增 13 文件 + 修改 15 文件 + 删除 Expenses.tsx，级联删除扩展至 8 集合，v1.20.0'] },
{ v: 'v1.20.0', date: '2026-05-10', items: ['成本台账模块：追踪真实项目成本（含灰色支出/垫资/多开发票回流），双入口模式，9支出+2收入分类', '级联删除扩展至8个关联集合', '旧成本管理模块Expenses.tsx删除（432行零数据）'] },
{ v: 'v1.19.1', date: '2026-05-10', items: ['自动版本迭代修复：neat-freak PostToolUse hook 版本判定逻辑优化'] },
{ v: 'v1.19.0', date: '2026-05-10', items: ['自动版本迭代升级：auto-version-on-neat-freak.js 从硬编码 patch 改为自动检测 major/minor/patch 级别（关键词匹配 + 统计启发）'] },
                  { v: 'v1.18.0', date: '2026-05-08', items: ['侧边栏重构：系统设置和用户管理从导航菜单移除，头像弹出菜单收纳四入口（DropdownMenu类Windows开始菜单风格）', '锁定屏幕：LockScreen全屏毛玻璃遮罩+密码验证，锁屏/解锁均记审计日志', '审计日志修复：actionConfig未知操作类型兜底，防止lock/unlock审计记录导致白屏'] },
                  { v: 'v1.17.1', date: '2026-05-08', items: ['修复PostToolUse hook不支持if字段的bug', 'CLAUDE.md从64.8KB压缩至18.8KB（289行）', 'bump-version.js新增双格式摘要提取（regex+indexOf）'] },
                  { v: 'v1.17.0', date: '2026-05-07', items: ['模板系统实用化改造：服务端变量自动检测、TemplateSelectorModal、ContractPage/SettlementProjectDetail集成从模板生成入口'] },
                  { v: 'v1.16.1', date: '2026-05-07', items: ['bump-version.js全面修复：上下文感知精确匹配、去重逻辑、--msg参数', 'Settings.tsx更新日志渲染修复（renderMarkdownInline+22条归一化）', 'CHANGELOG.md格式规范化：补全6处缺失分隔符，同步目标从5处扩展到6处'] },
                  { v: 'v1.16.0', date: '2026-05-07', items: ['模板管理独立模块：从合同管理分离为顶级路由，7种分类', '模板变量系统：text/number/date/select四种类型，{{key}}→值替换+实时预览', '结算看板重设计：对标项目管理改为看板首页+项目结算详情', '合同管理简化：Contracts视图从4种精简为3种'] },
                  { v: 'v1.15.0', date: '2026-05-07', items: ['合同管理重构：看板首页+子页面模式（对标项目管理）', '结算办理全面重设计：6种细分+材料明细表+Excel导入+多文件上传+状态流转+办理核验', '审计日志可读化：详情弹窗三列对比表格+金额格式化+状态翻译', '发票统计重设计：开票/收票合并入总数，新增专票税额/普票税额', '回款/付款统计重设计：笔数合并入总数，新增剩余未收/未付', '收支对比数据修复：barData改paymentRecords'] },
                  { v: 'v1.14.0', date: '2026-05-07', items: ['付款凭证预览修复+关联单位下拉显示全部合作单位', '审计日志配额溢出修复：去details+上限3000+启动清理', '发票状态标签按收票/开票区分+加载时自动同步回写DB', '合同Word预览（mammoth转HTML嵌入iframe）+发票税额手动编辑'] },
                  { v: 'v1.13.0', date: '2026-05-06', items: ['工资模块架构重构：对标Projects→ProjectDetail模式，Dashboard→WageCycleDetail（3 Tab）', '工资发放记录：新增paidAmount/paidDate字段，差额自动计算', '首页项目卡片：WageProjectCard+WageProjectList按项目汇总'] },
                  { v: 'v1.12.1', date: '2026-05-06', items: ['表头sticky固定：发票/回款/费用/图纸四个列表统一sticky定位', 'App.tsx页面动画改为纯opacity（修复transform导致sticky全局失效）', '发票页固定头部+嵌套滚动三层布局', '图纸管理卡片→列表视图（6列Table）', '旧支付记录数据补全（recordDate/createdAt）'] },
                  { v: 'v1.12.0', date: '2026-05-06', items: ['发票票种细化4类：纸质普票/纸质专票/电子普票/电子专票', '收付款术语统一：收票→付款、开票→回款', '数据库安全加固：initDatabase()异常不再覆写真实数据', '金额显示全局formatMoney()确保2位小数（53处替换）'] },
                  { v: 'v1.11.1', date: '2026-05-06', items: ['neat-freak PostToolUse hook：收尾时自动触发版本迭代', 'bump-version.js补全CLAUDE.md版本引用自动同步'] },
                  { v: 'v1.11.0', date: '2026-05-06', items: ['动画性能深度优化：页面切换去scale、浮动光斑改CSS keyframes、spring刚度降低', '版本自动迭代系统：CHANGELOG.md、bump-version.js脚本、patch/minor/major分级', 'Settings关于页版本号+更新日志同步'] },
                  { v: 'v1.10.0', date: '2026-05-06', items: ['全站交互动画系统：Sidebar入场+layoutId激活态滑动、Login入场stagger', 'Dashboard CountUp数字滚动动画（useSpring）', '数据可视化：recharts animationDuration+入场动画', '全局组件hover/press反馈：Button/Card/Badge/ProgressBar/DropdownMenu', 'Toast图标emoji→lucide-react SVG+spring入场'] },
                  { v: 'v1.9.2', date: '2026-05-06', items: ['侧边栏配色蓝色→深slate色系（匹配Logo品牌色）', '修复单位管理白屏（Partners缺Icon导入）', '注册BadgeCheck/Shield/AlertCircle等图标'] },
                  { v: 'v1.9.1', date: '2026-05-06', items: ['UI收尾：子页面模态框标准化、ContractDashboard Bento网格+recharts重设计', 'Inventory/WorkerSection spring-animated Tab栏', 'InvoiceList/Filters原始SVG→lucide Icon', 'Login移动端Logo→深色渐变'] },
                  { v: 'v1.9.0', date: '2026-05-06', items: ['项目管理8文件全面重设计：Bento网格布局、健康度环形图', '投资组合概览横幅：深色渐变+4 KPI', '告警区：逾期任务/预算超支/收款率低自动检测', 'recharts全面替代手工SVG：RadialBarChart+BarChart+PieChart', '项目卡片健康环：SVG环形进度条'] },
                  { v: 'v1.8.0', date: '2026-05-06', items: ['管理人员卡片→表格（7列）+状态下拉直切', '批量删除考勤/工资表/工资记录（三Tab各加复选框列+全选）', '离职员工可入项目、考勤/工资含离职+项目经理', '状态筛选兜底（老数据无status默认active）'] },
                  { v: 'v1.7.0', date: '2026-05-06', items: ['全站设计语言统一：gray→slate色系（27文件682处）', '主题系统：Settings→外观主题（浅色/深色），darkMode: class', 'Dashboard重设计：Hero深色渐变横幅、KPI StatCard模式、recharts图表', 'Spring Tab栏：Contracts/WageManagement/Partners spring药丸按钮', '侧边栏重设计：固定宽度、深色渐变Logo区、圆角药丸导航项+左侧激活指示条'] },
                  { v: 'v1.6.0', date: '2026-05-05', items: ['考勤每日状态系统：dailyStatus字段+5种状态+画笔模式日历（Shift批量，右键循环）', '项目成员多对多：db.projectMembers关联表、MembersTab添加/移除UI'] },
                  { v: 'v1.5.2', date: '2026-05-05', items: ['DB全面防御：ensureDatabaseFields()覆盖全部26个集合', 'seedDefaultRoles启动崩溃修复+6个.bat启动脚本修复', 'getProjectPartners API+settlements.ts/attendance.ts守卫补齐', 'OCR网络检查URL修复'] },
                  { v: 'v1.5.1', date: '2026-05-05', items: ['文件存储projectName参数bug：4个文件间参数张冠李戴修复', 'Toast系统全局化：11页面从本地Toast→useToastContext()，Portal渲染', '文件名去Date.now()随机后缀+图纸DWG/DXF支持'] },
                  { v: 'v1.5.0', date: '2026-05-05', items: ['权限系统重设计：15资源×7操作矩阵+角色权限编辑器+侧边栏按权限过滤', '操作日志系统接通：IPC持久化（上限10000条）+用户身份关联', '用户管理独立：从Settings剥离，Users.tsx Tab系统', '路由守卫：users/settings加RequireAdmin/RequirePermission'] },
                  { v: 'v1.4.1', date: '2026-05-05', items: ['文件读取回退链修复：readFile/deleteFile对null projectName漏搜未分类/'] },
                  { v: 'v1.4.0', date: '2026-05-05', items: ['PageContainer组件：统一页面宽度入口（wide/narrow/full三种变体）', '17页面统一max-w-[1400px]（Dashboard 1600px、Settings双列网格）'] },
                  { v: 'v1.3.2', date: '2026-05-04', items: ['社保公积金计算逻辑修复：个人部分仅在companyCoversSocial=false时扣除', '考勤附件支持：图片/xlsx/PDF上传+批量保存'] },
                  { v: 'v1.3.1', date: '2026-05-04', items: ['MemberDetail照片读取补传projectName+file-service null projectName回退修复'] },
                  { v: 'v1.3.0', date: '2026-05-04', items: ['工资管理模块全面重写：考勤系统+计算引擎+4 Tab UI', '工人日薪制×出勤天数、管理人员月薪制（≤4天全勤）', 'db.wages/db.attendances持久化'] },
                  { v: 'v1.2.2', date: '2026-05-04', items: ['员工管理5 bug修复：MemberForm props不匹配+WorkerSection TeamFormModal未渲染', 'readUploadedFile未import+TeamFormModal JSX作用域外导致启动白屏'] },
                  { v: 'v1.2.1', date: '2026-05-03', items: ['项目名作为第一层目录（uploads/<项目名>/）+文件读取三级回退', '合同PDF预览白屏修复（contract-file://协议中文路径支持）'] },
                  { v: 'v1.2.0', date: '2026-05-03', items: ['文件存储全面改造：base64→磁盘文件+中文分目录分类', '统一IPC文件通道：file:save/file:read/file:delete', 'engineering.json从18MB瘦身至1.4MB'] },
                  { v: 'v1.1.0', date: '2026-05-02', items: ['Toast系统：Context模式+AnimatePresence堆叠动画', '登录页双列重设计：品牌区+表单卡片', '全站emoji→lucide-react SVG图标（48文件）+侧边栏独立组件化'] },
                  { v: 'v1.0.2', date: '2026-05-02', items: ['8个核心组件升级（Button/Input/Modal/Card/Badge/Select/Pagination/Table）+6个新组件（DropdownMenu/Tabs/Tooltip/ProgressBar/FormField/Loading）'] },
                  { v: 'v1.0.1', date: '2026-05-02', items: ['Tasks.tsx 40+处编码损坏修复+Login.tsx localStorage→AuthContext', 'API密钥从MEMORY.md移除+IPC handler 34个冗余产物清理'] },
                  { v: 'v1.0.0', date: '2026-05-01', items: ['初始版本：Electron 28+React 18+TypeScript 5+Vite 5+TailwindCSS', '核心模块：项目管理/合同管理/发票管理/员工管理/仓库管理/单位管理'] },
                ].map(ver => (
                  <div key={ver.v}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-xs font-bold bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 rounded-md">{ver.v}</span>
                      <span className="text-xs text-slate-400">{ver.date}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {ver.items.map((item, i) => (
                        <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                          <span className="text-slate-300 dark:text-slate-600 mt-0.5 flex-shrink-0">•</span>
                          <span>{renderMarkdownInline(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

    </motion.div>
  )
}

export default Settings