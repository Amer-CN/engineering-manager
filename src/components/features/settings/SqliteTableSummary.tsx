import React from 'react'
import { TABLE_NAME_MAP } from './sqliteConstants'

interface SqliteTableSummaryProps {
  summary: Record<string, number> | undefined
}

export const SqliteTableSummary: React.FC<SqliteTableSummaryProps> = ({ summary }) => {
  if (!summary || Object.keys(summary).length === 0) return null

  const totalRows = Object.values(summary).filter(v => v > 0).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
        {Object.entries(summary)
          .sort(([, a], [, b]) => b - a)
          .map(([table, count]) => (
            <div key={table} className="flex justify-between items-center">
              <span className="text-slate-600 truncate">{TABLE_NAME_MAP[table] || TABLE_NAME_MAP[table.replace(/[A-Z]/g, c => '_' + c.toLowerCase())] || table}</span>
              <span className="text-slate-800 font-medium tabular-nums ml-2">{count.toLocaleString()}</span>
            </div>
          ))}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between text-sm">
        <span className="text-slate-600 font-medium">总计</span>
        <span className="text-slate-800 font-bold tabular-nums">{totalRows.toLocaleString()} 行</span>
      </div>
    </div>
  )
}
