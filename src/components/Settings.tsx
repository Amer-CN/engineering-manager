import React, { useState } from 'react'
import { motion } from 'framer-motion'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Loading/Loading'
import { useDataPath } from '@/hooks/useDataPath'
import { useOCRConfig } from '@/hooks/useOCRConfig'
import { useSqliteSettings } from '@/hooks/useSqliteSettings'
import { SettingsOcrSection } from '@/components/SettingsOcrSection'
import { SettingsSqliteSection } from '@/components/SettingsSqliteSection'
import SettingsChangelog from '@/components/features/settings/SettingsChangelog'
import { SettingsPiiKeySection } from '@/components/features/settings/SettingsPiiKeySection'
import { DataPathSection } from '@/components/features/settings/DataPathSection'
import { DevToolsSection } from '@/components/features/settings/DevToolsSection'
import { AppearanceSection } from '@/components/features/settings/AppearanceSection'
import { AiProviderSection } from '@/components/features/settings/AiProviderSection'
import { AboutSection } from '@/components/features/settings/AboutSection'

/**
 * v0.76.0 累计待办 #7: Settings 剩余拆分 — 主页面只剩组合
 * 子组件:
 *   - DataPathSection     数据存储设置 (左列)
 *   - SettingsPiiKeySection PII 加密密钥 (左列, v0.76.0 #5)
 *   - SettingsSqliteSection SQLite 状态 (左列)
 *   - DevToolsSection     开发工具 (左列)
 *   - SettingsOcrSection  OCR 配置 (右列)
 *   - AppearanceSection   外观主题 (右列)
 *   - AboutSection        关于 (右列)
 */
interface SettingsProps { refresh?: () => void }

const Settings: React.FC<SettingsProps> = ({ refresh }) => {
  const dp = useDataPath(refresh)
  const ocr = useOCRConfig()
  const sqlite = useSqliteSettings()
  const [showChangelog, setShowChangelog] = useState(false)

  if (dp.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <span className="text-slate-500">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="max-w-[1400px] mx-auto p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <PageHeader title="系统设置" subtitle="管理应用程序设置" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 左列：数据 & 技术 ── */}
        <div className="space-y-6">
          <AiProviderSection />
          <DataPathSection refresh={refresh} />
          <SettingsPiiKeySection />
          <SettingsSqliteSection
            status={sqlite.status}
            loading={sqlite.loading}
            enabling={sqlite.enabling}
            migrating={sqlite.migrating}
            switching={sqlite.switching}
            message={sqlite.message}
            onEnable={sqlite.handleEnable}
            onMigrate={sqlite.handleMigrate}
            onRemigrate={sqlite.handleRemigrate}
            onSetReadMode={sqlite.handleSetReadMode}
          />
          <DevToolsSection />
        </div>

        {/* ── 右列：外观 & 关于 ── */}
        <div className="space-y-6">
          <SettingsOcrSection
            ocrConfig={ocr.ocrConfig} setOcrConfig={ocr.setOcrConfig}
            ocrStatus={ocr.ocrStatus} testingOCR={ocr.testingOCR} ocrMessage={ocr.ocrMessage}
            onSave={ocr.handleSaveOCRConfig} onTest={ocr.handleTestOCR}
          />
          <AppearanceSection />
          <AboutSection onShowChangelog={() => setShowChangelog(true)} />
        </div>
      </div>

      {showChangelog && <SettingsChangelog onClose={() => setShowChangelog(false)} />}
    </motion.div>
  )
}

export default Settings