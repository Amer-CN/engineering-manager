import React from 'react'

interface PageContainerProps {
  children: React.ReactNode
  /** Override the default max-width. Use "wide" for data-heavy pages, "narrow" for form pages. */
  maxWidth?: 'default' | 'wide' | 'narrow' | 'full'
  /** Additional classes merged onto the container */
  className?: string
}

const maxWidthClasses: Record<string, string> = {
  default: 'max-w-[1400px]',
  wide: 'max-w-[1600px]',
  narrow: 'max-w-4xl',
  full: '',
}

/**
 * Unified page layout wrapper.
 * Every top-level page should use this to ensure consistent width, centering, and padding.
 */
const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = 'default',
  className = '',
}) => {
  return (
    <div className={`p-6 mx-auto ${maxWidthClasses[maxWidth]} ${className}`}>
      {children}
    </div>
  )
}

export default PageContainer
