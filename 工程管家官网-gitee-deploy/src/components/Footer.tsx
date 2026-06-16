import { GitBranch, Mail } from 'lucide-react'
import Logo from './Logo'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <Logo size={24} />
              <span>工程管家</span>
            </div>
            <p className="footer-tagline">
              建筑工程企业一站式管理平台，助力工程管理数字化转型。
            </p>
          </div>

          <div className="footer-links">
            <h4>快速链接</h4>
            {[
              { label: '功能特性', href: '#features' },
              { label: '软件截图', href: '#gallery' },
              { label: '下载', href: '#download' },
            ].map(link => (
              <a key={link.href} href={link.href} className="footer-link">
                {link.label}
              </a>
            ))}
          </div>

          <div className="footer-links">
            <h4>联系与反馈</h4>
            <a
              href="https://github.com/Amer-CN/engineering-manager"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              <GitBranch size={13} /> GitHub
            </a>
            <a
              href="mailto:cd.hyxc.jz@foxmail.com"
              className="footer-link"
            >
              <Mail size={13} /> cd.hyxc.jz@foxmail.com
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          &copy; {year} 工程管家. 保留所有权利.
        </div>
      </div>

      <style>{`
        .site-footer {
          border-top: 1px solid var(--border);
          padding: 48px 0 32px;
          background: var(--bg-secondary);
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }
        .footer-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 17px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 12px;
        }
        .footer-tagline {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.7;
          margin: 0;
          max-width: 280px;
        }
        .footer-links h4 {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 16px;
          letter-spacing: 0.02em;
        }
        .footer-link {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-muted);
          text-decoration: none;
          padding: 4px 0;
          transition: color 0.2s;
        }
        a.footer-link:hover {
          color: var(--text);
        }
        .footer-link--static {
          cursor: default;
        }
        .footer-bottom {
          border-top: 1px solid var(--border);
          padding-top: 20px;
          text-align: center;
          font-size: 12px;
          color: var(--text-muted);
        }
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }
      `}</style>
    </footer>
  )
}