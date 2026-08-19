import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { FolderItem } from './types';
import { GlassFolderCard } from './GlassFolderCard';
import { FloatingPreviewBadge } from './FloatingPreviewBadge';

interface FolderCarouselProps {
  folders: FolderItem[];
  theme?: 'dark' | 'light';
  onSelectFolder?: (folder: FolderItem) => void;
  onFolderClick?: (folder: FolderItem) => void;
  selectedFolderId?: string;
}

export const FolderCarousel: React.FC<FolderCarouselProps> = ({
  folders,
  theme = 'dark',
  onSelectFolder,
  onFolderClick,
  selectedFolderId,
}) => {
  // If no folders provided
  if (!folders || folders.length === 0) return null;

  const isDark = theme === 'dark';

  // Triple the array to create seamless infinite looping
  const totalOriginal = folders.length;

  // Virtual position index (float value for smooth drag & infinite continuous looping)
  const [virtualIndex, setVirtualIndex] = useState<number>(0);
  const virtualIndexRef = useRef<number>(0);
  virtualIndexRef.current = virtualIndex;

  // Target index for smooth snapping when stepping or clicking cards/dots
  const targetIndexRef = useRef<number | null>(null);

  // Auto scroll state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [scrollSpeed, setScrollSpeed] = useState<number>(1); // 1 = normal speed
  const [rotateYAngle, setRotateYAngle] = useState<number>(22); // 朝右（正角度卡面更朝观众，内容可读性好；引擎自动翻转深度与遮挡方向）
  const [rotateXAngle, setRotateXAngle] = useState<number>(10);
  const [itemSpacing, setItemSpacing] = useState<number>(90); // 90px：标题+进度 pill 完整可见的临界值加余量
  const [showControls, setShowControls] = useState<boolean>(false);

  // Dragging state
  const isDragging = useRef<boolean>(false);
  const startX = useRef<number>(0);
  const startIndex = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  // 容器宽度监听：卡片轨道半径按实际宽度自适应（边缘卡贴边进出，用户拍板 A）
  const [containerWidth, setContainerWidth] = useState(1200);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return; // jsdom 测试环境无 RO，用初值
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Calculate actual active original index
  const normalizedIndex = Math.round(virtualIndex);
  const activeOriginalIndex = ((normalizedIndex % totalOriginal) + totalOriginal) % totalOriginal;
  const activeFolder = folders[activeOriginalIndex] || folders[0];

  // Ref to track last reported/synced folder ID to prevent infinite state update loops
  const lastReportedFolderIdRef = useRef<string | null>(selectedFolderId || null);

  // Sync external selectedFolderId if changed from outside
  useEffect(() => {
    if (selectedFolderId && selectedFolderId !== lastReportedFolderIdRef.current) {
      lastReportedFolderIdRef.current = selectedFolderId;
      const idx = folders.findIndex((f) => f.id === selectedFolderId);
      if (idx !== -1) {
        const currentSlot = Math.round(virtualIndexRef.current);
        const currentFolderIndex = ((currentSlot % totalOriginal) + totalOriginal) % totalOriginal;
        let diff = idx - currentFolderIndex;
        if (diff > totalOriginal / 2) diff -= totalOriginal;
        if (diff < -totalOriginal / 2) diff += totalOriginal;
        targetIndexRef.current = currentSlot + diff;
      }
    }
  }, [selectedFolderId, folders, totalOriginal]);

  // Notify parent of active folder when active index changes
  useEffect(() => {
    if (onSelectFolder && activeFolder && activeFolder.id !== lastReportedFolderIdRef.current) {
      lastReportedFolderIdRef.current = activeFolder.id;
      onSelectFolder(activeFolder);
    }
  }, [activeOriginalIndex, activeFolder, onSelectFolder]);

  // Unified Animation Loop (Continuous Auto-Play + Smooth Lerp Snapping)
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1); // Cap delta to prevent jump on tab switch
      lastTime = now;

      if (!isDragging.current) {
        if (targetIndexRef.current !== null) {
          // Lerp towards target index smoothly
          const diff = targetIndexRef.current - virtualIndexRef.current;
          if (Math.abs(diff) < 0.001) {
            setVirtualIndex(targetIndexRef.current);
            virtualIndexRef.current = targetIndexRef.current;
            targetIndexRef.current = null;
          } else {
            const nextVal = virtualIndexRef.current + diff * 0.18;
            setVirtualIndex(nextVal);
            virtualIndexRef.current = nextVal;
          }
        } else if (isPlaying) {
          // Continuous smooth infinite auto-play (no resets, no clamping jumps)
          const step = 0.35 * scrollSpeed * delta;
          const nextVal = virtualIndexRef.current + step;
          setVirtualIndex(nextVal);
          virtualIndexRef.current = nextVal;
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, scrollSpeed]);

  // Mouse & Touch Drag Event Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    targetIndexRef.current = null;
    startX.current = e.clientX;
    startIndex.current = virtualIndexRef.current;
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - startX.current;
    // Map pixel drag to index offset
    const indexDelta = -deltaX / (itemSpacing * 1.2);
    const nextVal = startIndex.current + indexDelta;
    setVirtualIndex(nextVal);
    virtualIndexRef.current = nextVal;
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
    // Snap smoothly to nearest integer slot if paused, or continue smooth auto-play
    if (!isPlaying) {
      targetIndexRef.current = Math.round(virtualIndexRef.current);
    }
  };

  // Ref for wheel debounce timeout
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Native non-passive wheel event listener for maximum responsiveness ("跟手") and 0-latency tracking
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();

      // Cancel any ongoing lerp snapping while actively wheeling
      targetIndexRef.current = null;

      let delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;

      // Handle OS/Browser deltaMode (0: pixels, 1: lines, 2: pages)
      if (e.deltaMode === 1) delta *= 32;
      else if (e.deltaMode === 2) delta *= 300;

      // Map wheel delta directly to virtual index step for instant response
      const sensitivity = 0.0035;
      const step = delta * sensitivity;

      const nextVal = virtualIndexRef.current + step;
      virtualIndexRef.current = nextVal;
      setVirtualIndex(nextVal);

      // Debounce snap to nearest folder slot after scrolling pauses
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => {
        targetIndexRef.current = Math.round(virtualIndexRef.current);
      }, 120);
    };

    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheelNative);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, []);

  // Manual Step Controls
  const stepPrev = () => {
    const base = targetIndexRef.current !== null ? targetIndexRef.current : Math.round(virtualIndexRef.current);
    targetIndexRef.current = base - 1;
  };

  const stepNext = () => {
    const base = targetIndexRef.current !== null ? targetIndexRef.current : Math.round(virtualIndexRef.current);
    targetIndexRef.current = base + 1;
  };

  const handleDotClick = (targetOriginalIdx: number) => {
    const currentSlot = Math.round(virtualIndexRef.current);
    const currentFolderIndex = ((currentSlot % totalOriginal) + totalOriginal) % totalOriginal;
    let diff = targetOriginalIdx - currentFolderIndex;
    if (diff > totalOriginal / 2) diff -= totalOriginal;
    if (diff < -totalOriginal / 2) diff += totalOriginal;
    targetIndexRef.current = currentSlot + diff;
  };

  const handleCardClick = (slot: number, folder: FolderItem) => {
    targetIndexRef.current = slot;
    if (onFolderClick) onFolderClick(folder);
  };

  return (
    <div className="relative w-full flex flex-col items-center select-none overflow-hidden py-6">
      {/* Floating Preview Badge (Positioned at top-left / center of carousel) */}
      <div className="absolute top-4 left-6 md:left-12 z-40 transition-all duration-300">
        <FloatingPreviewBadge
          folder={activeFolder}
          theme={theme}
          onClick={() => onSelectFolder && onSelectFolder(activeFolder)}
        />
      </div>

      {/* Control Action Buttons (Top Right Overlay) */}
      <div className="absolute top-4 right-6 md:right-12 z-40 flex items-center gap-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`
            p-3 rounded-full backdrop-blur-md transition-all duration-200 border shadow-lg flex items-center gap-2 text-xs font-medium
            ${
              isDark
                ? 'bg-zinc-900/70 border-white/20 text-white hover:bg-zinc-800'
                : 'bg-white/80 border-white/80 text-zinc-900 hover:bg-white'
            }
          `}
          title={isPlaying ? '暂停自动滚动' : '开启循环滚动'}
        >
          {isPlaying ? <Pause className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
          <span className="hidden sm:inline">{isPlaying ? '循环中' : '已暂停'}</span>
        </button>

        <button
          onClick={() => setShowControls(!showControls)}
          className={`
            p-3 rounded-full backdrop-blur-md transition-all duration-200 border shadow-lg
            ${
              showControls
                ? 'bg-emerald-500 text-white border-emerald-400'
                : isDark
                ? 'bg-zinc-900/70 border-white/20 text-white hover:bg-zinc-800'
                : 'bg-white/80 border-white/80 text-zinc-900 hover:bg-white'
            }
          `}
          title="调整3D视效参数"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <button
          onClick={stepPrev}
          className={`
            p-3 rounded-full backdrop-blur-md transition-all duration-200 border shadow-lg
            ${
              isDark
                ? 'bg-zinc-900/70 border-white/20 text-white hover:bg-zinc-800'
                : 'bg-white/80 border-white/80 text-zinc-900 hover:bg-white'
            }
          `}
          title="上一个文件夹"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={stepNext}
          className={`
            p-3 rounded-full backdrop-blur-md transition-all duration-200 border shadow-lg
            ${
              isDark
                ? 'bg-zinc-900/70 border-white/20 text-white hover:bg-zinc-800'
                : 'bg-white/80 border-white/80 text-zinc-900 hover:bg-white'
            }
          `}
          title="下一个文件夹"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3D Visual Customizer Drawer Dropdown */}
      {showControls && (
        <div
          className={`
            absolute top-20 right-6 md:right-12 z-50 p-4 rounded-2xl w-72 backdrop-blur-xl border shadow-2xl space-y-3 text-xs
            ${isDark ? 'bg-zinc-900/90 border-white/20 text-white' : 'bg-white/90 border-white/80 text-zinc-900'}
          `}
        >
          <div className="font-semibold border-b pb-2 border-white/10 flex items-center justify-between">
            <span>3D 文件夹视效设置</span>
            <button
              onClick={() => {
                setRotateYAngle(22);
                setRotateXAngle(10);
                setItemSpacing(90);
                setScrollSpeed(1);
              }}
              className="text-emerald-400 flex items-center gap-1 hover:underline"
            >
              <RotateCcw className="w-3 h-3" /> 重置
            </button>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>滚动速度</span>
              <span className="font-mono">{scrollSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.1"
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>3D Y轴旋转角度</span>
              <span className="font-mono">{rotateYAngle}°</span>
            </div>
            <input
              type="range"
              min="-60"
              max="60"
              value={rotateYAngle}
              onChange={(e) => setRotateYAngle(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>3D X轴俯仰角度</span>
              <span className="font-mono">{rotateXAngle}°</span>
            </div>
            <input
              type="range"
              min="-20"
              max="30"
              value={rotateXAngle}
              onChange={(e) => setRotateXAngle(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>文件夹重叠间距</span>
              <span className="font-mono">{itemSpacing}px</span>
            </div>
            <input
              type="range"
              min="40"
              max="140"
              value={itemSpacing}
              onChange={(e) => setItemSpacing(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* --- 3D PERSPECTIVE STACK CONTAINER --- */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full h-[380px] sm:h-[420px] flex items-center justify-center cursor-grab touch-pan-y relative mt-16 sm:mt-8"
        style={{
          perspective: '1400px',
          perspectiveOrigin: '50% 50%',
        }}
      >

        {/* 零背景（用户拍板）：地光已删 */}

        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {(() => {
            // 轨道半径自适应容器宽：保证边缘卡正好顶到容器左右边界（而非居中留白）
            const VISIBLE_RADIUS = Math.min(24, Math.max(4, Math.ceil((containerWidth / 2) / itemSpacing) + 1));
            const currentSlot = Math.round(virtualIndex);
            const minSlot = currentSlot - VISIBLE_RADIUS;
            const maxSlot = currentSlot + VISIBLE_RADIUS;

            const slots: number[] = [];
            for (let s = minSlot; s <= maxSlot; s++) {
              slots.push(s);
            }

            return slots.map((slot) => {
              const offset = slot - virtualIndex;
              const absOffset = Math.abs(offset);

              const folderIndex = ((slot % totalOriginal) + totalOriginal) % totalOriginal;
              const folder = folders[folderIndex];
              if (!folder) return null;

              const uniqueKey = `${folder.id}-slot-${slot}`;
              const isCurrentActive = absOffset < 0.5;
              const activeFactor = Math.max(0, 1 - absOffset);

              // Monotonic Z-Index based on 3D Y-angle orientation
              const isFacingRight = rotateYAngle <= 0;
              const zIndex = isFacingRight ? 10000 - slot : 10000 + slot;

              // Monotonic 3D depth along Z axis matching physical stack order
              const depthStep = 14;
              const stackDepthMultiplier = isFacingRight ? -1 : 1;
              const baseTranslateZ = offset * stackDepthMultiplier * depthStep;
              const translateZ = baseTranslateZ + activeFactor * 6;

              // Compute 3D Position Transforms
              const translateX = offset * itemSpacing;
              const translateY = -activeFactor * 36 + offset * 1.5;
              const rotateY = rotateYAngle + offset * 1.2;
              const rotateX = rotateXAngle;
              const rotateZ = -3 - activeFactor * 2.5 + offset * 0.2;

              // Opacity fade strictly for extreme edge items
              const fadeStart = VISIBLE_RADIUS - 2;
              const opacity = absOffset <= fadeStart ? 1 : Math.max(0, 1 - (absOffset - fadeStart) * 0.25);

              return (
                <div
                  key={uniqueKey}
                  onClick={() => handleCardClick(slot, folder)}
                  className="absolute pointer-events-auto transition-none"
                  style={{
                    transform: `
                      translate3d(${translateX}px, ${translateY}px, ${translateZ}px)
                      rotateY(${rotateY}deg)
                      rotateX(${rotateX}deg)
                      rotateZ(${rotateZ}deg)
                    `,
                    zIndex: Math.max(1, zIndex),
                    opacity,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <GlassFolderCard
                    folder={folder}
                    isActive={isCurrentActive}
                    theme={theme}
                    index={folderIndex}
                    rotateY={rotateY}
                    rotateX={rotateX}
                    offset={offset}
                  />
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Pagination Dot Navigation indicator bar */}
      <div className="flex items-center gap-2 mt-4 z-30">
        {folders.map((f, i) => {
          const isSelected = i === activeOriginalIndex;
          return (
            <button
              key={f.id}
              onClick={() => handleDotClick(i)}
              className={`
                h-2 rounded-full transition-all duration-300
                ${
                  isSelected
                    ? 'w-7 bg-emerald-500 shadow-[0_0_10px_#10b981]'
                    : isDark
                    ? 'w-2 bg-white/20 hover:bg-white/40'
                    : 'w-2 bg-black/20 hover:bg-black/40'
                }
              `}
              title={f.title}
            />
          );
        })}
      </div>
    </div>
  );
};
