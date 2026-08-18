/**
 * KnowledgeCarouselStage — 知识库 3D 轮播舞台（参考项目原版引擎 + 三主题容器适配）
 *
 * 引擎 = 参考项目 FolderCarousel 原样（React state 驱动：无限循环三倍数组、
 * 自动播放默认开、参数实时预览——已在 demo 页与参考项目 DOM 逐项比对一致）。
 * 本组件只做两件事：
 *   1. 三主题容器适配：舞台内视觉永远原版暗色（bg-black + emerald 是视觉本体），
 *      外层容器按主题过渡——graphite 直接融合，sandstone/white 用深色容器包裹
 *      （暖调深底 / 中性深底），避免亮页面上突兀的黑块
 *   2. 数据接线：API 文件夹 → 参考项目 FolderItem 模型
 */

import React, { useMemo } from 'react'
import { useTheme } from '@/hooks/useTheme'
import type { FolderItem } from './types'
import { FolderCarousel } from './FolderCarousel'
import type { KnowledgeFolder } from '@/services/knowledge-folders'

interface KnowledgeCarouselStageProps {
  folders: KnowledgeFolder[]
}

/** 三主题舞台容器底色：graphite 融合页底；亮色主题给深色包裹（暖/中性按主题色温） */
const STAGE_CONTAINER: Record<string, string> = {
  graphite: 'bg-transparent',                       // 暗色主题直接融合
  sandstone: 'bg-[#241f26]',                        // 暖白紫主题 → 暖调深底
  white: 'bg-[#1a1a1e]',                            // 纯白主题 → 中性深底
}

export const KnowledgeCarouselStage: React.FC<KnowledgeCarouselStageProps> = ({ folders }) => {
  const { scheme } = useTheme()

  // API 文件夹 → 参考项目 FolderItem（映射关系与 M3 glass/ 版一致）
  const items: FolderItem[] = useMemo(
    () => folders.map((f) => ({
      id: String(f.id),
      title: f.name,
      englishTitle: f.englishName ?? undefined,
      period: f.category ?? '知识库',
      progress: 60, // 占位：文件夹完成度暂无统计口径，先给固定值保持卡片视觉完整
      memberCount: f.docCount,
      category: f.category ?? '知识库',
      documents: [],
    })),
    [folders],
  )

  if (items.length === 0) return null

  return (
    <div className={`rounded-2xl overflow-hidden ${STAGE_CONTAINER[scheme] ?? STAGE_CONTAINER.sandstone}`}>
      {/* 舞台内保持参考项目原版暗色视觉 */}
      <div className="bg-black">
        <FolderCarousel folders={items} theme="dark" />
      </div>
    </div>
  )
}
