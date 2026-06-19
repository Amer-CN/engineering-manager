import { motion } from 'framer-motion'
import { Download as DownloadIcon, ExternalLink, FileCode, Package, Shield, Cpu, GitBranch } from 'lucide-react'

const version = 'v0.70.0'
const GITHUB_REPO = 'https://github.com/Amer-CN/engineering-manager'
// GitHub Releases 下载地址（文件实际名：v0.70.0.exe）
const downloadUrl = `${GITHUB_REPO}/releases/download/${version}/${version}.exe`
// 备用国内网盘地址（担心 GitHub 国内下载慢时使用）
const mirrorUrl = 'https://cloud.189.cn/web/share?code=jUjM73RJRbUv'
const mirrorUrl2 = 'https://1821605241.share.123865.com/123pan/uSpfjv-LWVVv'

const requirements = [
  { label: '操作系统', value: 'Windows 10 1809+ / Windows 11' },
  { label: '架构', value: 'x64' },
  { label: '运行时', value: '.NET 8.0 Desktop Runtime（内置）' },
  { label: '存储空间', value: '约 500MB' },
  { label: '内存', value: '推荐 8GB+' },
]

export default function Download() {
  return (
    <section id="download" className="section">
      <div className="container">
        <div className="section-header">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-label"
          >
            DOWNLOAD
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="section-title"
          >
            立即下载工程管家
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="section-desc"
          >
            免费使用，安装即用。数据完全存储在本地，安全可控。
          </motion.p>
        </div>

        <div className="download-layout">
          {/* 左侧：下载卡片 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="download-card"
          >
            <div className="download-card-icon">
              <Package size={32} color="white" />
            </div>
            <div className="download-card-badge">
              <FileCode size={13} />
              {version}
            </div>
            <h3 className="download-card-title">工程管家 安装包</h3>
            <p className="download-card-desc">
              桌面客户端，安装后即可使用。数据路径可自由配置，支持多用户权限管理。
            </p>
            <a href={downloadUrl} className="download-btn">
              <DownloadIcon size={18} />
              下载安装包（~198MB）
            </a>
            {mirrorUrl && (
              <a
                href={mirrorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="download-mirror"
              >
                天翼云盘（访问码 yqq4）<ExternalLink size={12} />
              </a>
            )}
            {mirrorUrl2 && (
              <a
                href={mirrorUrl2}
                target="_blank"
                rel="noopener noreferrer"
                className="download-mirror"
              >
                123 云盘（提取码 HovS）<ExternalLink size={12} />
              </a>
            )}
            <div className="download-links">
              <a
                href={`${GITHUB_REPO}/releases/tag/${version}`}
                target="_blank"
                rel="noopener noreferrer"
                className="download-link"
              >
                <GitBranch size={13} /> GitHub Releases
              </a>
              <a
                href={`${GITHUB_REPO}/blob/main/CHANGELOG.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="download-link"
              >
                <FileCode size={13} /> 更新日志
              </a>
            </div>
          </motion.div>

          {/* 右侧：系统要求 */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="requirements-card"
          >
            <div className="requirements-header">
              <Cpu size={18} />
              <span>系统要求</span>
            </div>
            <div className="requirements-list">
              {requirements.map((req, i) => (
                <div key={req.label} className="requirements-row">
                  <span className="requirements-label">{req.label}</span>
                  <span className="requirements-value">{req.value}</span>
                </div>
              ))}
            </div>
            <div className="requirements-note">
              <Shield size={13} />
              数据存储路径由用户自由配置，卸载时不影响数据安全
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        .download-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          max-width: 880px;
          margin: 0 auto;
        }

        /* 下载卡片 */
        .download-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg, 20px);
          padding: 40px 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: border-color 0.3s;
        }
        .download-card:hover {
          border-color: color-mix(in srgb, var(--primary) 30%, transparent);
        }
        .download-card-icon {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .download-card-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 12px;
          border-radius: 16px;
          background: color-mix(in srgb, var(--primary) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
          font-size: 12px;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 16px;
        }
        .download-card-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 8px;
        }
        .download-card-desc {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0 0 28px;
          line-height: 1.6;
        }
        .download-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 36px;
          border-radius: 46px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: white;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px color-mix(in srgb, var(--primary) 30%, transparent);
        }
        .download-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px color-mix(in srgb, var(--primary) 40%, transparent);
        }
        .download-changelog {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 16px;
          font-size: 13px;
          color: var(--text-muted);
        }
        .download-mirror {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 10px;
          font-size: 12px;
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s;
        }
        .download-mirror:hover {
          color: var(--primary);
        }
        .download-links {
          display: flex;
          gap: 16px;
          margin-top: 16px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .download-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s;
        }
        .download-link:hover {
          color: var(--primary);
        }

        /* 系统要求 */
        .requirements-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg, 20px);
          padding: 36px;
          display: flex;
          flex-direction: column;
        }
        .requirements-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 24px;
        }
        .requirements-list {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .requirements-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid var(--border);
        }
        .requirements-row:last-child {
          border-bottom: none;
        }
        .requirements-label {
          font-size: 14px;
          color: var(--text-secondary);
        }
        .requirements-value {
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
        }
        .requirements-note {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 20px;
          font-size: 12px;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .download-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  )
}