# 发票管理模块修复规格书

## 背景

C# 后端迁移时，发票表(invoices)和付款记录表(payment_records)的建表 SQL 与 Rust/前端期望的结构严重不一致，导致发票模块几乎所有功能异常。

## 核心问题

C# 端的表结构是"旧版本"（Electron 时代），Rust 端的表结构是"新版本"（前端基于此开发）。需要将 C# 端对齐到 Rust 端。

---

## 修复 1: invoices 表结构 (Program.cs 第 110 行)

### 现状（C# 错误版本）
```sql
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER, partner_id INTEGER, contract_id INTEGER,
    type TEXT, invoice_kind TEXT, invoice_no TEXT, invoice_code TEXT,
    name TEXT, amount REAL, price_amount REAL, tax_amount REAL, tax_rate REAL,
    issue_date TEXT, status TEXT, remarks TEXT, file_url TEXT, file_type TEXT,
    created_at TEXT, updated_at TEXT
);
```

### 目标（Rust 正确版本）
```sql
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    seller_id INTEGER,
    buyer_id INTEGER,
    contract_id INTEGER,
    type TEXT,
    invoice_kind TEXT,
    invoice_no TEXT,
    invoice_code TEXT,
    name TEXT,
    amount REAL DEFAULT 0,
    price_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    received_amount REAL DEFAULT 0,
    settlement_id INTEGER,
    issue_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

### 迁移策略（已有数据库）
在 `EnsureTables` 方法末尾添加 ALTER TABLE 语句：
```csharp
// invoices 表迁移：添加缺失列
try { db.Execute("ALTER TABLE invoices ADD COLUMN seller_id INTEGER"); } catch { }
try { db.Execute("ALTER TABLE invoices ADD COLUMN buyer_id INTEGER"); } catch { }
try { db.Execute("ALTER TABLE invoices ADD COLUMN received_amount REAL DEFAULT 0"); } catch { }
try { db.Execute("ALTER TABLE invoices ADD COLUMN settlement_id INTEGER"); } catch { }
```

---

## 修复 2: payment_records 表结构 (Program.cs 第 111 行)

### 现状（C# 错误版本）
```sql
CREATE TABLE IF NOT EXISTS payment_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER, amount REAL, date TEXT, remark TEXT, files TEXT,
    created_at TEXT, updated_at TEXT
);
```

### 目标（Rust 正确版本）
```sql
CREATE TABLE IF NOT EXISTS payment_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL DEFAULT 0,
    record_date TEXT DEFAULT '',
    project_id INTEGER,
    partner_id INTEGER,
    contract_id INTEGER,
    invoice_details TEXT DEFAULT '[]',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
```

### 迁移策略
SQLite 不支持重命名列或删除列。需要创建新表并迁移数据：
```csharp
// payment_records 表迁移
try
{
    // 检查旧表是否存在 date 列（旧结构标志）
    var hasOldSchema = db.ExecuteScalar<int>("SELECT COUNT(*) FROM pragma_table_info('payment_records') WHERE name='date'") > 0;
    if (hasOldSchema)
    {
        db.Execute(@"
            CREATE TABLE IF NOT EXISTS payment_records_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL DEFAULT 'payment_out',
                amount REAL DEFAULT 0,
                record_date TEXT DEFAULT '',
                project_id INTEGER,
                partner_id INTEGER,
                contract_id INTEGER,
                invoice_details TEXT DEFAULT '[]',
                remarks TEXT DEFAULT '',
                file_url TEXT,
                file_type TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );
            INSERT INTO payment_records_new (id, amount, record_date, remarks, created_at)
                SELECT id, amount, date, remark, created_at FROM payment_records;
            DROP TABLE payment_records;
            ALTER TABLE payment_records_new RENAME TO payment_records;
        ");
    }
}
catch { }
```

---

## 修复 3: InvoiceDto (Common.cs 第 59 行)

### 现状
```csharp
record InvoiceDto(long? Id, long? ProjectId, long? PartnerId, string? Type,
    string? InvoiceKind, string? InvoiceNo, string? InvoiceCode, string? Name,
    double? Amount, double? TaxRate, double? TaxAmount, string? IssueDate,
    string? Status, string? Remarks);
```

### 目标
```csharp
record InvoiceDto(long? Id, long? ProjectId, long? SellerId, long? BuyerId,
    long? ContractId, long? SettlementId, string? Type, string? InvoiceKind,
    string? InvoiceNo, string? InvoiceCode, string? Name,
    double? Amount, double? PriceAmount, double? TaxRate, double? TaxAmount,
    double? ReceivedAmount, string? IssueDate, string? Status, string? Remarks,
    string? FileUrl, string? FileType);
