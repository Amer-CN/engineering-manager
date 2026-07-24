/**
 * appPrefs — 应用级用户偏好持久化 (v0.83.0 设置页重构)
 *
 * 策略 (对齐 MaskContext 已有模式):
 * - localStorage 是快速同步读缓存 (App 启动 / toast 触发时需同步取值)
 * - 后端 /api/user-preferences 是多设备同步权威源
 * - 写: 立即写 localStorage + 异步 PUT 后端 (失败不阻塞)
 * - 读: 优先后端, 失败回退 localStorage, 再回退默认值
 */

import { getAPI } from '@/services/api-adapter'

/** 偏好键 (与后端 user_preferences.key 一致) */
export const PREF_KEYS = {
  autoLockMinutes: 'auto_lock_minutes',
  defaultStartPage: 'default_start_page',
  toastDuration: 'toast_duration',
} as const

const LS_PREFIX = 'app_pref_'

/** 同步读本地缓存 (无则 null) */
export function getLocalPref(key: string): string | null {
  try { return localStorage.getItem(LS_PREFIX + key) } catch { return null }
}

/** 同步写本地缓存 */
export function setLocalPref(key: string, value: string): void {
  try { localStorage.setItem(LS_PREFIX + key, value) } catch { /* 隐私模式忽略 */ }
}

/** 写本地 + 异步同步后端 (fire-and-forget, 失败仅告警) */
export async function savePref(key: string, value: string): Promise<void> {
  setLocalPref(key, value)
  // 通知 App 等监听方偏好已变更 (如自动锁屏时长实时生效)
  try { window.dispatchEvent(new CustomEvent('app-pref-changed', { detail: { key } })) } catch { /* SSR 忽略 */ }
  try {
    const api = await getAPI()
    await api.putUserPreference?.(key, value)
  } catch (e) {
    console.warn('[appPrefs] 后端同步失败, localStorage 仍是权威:', key, e)
  }
}

/** 优先后端 (并回填本地), 失败回退本地缓存, 再回退默认值 */
export async function loadPref(key: string, fallback: string): Promise<string> {
  try {
    const api = await getAPI()
    const res = await api.getUserPreference?.(key)
    const v = (res?.data?.value ?? undefined) as string | undefined
    if (v != null && v !== '') { setLocalPref(key, v); return v }
  } catch { /* fall through 回退本地 */ }
  return getLocalPref(key) ?? fallback
}
