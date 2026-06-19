import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

const screenshots = [
  { title: '项目管理', desc: '投资组合概览，6 Tab 指挥中心，项目健康度一目了然', gradient: 'var(--color-blue)' },
  { title: '发票管理', desc: '收票付款、开票回款全流程，支持 OCR 智能识别', gradient: 'var(--color-emerald)' },
  { title: '人事考勤', desc: '员工档案、考勤管理、月薪薪酬自动核算', gradient: 'var(--color-indigo)' },
  { title: '合同管理', desc: '收入/支出/其他协议，看板视图高效管理', gradient: 'var(--color-violet)' },
  { title: '仓库管理', desc: '物料库、出入库登记、项目材料关联', gradient: 'var(--color-orange)' },
  { title: '成本台账', desc: '真实资金流追踪，双入口角色分离', gradient: 'var(--color-teal)' },
]

export default function Gallery() {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  return (
    <section id="gallery" className="section">
      <div className="container">
        <div className="section-header">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-label"
          >
            GALLERY
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="section-title"
          >
            界面预览
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="section-desc"
          >
            简洁直观的 UI 设计，三主题系统自由切换（皓白/石墨/砂岩）。
          </motion.p>
        </div>

        <div className="gallery-grid">
          {screenshots.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="gallery-card"
              onClick={() => { setCurrentIndex(i); setLightboxOpen(true) }}
            >
              <div className="gallery-card-bg" style={{ background: s.gradient }} />
              <div className="gallery-card-content">
                <h3 className="gallery-card-title">{s.title}</h3>
                <p className="gallery-card-desc">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 灯箱 */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lightbox-overlay"
            onClick={() => setLightboxOpen(false)}
          >
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="lightbox-card"
              onClick={e => e.stopPropagation()}
            >
              <div className="lightbox-bg" style={{ background: screenshots[currentIndex].gradient }} />
              <div className="lightbox-content">
                <h3 className="lightbox-title">{screenshots[currentIndex].title}</h3>
                <p className="lightbox-desc">{screenshots[currentIndex].desc}</p>
                <p className="lightbox-hint">截图准备中，敬请期待</p>
              </div>

              <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>
                <X size={18} />
              </button>
              <button className="lightbox-prev" onClick={() => setCurrentIndex(i => (i - 1 + screenshots.length) % screenshots.length)}>
                <ChevronLeft size={20} />
              </button>
              <button className="lightbox-next" onClick={() => setCurrentIndex(i => (i + 1) % screenshots.length)}>
                <ChevronRight size={20} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .gallery-card {
          position: relative;
          aspect-ratio: 16 / 10;
          border-radius: var(--radius-lg, 20px);
          overflow: hidden;
          cursor: pointer;
          border: 1px solid var(--border);
          transition: transform 0.3s ease, border-color 0.3s ease;
        }
        .gallery-card:hover {
          transform: translateY(-4px);
          border-color: color-mix(in srgb, var(--primary) 40%, transparent);
        }
        .gallery-card-bg {
          position: absolute;
          inset: 0;
          opacity: 0.08;
        }
        .gallery-card-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          text-align: center;
        }
        .gallery-card-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 8px;
        }
        .gallery-card-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
          max-width: 220px;
        }

        .lightbox-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }
        .lightbox-card {
          position: relative;
          max-width: 640px;
          width: 100%;
          border-radius: var(--radius-lg, 20px);
          overflow: hidden;
          border: 1px solid var(--border);
          min-height: 400px;
        }
        .lightbox-bg {
          position: absolute;
          inset: 0;
          opacity: 0.12;
        }
        .lightbox-content {
          position: relative;
          padding: 48px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }
        .lightbox-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 12px;
        }
        .lightbox-desc {
          font-size: 15px;
          color: var(--text-secondary);
          margin: 0 0 24px;
        }
        .lightbox-hint {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
        }
        .lightbox-close, .lightbox-prev, .lightbox-next {
          position: absolute;
          background: rgba(0,0,0,0.2);
          border: none;
          color: var(--text);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .lightbox-close:hover, .lightbox-prev:hover, .lightbox-next:hover {
          background: rgba(0,0,0,0.4);
        }
        .lightbox-close { top: 16px; right: 16px; }
        .lightbox-prev { left: 16px; top: 50%; transform: translateY(-50%); }
        .lightbox-next { right: 16px; top: 50%; transform: translateY(-50%); }

        @media (max-width: 768px) {
          .gallery-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  )
}