```

---

## 修复 4: InvoiceEndpoints.cs 查询和写入

### 第 21-27 行 GET 发票列表
```csharp
// 现状（引用不存在的 seller_id/buyer_id）
SELECT i.*, p.name as project_name,
       seller.name as sellerName, buyer.name as buyerName,
       CASE WHEN i.type='invoice_in' THEN seller.name ELSE buyer.name END as partner_name
FROM invoices i
LEFT JOIN partners seller ON i.seller_id=seller.id
LEFT JOIN partners buyer ON i.buyer_id=buyer.id
LEFT JOIN projects p ON i.project_id=p.id
ORDER BY i.created_at DESC

// 目标（使用正确的 seller_id/buyer_id）
// SQL 不变，因为修复 1 已经添加了 seller_id/buyer_id 列
```

### 第 35-39 行 POST 创建发票
```csharp
// 现状（缺少多个字段）
INSERT INTO invoices (project_id, partner_id, type, invoice_kind, invoice_no, invoice_code,
    name, amount, tax_rate, tax_amount, issue_date, status, remarks, created_at, updated_at)

// 目标
INSERT INTO invoices (project_id, seller_id, buyer_id, contract_id, settlement_id,
    type, invoice_kind, invoice_no, invoice_code, name,
    amount, price_amount, tax_rate, tax_amount, received_amount,
    issue_date, status, remarks, file_url, file_type, created_at, updated_at)
VALUES (@ProjectId, @SellerId, @BuyerId, @ContractId, @SettlementId,
    @Type, @InvoiceKind, @InvoiceNo, @InvoiceCode, @Name,
    @Amount, @PriceAmount, @TaxRate, @TaxAmount, @ReceivedAmount,
    @IssueDate, @Status, @Remarks, @FileUrl, @FileType, @Now, @Now)
```

### 第 49-52 行 PUT 更新发票
同样添加所有缺失字段。

---

## 修复 5: InvoiceEndpoints.cs 付款记录端点

### 第 66-78 行 GET 付款记录
```csharp
// 现状（引用不存在的 project_id/partner_id）
SELECT pr.*, p.name as project_name, pt.name as partner_name
FROM payment_records pr
LEFT JOIN projects p ON pr.project_id=p.id
LEFT JOIN partners pt ON pr.partner_id=pt.id
ORDER BY pr.created_at DESC

// 目标（修复后表结构已有 project_id/partner_id，SQL 不变）
// 但需要解析 invoice_details JSON 并序列化 invoiceInfos
```

### 第 80-88 行 POST 创建付款记录
```csharp
// 现状（引用不存在的列）
INSERT INTO payment_records (project_id, partner_id, type, amount, record_date, method, remarks, created_at, updated_at)

// 目标
INSERT INTO payment_records (type, amount, record_date, project_id, partner_id, contract_id, invoice_details, remarks, file_url, file_type, created_at)
VALUES (@Type, @Amount, @RecordDate, @ProjectId, @PartnerId, @ContractId, @InvoiceDetails, @Remarks, @FileUrl, @FileType, @Now)
```

---

## 修复 6: PaymentRecordDto (Common.cs)

需要添加或修改 PaymentRecordDto：
```csharp
record PaymentRecordDto(long? Id, string? Type, double? Amount, string? RecordDate,
    long? ProjectId, long? PartnerId, long? ContractId, string? InvoiceDetails,
    string? Remarks, string? FileUrl, string? FileType);
```

---

## 文件变更清单

| 文件 | 行号 | 修改内容 |
|------|------|----------|
| `Program.cs` | 110 | invoices 建表 SQL 对齐 Rust 版本 |
| `Program.cs` | 111 | payment_records 建表 SQL 对齐 Rust 版本 |
| `Program.cs` | EnsureTables 末尾 | 添加 ALTER TABLE 迁移语句 |
| `Common.cs` | 59 | InvoiceDto 添加缺失字段 |
| `Common.cs` | 新增 | PaymentRecordDto 更新字段 |
| `InvoiceEndpoints.cs` | 35-39 | POST invoices 添加缺失字段 |
| `InvoiceEndpoints.cs` | 49-52 | PUT invoices 添加缺失字段 |
| `InvoiceEndpoints.cs` | 80-88 | POST payment_records 适配新表结构 |
| `InvoiceEndpoints.cs` | 90-95 | PUT payment_records 适配新表结构 |

## 验证方式

1. 删除 `engineering.db` 后重启，检查 invoices 和 payment_records 表结构
2. 创建发票，检查所有字段是否正确保存
3. 创建付款记录，检查关联信息是否正确
4. 查看发票列表，检查税率、已收金额、进度条是否显示
5. 查看付款记录列表，检查关联单位、关联发票、收款比例是否显示
