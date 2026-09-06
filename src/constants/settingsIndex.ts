/**
 * 设置页分类与搜索注册表 (v0.83.0 设置页重构)
 *
 * - SETTING_CATEGORIES: 左侧导航分类元数据 (唯一真源)
 * - SETTINGS_INDEX:     可搜索的设置项 (label + keywords → category + 锚点 id)
 * - searchSettings:     关键词匹配 (供设置内搜索使用)
 *
 * 锚点约定: SettingItem.id 必须与对应面板内该控件外层的 id={...} 一致,
 * 搜索命中后据此滚动定位 + 高亮.
 */

export type SettingCategory =
  | 'account'
  | 'appearance'
  | 'ai'
  | 'data'
  | 'preferences'
  | 'about'

export interface SettingCategoryMeta {
  id: SettingCategory
  label: string
  description: string
  /** iconMap 已注册的图标名 */
  icon: string
}

/** 左侧导航分类 (顺序即展示顺序; 默认落在第一个) */
export const SETTING_CATEGORIES: SettingCategoryMeta[] = [
  { id: 'account', label: '个人账户', description: '密码 · 隐私 · 锁屏', icon: 'User' },
  { id: 'appearance', label: '外观', description: '主题 · 字号 · 字体', icon: 'Palette' },
  { id: 'ai', label: 'AI 能力', description: '助手 · 智能识别', icon: 'Bot' },
  { id: 'data', label: '数据与存储', description: '路径 · 引擎 · 备份', icon: 'Database' },
  { id: 'preferences', label: '通知与偏好', description: '起始页 · 提示', icon: 'Bell' },
  { id: 'about', label: '关于与帮助', description: '版本 · 快捷键', icon: 'Info' },
]

export interface SettingItem {
  /** 锚点 id — 与面板内对应控件的 id 一致, 供搜索定位/高亮 */
  id: string
  /** 显示名 */
  label: string
  /** 搜索关键词 (含中英文/别名) */
  keywords: string[]
  /** 所属分类 */
  category: SettingCategory
  /** 仅管理员可见 (搜索结果对非 admin 隐藏) */
  adminOnly?: boolean
}

/** 可搜索设置项注册表 */
export const SETTINGS_INDEX: SettingItem[] = [
  // ── 个人账户 ──
  { id: 'my-info', label: '我的信息', keywords: ['账户', '用户名', '显示名', '角色', '个人信息', 'account'], category: 'account' },
  { id: 'change-password', label: '修改密码', keywords: ['密码', 'password', '改密码', '原密码', '新密码', 'pwd'], category: 'account' },
  { id: 'pii-mask', label: '隐私脱敏显示', keywords: ['脱敏', '隐私', 'mask', '身份证', '手机号', '银行账号', 'pii', '显示'], category: 'account' },
  { id: 'auto-lock', label: '自动锁屏', keywords: ['锁屏', '自动锁定', '超时', 'lock', '安全', '闲置'], category: 'account' },

  // ── 外观 ──
  { id: 'theme', label: '主题', keywords: ['主题', '配色', '深色', '浅色', '暗色', 'theme', '外观'], category: 'appearance' },
  { id: 'font-size', label: '界面字号', keywords: ['字号', '字体大小', '缩放', 'font', '大字'], category: 'appearance' },
  { id: 'row-hover', label: '表格行悬停高亮', keywords: ['表格', '悬停', '高亮', '行', 'hover'], category: 'appearance' },
  { id: 'export-font', label: '导出/打印字体', keywords: ['导出', '打印', '字体', '合同', '宋体', '黑体', 'font'], category: 'appearance' },

  // ── AI 能力 ──
  { id: 'ai-provider', label: 'AI 助手', keywords: ['ai', '大模型', 'llm', '助手', '模型', '温度', 'api key', 'base url', 'openai'], category: 'ai' },
  { id: 'ocr', label: 'AI 智能识别', keywords: ['ocr', '识别', '百度', '发票', '身份证', '银行卡', '智能识别', '营业执照'], category: 'ai' },

  // ── 数据与存储 ──
  { id: 'data-path', label: '数据存储路径', keywords: ['数据', '路径', '存储', '位置', '迁移', '备份位置', 'datapath'], category: 'data' },
  { id: 'db-engine', label: '数据库引擎', keywords: ['数据库', 'sqlite', '引擎', '读取模式', '迁移', 'database'], category: 'data' },
  { id: 'backup-restore', label: '备份与恢复', keywords: ['备份', '恢复', '快照', '回滚', 'snapshot', '还原', 'restore'], category: 'data', adminOnly: true },
  { id: 'pii-key', label: 'PII 加密密钥', keywords: ['加密', '密钥', 'pii', '轮换', 'key', '安全', 'rotate'], category: 'data', adminOnly: true },

  // ── 通知与偏好 ──
  { id: 'default-start-page', label: '默认起始页', keywords: ['起始页', '首页', '默认页面', '启动', 'home'], category: 'preferences' },
  { id: 'toast-duration', label: '提示停留时长', keywords: ['提示', 'toast', '通知', '时长', '消息', 'notification'], category: 'preferences' },
  { id: 'agent-retention-days', label: '对话删除保留天数', keywords: ['删除', '清理', '保留', 'retention', '对话', '清空'], category: 'preferences'},

  // ── 关于与帮助 ──
  { id: 'app-version', label: '版本与更新', keywords: ['版本', '更新', '升级', '检查更新', 'version', 'update', '更新日志', 'changelog', '变更历史'], category: 'about' },
  { id: 'shortcuts', label: '快捷键参考', keywords: ['快捷键', '键盘', 'shortcut', 'hotkey', '热键'], category: 'about' },
  { id: 'dev-tools', label: '开发者工具', keywords: ['控制台', '开发者', '调试', '日志', 'devtools', 'f12', 'gpu', '硬件加速', '显卡'], category: 'about' },
]

/**
 * 关键词匹配 (label + keywords, 忽略大小写)。
 * isAdmin=false 时隐藏 adminOnly 项。空查询返回空数组。
 */
export function searchSettings(query: string, isAdmin: boolean): SettingItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return SETTINGS_INDEX.filter(item => {
    if (item.adminOnly && !isAdmin) return false
    if (item.label.toLowerCase().includes(q)) return true
    return item.keywords.some(k => k.toLowerCase().includes(q))
  })
}

/** 取分类元数据 */
export function getCategoryMeta(id: SettingCategory): SettingCategoryMeta {
  return SETTING_CATEGORIES.find(c => c.id === id)!
}
