import type { CostLedgerEntry } from '@/types'

interface CostLedgerRowProps {
  entry: CostLedgerEntry
  index: number
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onAddSubItem: (parentId: number) => void
  level?: number
  allEntries?: CostLedgerEntry[]
}

export const CostLedgerRow = vi.fn((props: CostLedgerRowProps) => (
  <div data-testid="cost-ledger-row" data-id={props.entry?.id}>
    {props.entry?.summary || 'row'}
  </div>
))
