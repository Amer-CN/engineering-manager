import { useState } from 'react'
import type { InvoiceTaxRate } from '@/types/electron'

interface InvoiceAmountState {
  amount: number
  priceAmount: number
  taxAmount: number
  taxRate: InvoiceTaxRate
}

interface UseInvoiceAmountsOptions {
  onUpdate: (patch: Partial<InvoiceAmountState>) => void
  initial: InvoiceAmountState
}

const calcFromTaxed = (taxedAmount: number, taxRate: number) => {
  if (taxRate === 0) return { priceAmount: Math.round(taxedAmount * 100) / 100, taxAmount: 0 }
  const priceAmount = taxedAmount / (1 + taxRate)
  const taxAmount = taxedAmount - priceAmount
  return { priceAmount: Math.round(priceAmount * 100) / 100, taxAmount: Math.round(taxAmount * 100) / 100 }
}

const calcFromUntaxed = (untaxedAmount: number, taxRate: number) => {
  const taxAmount = untaxedAmount * taxRate
  const taxedAmount = untaxedAmount + taxAmount
  return { amount: Math.round(taxedAmount * 100) / 100, taxAmount: Math.round(taxAmount * 100) / 100 }
}

export function useInvoiceAmounts({ onUpdate, initial }: UseInvoiceAmountsOptions) {
  const [amountMode, setAmountMode] = useState<'taxed' | 'untaxed'>('taxed')

  const handleTaxRateChange = (newTaxRate: number) => {
    if (amountMode === 'taxed' && initial.amount > 0) {
      const { priceAmount, taxAmount } = calcFromTaxed(initial.amount, newTaxRate)
      onUpdate({ taxRate: newTaxRate as InvoiceTaxRate, priceAmount, taxAmount })
    } else if (amountMode === 'untaxed' && initial.priceAmount > 0) {
      const { amount, taxAmount } = calcFromUntaxed(initial.priceAmount, newTaxRate)
      onUpdate({ taxRate: newTaxRate as InvoiceTaxRate, amount, taxAmount })
    } else {
      onUpdate({ taxRate: newTaxRate as InvoiceTaxRate })
    }
  }

  const handleTaxedAmountChange = (value: number) => {
    setAmountMode('taxed')
    const { priceAmount, taxAmount } = calcFromTaxed(value, initial.taxRate)
    onUpdate({ amount: value, priceAmount, taxAmount })
  }

  const handleUntaxedAmountChange = (value: number) => {
    setAmountMode('untaxed')
    const { amount, taxAmount } = calcFromUntaxed(value, initial.taxRate)
    onUpdate({ amount, priceAmount: value, taxAmount })
  }

  const handleTaxAmountChange = (value: number) => {
    setAmountMode('untaxed')
    const newAmount = Math.round((initial.priceAmount + value) * 100) / 100
    onUpdate({ amount: newAmount, taxAmount: value })
  }

  return { amountMode, handleTaxRateChange, handleTaxedAmountChange, handleUntaxedAmountChange, handleTaxAmountChange }
}
