/**
 * GlassCarousel — 3D 玻璃文件夹轮播（舞台区主体）
 *
 * 结构：透视容器（perspective 1400 / origin 50% 50%）+ 全量卡片注册层
 * + 左上 FolderInfoBadge + 右上 CarouselControls + 底部圆点导航 + 舞台氛围光。
 * 卡片 3D transform 由 useCarouselEngine 每帧直写（.gc-card 注册层，聚焦索引才 setState）。
 * 交互：滚轮（原生 passive:false + 首尾 EDGE_EPS 释放）、拖拽吸附、圆点/步进跳转。
 * 降级：reduced-motion → 横向平铺列表；低帧 → 舞台挂 gc-noglass 关玻璃。
 * 数据：M3 起受控 props（KnowledgeHomePage 从 useKnowledgeFolders 提供，支持项目筛选）；
 *       空数组不渲染（页面级空态由外层 EmptyState 处理）。
 */

import React, { useState, useEffect } from 'react'
import type { FolderItem } from './types'
import { useCarouselEngine } from './useCarouselEngine'
import { GlassFolderCard } from './GlassFolderCard'
import { FolderInfoBadge } from './FolderInfoBadge'
import { CarouselControls } from './CarouselControls'
import './glassCarousel.css'

const STAGE_HEIGHT_CLASS = 'relative w-full h-[380px] sm:h-[420px] flex items-center justify-center cursor-grab touch-pan-y mt-16 sm:mt-8'

interface GlassCarouselProps {
  folders: FolderItem[]
  /** 卡片点击（选中卡/任意卡；缺省无动作——知识库首页 M2 决策纯展示） */
  onFolderClick?: (folder: FolderItem) => void
}

export const GlassCarousel: React.FC<GlassCarouselProps> = ({ folders, onFolderClick }) => {
  if (!folders || folders.length === 0) return null

  const [isPlaying, setIsPlaying] = useState(true) // MARKER_XYZ_123 // 自动循环默认开启（参考项目原生行为，产品拍板）
  const [isLoop, setIsLoop] = useState(true) // 无限循环默认开启：无缝环转（参考项目原生行为）
  const [scrollSpeed, setScrollSpeed] = useState(1)
  const [rotateYAngle, setRotateYAngle] = useState(-26)
  const [rotateXAngle, setRotateXAngle] = useState(10)
  const [itemSpacing, setItemSpacing] = useState(75)
  const [showControls, setShowControls] = useState(false)

  const engine = useCarouselEngine({
    count: folders.length,
    itemSpacing,
    rotateYAngle,
    rotateXAngle,
    isPlaying,
    scrollSpeed,
    loop: isLoop,
  })

  const activeFolder = folders[engine.focusIndex] ?? folders[0]

  // 原生 wheel 监听（passive:false 才能 preventDefault；首尾释放由引擎判定）
  useEffect(() => {
    const stage = engine.stageRef.current
    if (!stage) return
    stage.addEventListener('wheel', engine.onWheelNative, { passive: false })
    return () => stage.removeEventListener('wheel', engine.onWheelNative)
  }, [engine])

  // 无障碍底线：reduced-motion → 横向平铺列表（无 3D）
  if (engine.reducedMotion) {
    return (
      <div className="gc-stage">
        <div className="gc-flat-track">
          {folders.map((f) => (
            <div key={f.id} style={{ width: 'var(--gc-card-w)' }}>
              <GlassFolderCard folder={f} isActive={false} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`gc-stage${engine.downgraded ? ' gc-noglass' : ''}`}>
      {/* 舞台氛围：左上/中央光 + 暗角 */}
      <div className="gc-ambient-tl" />
      <div className="gc-ambient-center" />
      <div className="gc-vignette" />

      {/* 左上：悬浮信息卡（纯展示，M3 接详情跳转） */}
      <div className="absolute top-4 left-6 md:left-12 z-40">
        <FolderInfoBadge folder={activeFolder} />
      </div>

      {/* 右上：控制组（参数 + 左右步进） */}
      <div className="absolute top-4 right-6 md:right-12 z-40 flex items-center gap-2">
        <CarouselControls
          showControls={showControls}
          onToggleControls={() => setShowControls(v => !v)}
          onStepPrev={engine.stepPrev}
          onStepNext={engine.stepNext}
          isPlaying={isPlaying}
          onTogglePlaying={() => setIsPlaying(v => !v)}
          isLoop={isLoop}
          onToggleLoop={() => setIsLoop(v => !v)}
          scrollSpeed={scrollSpeed}
          onScrollSpeedChange={setScrollSpeed}
          rotateYAngle={rotateYAngle}
          onRotateYChange={setRotateYAngle}
          rotateXAngle={rotateXAngle}
          onRotateXChange={setRotateXAngle}
          itemSpacing={itemSpacing}
          onSpacingChange={setItemSpacing}
        />
      </div>

      {/* 透视舞台：卡片 3D 定位由引擎直写 */}
      <div
        ref={engine.stageRef}
        onPointerDown={engine.handlePointerDown}
        onPointerMove={engine.handlePointerMove}
        onPointerUp={engine.handlePointerUp}
        onPointerLeave={engine.handlePointerUp}
        className={STAGE_HEIGHT_CLASS}
        style={{ perspective: '1400px', perspectiveOrigin: '50% 50%' }}
        aria-label="3D 文件夹轮播"
        role="region"
      >
        <div className="gc-glow-floor" />
        <div className="relative w-full h-full flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
          {folders.map((f, i) => (
            <div key={f.id} ref={engine.registerCard(i)} className="gc-card">
              <GlassFolderCard folder={f} isActive={i === engine.focusIndex} onClick={onFolderClick ? () => onFolderClick(f) : undefined} />
            </div>
          ))}
        </div>
      </div>

      {/* 底部圆点导航 */}
      <div className="relative flex items-center justify-center gap-2 mt-4 z-30">
        {folders.map((f, i) => (
          <button
            key={f.id}
            onClick={() => engine.dotGoTo(i)}
            className={`gc-dot${i === engine.focusIndex ? ' gc-dot--active' : ''}`}
            title={f.title}
            aria-label={`第 ${i + 1} 个文件夹：${f.title}`}
            aria-current={i === engine.focusIndex ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  )
}
