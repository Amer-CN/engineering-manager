import React from 'react'
import { Settlement as SettlementData, Project, Partner } from '../../../types/electron'
import { formatMoney } from '@/utils/format'

interface PrintContentProps {
  settlement: SettlementData
  projects: Project[]
  partners: Partner[]
}

export const PrintContent: React.FC<PrintContentProps> = ({ settlement, projects, partners }) => (
  <div className="print-content hidden print:block">
    <div className="print-header">
      <h1 style={{ fontSize: '24pt', fontWeight: 'bold', marginBottom: '10px' }}>{settlement.name}</h1>
      <p style={{ fontSize: '12pt', color: '#666' }}>结算单号: {settlement.settlementNo}</p>
    </div>
    
    <div style={{ marginBottom: '20px' }}>
      <p><strong>项目:</strong> {projects.find(p => p.id === settlement.projectId)?.name || '-'}</p>
      <p><strong>单位:</strong> {partners.find(p => p.id === settlement.partnerId)?.name || '-'}</p>
      <p><strong>结算周期:</strong> {settlement.periodStart} 至 {settlement.periodEnd}</p>
      <p><strong>结算金额:</strong> ¥{formatMoney(settlement.amount)}</p>
    </div>

    {settlement.items && settlement.items.length > 0 && (
      <table className="print-table">
        <thead>
          <tr>
            <th>序号</th>
            <th>项目描述</th>
            <th>数量</th>
            <th>单位</th>
            <th>单价</th>
            <th>金额</th>
          </tr>
        </thead>
        <tbody>
          {settlement.items.map((item, index) => (
            <tr key={item.id}>
              <td>{index + 1}</td>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>{item.unit}</td>
              <td>¥{formatMoney(item.unitPrice)}</td>
              <td>¥{formatMoney(item.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} style={{ textAlign: 'right' }}><strong>合计:</strong></td>
            <td><strong>¥{formatMoney(settlement.amount)}</strong></td>
          </tr>
        </tfoot>
      </table>
    )}

    <div className="print-footer">
      <div className="print-signature">
        <p>提交人签字:</p>
        <p style={{ marginTop: '40px' }}>{settlement.submittedBy || '-'}</p>
        <p style={{ marginTop: '10px' }}>{settlement.submittedAt ? new Date(settlement.submittedAt).toLocaleDateString() : '-'}</p>
      </div>
      <div className="print-signature">
        <p>审核人签字:</p>
        <p style={{ marginTop: '40px' }}>{settlement.approvedBy || '-'}</p>
        <p style={{ marginTop: '10px' }}>{settlement.approvedAt ? new Date(settlement.approvedAt).toLocaleDateString() : '-'}</p>
      </div>
      <div className="print-signature">
        <p>付款人签字:</p>
        <p style={{ marginTop: '40px' }}>{settlement.paidAt ? '<Icon name="Check" size={14} className="inline-block" /> 已付款' : '-'}</p>
        <p style={{ marginTop: '10px' }}>{settlement.paidAt ? new Date(settlement.paidAt).toLocaleDateString() : '-'}</p>
      </div>
    </div>
  </div>
)

export default PrintContent