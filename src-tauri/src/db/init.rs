use rusqlite::{Connection, Result};

/// 创建所有表结构
/// 与 Electron 版本的 database.ts 中的 ensureDatabaseFields 对应
pub fn create_tables(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        -- 项目表
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT '',
            description TEXT DEFAULT '',
            address TEXT DEFAULT '',
            start_date TEXT DEFAULT '',
            end_date TEXT DEFAULT '',
            status TEXT DEFAULT 'planning',
            budget REAL DEFAULT 0,
            project_manager_id INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 人员表（管理人员 + 农民工）
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT '',
            phone TEXT DEFAULT '',
            email TEXT DEFAULT '',
            member_type TEXT DEFAULT 'worker',
            role TEXT DEFAULT '',
            worker_type TEXT,
            id_card TEXT DEFAULT '',
            id_card_front TEXT DEFAULT '',
            id_card_back TEXT DEFAULT '',
            gender TEXT,
            ethnicity TEXT,
            birth_date TEXT,
            id_card_address TEXT,
            contract_file TEXT DEFAULT '',
            contract_file_type TEXT DEFAULT '',
            base_salary REAL,
            social_security_personal REAL,
            social_security_company REAL,
            housing_fund REAL,
            housing_fund_personal REAL,
            other_allowances REAL,
            company_covers_social INTEGER,
            team_id INTEGER,
            daily_wage REAL,
            entry_date TEXT,
            expected_leave_date TEXT,
            actual_leave_date TEXT,
            wage_bank_account TEXT,
            wage_bank_name TEXT,
            three_level_education INTEGER,
            safety_training_file TEXT,
            health_report_file TEXT,
            special_certificate_file TEXT,
            status TEXT DEFAULT 'active',
            leave_date TEXT,
            reentry_date TEXT,
            remarks TEXT DEFAULT '',
            department_id INTEGER,
            position TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 合作单位表
        CREATE TABLE IF NOT EXISTS partners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT '',
            category TEXT DEFAULT 'other',
            contact TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            email TEXT DEFAULT '',
            address TEXT DEFAULT '',
            bank_account TEXT DEFAULT '',
            bank_name TEXT DEFAULT '',
            tax_number TEXT DEFAULT '',
            credit_code TEXT DEFAULT '',
            registered_address TEXT DEFAULT '',
            business_scope TEXT DEFAULT '',
            tax_type TEXT DEFAULT '',
            license_file TEXT DEFAULT '',
            license_file_type TEXT DEFAULT '',
            other_files TEXT DEFAULT '',
            other_files_type TEXT DEFAULT '',
            project_ids TEXT DEFAULT '[]',
            remarks TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 用户表
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL DEFAULT '',
            password_hash_version INTEGER NOT NULL DEFAULT 2,
            display_name TEXT NOT NULL DEFAULT '',
            role_id TEXT NOT NULL DEFAULT 'worker',
            status TEXT DEFAULT 'active',
            must_change_password INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            last_login_at TEXT
        );

        -- 角色权限表
        CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            permissions TEXT NOT NULL DEFAULT '[]',
            is_system INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 发票表
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            status TEXT DEFAULT 'issued',
            invoice_kind TEXT DEFAULT 'paper_regular',
            invoice_no TEXT DEFAULT '',
            invoice_code TEXT DEFAULT '',
            name TEXT DEFAULT '',
            amount REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            price_amount REAL DEFAULT 0,
            tax_rate REAL DEFAULT 0,
            issue_date TEXT DEFAULT '',
            seller_id INTEGER,
            buyer_id INTEGER,
            settlement_id INTEGER,
            project_id INTEGER,
            contract_id INTEGER,
            received_amount REAL DEFAULT 0,
            file_url TEXT,
            file_type TEXT,
            remarks TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 收付款记录表
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

        -- 收入合同表
        CREATE TABLE IF NOT EXISTS income_contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            partner_id INTEGER,
            contract_no TEXT DEFAULT '',
            name TEXT DEFAULT '',
            amount REAL DEFAULT 0,
            signed_date TEXT DEFAULT '',
            start_date TEXT DEFAULT '',
            end_date TEXT DEFAULT '',
            status TEXT DEFAULT 'draft',
            payment_method TEXT DEFAULT 'one_time',
            remarks TEXT DEFAULT '',
            final_amount REAL,
            settlement_id INTEGER,
            file_url TEXT,
            file_type TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 支出合同表
        CREATE TABLE IF NOT EXISTS expense_contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            partner_id INTEGER,
            contract_no TEXT DEFAULT '',
            name TEXT DEFAULT '',
            amount REAL DEFAULT 0,
            signed_date TEXT DEFAULT '',
            start_date TEXT DEFAULT '',
            end_date TEXT DEFAULT '',
            status TEXT DEFAULT 'draft',
            payment_method TEXT DEFAULT 'one_time',
            remarks TEXT DEFAULT '',
            final_amount REAL,
            settlement_id INTEGER,
            file_url TEXT,
            file_type TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 其他协议表
        CREATE TABLE IF NOT EXISTS agreement_contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            partner_id INTEGER,
            contract_no TEXT DEFAULT '',
            name TEXT DEFAULT '',
            agreement_type TEXT DEFAULT 'other',
            amount REAL,
            signed_date TEXT DEFAULT '',
            start_date TEXT DEFAULT '',
            end_date TEXT DEFAULT '',
            status TEXT DEFAULT 'draft',
            remarks TEXT DEFAULT '',
            final_amount REAL,
            settlement_id INTEGER,
            file_url TEXT,
            file_type TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 结算表
        CREATE TABLE IF NOT EXISTS settlements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            contract_id INTEGER,
            partner_id INTEGER,
            type TEXT NOT NULL,
            sub_type TEXT,
            status TEXT DEFAULT 'draft',
            settlement_no TEXT DEFAULT '',
            name TEXT DEFAULT '',
            amount REAL DEFAULT 0,
            settlement_date TEXT,
            period_start TEXT,
            period_end TEXT,
            submitted_by TEXT DEFAULT '',
            submitted_at TEXT DEFAULT '',
            approved_by TEXT DEFAULT '',
            approved_at TEXT DEFAULT '',
            paid_at TEXT DEFAULT '',
            remarks TEXT DEFAULT '',
            items TEXT DEFAULT '[]',
            files TEXT DEFAULT '[]',
            file_url TEXT,
            file_name TEXT,
            file_type TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 全局工人信息库
        CREATE TABLE IF NOT EXISTS workers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT '',
            id_card TEXT UNIQUE,
            gender TEXT,
            birth_date TEXT,
            ethnicity TEXT,
            phone TEXT,
            address TEXT,
            bank_account TEXT,
            bank_name TEXT,
            bank_line_no TEXT,
            worker_type TEXT,
            daily_wage REAL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 项目用工关系表
        CREATE TABLE IF NOT EXISTS project_workers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            worker_id INTEGER NOT NULL,
            project_id INTEGER NOT NULL,
            team_id INTEGER,
            daily_wage REAL DEFAULT 0,
            worker_type TEXT DEFAULT '',
            entry_date TEXT DEFAULT '',
            status TEXT DEFAULT 'active',
            remarks TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 考勤表
        CREATE TABLE IF NOT EXISTS attendances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id INTEGER,
            project_id INTEGER,
            project_worker_id INTEGER,
            year_month TEXT NOT NULL,
            work_days REAL DEFAULT 0,
            days_off INTEGER DEFAULT 0,
            is_full_attendance INTEGER DEFAULT 0,
            daily_status TEXT,
            file_url TEXT,
            file_name TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 工资表
        CREATE TABLE IF NOT EXISTS wages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            member_id INTEGER,
            project_worker_id INTEGER,
            year_month TEXT NOT NULL,
            daily_wage REAL DEFAULT 0,
            work_days REAL DEFAULT 0,
            bonus REAL DEFAULT 0,
            deduction REAL DEFAULT 0,
            actual_wage REAL DEFAULT 0,
            paid_amount REAL,
            paid_date TEXT,
            bank_receipt_path TEXT,
            payment_locked INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 审计日志表
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            username TEXT,
            action TEXT NOT NULL,
            module TEXT NOT NULL,
            target_id TEXT,
            target_name TEXT,
            details TEXT,
            ip_address TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 部门表
        CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT '',
            manager_id INTEGER,
            positions TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 薪资历史表
        CREATE TABLE IF NOT EXISTS salary_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id INTEGER NOT NULL,
            effective_date TEXT NOT NULL,
            base_salary REAL DEFAULT 0,
            subsidy REAL DEFAULT 0,
            subsidy_note TEXT DEFAULT '',
            note TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 工资历史表（工人日工资变动）
        CREATE TABLE IF NOT EXISTS wage_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_worker_id INTEGER NOT NULL,
            year_month TEXT NOT NULL,
            daily_wage REAL NOT NULL,
            note TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 模板表
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT '',
            category TEXT DEFAULT 'other',
            description TEXT DEFAULT '',
            file_name TEXT DEFAULT '',
            stored_file_name TEXT DEFAULT '',
            file_type TEXT DEFAULT 'docx',
            variables TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 成本台账分类表
        CREATE TABLE IF NOT EXISTS cost_ledger_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            label TEXT NOT NULL DEFAULT '',
            direction TEXT NOT NULL DEFAULT 'expense',
            color TEXT DEFAULT '',
            is_builtin INTEGER DEFAULT 0,
            is_enabled INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            level1 TEXT
        );

        -- 成本台账条目表
        CREATE TABLE IF NOT EXISTS cost_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            batch_id INTEGER,
            voucher_no TEXT DEFAULT '',
            date TEXT NOT NULL,
            direction TEXT NOT NULL DEFAULT 'expense',
            amount REAL NOT NULL DEFAULT 0,
            category TEXT NOT NULL DEFAULT '',
            summary TEXT DEFAULT '',
            counterparty TEXT DEFAULT '',
            channel TEXT DEFAULT '',
            linked_invoice_id INTEGER,
            notes TEXT DEFAULT '',
            attachments TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 成本台账批次表
        CREATE TABLE IF NOT EXISTS cost_ledger_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            name TEXT NOT NULL DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 成本台账匹配规则表
        CREATE TABLE IF NOT EXISTS cost_ledger_match_rules (
            keyword TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            direction TEXT NOT NULL DEFAULT 'expense',
            hit_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 进销存物料表
        CREATE TABLE IF NOT EXISTS inventory_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT DEFAULT '',
            name TEXT NOT NULL DEFAULT '',
            category TEXT DEFAULT '',
            unit TEXT DEFAULT '',
            specifications TEXT DEFAULT '',
            purchase_price REAL DEFAULT 0,
            sale_price REAL DEFAULT 0,
            current_stock REAL DEFAULT 0,
            min_stock REAL DEFAULT 0,
            max_stock REAL DEFAULT 0,
            supplier_id INTEGER,
            remarks TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 进销存交易表
        CREATE TABLE IF NOT EXISTS inventory_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            quantity REAL NOT NULL DEFAULT 0,
            unit_price REAL DEFAULT 0,
            total_amount REAL DEFAULT 0,
            project_id INTEGER,
            contract_id INTEGER,
            counterparty_id INTEGER,
            transaction_date TEXT DEFAULT '',
            document_no TEXT DEFAULT '',
            remarks TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 图纸表
        CREATE TABLE IF NOT EXISTS drawings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            name TEXT NOT NULL DEFAULT '',
            category TEXT DEFAULT '',
            file_path TEXT DEFAULT '',
            remarks TEXT DEFAULT '',
            position TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 地区表
        CREATE TABLE IF NOT EXISTS regions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            province TEXT DEFAULT '',
            city TEXT DEFAULT '',
            district TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 监管单位表
        CREATE TABLE IF NOT EXISTS supervisors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            region_id INTEGER,
            name TEXT NOT NULL DEFAULT '',
            category TEXT DEFAULT 'other',
            contact TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            address TEXT DEFAULT '',
            project_ids TEXT DEFAULT '[]',
            remarks TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 工人调动记录表
        CREATE TABLE IF NOT EXISTS worker_transfer_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            worker_id INTEGER NOT NULL,
            from_team_id INTEGER,
            to_team_id INTEGER,
            from_project_id INTEGER,
            to_project_id INTEGER,
            transfer_date TEXT DEFAULT '',
            reason TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 班组表
        CREATE TABLE IF NOT EXISTS worker_teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT '',
            project_id INTEGER NOT NULL,
            leader_id INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 项目成员关联表
        CREATE TABLE IF NOT EXISTS project_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            member_id INTEGER NOT NULL,
            joined_at TEXT DEFAULT (datetime('now')),
            left_at TEXT
        );

        -- 材料表
        CREATE TABLE IF NOT EXISTS materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            name TEXT NOT NULL DEFAULT '',
            category TEXT DEFAULT '',
            unit TEXT DEFAULT '',
            quantity REAL DEFAULT 0,
            price REAL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 费用表
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            amount REAL DEFAULT 0,
            category TEXT DEFAULT '',
            description TEXT DEFAULT '',
            date TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- 合同模板表（旧版）
        CREATE TABLE IF NOT EXISTS contract_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT '',
            type TEXT DEFAULT 'other',
            description TEXT DEFAULT '',
            file_path TEXT DEFAULT '',
            file_name TEXT DEFAULT '',
            variables TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 快照表
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            db_summary TEXT DEFAULT '{}',
            label TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- OCR 统计表
        CREATE TABLE IF NOT EXISTS ocr_stats (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            id_card INTEGER DEFAULT 0,
            invoice INTEGER DEFAULT 0,
            bank_card INTEGER DEFAULT 0,
            business_license INTEGER DEFAULT 0,
            bank_receipt INTEGER DEFAULT 0,
            permit INTEGER DEFAULT 0,
            bank_statement INTEGER DEFAULT 0,
            general_receipt INTEGER DEFAULT 0,
            company_query INTEGER DEFAULT 0,
            last_reset TEXT DEFAULT (datetime('now'))
        );

        -- 迁移跟踪表
        CREATE TABLE IF NOT EXISTS _migrations (
            key TEXT PRIMARY KEY,
            applied_at TEXT DEFAULT (datetime('now'))
        );

        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_members_type ON members(member_type);
        CREATE INDEX IF NOT EXISTS idx_members_department ON members(department_id);
        CREATE INDEX IF NOT EXISTS idx_workers_id_card ON workers(id_card);
        CREATE INDEX IF NOT EXISTS idx_project_workers_project ON project_workers(project_id);
        CREATE INDEX IF NOT EXISTS idx_project_workers_worker ON project_workers(worker_id);
        CREATE INDEX IF NOT EXISTS idx_attendances_member ON attendances(member_id);
        CREATE INDEX IF NOT EXISTS idx_attendances_project ON attendances(project_id);
        CREATE INDEX IF NOT EXISTS idx_attendances_year_month ON attendances(year_month);
        CREATE INDEX IF NOT EXISTS idx_wages_project ON wages(project_id);
        CREATE INDEX IF NOT EXISTS idx_wages_year_month ON wages(year_month);
        CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type);
        CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
        CREATE INDEX IF NOT EXISTS idx_cost_ledger_project ON cost_ledger(project_id);
        CREATE INDEX IF NOT EXISTS idx_cost_ledger_batch ON cost_ledger(batch_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
        "
    )?;

    // 为 audit_logs 添加 module 列（如果不存在）
    let has_module: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('audit_logs') WHERE name='module'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0)
        > 0;

    if !has_module {
        let _ = conn.execute("ALTER TABLE audit_logs ADD COLUMN module TEXT DEFAULT ''", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module)", []);
    }

    // 自动迁移：为 users 表添加 password_salt 和 password_hash_version 列
    let has_salt: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='password_salt'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0)
        > 0;

    if !has_salt {
        let _ = conn.execute(
            "ALTER TABLE users ADD COLUMN password_salt TEXT NOT NULL DEFAULT ''",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE users ADD COLUMN password_hash_version INTEGER NOT NULL DEFAULT 1",
            [],
        );
        log::info!("users 表已迁移：添加 password_salt + password_hash_version 列");
    }

    // 创建默认管理员账号（如果不存在）
    create_default_admin(conn)?;

    // 自动迁移：为 roles 表添加 created_at 列（Electron 旧版无此列）
    let has_created_at: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('roles') WHERE name='created_at'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0)
        > 0;

    if !has_created_at {
        let _ = conn.execute(
            "ALTER TABLE roles ADD COLUMN created_at TEXT DEFAULT (datetime('now'))",
            [],
        );
        log::info!("roles 表已迁移：添加 created_at 列");
    }

    // 创建默认角色（如果不存在）
    create_default_roles(conn)?;

    log::info!("数据库表结构初始化完成");
    Ok(())
}

