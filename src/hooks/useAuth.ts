/**
 * useAuth - 认证状态管理 Hook
 * 
 * 提供登录状态管理和权限检查
 * 注意：每次打开应用都需要重新登录，不会自动恢复登录状态
 * 这是为了安全考虑，防止他人未经授权访问
 */

// 从 Zustand store 重新导出
export { useAuth, useAuthStore, type StoredAuth } from '@/store/authStore'
