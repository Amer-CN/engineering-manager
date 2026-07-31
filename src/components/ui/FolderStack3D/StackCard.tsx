// StackCard.tsx — FolderStack3D 卡面（纯展示，竖版文件夹母版 reference-a）
// 姿态（transform/opacity/filter/态类名）全部由 useWheelStack 的 rAF 逐帧直写，
// 本组件只负责静态卡面内容；memo 隔离——聚焦索引变化重渲染舞台时卡面不重绘。
//
// DOM 分层（自下而上，严格按母版执行单 §3）：
//   back-shell（平直圆角矩形，无凸耳）
//   → paper-stack（三张等大纸，刚性平移 + 右上折角，front 带装饰线）
//   → front-shell（连续圆滑口袋轮廓，内联 SVG path，1px 描线）
//   → face-content（人数图标+数字 / 标题 / files 副行）
// 颜色全部取 --stage-* token（theme-verdant.css），几何全部走 CSS 变量 + 百分比。
import { memo } from 'react'
import { Icon } from '../Icon'
import type { StackGroup } from './types'

// 前壳口袋轮廓（viewBox 250×360 = 现有卡逻辑尺寸，preserveAspectRatio=none 可整体缩放）：
// 左高平台 y=88.2（卡高 24.5%）→ 三次贝塞尔平滑下降 → 右低平台 y=114.8（卡高 31.9%），
// 一条连续路径收进 22px 底圆角——不是「矩形 + 独立凸耳」（视觉硬规则 2）。
const FRONT_SHELL_PATH =
  'M 0 100.2 Q 0 88.2 12 88.2 L 93 88.2 ' +
  'C 118 88.2 130 114.8 155 114.8 L 238 114.8 Q 250 114.8 250 126.8 ' +
  'L 250 338 Q 250 360 228 360 L 22 360 Q 0 360 0 338 Z'

interface StackCardProps {
  group: StackGroup
  index: number
  cardId: string
  selected: boolean
  refFn: (el: HTMLDivElement | null) => void
  onClick: (index: number) => void
}

export const StackCard = memo(function StackCard({ group, index, cardId, selected, refFn, onClick }: StackCardProps) {
  return (
    // 卡片姿态类由 rAF 直写管理（React 不 diff 实际 DOM 的 className，重渲染不会覆盖）；
    // 初始 fs3d-hide 避免首帧 40 张叠在原点（useLayoutEffect 首次 renderFrame 立即摆位）
    <div
      ref={refFn}
      id={cardId}
      role="option"
      aria-selected={selected}
      className="fs3d-card fs3d-hide"
      onClick={() => onClick(index)}
    >
      {/* 后壳：顶边平直的圆角矩形，半透明同 token 材质（点阵透壳） */}
      <div className="fs3d-backshell" />

      {/* 三张等大纸：DOM 顺序 back → middle → front（front 最后绘制在最上） */}
      <div className="fs3d-papers" aria-hidden="true">
        <i className="fs3d-paper" />
        <i className="fs3d-paper" />
        <i className="fs3d-paper fs3d-paper-front">
          <span /><span /><span /><span /><span /><span /><span />
        </i>
      </div>

      {/* 前壳：连续圆滑口袋轮廓（唯一允许凸耳/台阶的层），1px 非缩放描线 */}
      <svg className="fs3d-frontshell" viewBox="0 0 250 360" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d={FRONT_SHELL_PATH} vectorEffect="non-scaling-stroke" />
      </svg>

      {/* 卡面内容：只保留 人数+数字 / 标题 / files 副行（视觉硬规则 7） */}
      <div className="fs3d-face">
        {group.people != null && (
          <span className="fs3d-people">
            <Icon name="Users" className="fs3d-people-icon" strokeWidth={2.4} />
            {group.people}
          </span>
        )}
        <div className="fs3d-title">{group.name}</div>
        <div className="fs3d-files">
          {group.primaryValue}
          {group.primaryUnit && <u>{group.primaryUnit}</u>}
        </div>
      </div>
    </div>
  )
})
