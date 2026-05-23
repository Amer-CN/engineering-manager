/**
 * 发票 & 收款记录 SQLite 查询模块
 *
 * 实现 invoices、payment_records 两张表的 CRUD 操作。
 * 包含发票状态同步逻辑。
 */
/** 列出发票（含 sellerName、buyerName、projectName、contractName、computed receivedAmount/status） */
export declare function listInvoices(type?: string): any[] | null;
/** 创建发票 */
export declare function createInvoice(invoice: any): boolean;
/** 更新发票 */
export declare function updateInvoice(invoice: any): boolean;
/** 更新发票状态 */
export declare function updateInvoiceStatus(id: number, status: string): boolean;
/** 更新发票的 receivedAmount 和 status */
export declare function updateInvoiceReceived(id: number, receivedAmount: number, status: string): boolean;
/** 删除发票 */
export declare function deleteInvoice(id: number): boolean;
/** 列出收款记录（含 projectName、partnerName、contractName、invoiceInfos） */
export declare function listPaymentRecords(type?: string): any[] | null;
/** 创建收款记录 */
export declare function createPaymentRecord(record: any): boolean;
/** 更新收款记录 */
export declare function updatePaymentRecord(record: any): boolean;
/** 删除收款记录 */
export declare function deletePaymentRecord(id: number): boolean;
/** 重新计算所有发票的 receivedAmount 和 status */
export declare function recalculateInvoiceStatusSqlite(): boolean;
