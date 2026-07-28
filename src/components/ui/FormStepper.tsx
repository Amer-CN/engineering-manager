/**
 * FormStepper — S20 Stitch-aligned horizontal step indicator.
 *
 * Props:
 *   steps: string[] — step labels
 *   current: number — 0-based active step index
 */
import React from 'react'

interface FormStepperProps {
  steps: string[]
  current: number
}

export const FormStepper: React.FC<FormStepperProps> = ({ steps, current }) => {
  return (
    <div className="w-full flex items-center justify-between px-4 py-2.5 bg-[color:var(--panel-2)] rounded-lg border border-[color:var(--border)]">
      {steps.map((label, i) => {
        const isActive = i === current
        const isPast = i < current
        const isFuture = i > current
        return (
          <React.Fragment key={i}>
            {i > 0 && <div className="flex-1 h-px bg-[color:var(--border)] mx-4" />}
            <div className={`flex items-center gap-2.5 ${isFuture ? 'opacity-50' : ''}`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-medium flex-shrink-0 ${
                  isActive
                    ? 'bg-[color:var(--fg)] text-[color:var(--bg)]'
                    : isPast
                      ? 'bg-[color:var(--accent)] text-white'
                      : 'bg-[color:var(--panel-2)] border border-[color:var(--border)] text-[color:var(--muted)]'
                }`}
              >
                {isPast ? '✓' : i + 1}
              </div>
              <span
                className={`text-sm whitespace-nowrap ${
                  isActive ? 'font-semibold text-[color:var(--fg)]' : 'text-[color:var(--muted)]'
                }`}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
