import type { ParsedBankReceipt } from './wage-calc';
/**
 * 解析银行回单PDF：复制到uploads → Python pypdf提取文本 → 解析 → 返回结构化数据。
 * 从 wage-calc.ts 提取，独立维护。
 */
export declare function parseBankReceipt(sourcePath: string, projectName?: string | null, yearMonth?: string): Promise<{
    success: boolean;
    data?: ParsedBankReceipt;
    error?: string;
}>;
