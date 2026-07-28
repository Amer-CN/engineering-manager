import { useState, useEffect } from 'react'
import { getAPI } from '@/services/api-adapter'

interface InvoiceLinkerProps {
  projectId: number
  value: number | undefined
  onChange: (id: number | undefined) => void
}

export function InvoiceLinker({ projectId, value, onChange }: InvoiceLinkerProps) {
  const [invoices, setInvoices] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (projectId) {
      getAPI().then(api => api.getInvoices(projectId)).then((r: any) => {
        if (r.success) setInvoices(r.data || [])
      }).catch(() => {})
    }
  }, [projectId])

  const filtered = search
    ? invoices.filter((inv: any) =>
        (inv.invoiceNo || '').includes(search) ||
        (inv.counterparty || inv.sellerName || '').includes(search)
      )
    : invoices

  const selected = value ? invoices.find((inv: any) => inv.id === value) : null

  return (
    <div>
      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] px-3 py-2 text-sm">
          <span className="text-[color:var(--fg-2)]">
            {selected.invoiceNo || `发票 #${selected.id}`}
          </span>
          <span className="text-xs text-[color:var(--muted)]">
            {selected.counterparty || selected.sellerName || ''}
          </span>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="ml-auto text-xs text-danger-500 hover:text-danger-700"
          >
            清除
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索发票号或对方名称..."
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
          />
          {search && filtered.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg">
              {filtered.slice(0, 10).map((inv: any) => (
                <button
                  key={inv.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[color:var(--panel-2)]"
                  onMouseDown={() => { onChange(inv.id); setSearch('') }}
                >
                  <span className="font-medium">{inv.invoiceNo || `发票 #${inv.id}`}</span>
                  <span className="ml-2 text-xs text-[color:var(--muted)]">
                    {inv.counterparty || inv.sellerName || ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
