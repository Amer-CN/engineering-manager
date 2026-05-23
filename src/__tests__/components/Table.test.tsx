import { render, screen, fireEvent } from '@testing-library/react'
import { Table, TableColumn } from '../../components/ui/Table'

interface TestRecord {
  id: number
  name: string
  age: number
  [key: string]: unknown
}

const mockColumns: TableColumn<TestRecord>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名' },
  { key: 'age', title: '年龄', align: 'right' },
]

const mockData: TestRecord[] = [
  { id: 1, name: '张三', age: 25 },
  { id: 2, name: '李四', age: 30 },
]

describe('Table', () => {
  it('renders table with columns and data', () => {
    render(<Table columns={mockColumns} data={mockData} rowKey="id" />)
    
    // 检查列标题
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('姓名')).toBeInTheDocument()
    expect(screen.getByText('年龄')).toBeInTheDocument()
    
    // 检查数据行
    expect(screen.getByText('张三')).toBeInTheDocument()
    expect(screen.getByText('李四')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('renders empty text when data is empty', () => {
    render(<Table columns={mockColumns} data={[]} rowKey="id" />)
    
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('renders custom empty text', () => {
    render(
      <Table 
        columns={mockColumns} 
        data={[]} 
        rowKey="id"
        emptyText="没有找到数据"
      />
    )
    
    expect(screen.getByText('没有找到数据')).toBeInTheDocument()
  })

  it('renders loading skeleton when loading is true', () => {
    const { container } = render(
      <Table columns={mockColumns} data={mockData} rowKey="id" loading={true} />
    )
    
    // 检查骨架屏（animate-pulse 元素）
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('calls onRowClick when row is clicked', () => {
    const handleRowClick = vi.fn()
    
    render(
      <Table 
        columns={mockColumns} 
        data={mockData} 
        rowKey="id"
        onRowClick={handleRowClick}
      />
    )
    
    // 点击第一行的姓名单元格
    fireEvent.click(screen.getByText('张三'))
    
    expect(handleRowClick).toHaveBeenCalledTimes(1)
    expect(handleRowClick).toHaveBeenCalledWith(mockData[0], 0)
  })

  it('does not call onRowClick when not provided', () => {
    const { container } = render(
      <Table columns={mockColumns} data={mockData} rowKey="id" />
    )
    
    // 行不应该有 cursor-pointer 类
    const rows = container.querySelectorAll('tbody tr')
    expect(rows[0]).not.toHaveClass('cursor-pointer')
  })

  it('renders with custom rowKey function', () => {
    const customRowKey = (record: TestRecord) => `user-${record.id}`
    
    const { container } = render(
      <Table 
        columns={mockColumns} 
        data={mockData} 
        rowKey={customRowKey}
      />
    )
    
    // 检查 row key 是否正确应用（通过 data-key 或类似属性）
    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)
  })

  it('applies compact size', () => {
    const { container } = render(
      <Table columns={mockColumns} data={mockData} rowKey="id" size="compact" />
    )
    
    // 检查是否有 compact 的 padding 类
    const cells = container.querySelectorAll('td, th')
    expect(cells[0]).toHaveClass('px-3')
    expect(cells[0]).toHaveClass('py-2')
  })

  it('applies spacious size', () => {
    const { container } = render(
      <Table columns={mockColumns} data={mockData} rowKey="id" size="spacious" />
    )
    
    // 检查是否有 spacious 的 padding 类
    const cells = container.querySelectorAll('td, th')
    expect(cells[0]).toHaveClass('px-5')
    expect(cells[0]).toHaveClass('py-4')
  })

  it('applies bordered style', () => {
    const { container } = render(
      <Table columns={mockColumns} data={mockData} rowKey="id" bordered={true} />
    )
    
    // 检查外层 div 是否有 border 类
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('border')
    expect(wrapper).toHaveClass('border-slate-200')
  })

  it('renders column with render function', () => {
    const columnsWithRender: TableColumn<TestRecord>[] = [
      { key: 'id', title: 'ID' },
      { 
        key: 'name', 
        title: '姓名',
        render: (value) => <span className="font-bold">{String(value)}</span>
      },
      { key: 'age', title: '年龄' },
    ]
    
    render(<Table columns={columnsWithRender} data={mockData} rowKey="id" />)
    
    // 检查 render 函数是否正确应用
    const boldName = document.querySelector('.font-bold')
    expect(boldName).toBeInTheDocument()
    expect(boldName).toHaveTextContent('张三')
  })

  it('renders dash for null or undefined values', () => {
    const dataWithNull: TestRecord[] = [
      { id: 1, name: '张三', age: null as any },
      { id: 2, name: undefined as any, age: 30 },
    ]
    
    render(<Table columns={mockColumns} data={dataWithNull} rowKey="id" />)
    
    // null 和 undefined 应该显示为 '-'
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('applies sticky header', () => {
    const { container } = render(
      <Table columns={mockColumns} data={mockData} rowKey="id" stickyHeader={true} />
    )
    
    const thead = container.querySelector('thead')
    expect(thead).toHaveClass('sticky')
    expect(thead).toHaveClass('top-0')
    expect(thead).toHaveClass('z-10')
  })

  it('does not apply hover class when hoverable is false', () => {
    const { container } = render(
      <Table columns={mockColumns} data={mockData} rowKey="id" hoverable={false} />
    )
    
    const rows = container.querySelectorAll('tbody tr')
    expect(rows[0]).not.toHaveClass('table-row-hover')
  })
})
