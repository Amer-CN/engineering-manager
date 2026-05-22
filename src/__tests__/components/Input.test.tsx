// @ts-nocheck
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '../../components/ui/Input'

describe('Input', () => {
  it('renders input element', () => {
    render(<Input />)
    
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('renders with label', () => {
    render(<Input label="用户名" />)
    
    expect(screen.getByLabelText('用户名')).toBeInTheDocument()
    expect(screen.getByText('用户名')).toBeInTheDocument()
  })

  it('renders required indicator when required', () => {
    render(<Input label="用户名" required />)
    
    const requiredIndicator = document.querySelector('.text-danger-500')
    expect(requiredIndicator).toBeInTheDocument()
    expect(requiredIndicator).toHaveTextContent('*')
  })

  it('applies small size', () => {
    const { container } = render(<Input size="sm" />)
    
    const input = container.querySelector('input')
    expect(input).toHaveClass('px-3')
    expect(input).toHaveClass('py-1.5')
    expect(input).toHaveClass('text-sm')
  })

  it('applies large size', () => {
    const { container } = render(<Input size="lg" />)
    
    const input = container.querySelector('input')
    expect(input).toHaveClass('px-5')
    expect(input).toHaveClass('py-3')
    expect(input).toHaveClass('text-lg')
  })

  it('applies default size by default', () => {
    const { container } = render(<Input />)
    
    const input = container.querySelector('input')
    expect(input).toHaveClass('px-4')
    expect(input).toHaveClass('py-2.5')
    expect(input).toHaveClass('text-base')
  })

  it('applies error status', () => {
    const { container } = render(<Input error="用户名不能为空" />)
    
    const input = container.querySelector('input')
    expect(input).toHaveClass('border-danger-500')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders error message', () => {
    render(<Input error="用户名不能为空" />)
    
    expect(screen.getByText('用户名不能为空')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('applies warning status', () => {
    const { container } = render(<Input status="warning" />)
    
    const input = container.querySelector('input')
    expect(input).toHaveClass('border-warning-500')
  })

  it('applies success status', () => {
    const { container } = render(<Input status="success" />)
    
    const input = container.querySelector('input')
    expect(input).toHaveClass('border-success-500')
  })

  it('renders help text when no error', () => {
    render(<Input helpText="请输入2-20个字符" />)
    
    expect(screen.getByText('请输入2-20个字符')).toBeInTheDocument()
  })

  it('does not render help text when error exists', () => {
    render(
      <Input 
        helpText="请输入2-20个字符" 
        error="用户名不能为空" 
      />
    )
    
    expect(screen.queryByText('请输入2-20个字符')).not.toBeInTheDocument()
    expect(screen.getByText('用户名不能为空')).toBeInTheDocument()
  })

  it('renders left icon', () => {
    const { container } = render(<Input leftIcon="Search" />)
    
    // 检查左侧图标容器是否存在
    const leftIconContainer = container.querySelector('.left-0')
    expect(leftIconContainer).toBeInTheDocument()
  })

  it('renders right icon', () => {
    const { container } = render(<Input rightIcon="Eye" />)
    
    // 检查右侧图标容器是否存在
    const rightIconContainer = container.querySelector('.right-0')
    expect(rightIconContainer).toBeInTheDocument()
  })

  it('applies disabled state', () => {
    const { container } = render(<Input disabled />)
    
    const input = container.querySelector('input')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:bg-slate-50')
    expect(input).toHaveClass('disabled:cursor-not-allowed')
  })

  it('forwards ref', () => {
    const ref = { current: null }
    render(<Input ref={ref} />)
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('handles onChange event', () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })
    
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('handles onBlur event', () => {
    const handleBlur = vi.fn()
    render(<Input onBlur={handleBlur} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.blur(input)
    
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    const { container } = render(<Input className="custom-input" />)
    
    const input = container.querySelector('input')
    expect(input).toHaveClass('custom-input')
  })

  it('applies containerClassName', () => {
    const { container } = render(<Input containerClassName="max-w-md" />)
    
    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('max-w-md')
  })

  it('passes through HTML attributes', () => {
    render(<Input placeholder="请输入用户名" type="email" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('placeholder', '请输入用户名')
    expect(input).toHaveAttribute('type', 'email')
  })
})
