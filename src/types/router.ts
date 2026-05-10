/**
 * 路由类型定义
 * 
 * 扩展的路由配置类型
 */

/**
 * 路由配置（带组件信息）
 */
export interface RouteConfig {
  /** 路由 ID */
  id: string
  /** 显示标签 */
  label: string
  /** 组件路径 */
  component?: string
  /** 布局类型 */
  layout?: 'main' | 'blank' | 'auth'
  /** 子路由 */
  children?: RouteConfig[]
  /** 元数据 */
  meta?: {
    /** 是否需要认证 */
    requiresAuth?: boolean
    /** 权限角色 */
    roles?: string[]
    /** 页面标题 */
    title?: string
    /** 面包屑图标 */
    breadcrumbIcon?: string
  }
}
