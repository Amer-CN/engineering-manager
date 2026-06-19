/**
 * 合同管理命令
 *
 * 对应 Electron 版本的 contracts.ts
 * 包含收入合同、支出合同、其他协议
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

// ============ 收入合同 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncomeContract {
    pub id: Option<i64>,
    pub project_id: Option<i64>,
    pub partner_id: Option<i64>,
    pub contract_no: Option<String>,
    pub name: Option<String>,
    pub amount: f64,
    pub signed_date: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<String>,
    pub payment_method: Option<String>,
    pub remarks: Option<String>,
    pub final_amount: Option<f64>,
    pub settlement_id: Option<i64>,
    pub file_url: Option<String>,
    pub file_type: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub project_name: Option<String>,
    pub partner_name: Option<String>,
}

/// 获取收入合同列表
#[command]
pub fn get_income_contracts(
    state: State<'_, AppState>,
    project_id: Option<i64>,
) -> AppResult<Vec<IncomeContract>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let sql = if project_id.is_some() {
        "SELECT c.id, c.project_id, c.partner_id, c.contract_no, c.name, c.amount,
                c.signed_date, c.start_date, c.end_date, c.status, c.payment_method,
                c.remarks, c.final_amount, c.settlement_id, c.file_url, c.file_type,
                c.created_at, c.updated_at,
                p.name as project_name,
                pt.name as partner_name
         FROM income_contracts c
         LEFT JOIN projects p ON c.project_id = p.id
         LEFT JOIN partners pt ON c.partner_id = pt.id
         WHERE c.project_id = ?1
         ORDER BY c.created_at DESC"
    } else {
        "SELECT c.id, c.project_id, c.partner_id, c.contract_no, c.name, c.amount,
                c.signed_date, c.start_date, c.end_date, c.status, c.payment_method,
                c.remarks, c.final_amount, c.settlement_id, c.file_url, c.file_type,
                c.created_at, c.updated_at,
                p.name as project_name,
                pt.name as partner_name
         FROM income_contracts c
         LEFT JOIN projects p ON c.project_id = p.id
         LEFT JOIN partners pt ON c.partner_id = pt.id
         ORDER BY c.created_at DESC"
    };

    let mut stmt = db.prepare(sql).map_err(|e| AppError::Database(e.to_string()))?;

    let contracts = if let Some(pid) = project_id {
        stmt.query_map(params![pid], |row| {
            Ok(IncomeContract {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                partner_id: row.get(2)?,
                contract_no: row.get(3)?,
                name: row.get(4)?,
                amount: row.get(5)?,
                signed_date: row.get(6)?,
                start_date: row.get(7)?,
                end_date: row.get(8)?,
                status: row.get(9)?,
                payment_method: row.get(10)?,
                remarks: row.get(11)?,
                final_amount: row.get(12)?,
                settlement_id: row.get(13)?,
                file_url: row.get(14)?,
                file_type: row.get(15)?,
                created_at: row.get(16)?,
                updated_at: row.get(17)?,
                project_name: row.get(18)?,
                partner_name: row.get(19)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    } else {
        stmt.query_map([], |row| {
            Ok(IncomeContract {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                partner_id: row.get(2)?,
                contract_no: row.get(3)?,
                name: row.get(4)?,
                amount: row.get(5)?,
                signed_date: row.get(6)?,
                start_date: row.get(7)?,
                end_date: row.get(8)?,
                status: row.get(9)?,
                payment_method: row.get(10)?,
                remarks: row.get(11)?,
                final_amount: row.get(12)?,
                settlement_id: row.get(13)?,
                file_url: row.get(14)?,
                file_type: row.get(15)?,
                created_at: row.get(16)?,
                updated_at: row.get(17)?,
                project_name: row.get(18)?,
                partner_name: row.get(19)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    };

    Ok(contracts)
}

/// 创建收入合同
#[command]
pub fn create_income_contract(
    state: State<'_, AppState>,
    contract: IncomeContract,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO income_contracts (project_id, partner_id, contract_no, name, amount,
         signed_date, start_date, end_date, status, payment_method, remarks)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            contract.project_id,
            contract.partner_id,
            contract.contract_no,
            contract.name,
            contract.amount,
            contract.signed_date,
            contract.start_date,
            contract.end_date,
            contract.status,
            contract.payment_method,
            contract.remarks,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新收入合同
#[command]
pub fn update_income_contract(
    state: State<'_, AppState>,
    contract: IncomeContract,
) -> AppResult<()> {
    let id = contract.id.ok_or_else(|| AppError::Validation("更新收入合同需要 id".into()))?;
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE income_contracts SET project_id = ?1, partner_id = ?2, contract_no = ?3,
             name = ?4, amount = ?5, signed_date = ?6, start_date = ?7, end_date = ?8,
             status = ?9, payment_method = ?10, remarks = ?11, final_amount = ?12,
             settlement_id = ?13, updated_at = datetime('now')
             WHERE id = ?14",
            params![
                contract.project_id,
                contract.partner_id,
                contract.contract_no,
                contract.name,
                contract.amount,
                contract.signed_date,
                contract.start_date,
                contract.end_date,
                contract.status,
                contract.payment_method,
                contract.remarks,
                contract.final_amount,
                contract.settlement_id,
                id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "收入合同 {} 不存在",
            id
        )));
    }

    Ok(())
}

/// 删除收入合同
#[command]
pub fn delete_income_contract(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM income_contracts WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("收入合同 {} 不存在", id)));
    }

    Ok(())
}

// ============ 支出合同（结构类似，省略详细实现） ============

/// 支出合同类型（复用收入合同结构）
pub type ExpenseContract = IncomeContract;

/// 获取支出合同列表
#[command]
pub fn get_expense_contracts(
    state: State<'_, AppState>,
    project_id: Option<i64>,
) -> AppResult<Vec<ExpenseContract>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let sql = if project_id.is_some() {
        "SELECT c.id, c.project_id, c.partner_id, c.contract_no, c.name, c.amount,
                c.signed_date, c.start_date, c.end_date, c.status, c.payment_method,
                c.remarks, c.final_amount, c.settlement_id, c.file_url, c.file_type,
                c.created_at, c.updated_at,
                p.name as project_name,
                pt.name as partner_name
         FROM expense_contracts c
         LEFT JOIN projects p ON c.project_id = p.id
         LEFT JOIN partners pt ON c.partner_id = pt.id
         WHERE c.project_id = ?1
         ORDER BY c.created_at DESC"
    } else {
        "SELECT c.id, c.project_id, c.partner_id, c.contract_no, c.name, c.amount,
                c.signed_date, c.start_date, c.end_date, c.status, c.payment_method,
                c.remarks, c.final_amount, c.settlement_id, c.file_url, c.file_type,
                c.created_at, c.updated_at,
                p.name as project_name,
                pt.name as partner_name
         FROM expense_contracts c
         LEFT JOIN projects p ON c.project_id = p.id
         LEFT JOIN partners pt ON c.partner_id = pt.id
         ORDER BY c.created_at DESC"
    };

    let mut stmt = db.prepare(sql).map_err(|e| AppError::Database(e.to_string()))?;

    let contracts = if let Some(pid) = project_id {
        stmt.query_map(params![pid], |row| {
            Ok(IncomeContract {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                partner_id: row.get(2)?,
                contract_no: row.get(3)?,
                name: row.get(4)?,
                amount: row.get(5)?,
                signed_date: row.get(6)?,
                start_date: row.get(7)?,
                end_date: row.get(8)?,
                status: row.get(9)?,
                payment_method: row.get(10)?,
                remarks: row.get(11)?,
                final_amount: row.get(12)?,
                settlement_id: row.get(13)?,
                file_url: row.get(14)?,
                file_type: row.get(15)?,
                created_at: row.get(16)?,
                updated_at: row.get(17)?,
                project_name: row.get(18)?,
                partner_name: row.get(19)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    } else {
        stmt.query_map([], |row| {
            Ok(IncomeContract {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                partner_id: row.get(2)?,
                contract_no: row.get(3)?,
                name: row.get(4)?,
                amount: row.get(5)?,
                signed_date: row.get(6)?,
                start_date: row.get(7)?,
                end_date: row.get(8)?,
                status: row.get(9)?,
                payment_method: row.get(10)?,
                remarks: row.get(11)?,
                final_amount: row.get(12)?,
                settlement_id: row.get(13)?,
                file_url: row.get(14)?,
                file_type: row.get(15)?,
                created_at: row.get(16)?,
                updated_at: row.get(17)?,
                project_name: row.get(18)?,
                partner_name: row.get(19)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    };

    Ok(contracts)
}

/// 创建支出合同
#[command]
pub fn create_expense_contract(
    state: State<'_, AppState>,
    contract: ExpenseContract,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO expense_contracts (project_id, partner_id, contract_no, name, amount,
         signed_date, start_date, end_date, status, payment_method, remarks)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            contract.project_id,
            contract.partner_id,
            contract.contract_no,
            contract.name,
            contract.amount,
            contract.signed_date,
            contract.start_date,
            contract.end_date,
            contract.status,
            contract.payment_method,
            contract.remarks,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新支出合同
#[command]
pub fn update_expense_contract(
    state: State<'_, AppState>,
    contract: ExpenseContract,
) -> AppResult<()> {
    let id = contract.id.ok_or_else(|| AppError::Validation("更新支出合同需要 id".into()))?;
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE expense_contracts SET project_id = ?1, partner_id = ?2, contract_no = ?3,
             name = ?4, amount = ?5, signed_date = ?6, start_date = ?7, end_date = ?8,
             status = ?9, payment_method = ?10, remarks = ?11, final_amount = ?12,
             settlement_id = ?13, updated_at = datetime('now')
             WHERE id = ?14",
            params![
                contract.project_id,
                contract.partner_id,
                contract.contract_no,
                contract.name,
                contract.amount,
                contract.signed_date,
                contract.start_date,
                contract.end_date,
                contract.status,
                contract.payment_method,
                contract.remarks,
                contract.final_amount,
                contract.settlement_id,
                id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "支出合同 {} 不存在",
            id
        )));
    }

    Ok(())
}

/// 删除支出合同
#[command]
pub fn delete_expense_contract(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM expense_contracts WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("支出合同 {} 不存在", id)));
    }

    Ok(())
}

// ============ 合同统计 ============

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractStats {
    pub income_count: i64,
    pub income_total: f64,
    pub income_received: f64,
    pub expense_count: i64,
    pub expense_total: f64,
    pub expense_paid: f64,
    pub agreement_count: i64,
    pub net_income: f64,
    pub net_received: f64,
}

/// 获取合同统计
#[command]
pub fn get_contract_stats(state: State<'_, AppState>) -> AppResult<ContractStats> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let income_count: i64 = db
        .query_row("SELECT COUNT(*) FROM income_contracts", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let income_total: f64 = db
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM income_contracts",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let expense_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM expense_contracts",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let expense_total: f64 = db
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM expense_contracts",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let agreement_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM agreement_contracts",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    // 计算已收款（从 payment_records）
    let income_received: f64 = db
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM payment_records WHERE type = 'invoice_out'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let expense_paid: f64 = db
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM payment_records WHERE type = 'invoice_in'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(ContractStats {
        income_count,
        income_total,
        income_received,
        expense_count,
        expense_total,
        expense_paid,
        agreement_count,
        net_income: income_total - expense_total,
        net_received: income_received - expense_paid,
    })
}
