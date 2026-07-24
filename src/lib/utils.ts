import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * shadcn/ui 标准类名合并工具：clsx 组合 + tailwind-merge 去重冲突。
 * 供 src/components/ui 下的 shadcn 原语（command / dialog 等）使用。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
