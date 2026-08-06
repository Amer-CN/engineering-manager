/**
 * CarouselControls — 轮播右上控制组（精简版）
 *
 * §2.3 交互裁剪：源项目常驻 4 按钮（播放/参数/上/下）→ 精简为「参数 + 左右步进」；
 * 自动播放开关（默认关闭）藏入参数抽屉；重置按钮恢复参数真值。
 * 按钮样式走 glassCarousel.css（.gc-btn，舞台授权区内）。
 */

import React from 'react'
import { ChevronLeft, ChevronRight, SlidersHorizontal, RotateCcw, Play, Pause } from 'lucide-react'
import { GC_PARAMS } from './useCarouselEngine'

interface CarouselControlsProps {
  showControls: boolean
  onToggleControls: () => void
  onStepPrev: () => void
  onStepNext: () => void
  isPlaying: boolean
  onTogglePlaying: () => void
  scrollSpeed: number
  onScrollSpeedChange: (v: number) => void
  rotateYAngle: number
  onRotateYChange: (v: number) => void
  rotateXAngle: number
  onRotateXChange: (v: number) => void
  itemSpacing: number
  onSpacingChange: (v: number) => void
}

export const CarouselControls: React.FC<CarouselControlsProps> = ({
  showControls,
  onToggleControls,
  onStepPrev,
  onStepNext,
  isPlaying,
  onTogglePlaying,
  scrollSpeed,
  onScrollSpeedChange,
  rotateYAngle,
  onRotateYChange,
  rotateXAngle,
  onRotateXChange,
  itemSpacing,
  onSpacingChange,
}) => {
  const resetParams = () => {
    onRotateYChange(GC_PARAMS.rotateYAngle)
    onRotateXChange(GC_PARAMS.rotateXAngle)
    onSpacingChange(GC_PARAMS.itemSpacing)
    onScrollSpeedChange(1)
  }

  return (
    <>
      {/* 右上按钮组：参数 + 左右步进 */}
      <button className={`gc-btn${showControls ? ' gc-btn--active' : ''}`} onClick={onToggleControls} title="调整 3D 视效参数" aria-label="调整 3D 视效参数">
        <SlidersHorizontal className="w-4 h-4" />
      </button>
      <button className="gc-btn" onClick={onStepPrev} title="上一个文件夹" aria-label="上一个文件夹">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button className="gc-btn" onClick={onStepNext} title="下一个文件夹" aria-label="下一个文件夹">
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* 参数抽屉（含自动播放开关） */}
      {showControls && (
        <div className="absolute top-14 right-0 z-50 w-72 p-4 rounded-2xl border border-white/20 bg-slate-900/90 backdrop-blur-xl shadow-2xl space-y-3 text-caption text-white">
          <div className="font-semibold border-b pb-2 border-white/10 flex items-center justify-between">
            <span>3D 视效设置</span>
            <button onClick={resetParams} className="text-emerald-400 flex items-center gap-1 hover:underline">
              <RotateCcw className="w-3 h-3" /> 重置
            </button>
          </div>

          {/* 自动播放（默认关闭，管理场景非海报） */}
          <button
            onClick={onTogglePlaying}
            className="w-full flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2 hover:bg-white/10"
          >
            <span className="flex items-center gap-2">
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              自动循环
            </span>
            <span className={`font-mono ${isPlaying ? 'text-emerald-400' : 'text-slate-400'}`}>{isPlaying ? '开启' : '关闭'}</span>
          </button>

          <SliderRow label="滚动速度" value={`${scrollSpeed.toFixed(1)}x`} min={0.2} max={3} step={0.1} valueNum={scrollSpeed} onChange={onScrollSpeedChange} />
          <SliderRow label="Y 轴旋转角度" value={`${rotateYAngle}°`} min={-60} max={60} step={1} valueNum={rotateYAngle} onChange={onRotateYChange} />
          <SliderRow label="X 轴俯仰角度" value={`${rotateXAngle}°`} min={-20} max={30} step={1} valueNum={rotateXAngle} onChange={onRotateXChange} />
          <SliderRow label="文件夹重叠间距" value={`${itemSpacing}px`} min={40} max={140} step={1} valueNum={itemSpacing} onChange={onSpacingChange} />
        </div>
      )}
    </>
  )
}

interface SliderRowProps {
  label: string
  value: string
  min: number
  max: number
  step: number
  valueNum: number
  onChange: (v: number) => void
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step, valueNum, onChange }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={valueNum}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-emerald-500 cursor-pointer"
      aria-label={label}
    />
  </div>
)