/// 创建默认管理员账号
fn create_default_admin(conn: &Connection) -> Result<()> {
    let admin_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM users WHERE username = 'admin'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0)
        > 0;

    if admin_exists {
        return Ok(());
    }

    // 生成 PBKDF2-SHA512 密码（与 Electron 版本一致）
    use ring::pbkdf2;
    use std::num::NonZeroU32;

    let salt = "admin-default-salt-2026"; // 固定 salt 用于默认管理员
    let password = std::env::var("ADMIN_INITIAL_PASSWORD").unwrap_or_else(|_| {
        use rand::Rng;
        rand::thread_rng().sample_string(&rand::distributions::Alphanumeric, 16)
    });
    let iterations = NonZeroU32::new(210000).unwrap();
    let mut hash = [0u8; 64];

    pbkdf2::derive(
        pbkdf2::PBKDF2_HMAC_SHA512,
        iterations,
        salt.as_bytes(),
        password.as_bytes(),
        &mut hash,
    );

    let password_hash = hex::encode(hash);
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT OR IGNORE INTO users (id, username, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
         VALUES ('admin-001', 'admin', ?1, ?2, 2, '系统管理员', 'admin', 'active', ?3)",
        rusqlite::params![password_hash, salt, now],
    )?;

    log::info!("默认管理员账号已创建: admin（首次登录后请立即修改密码，初始密码已从环境变量 ADMIN_INITIAL_PASSWORD 读取或自动生成）");
    Ok(())
}

