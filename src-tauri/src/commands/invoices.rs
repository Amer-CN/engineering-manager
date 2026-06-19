/**
 * 发票管理命令
 *
 * 对应 Electron 版本的 invoices.ts
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Invoice {
    pub id: i64,
    #[serde(rename = "type")]
    pub invoice_type: String, // invoice_in | invoice_out
    pub status: Option<String>,
    pub invoice_kind: Option<String>,
    pub invoice_no: Option<String>,
    pub invoice_code: Option<String>,
    pub name: Option<String>,
    pub amount: f64,
    pub tax_amount: f64,
    pub price_amount: f64,
    pub tax_rate: f64,
    pub issue_date: Option<String>,
    pub seller_id: Option<i64>,
    pub buyer_id: Option<i64>,
    pub settlement_id: Option<i64>,
    pub project_id: Option<i64>,
    pub contract_id: Option<i64>,
    pub received_amount: f64,
    pub file_url: Option<String>,
    pub file_type: Option<String>,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub seller_name: Option<String>,
    pub buyer_name: Option<String>,
    pub project_name: Option<String>,
}

/// 获取发票列表
#[command]
pub fn get_invoices(
    state: State<'_, AppState>,
    project_id: Option<i64>,
    invoice_type: Option<String>,
) -> AppResult<Vec<Invoice>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut sql = String::from(
        "SELECT i.id, i.type, i.status, i.invoice_kind, i.invoice_no, i.invoice_code,
                i.name, i.amount, i.tax_amount, i.price_amount, i.tax_rate, i.issue_date,
                i.seller_id, i.buyer_id, i.settlement_id, i.project_id, i.contract_id,
                i.received_amount, i.file_url, i.file_type, i.remarks, i.created_at, i.updated_at,
                s.name as seller_name,
                b.name as buyer_name,
                p.name as project_name
         FROM invoices i
         LEFT JOIN partners s ON i.seller_id = s.id
         LEFT JOIN partners b ON i.buyer_id = b.id
         LEFT JOIN projects p ON i.project_id = p.id
         WHERE 1=1"
    );

    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut param_idx = 1;

    if let Some(pid) = project_id {
        sql.push_str(&format!(" AND i.project_id = ?{}", param_idx));
        param_values.push(Box::new(pid));
        param_idx += 1;
    }

    if let Some(ref itype) = invoice_type {
        sql.push_str(&format!(" AND i.type = ?{}", param_idx));
        param_values.push(Box::new(itype.clone()));
    }

    sql.push_str(" ORDER BY i.created_at DESC");

    let mut stmt = db.prepare(&sql).map_err(|e| AppError::Database(e.to_string()))?;

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let invoices = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(Invoice {
                id: row.get(0)?,
                invoice_type: row.get(1)?,
                status: row.get(2)?,
                invoice_kind: row.get(3)?,
                invoice_no: row.get(4)?,
                invoice_code: row.get(5)?,
                name: row.get(6)?,
                amount: row.get(7)?,
                tax_amount: row.get(8)?,
                price_amount: row.get(9)?,
                tax_rate: row.get(10)?,
                issue_date: row.get(11)?,
                seller_id: row.get(12)?,
                buyer_id: row.get(13)?,
                settlement_id: row.get(14)?,
                project_id: row.get(15)?,
                contract_id: row.get(16)?,
                received_amount: row.get(17)?,
                file_url: row.get(18)?,
                file_type: row.get(19)?,
                remarks: row.get(20)?,
                created_at: row.get(21)?,
                updated_at: row.get(22)?,
                seller_name: row.get(23)?,
                buyer_name: row.get(24)?,
                project_name: row.get(25)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(invoices)
}

/// 创建发票
#[command]
pub fn create_invoice(state: State<'_, AppState>, invoice: Invoice) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO invoices (type, status, invoice_kind, invoice_no, invoice_code, name,
         amount, tax_amount, price_amount, tax_rate, issue_date, seller_id, buyer_id,
         settlement_id, project_id, contract_id, remarks)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        params![
            invoice.invoice_type,
            invoice.status,
            invoice.invoice_kind,
            invoice.invoice_no,
            invoice.invoice_code,
            invoice.name,
            invoice.amount,
            invoice.tax_amount,
            invoice.price_amount,
            invoice.tax_rate,
            invoice.issue_date,
            invoice.seller_id,
            invoice.buyer_id,
            invoice.settlement_id,
            invoice.project_id,
            invoice.contract_id,
            invoice.remarks,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新发票
#[command]
pub fn update_invoice(state: State<'_, AppState>, invoice: Invoice) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE invoices SET type = ?1, status = ?2, invoice_kind = ?3, invoice_no = ?4,
             invoice_code = ?5, name = ?6, amount = ?7, tax_amount = ?8, price_amount = ?9,
             tax_rate = ?10, issue_date = ?11, seller_id = ?12, buyer_id = ?13,
             settlement_id = ?14, project_id = ?15, contract_id = ?16, remarks = ?17,
             updated_at = datetime('now')
             WHERE id = ?18",
            params![
                invoice.invoice_type,
                invoice.status,
                invoice.invoice_kind,
                invoice.invoice_no,
                invoice.invoice_code,
                invoice.name,
                invoice.amount,
                invoice.tax_amount,
                invoice.price_amount,
                invoice.tax_rate,
                invoice.issue_date,
                invoice.seller_id,
                invoice.buyer_id,
                invoice.settlement_id,
                invoice.project_id,
                invoice.contract_id,
                invoice.remarks,
                invoice.id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("发票 {} 不存在", invoice.id)));
    }

    Ok(())
}

/// 删除发票
#[command]
pub fn delete_invoice(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM invoices WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("发票 {} 不存在", id)));
    }

    Ok(())
}

/// 更新发票状态
#[command]
pub fn update_invoice_status(
    state: State<'_, AppState>,
    id: i64,
    status: String,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE invoices SET status = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![status, id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("发票 {} 不存在", id)));
    }

    Ok(())
}

// ============ 收付款记录 ============

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
    pub project_name: Option<String>,
    pub partner_name: Option<String>,
}
