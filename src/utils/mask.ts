/**
 * PII 脱敏工具（P0-3 阶段 A）
 *
 * 不修改数据库，只在 UI 展示时脱敏：
 * - 身份证：保留前 4 + 后 4，中间 * 填充
 * - 手机号：保留前 3 + 后 4，中间 * 填充
 * - 银行卡：保留前 4 + 后 4，中间 * 填充
 * - 邮箱：保留首字符 + @ + 域名
 *
 * 数据库里的明文不动，只改显示层。
 */

export function maskIdCard(value: string | null | undefined): string {
  if (!value) return '';
  const s = String(value).trim();
  if (s.length < 8) return s; // 太短原样返回
  // 18 位身份证：前 4 + 10 个 * + 后 4
  // 15 位老身份证：前 4 + 7 个 * + 后 4
  return s.slice(0, 4) + '*'.repeat(Math.max(4, s.length - 8)) + s.slice(-4);
}

export function maskPhone(value: string | null | undefined): string {
  if (!value) return '';
  const s = String(value).trim();
  if (s.length < 7) return s;
  // 11 位手机：前 3 + 4 个 * + 后 4
  if (s.length === 11 && s.startsWith('1')) {
    return s.slice(0, 3) + '****' + s.slice(-4);
  }
  return s.slice(0, 3) + '****' + s.slice(-4);
}

export function maskBankAccount(value: string | null | undefined): string {
  if (!value) return '';
  const s = String(value).trim();
  if (s.length < 8) return s;
  // 银行卡：前 4 + 中间 * + 后 4
  const middleLen = Math.max(4, s.length - 8);
  return s.slice(0, 4) + '*'.repeat(middleLen) + s.slice(-4);
}

export function maskEmail(value: string | null | undefined): string {
  if (!value) return '';
  const s = String(value).trim();
  const atIdx = s.indexOf('@');
  if (atIdx <= 0) return s;
  const local = s.slice(0, atIdx);
  const domain = s.slice(atIdx);
  if (local.length <= 1) return s;
  return local[0] + '***' + domain;
}

/** 通用脱敏：自动识别类型 */
export function maskPII(type: 'idCard' | 'phone' | 'bankAccount' | 'email', value: string | null | undefined): string {
  switch (type) {
    case 'idCard': return maskIdCard(value);
    case 'phone': return maskPhone(value);
    case 'bankAccount': return maskBankAccount(value);
    case 'email': return maskEmail(value);
  }
}
