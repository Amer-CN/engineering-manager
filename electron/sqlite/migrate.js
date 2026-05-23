/**
 * JSON → SQLite 数据迁移脚本
 *
 * 职责：
 * 1. 读取 engineering.json 的全部数据
 * 2. 在事务中逐表写入 SQLite
 * 3. 行数校验 + 错误处理
 * 4. 迁移完成后标记 _migrations.sqliteMigratedV1
 *
 * 安全措施：
 * - 迁移前自动备份 engineering.json
 * - 整个迁移在一个事务中，失败则全部回滚
 * - 旧 JSON 数据不会被删除，可随时回退
 */
import fs from 'fs';
import log from 'electron-log';
import { getSqliteDb, getSqliteSummary } from './db-init';
// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════════
/** camelCase → snake_case */
function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, function (letter) { return "_".concat(letter.toLowerCase()); });
}
/** 安全获取嵌套属性 */
function safeGet(obj, key) {
    var _a;
    return (_a = obj === null || obj === void 0 ? void 0 : obj[key]) !== null && _a !== void 0 ? _a : null;
}
/** 将值转为 SQLite 兼容格式 */
function toSqliteValue(val) {
    if (val === undefined)
        return null;
    if (val === null)
        return null;
    if (typeof val === 'boolean')
        return val ? 1 : 0;
    if (Array.isArray(val))
        return JSON.stringify(val);
    if (typeof val === 'object')
        return JSON.stringify(val);
    return val;
}
/** 备份 JSON 数据库 */
function backupJsonDb(dbPath) {
    try {
        var backupPath = dbPath + ".pre-sqlite-migration.".concat(Date.now(), ".bak");
        fs.copyFileSync(dbPath, backupPath);
        log.info('[Migration] JSON database backed up to:', backupPath);
        return backupPath;
    }
    catch (e) {
        log.error('[Migration] Failed to backup JSON database:', e);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 迁移映射：JSON 键 → SQLite 表名
// ═══════════════════════════════════════════════════════════════════════════════
var TABLE_MIGRATIONS = [
    {
        jsonKey: 'projects',
        sqliteTable: 'projects',
        columnMap: {
            id: 'id', name: 'name', description: 'description', address: 'address',
            startDate: 'start_date', endDate: 'end_date', status: 'status',
            budget: 'budget', projectManagerId: 'project_manager_id',
            createdAt: 'created_at', updatedAt: 'updated_at',
        },
    },
    {
        jsonKey: 'departments',
        sqliteTable: 'departments',
        columnMap: {
            id: 'id', name: 'name', managerId: 'manager_id',
            positions: 'positions', createdAt: 'created_at',
        },
        defaultValues: { positions: '[]' },
    },
    {
        jsonKey: 'members',
        sqliteTable: 'members',
        columnMap: {
            id: 'id', name: 'name', phone: 'phone', email: 'email',
            memberType: 'member_type', role: 'role', workerType: 'worker_type',
            idCard: 'id_card', idCardFront: 'id_card_front', idCardBack: 'id_card_back',
            gender: 'gender', ethnicity: 'ethnicity', birthDate: 'birth_date',
            idCardAddress: 'id_card_address',
            contractFile: 'contract_file', contractFileType: 'contract_file_type',
            baseSalary: 'base_salary', socialSecurityPersonal: 'social_security_personal',
            socialSecurityCompany: 'social_security_company', housingFund: 'housing_fund',
            housingFundPersonal: 'housing_fund_personal', otherAllowances: 'other_allowances',
            companyCoversSocial: 'company_covers_social',
            teamId: 'team_id', dailyWage: 'daily_wage', entryDate: 'entry_date',
            expectedLeaveDate: 'expected_leave_date', actualLeaveDate: 'actual_leave_date',
            wageBankAccount: 'wage_bank_account', wageBankName: 'wage_bank_name',
            threeLevelEducation: 'three_level_education',
            safetyTrainingFile: 'safety_training_file',
            healthReportFile: 'health_report_file',
            specialCertificateFile: 'special_certificate_file',
            status: 'status', leaveDate: 'leave_date', reentryDate: 'reentry_date',
            remarks: 'remarks', departmentId: 'department_id', position: 'position',
            projectId: 'project_id', isTeamLeader: 'is_team_leader',
            createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'workers',
        sqliteTable: 'workers',
        columnMap: {
            id: 'id', name: 'name', idCard: 'id_card', gender: 'gender',
            birthDate: 'birth_date', ethnicity: 'ethnicity', phone: 'phone',
            address: 'address', bankAccount: 'bank_account', bankName: 'bank_name',
            bankLineNo: 'bank_line_no', workerType: 'worker_type', dailyWage: 'daily_wage',
            createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'workerTeams',
        sqliteTable: 'worker_teams',
        columnMap: {
            id: 'id', name: 'name', projectId: 'project_id', leaderId: 'leader_id',
            createdAt: 'created_at', updatedAt: 'updated_at',
        },
    },
    {
        jsonKey: 'projectWorkers',
        sqliteTable: 'project_workers',
        columnMap: {
            id: 'id', workerId: 'worker_id', projectId: 'project_id', teamId: 'team_id',
            dailyWage: 'daily_wage', workerType: 'worker_type', entryDate: 'entry_date',
            status: 'status', remarks: 'remarks', createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'workerTransferRecords',
        sqliteTable: 'worker_transfer_records',
        columnMap: {
            id: 'id', workerId: 'worker_id', fromTeamId: 'from_team_id',
            toTeamId: 'to_team_id', fromProjectId: 'from_project_id',
            toProjectId: 'to_project_id', transferDate: 'transfer_date',
            reason: 'reason', createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'projectMembers',
        sqliteTable: 'project_members',
        columnMap: {
            id: 'id', projectId: 'project_id', memberId: 'member_id', joinedAt: 'joined_at',
        },
    },
    {
        jsonKey: 'materials',
        sqliteTable: 'materials',
        columnMap: {
            id: 'id', projectId: 'project_id', name: 'name', category: 'category',
            unit: 'unit', quantity: 'quantity', price: 'price', createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'expenses',
        sqliteTable: 'expenses',
        columnMap: {
            id: 'id', projectId: 'project_id', amount: 'amount', category: 'category',
            description: 'description', date: 'date', createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'costLedger',
        sqliteTable: 'cost_ledger',
        columnMap: {
            id: 'id', projectId: 'project_id', batchId: 'batch_id',
            voucherNo: 'voucher_no', date: 'date', direction: 'direction',
            amount: 'amount', category: 'category', summary: 'summary',
            counterparty: 'counterparty', channel: 'channel',
            linkedInvoiceId: 'linked_invoice_id',
            linkedInvoiceStatus: 'linked_invoice_status',
            notes: 'notes', attachments: 'attachments',
            createdAt: 'created_at', updatedAt: 'updated_at',
        },
        defaultValues: { attachments: '[]' },
    },
    {
        jsonKey: 'costLedgerCategories',
        sqliteTable: 'cost_ledger_categories',
        columnMap: {
            id: 'id', code: 'code', label: 'label', direction: 'direction',
            color: 'color', isBuiltin: 'is_builtin', isEnabled: 'is_enabled',
            sortOrder: 'sort_order', level1: 'level1',
        },
        defaultValues: { is_builtin: 0, is_enabled: 1 },
    },
    {
        jsonKey: 'drawings',
        sqliteTable: 'drawings',
        columnMap: {
            id: 'id', projectId: 'project_id', name: 'name', category: 'category',
            filePath: 'file_path', remarks: 'remarks', position: 'position',
            createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'partners',
        sqliteTable: 'partners',
        columnMap: {
            id: 'id', name: 'name', category: 'category', contact: 'contact',
            phone: 'phone', email: 'email', address: 'address',
            bankAccount: 'bank_account', bankName: 'bank_name',
            taxNumber: 'tax_number', creditCode: 'credit_code',
            registeredAddress: 'registered_address', businessScope: 'business_scope',
            taxType: 'tax_type', licenseFile: 'license_file',
            licenseFileType: 'license_file_type',
            otherFiles: 'other_files', otherFilesType: 'other_files_type',
            projectIds: 'project_ids', remarks: 'remarks',
            createdAt: 'created_at', updatedAt: 'updated_at',
        },
        defaultValues: { project_ids: '[]' },
    },
    {
        jsonKey: 'regions',
        sqliteTable: 'regions',
        columnMap: {
            id: 'id', province: 'province', city: 'city', district: 'district',
            createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'supervisors',
        sqliteTable: 'supervisors',
        columnMap: {
            id: 'id', regionId: 'region_id', name: 'name', category: 'category',
            contact: 'contact', phone: 'phone', address: 'address',
            projectIds: 'project_ids', remarks: 'remarks',
            createdAt: 'created_at', updatedAt: 'updated_at',
        },
        defaultValues: { project_ids: '[]' },
    },
    {
        jsonKey: 'incomeContracts',
        sqliteTable: 'income_contracts',
        columnMap: {
            id: 'id', projectId: 'project_id', partnerId: 'partner_id',
            contractNo: 'contract_no', name: 'name', amount: 'amount',
            signedDate: 'signed_date', startDate: 'start_date', endDate: 'end_date',
            status: 'status', paymentMethod: 'payment_method', remarks: 'remarks',
            finalAmount: 'final_amount', settlementId: 'settlement_id',
            fileUrl: 'file_url', fileType: 'file_type',
            createdAt: 'created_at', updatedAt: 'updated_at',
        },
    },
    {
        jsonKey: 'incomeRecords',
        sqliteTable: 'income_records',
        columnMap: {
            id: 'id', contractId: 'contract_id', amount: 'amount',
            recordDate: 'record_date', payer: 'payer', remarks: 'remarks',
            createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'expenseContracts',
        sqliteTable: 'expense_contracts',
        columnMap: {
            id: 'id', projectId: 'project_id', partnerId: 'partner_id',
            contractNo: 'contract_no', name: 'name', amount: 'amount',
            signedDate: 'signed_date', startDate: 'start_date', endDate: 'end_date',
            status: 'status', paymentMethod: 'payment_method', remarks: 'remarks',
            finalAmount: 'final_amount', settlementId: 'settlement_id',
            fileUrl: 'file_url', fileType: 'file_type',
            createdAt: 'created_at', updatedAt: 'updated_at',
        },
    },
    {
        jsonKey: 'expenseRecords',
        sqliteTable: 'expense_records',
        columnMap: {
            id: 'id', contractId: 'contract_id', amount: 'amount',
            recordDate: 'record_date', payee: 'payee', remarks: 'remarks',
            createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'agreementContracts',
        sqliteTable: 'agreement_contracts',
        columnMap: {
            id: 'id', projectId: 'project_id', partnerId: 'partner_id',
            contractNo: 'contract_no', name: 'name', agreementType: 'agreement_type',
            amount: 'amount', signedDate: 'signed_date',
            startDate: 'start_date', endDate: 'end_date',
            status: 'status', remarks: 'remarks',
            finalAmount: 'final_amount', settlementId: 'settlement_id',
            fileUrl: 'file_url', fileType: 'file_type',
            createdAt: 'created_at', updatedAt: 'updated_at',
        },
    },
    {
        jsonKey: 'settlements',
        sqliteTable: 'settlements',
        columnMap: {
            id: 'id', projectId: 'project_id', contractId: 'contract_id',
            partnerId: 'partner_id', type: 'type', subType: 'sub_type',
            status: 'status', settlementNo: 'settlement_no', name: 'name',
            amount: 'amount', settlementDate: 'settlement_date',
            periodStart: 'period_start', periodEnd: 'period_end',
            submittedBy: 'submitted_by', submittedAt: 'submitted_at',
            approvedBy: 'approved_by', approvedAt: 'approved_at',
            paidAt: 'paid_at', remarks: 'remarks',
            items: 'items', files: 'files',
            fileUrl: 'file_url', fileName: 'file_name', fileType: 'file_type',
            createdAt: 'created_at', updatedAt: 'updated_at',
        },
        defaultValues: { items: '[]', files: '[]' },
    },
    {
        jsonKey: 'invoices',
        sqliteTable: 'invoices',
        columnMap: {
            id: 'id', type: 'type', status: 'status', invoiceKind: 'invoice_kind',
            invoiceNo: 'invoice_no', invoiceCode: 'invoice_code', name: 'name',
            amount: 'amount', taxAmount: 'tax_amount', priceAmount: 'price_amount',
            taxRate: 'tax_rate', issueDate: 'issue_date',
            sellerId: 'seller_id', buyerId: 'buyer_id',
            settlementId: 'settlement_id', projectId: 'project_id',
            contractId: 'contract_id', receivedAmount: 'received_amount',
            fileUrl: 'file_url', fileType: 'file_type', remarks: 'remarks',
            createdAt: 'created_at', updatedAt: 'updated_at',
        },
    },
    {
        jsonKey: 'paymentRecords',
        sqliteTable: 'payment_records',
        columnMap: {
            id: 'id', type: 'type', amount: 'amount', recordDate: 'record_date',
            projectId: 'project_id', partnerId: 'partner_id', contractId: 'contract_id',
            invoiceDetails: 'invoice_details', remarks: 'remarks',
            createdAt: 'created_at', fileUrl: 'file_url', fileType: 'file_type',
        },
        defaultValues: { invoice_details: '[]' },
    },
    {
        jsonKey: 'inventoryItems',
        sqliteTable: 'inventory_items',
        columnMap: {
            id: 'id', code: 'code', name: 'name', category: 'category',
            unit: 'unit', specifications: 'specifications',
            purchasePrice: 'purchase_price', salePrice: 'sale_price',
            currentStock: 'current_stock', minStock: 'min_stock', maxStock: 'max_stock',
            supplierId: 'supplier_id', remarks: 'remarks',
            createdAt: 'created_at', updatedAt: 'updated_at',
        },
    },
    {
        jsonKey: 'inventoryTransactions',
        sqliteTable: 'inventory_transactions',
        columnMap: {
            id: 'id', itemId: 'item_id', type: 'type', quantity: 'quantity',
            unitPrice: 'unit_price', totalAmount: 'total_amount',
            projectId: 'project_id', contractId: 'contract_id',
            counterpartyId: 'counterparty_id', transactionDate: 'transaction_date',
            documentNo: 'document_no', remarks: 'remarks', createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'attendances',
        sqliteTable: 'attendances',
        columnMap: {
            id: 'id', memberId: 'member_id', projectWorkerId: 'project_worker_id', projectId: 'project_id',
            memberName: 'member_name', yearMonth: 'year_month',
            workDays: 'work_days', daysOff: 'days_off',
            isFullAttendance: 'is_full_attendance',
            dailyStatus: 'daily_status',
            fileUrl: 'file_url', fileName: 'file_name',
            createdAt: 'created_at', updatedAt: 'updated_at',
        },
        defaultValues: { daily_status: '{}' },
    },
    {
        jsonKey: 'wages',
        sqliteTable: 'wages',
        columnMap: {
            id: 'id', projectId: 'project_id', memberId: 'member_id',
            projectWorkerId: 'project_worker_id', yearMonth: 'year_month',
            dailyWage: 'daily_wage', workDays: 'work_days', bonus: 'bonus',
            deduction: 'deduction', actualWage: 'actual_wage',
            paidAmount: 'paid_amount', paidDate: 'paid_date',
            bankReceiptPath: 'bank_receipt_path', paymentLocked: 'payment_locked',
            memberName: 'member_name', memberType: 'member_type',
            bankAccount: 'bank_account',
            createdAt: 'created_at', updatedAt: 'updated_at',
        },
    },
    {
        jsonKey: 'salaryHistory',
        sqliteTable: 'salary_history',
        columnMap: {
            id: 'id', memberId: 'member_id', effectiveDate: 'effective_date',
            baseSalary: 'base_salary', subsidy: 'subsidy',
            subsidyNote: 'subsidy_note', note: 'note', createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'wageHistory',
        sqliteTable: 'wage_history',
        columnMap: {
            id: 'id', projectWorkerId: 'project_worker_id', yearMonth: 'year_month',
            dailyWage: 'daily_wage', note: 'note', createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'users',
        sqliteTable: 'users',
        columnMap: {
            id: 'id', username: 'username', passwordHash: 'password_hash',
            passwordSalt: 'password_salt', passwordHashVersion: 'password_hash_version',
            roleId: 'role_id', status: 'status', displayName: 'display_name',
            createdAt: 'created_at', lastLoginAt: 'last_login_at',
            mustChangePassword: 'must_change_password',
            failedLoginAttempts: 'failed_login_attempts',
            lockedUntil: 'locked_until',
        },
    },
    {
        jsonKey: 'roles',
        sqliteTable: 'roles',
        columnMap: {
            id: 'id', name: 'name', description: 'description',
            isSystem: 'is_system', permissions: 'permissions',
        },
        defaultValues: { permissions: '[]' },
    },
    {
        jsonKey: 'auditLogs',
        sqliteTable: 'audit_logs',
        columnMap: {
            id: 'id', action: 'action', level: 'level',
            userId: 'user_id', userName: 'user_name',
            resourceType: 'resource_type', resourceId: 'resource_id',
            details: 'details', ipAddress: 'ip_address', createdAt: 'created_at',
        },
    },
    {
        jsonKey: 'templates',
        sqliteTable: 'templates',
        columnMap: {
            id: 'id', name: 'name', category: 'category',
            description: 'description', fileName: 'file_name',
            storedFileName: 'stored_file_name', fileType: 'file_type',
            variables: 'variables', createdAt: 'created_at', updatedAt: 'updated_at',
        },
        defaultValues: { variables: '[]' },
    },
    {
        jsonKey: 'contractTemplates',
        sqliteTable: 'contract_templates',
        columnMap: {
            id: 'id', name: 'name', type: 'type', description: 'description',
            filePath: 'file_path', fileName: 'file_name',
            variables: 'variables', createdAt: 'created_at', updatedAt: 'updated_at',
        },
        defaultValues: { variables: '[]' },
    },
    // ── 成本台账版本（批次）────────────────────────────────────────────
    {
        jsonKey: 'costLedgerBatches',
        sqliteTable: 'cost_ledger_batches',
        columnMap: {
            id: 'id',
            projectId: 'project_id',
            name: 'name',
            createdAt: 'created_at',
        },
    },
];
// ═══════════════════════════════════════════════════════════════════════════════
// 迁移主函数
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 从 JSON 数据库迁移到 SQLite
 * @param jsonData 已解析的 engineering.json 对象
 * @param jsonDbPath engineering.json 的文件路径（用于备份）
 */
export function migrateFromJson(jsonData, jsonDbPath) {
    var _a, _b, _c;
    var startTime = Date.now();
    var errors = [];
    var warnings = [];
    var totalRows = 0;
    var migratedTables = 0;
    var sqlite = getSqliteDb();
    // 1. 备份 JSON 数据库
    if (jsonDbPath && fs.existsSync(jsonDbPath)) {
        var backupPath = backupJsonDb(jsonDbPath);
        if (!backupPath) {
            errors.push('Failed to backup JSON database before migration');
            return { success: false, migratedTables: 0, totalRows: 0, verificationPassed: false, errors: errors, warnings: warnings, duration: Date.now() - startTime };
        }
    }
    // 2. 在事务中逐表迁移
    var migrateAll = sqlite.transaction(function () {
        var _loop_1 = function (migration) {
            var jsonRows = jsonData[migration.jsonKey];
            if (!Array.isArray(jsonRows)) {
                warnings.push("JSON key \"".concat(migration.jsonKey, "\" not found or not an array, skipping"));
                return "continue";
            }
            if (jsonRows.length === 0) {
                migratedTables++;
                return "continue";
            }
            try {
                // 构建 INSERT 语句
                var columns = Object.values(migration.columnMap);
                var placeholders = columns.map(function () { return '?'; }).join(', ');
                var insertSql = "INSERT OR REPLACE INTO \"".concat(migration.sqliteTable, "\" (").concat(columns.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(placeholders, ")");
                var stmt = sqlite.prepare(insertSql);
                var inserted = 0;
                var _loop_2 = function (row) {
                    try {
                        var values = Object.entries(migration.columnMap).map(function (_a) {
                            var _b;
                            var jsonField = _a[0], sqliteCol = _a[1];
                            var val = safeGet(row, jsonField);
                            // 应用默认值
                            if (val === null || val === undefined) {
                                var defaultVal = (_b = migration.defaultValues) === null || _b === void 0 ? void 0 : _b[sqliteCol];
                                if (defaultVal !== undefined) {
                                    val = defaultVal;
                                }
                            }
                            return toSqliteValue(val);
                        });
                        stmt.run.apply(stmt, values);
                        inserted++;
                    }
                    catch (rowErr) {
                        warnings.push("Table \"".concat(migration.sqliteTable, "\": row insert failed: ").concat(rowErr.message));
                    }
                };
                for (var _a = 0, jsonRows_1 = jsonRows; _a < jsonRows_1.length; _a++) {
                    var row = jsonRows_1[_a];
                    _loop_2(row);
                }
                totalRows += inserted;
                migratedTables++;
                log.info("[Migration] ".concat(migration.jsonKey, " \u2192 ").concat(migration.sqliteTable, ": ").concat(inserted, "/").concat(jsonRows.length, " rows"));
            }
            catch (tableErr) {
                errors.push("Table \"".concat(migration.sqliteTable, "\": ").concat(tableErr.message));
                log.error("[Migration] Failed to migrate ".concat(migration.jsonKey, ":"), tableErr);
            }
        };
        for (var _i = 0, TABLE_MIGRATIONS_2 = TABLE_MIGRATIONS; _i < TABLE_MIGRATIONS_2.length; _i++) {
            var migration = TABLE_MIGRATIONS_2[_i];
            _loop_1(migration);
        }
    });
    try {
        migrateAll();
    }
    catch (e) {
        errors.push("Transaction failed: ".concat(e.message));
        log.error('[Migration] Transaction failed:', e);
    }
    // 3. 迁移成本台账批次（从 costLedger 中提取唯一的 batchId+name）
    try {
        var batchRows = jsonData.costLedger || [];
        var batchMap = new Map();
        for (var _i = 0, batchRows_1 = batchRows; _i < batchRows_1.length; _i++) {
            var entry = batchRows_1[_i];
            if (entry.batchId && !batchMap.has(entry.batchId)) {
                batchMap.set(entry.batchId, "\u6279\u6B21 ".concat(entry.batchId));
            }
        }
        if (batchMap.size > 0) {
            var insertBatch = sqlite.prepare('INSERT OR IGNORE INTO cost_ledger_batches (id, project_id, name, created_at) VALUES (?, ?, ?, ?)');
            for (var _d = 0, batchMap_1 = batchMap; _d < batchMap_1.length; _d++) {
                var _e = batchMap_1[_d], batchId = _e[0], batchName = _e[1];
                insertBatch.run(batchId, 0, batchName, new Date().toISOString());
            }
            log.info("[Migration] cost_ledger_batches: ".concat(batchMap.size, " batches extracted"));
        }
    }
    catch (e) {
        warnings.push("cost_ledger_batches extraction: ".concat(e.message));
    }
    // 4. 行数校验
    var verificationPassed = true;
    var sqliteSummary = getSqliteSummary();
    for (var _f = 0, TABLE_MIGRATIONS_1 = TABLE_MIGRATIONS; _f < TABLE_MIGRATIONS_1.length; _f++) {
        var migration = TABLE_MIGRATIONS_1[_f];
        var jsonCount = (_b = (_a = jsonData[migration.jsonKey]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
        var sqliteCount = (_c = sqliteSummary[migration.sqliteTable]) !== null && _c !== void 0 ? _c : -1;
        if (jsonCount > 0 && sqliteCount !== jsonCount && sqliteCount >= 0) {
            warnings.push("Row count mismatch: ".concat(migration.jsonKey, " (JSON:").concat(jsonCount, ") \u2192 ").concat(migration.sqliteTable, " (SQLite:").concat(sqliteCount, ")"));
            verificationPassed = false;
        }
    }
    var duration = Date.now() - startTime;
    log.info("[Migration] Complete: ".concat(migratedTables, " tables, ").concat(totalRows, " rows, ").concat(duration, "ms"));
    return {
        success: errors.length === 0,
        migratedTables: migratedTables,
        totalRows: totalRows,
        verificationPassed: verificationPassed,
        errors: errors,
        warnings: warnings,
        duration: duration,
    };
}
/**
 * 检查是否已完成迁移（通过 schema_version 表标记）
 */
export function isSqliteMigrated() {
    try {
        var sqlite = getSqliteDb();
        var row = sqlite.prepare("SELECT value FROM schema_version WHERE key = 'json_migrated'").get();
        return (row === null || row === void 0 ? void 0 : row.value) === 1;
    }
    catch (_a) {
        return false;
    }
}
/**
 * 标记迁移已完成
 */
export function markMigrationComplete() {
    try {
        var sqlite = getSqliteDb();
        sqlite.prepare("INSERT OR REPLACE INTO schema_version (key, value) VALUES ('json_migrated', 1)").run();
        log.info('[Migration] Marked as complete');
    }
    catch (e) {
        log.error('[Migration] Failed to mark migration complete:', e);
    }
}
