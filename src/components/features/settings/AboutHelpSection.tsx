import { useState } from 'react'
import { AboutSection } from './AboutSection'
import { ShortcutsReference } from './ShortcutsReference'
import { DevToolsSection } from './DevToolsSection'
import SettingsChangelog from './SettingsChangelog'

/**
 * 关于与帮助面板 (v0.83.0 设置页重构)
 * 子区: 关于(版本/更新/更新日志) / 快捷键参考 / 开发者工具(控制台 + GPU 加速)
 */
export function AboutHelpSection() {
  const [showChangelog, setShowChangelog] = useState(false)

  return (
    <div className="space-y-6">
      <div id="app-version" data-setting-anchor>
        <AboutSection onShowChangelog={() => setShowChangelog(true)} />
      </div>

      <ShortcutsReference />

      <div id="dev-tools" data-setting-anchor>
        <DevToolsSection />
      </div>

      {showChangelog && <SettingsChangelog onClose={() => setShowChangelog(false)} />}
    </div>
  )
}