/// 创建默认角色及权限
fn create_default_roles(conn: &Connection) -> Result<()> {
    let roles: Vec<(&str, &str, Vec<&str>)> = vec![
        ("admin", "管理员", vec![
            "dashboard:read", "projects:create", "projects:read", "projects:update", "projects:delete",
            "contracts:create", "contracts:read", "contracts:update", "contracts:delete",
            "partners:create", "partners:read", "partners:update", "partners:delete",
            "members:create", "members:read", "members:update", "members:delete",
            "wages:create", "wages:read", "wages:update", "wages:delete",
            "settlement:create", "settlement:read", "settlement:update", "settlement:delete",
            "inventory:create", "inventory:read", "inventory:update", "inventory:delete",
            "invoices:create", "invoices:read", "invoices:update", "invoices:delete",
            "expenses:create", "expenses:read", "expenses:update", "expenses:delete",
            "costLedger:create", "costLedger:read", "costLedger:update", "costLedger:delete",
            "drawings:create", "drawings:read", "drawings:update", "drawings:delete",
            "settings:read", "settings:update",
            "users:create", "users:read", "users:update", "users:delete",
            "roles:read", "roles:update",
            "audit_logs:read", "audit_logs:export",
        ]),
        ("manager", "项目经理", vec![
            "dashboard:read", "projects:read", "projects:update",
            "contracts:read", "contracts:update",
            "partners:read", "partners:update",
            "members:read", "members:update",
            "wages:read", "wages:update",
            "settlement:read", "settlement:update",
            "inventory:read", "inventory:update",
            "invoices:read", "invoices:update",
            "expenses:read", "expenses:update",
            "costLedger:read", "costLedger:update",
            "drawings:read", "drawings:update",
            "settings:read", "users:read", "roles:read", "audit_logs:read",
        ]),
        ("accountant", "财务人员", vec![
            "dashboard:read", "projects:read",
            "contracts:read", "contracts:update",
            "partners:read", "members:read",
            "wages:create", "wages:read", "wages:update",
            "settlement:read", "settlement:update",
            "inventory:read",
            "invoices:create", "invoices:read", "invoices:update",
            "expenses:create", "expenses:read", "expenses:update",
            "costLedger:create", "costLedger:read", "costLedger:update",
            "drawings:read", "settings:read", "users:read", "roles:read",
            "audit_logs:read", "audit_logs:export",
        ]),
        ("worker", "普通员工", vec![
            "dashboard:read", "projects:read", "members:read", "wages:read", "drawings:read",
        ]),
    ];

    for (id, name, permissions) in &roles {
        let exists: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM roles WHERE id = ?1",
                rusqlite::params![id],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0)
            > 0;

        if !exists {
            let perms_json = serde_json::to_string(permissions).unwrap_or_else(|_| "[]".to_string());
            conn.execute(
                "INSERT INTO roles (id, name, permissions) VALUES (?1, ?2, ?3)",
                rusqlite::params![id, name, perms_json],
            )?;
            log::info!("默认角色已创建: {} ({})", name, id);
        }
    }

    Ok(())
}
