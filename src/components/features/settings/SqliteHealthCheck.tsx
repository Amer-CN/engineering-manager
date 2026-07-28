import React, { useState, useEffect } from 'react'
import { Icon } from '../../ui/Icon'
import { getAPI } from '@/services/api-adapter'

interface SqliteHealthCheckProps {
  enabled: boolean
}

export const SqliteHealthCheck: React.FC<SqliteHealthCheckProps> = ({ enabled }) => {
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'warning' | 'error' | 'unknown'>('unknown')
  const [healthDetails, setHealthDetails] = useState<string | null>(null)
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    const runCheck = async () => {
      try {
        const api = await getAPI()
        const [consRes, intRes] = await Promise.all([
          api.consistencyCheck(),
          api.integrityCheck(),
        ])

        const consistent = consRes.data?.consistent ?? true
        const integrityOk = intRes.data?.ok === true
        const now = new Date().toLocaleString('zh-CN')

        setLastCheckTime(now)

        if (integrityOk && consistent) {
          setHealthStatus('healthy')
          setHealthDetails(null)
        } else if (!integrityOk) {
          setHealthStatus('error')
          setHealthDetails(intRes.data?.result || '完整性检查失败')
        } else {
          setHealthStatus('warning')
          const count = consRes.data?.discrepancies?.length ?? 0
          setHealthDetails(`${count} 个数据表不一致`)
        }
      } catch {
        setHealthStatus('unknown')
      }
    }
    runCheck()
  }, [enabled])

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[color:var(--fg-2)] flex items-center gap-2">
          <Icon name="HeartPulse" size={16} className="text-[color:var(--accent)]" /> 数据健康检查
        </span>
        {lastCheckTime && (
          <span className="text-xs text-[color:var(--muted)]">上次检查: {lastCheckTime}</span>
        )}
      </div>
      <div className={`p-3 rounded-lg border ${
        healthStatus === 'healthy' ? 'bg-success-50 border-success-200' :
        healthStatus === 'warning' ? 'bg-warning-50 border-warning-200' :
        healthStatus === 'error' ? 'bg-danger-50 border-danger-200' :
        'bg-[color:var(--panel-2)] border-[color:var(--border)]'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            healthStatus === 'healthy' ? 'bg-success-500' :
            healthStatus === 'warning' ? 'bg-warning-500' :
            healthStatus === 'error' ? 'bg-danger-500' :
            'bg-[color:var(--muted)]'
          }`}></span>
          <span className={`text-sm font-medium ${
            healthStatus === 'healthy' ? 'text-success-700' :
            healthStatus === 'warning' ? 'text-warning-700' :
            healthStatus === 'error' ? 'text-danger-700' :
            'text-[color:var(--muted)]'
          }`}>
            {healthStatus === 'healthy' ? '数据完整，一切正常' :
             healthStatus === 'warning' ? '数据存在不一致' :
             healthStatus === 'error' ? '数据完整性异常' :
             '正在检查...'}
          </span>
          {healthDetails && (
            <span className="text-xs text-[color:var(--muted)] ml-auto">{healthDetails}</span>
          )}
        </div>
      </div>
    </>
  )
}
