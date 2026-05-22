/**
 * Loading 组件
 * 
 * 加载状态组件 - 包括 Spinner 和 Skeleton
 */

import React from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// Spinner
// ═══════════════════════════════════════════════════════════════════════════════

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'white' | 'gray'
  className?: string
}

const sizeStyles = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-9 h-9',
}

const colorStyles = {
  primary: 'text-primary-600',
  white: 'text-white',
  gray: 'text-slate-400',
}

/**
 * Spinner 加载指示器
 * 
 * @example
 * ```tsx
 * <Spinner size="md" color="primary" />
 * ```
 */
export function Spinner({
  size = 'md',
  color = 'primary',
  className = '',
}: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${sizeStyles[size]} ${colorStyles[color]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Skeleton
// ═══════════════════════════════════════════════════════════════════════════════

export interface SkeletonProps {
  width?: string | number
  height?: string | number
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  className?: string
}

const roundedStyles = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
}

/**
 * Skeleton 骨架屏
 * 
 * @example
 * ```tsx
 * <Skeleton width={200} height={20} />
 * <Skeleton width="100%" height={100} rounded="md" />
 * ```
 */
export function Skeleton({
  width,
  height = 16,
  rounded = 'md',
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`bg-slate-200 animate-pulse ${roundedStyles[rounded]} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Loading 包装组件
// ═══════════════════════════════════════════════════════════════════════════════

export interface LoadingProps {
  loading: boolean
  children: React.ReactNode
  indicator?: React.ReactNode
  className?: string
}

/**
 * Loading 加载状态包装组件
 * 
 * @example
 * ```tsx
 * <Loading loading={isLoading}>
 *   <DataTable data={data} />
 * </Loading>
 * ```
 */
export function Loading({
  loading,
  children,
  indicator,
  className = '',
}: LoadingProps) {
  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {indicator || <Spinner size="lg" />}
      </div>
    )
  }

  return <>{children}</>
}
