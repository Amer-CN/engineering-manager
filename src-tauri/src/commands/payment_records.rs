/**
 * 收付款记录命令
 *
 * 对应 Electron 版本的 invoices.ts（payment records section）
 * Table: payment_records(id, type, amount, record_date, project_id, partner_id,
 *        contract_id, invoice_details, remarks, file_url, file_type, created_at)
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentRecord {
    pub id: i64,
    #[serde(rename = "type")]
    pub payment_type: String,
    pub amount: f64,
    pub record_date: Option<String>,
    pub project_id: Option<i64>,
    pub partner_id: Option<i64>,
    pub contract_id: Option<i64>,
    pub invoice_details: Option<String>, // JSON string
    pub remarks: Option<String>,
    pub file_url: Option<String>,
    pub file_type: Option<String>,
    pub created_at: Option<String>,
    // JOIN enrichment
    pub project_name: Option<String>,
    pub partner_name: Option<String>,
    pub contract_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePaymentRecord {
    #[serde(rename = "type")]
    pub payment_type: String,
    pub amount: f64,
    pub record_date: String,
    pub project_id: Option<i64>,
    pub partner_id: Option<i64>,
    pub contract_id: Option<i64>,
    pub invoice_details: Option<String>,
    pub remarks: Option<String>,
    pub file_url: Option<String>,
    pub file_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePaymentRecord {
    #[serde(rename = "type")]
    pub payment_type: Option<String>,
    pub amount: Option<f64>,
    pub record_date: Option<String>,
    pub project_id: Option<i64>,
    pub partner_id: Option<i64>,
    pub contract_id: Option<i64>,
    pub invoice_details: Option<String>,
    pub remarks: Option<String>,
    pub file_url: Option<String>,
    pub file_type: Option<String>,
}

/// 获取收付款记录（可选类型+项目过滤）
#[command]
pub fn get_payment_records(
    state: State<'_, AppState>,
    payment_type: Option<String>,
    project_id: Option<i64>,
) -> AppResult<Vec<PaymentRecord>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut conditions = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(ref pt) = payment_type {
        conditions.push(format!("pr.type = ?{}", idx));
        param_values.push(Box::new(pt.clone()));
        idx += 1;
    }
    if let Some(pid) = project_id {
        conditions.push(format!("pr.project_id = ?{}", idx));
        param_values.push(Box::new(pid));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT pr.id, pr.type, pr.amount, pr.record_date, pr.project_id, pr.partner_id,
                pr.contract_id, pr.invoice_details, pr.remarks, pr.file_url, pr.file_type,
                pr.created_at,
                p.name as project_name,
                pt.name as partner_name
         FROM payment_records pr
         LEFT JOIN projects p ON pr.project_id = p.id
         LEFT JOIN partners pt ON pr.partner_id = pt.id
         {}
         ORDER BY pr.created_at DESC",
        where_clause
    );

    let mut stmt = db.prepare(&sql).map_err(|e| AppError::Database(e.to_string()))?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let records = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(PaymentRecord {
                id: row.get(0)?,
                payment_type: row.get(1)?,
                amount: row.get(2)?,
                record_date: row.get(3)?,
                project_id: row.get(4)?,
                partner_id: row.get(5)?,
                contract_id: row.get(6)?,
                invoice_details: row.get(7)?,
                remarks: row.get(8)?,
                file_url: row.get(9)?,
                file_type: row.get(10)?,
                created_at: row.get(11)?,
                project_name: row.get(12)?,
                partner_name: row.get(13)?,
                contract_name: None,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(records)
}

/// 创建收付款记录
#[command]
pub fn create_payment_record(
    state: State<'_, AppState>,
    record: CreatePaymentRecord,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO payment_records (type, amount, record_date, project_id, partner_id,
         contract_id, invoice_details, remarks)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            record.payment_type,
            record.amount,
            record.record_date,
            record.project_id,
            record.partner_id,
            record.contract_id,
            record.invoice_details,
            record.remarks.unwrap_or_default(),
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新收付款记录
#[command]
pub fn update_payment_record(
    state: State<'_, AppState>,
    id: i64,
    updates: UpdatePaymentRecord,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 查询现有记录
    let existing = db
        .query_row(
            "SELECT type, amount, record_date, project_id, partner_id,
                    contract_id, invoice_details, remarks
             FROM payment_records WHERE id = ?1",
            params![id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, f64>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<i64>>(3)?,
                    row.get::<_, Option<i64>>(4)?,
                    row.get::<_, Option<i64>>(5)?,
                    row.get::<_, Option<String>>(6)?,
                    row.get::<_, String>(7)?,
                ))
            },
        )
        .map_err(|_| AppError::NotFound(format!("收付款记录 {} 不存在", id)))?;

    let (old_type, old_amount, old_date, old_pid, old_partner, old_contract, old_details, old_remarks) =
        existing;

    let affected = db
        .execute(
            "UPDATE payment_records SET type = ?1, amount = ?2, record_date = ?3,
             project_id = ?4, partner_id = ?5, contract_id = ?6,
             invoice_details = ?7, remarks = ?8
             WHERE id = ?9",
            params![
                updates.payment_type.unwrap_or(old_type),
                updates.amount.unwrap_or(old_amount),
                updates.record_date.unwrap_or(old_date),
                updates.project_id.or(old_pid),
                updates.partner_id.or(old_partner),
                updates.contract_id.or(old_contract),
                updates.invoice_details.or(old_details),
                updates.remarks.unwrap_or(old_remarks),
                id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("收付款记录 {} 不存在", id)));
    }

    Ok(())
}

/// 删除收付款记录
#[command]
pub fn delete_payment_record(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM payment_records WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("收付款记录 {} 不存在", id)));
    }

    Ok(())
}
