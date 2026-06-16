import { motion } from 'framer-motion'
import {
  Users, UserCog, FileText, Receipt, FolderKanban,
  ClipboardCheck, FileSpreadsheet, Wallet, Package, Building2,
  Bot, ShieldCheck,
  type LucideIcon
} from 'lucide-react'

interface Feature {
  icon: LucideIcon
  title: string
  desc: string
  accent: string
  status?: 'live' | 'coming'
}

const features: Feature[] = [
  { icon: Users, title: '人事管理', desc: '管理员工档案、考勤打卡、月薪薪酬核算，支持工种/角色分类管理。', accent: 'var(--color-indigo)' },
  { icon: UserCog, title: '工人管理', desc: '农民工班组管理、档案登记、日薪工资计算，支持 Excel 批量导入。', accent: 'var(--color-amber)' },
  { icon: Receipt, title: '发票管理', desc: '收票→付款、开票→回款全流程管理，支持增值税发票 OCR 识别。', accent: 'var(--color-emerald)' },
  { icon: FileText, title: '合同管理', desc: '收入/支出/其他协议三类合同，看板视图+子页面，支持合同模板。', accent: 'var(--color-blue)' },
  { icon: FolderKanban, title: '项目管理', desc: '投资组合概览，6 Tab 指挥中心，实时跟踪项目进度与健康状况。', accent: 'var(--color-violet)' },
  { icon: ClipboardCheck, title: '结算办理', desc: '6 种类别结算，自动核验+Excel 导入，告别繁琐的手工对账。', accent: 'var(--color-cyan)' },
  { icon: FileSpreadsheet, title: '模板管理', desc: '7 种分类模板，变量系统，TemplateSelector 快速调用。', accent: 'var(--color-orange)' },
  { icon: Wallet, title: '成本台账', desc: '真实资金流追踪，双入口角色分离，成本明细一目了然。', accent: 'var(--color-teal)' },
  { icon: Package, title: '仓库管理', desc: '物料库管理、出入库登记、项目材料关联，库存实时可查。', accent: 'var(--color-pink)' },
  { icon: Building2, title: '单位管理', desc: '合作单位+监管单位管理，建立企业合作信息库。', accent: 'var(--color-slate)' },
  { icon: ShieldCheck, title: 'AI 数据守护', desc: '本地化数据守护引擎，自动备份/恢复/审计，零云端泄露风险，数据完全自主可控。', accent: 'var(--color-emerald)', status: 'live' },
  { icon: Bot, title: 'AI 助手', desc: '智能问答、报表自动生成、风险预警、决策建议，让 AI 替你处理繁琐数据。', accent: 'var(--color-indigo)', status: 'coming' },
]

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }
const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export default function Features() {
  return (
    <section id="features" className="section">
      <div className="container">
        <div className="section-header">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-label"
          >
            FEATURES
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="section-title"
          >
            全方位管理，一个就够了
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="section-desc"
          >
            覆盖建筑工程企业核心业务场景，从人事到财务，从合同到仓库。
          </motion.p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="features-grid"
        >
          {features.map((feat) => (
            <motion.article
              key={feat.title}
              variants={item}
              className="feature-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div className="feature-icon" style={{ color: feat.accent }}>
                  <feat.icon size={22} strokeWidth={1.8} />
                </div>
                {feat.status && (
                  <span className={`feature-badge feature-badge--${feat.status}`}>
                    {feat.status === 'live' ? '已上线' : '即将上线'}
                  </span>
                )}
              </div>
              <h3 className="feature-title">{feat.title}</h3>
              <p className="feature-desc">{feat.desc}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>

      <style>{`
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg, 20px);
          overflow: hidden;
        }
        .feature-card {
          padding: 36px 32px;
          background: var(--bg);
          transition: background 0.25s ease;
        }
        .feature-card:hover {
          background: var(--bg-secondary);
        }
        .feature-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .feature-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 10px;
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }
        .feature-badge--live {
          background: color-mix(in srgb, var(--color-emerald) 15%, transparent);
          color: var(--color-emerald);
          border: 1px solid color-mix(in srgb, var(--color-emerald) 30%, transparent);
        }
        .feature-badge--coming {
          background: color-mix(in srgb, var(--text-muted) 15%, transparent);
          color: var(--text-muted);
          border: 1px solid color-mix(in srgb, var(--text-muted) 30%, transparent);
        }
        .feature-title {
          font-size: 17px;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 10px;
          letter-spacing: -0.01em;
        }
        .feature-desc {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.7;
          margin: 0;
        }
        @media (max-width: 768px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
          .feature-card {
            padding: 28px 24px;
          }
        }
      `}</style>
    </section>
  )
}