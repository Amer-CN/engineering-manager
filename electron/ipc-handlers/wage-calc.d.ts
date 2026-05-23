export { parseBankReceipt } from './wage-bank-receipt';
/** 银行回单解析后的单条明细 */
export interface BankReceiptItem {
    name: string;
    amount: number;
    account?: string;
    date?: string;
    remark?: string;
}
/** 银行回单解析结果 */
export interface ParsedBankReceipt {
    date: string;
    totalAmount: number;
    successAmount: number;
    failCount: number;
    items: BankReceiptItem[];
    receiptPath: string;
    rawTextSnippet?: string;
}
export declare function getDaysInMonth(yearMonth: string): number;
export declare function calculateActualWage(dailyWage: number, workDays: number, bonus: number, deduction: number): number;
export declare function generateProjectWages(projectId: number, yearMonth: string): {
    success: boolean;
    error: string;
    data?: undefined;
    newCount?: undefined;
    archivedSkipped?: undefined;
} | {
    success: boolean;
    data: any[];
    newCount: number;
    archivedSkipped: number;
    error?: undefined;
};
