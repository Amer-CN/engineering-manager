/**
 * 根据表头自动识别姓名/出勤天数/身份证号列索引
 * @returns 列索引, 未匹配返回 -1
 */
export function autoMapColumns(headers: string[]): { nameCol: number; workDaysCol: number; idCardCol: number } {
  let nameCol = -1; let workDaysCol = -1; let idCardCol = -1
  headers.forEach((h, i) => {
    const l = h.toLowerCase().replace(/\s+/g, '')
    if (nameCol === -1 && (l.includes('姓名') || l.includes('名字') || l === 'name')) nameCol = i
    if (idCardCol === -1 && (l.includes('身份证') || l.includes('证件') || l.includes('idcard'))) idCardCol = i
    if (workDaysCol === -1 && (l.includes('勤') || (l.includes('天') && l.includes('数')) || l.includes('工作量') || l.includes('计时'))) workDaysCol = i
  })
  // Fallback workDaysCol
  if (workDaysCol === -1) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].replace(/\s+/g, '')
      if (h.includes('天') || h.includes('工') && !h.includes('工资')) { workDaysCol = i; break }
    }
  }
  return { nameCol, workDaysCol, idCardCol }
}
