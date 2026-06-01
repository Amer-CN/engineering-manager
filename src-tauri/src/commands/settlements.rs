/**
 * 结算办理命令
 *
 * 对应 Electron 版本的 settlements.ts
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settlement {
    pub id: i64,
    pub project_id: Option<i64>,
    pub contract_id: Option<i64>,
    pub partner_id: Option<i64>,
    #[serde(rename = "type")]
    pub settlement_type: String,
    pub sub_type: Option<String>,
    pub status: Option<String>,
    pub settlement_no: Option<String>,
    pub name: Option<String>,
    pub amount: f64,
    pub settlement_date: Option<String>,
    pub submitted_by: Option<String>,
    pub submitted_at: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<String>,
    pub paid_at: Option<String>,
    pub remarks: Option<String>,
    pub items: Option<String>, // JSON string
    pub files: Option<String>, // JSON string
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub project_name: Option<String>,
    pub partner_name: Option<String>,
    pub contract_name: Option<String>,
}

/// 获取结算列表
#[command]
pub fn get_settlements(
    state: State<'_, AppState>,
    project_id: Option<i64>,
) -> AppResult<Vec<Settlement>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let sql = if project_id.is_some() {
        "SELECT s.id, s.project_id, s.contract_id, s.partner_id, s.type, s.sub_type,
                s.status, s.settlement_no, s.name, s.amount, s.settlement_date,
                s.submitted_by, s.submitted_at, s.approved_by, s.approved_at, s.paid_at,
                s.remarks, s.items, s.files, s.created_at, s.updated_at,
                p.name as project_name,
                pt.name as partner_name,
                CASE WHEN s.type = 'income' THEN ic.name ELSE ec.name END as contract_name
         FROM settlements s
         LEFT JOIN projects p ON s.project_id = p.id
         LEFT JOIN partners pt ON s.partner_id = pt.id
         LEFT JOIN income_contracts ic ON s.contract_id = ic.id AND s.type = 'income'
         LEFT JOIN expense_contracts ec ON s.contract_id = ec.id AND s.type = 'expense'
         WHERE s.project_id = ?1
         ORDER BY s.created_at DESC"
    } else {
        "SELECT s.id, s.project_id, s.contract_id, s.partner_id, s.type, s.sub_type,
                s.status, s.settlement_no, s.name, s.amount, s.settlement_date,
                s.submitted_by, s.submitted_at, s.approved_by, s.approved_at, s.paid_at,
                s.remarks, s.items, s.files, s.created_at, s.updated_at,
                p.name as project_name,
                pt.name as partner_name,
                CASE WHEN s.type = 'income' THEN ic.name ELSE ec.name END as contract_name
         FROM settlements s
         LEFT JOIN projects p ON s.project_id = p.id
         LEFT JOIN partners pt ON s.partner_id = pt.id
         LEFT JOIN income_contracts ic ON s.contract_id = ic.id AND s.type = 'income'
         LEFT JOIN expense_contracts ec ON s.contract_id = ec.id AND s.type = 'expense'
         ORDER BY s.created_at DESC"
    };

    let mut stmt = db.prepare(sql).map_err(|e| AppError::Database(e.to_string()))?;

    let settlements = if let Some(pid) = project_id {
        stmt.query_map(params![pid], |row| {
            Ok(Settlement {
                id: row.get(0)?,
                project_id: row.get(1)?,
                contract_id: row.get(2)?,
                partner_id: row.get(3)?,
                settlement_type: row.get(4)?,
                sub_type: row.get(5)?,
                status: row.get(6)?,
                settlement_no: row.get(7)?,
                name: row.get(8)?,
                amount: row.get(9)?,
                settlement_date: row.get(10)?,
                submitted_by: row.get(11)?,
                submitted_at: row.get(12)?,
                approved_by: row.get(13)?,
                approved_at: row.get(14)?,
                paid_at: row.get(15)?,
                remarks: row.get(16)?,
                items: row.get(17)?,
                files: row.get(18)?,
                created_at: row.get(19)?,
                updated_at: row.get(20)?,
                project_name: row.get(21)?,
                partner_name: row.get(22)?,
                contract_name: row.get(23)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    } else {
        stmt.query_map([], |row| {
            Ok(Settlement {
                id: row.get(0)?,
                project_id: row.get(1)?,
                contract_id: row.get(2)?,
                partner_id: row.get(3)?,
                settlement_type: row.get(4)?,
                sub_type: row.get(5)?,
                status: row.get(6)?,
                settlement_no: row.get(7)?,
                name: row.get(8)?,
                amount: row.get(9)?,
                settlement_date: row.get(10)?,
                submitted_by: row.get(11)?,
                submitted_at: row.get(12)?,
                approved_by: row.get(13)?,
                approved_at: row.get(14)?,
                paid_at: row.get(15)?,
                remarks: row.get(16)?,
                items: row.get(17)?,
                files: row.get(18)?,
                created_at: row.get(19)?,
                updated_at: row.get(20)?,
                project_name: row.get(21)?,
                partner_name: row.get(22)?,
                contract_name: row.get(23)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    };

    Ok(settlements)
}

/// 创建结算
#[command]
pub fn create_settlement(
    state: State<'_, AppState>,
    settlement: Settlement,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO settlements (project_id, contract_id, partner_id, type, sub_type,
         status, settlement_no, name, amount, settlement_date, submitted_by, remarks)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            settlement.project_id,
            settlement.contract_id,
            settlement.partner_id,
            settlement.settlement_type,
            settlement.sub_type,
            settlement.status,
            settlement.settlement_no,
            settlement.name,
            settlement.amount,
            settlement.settlement_date,
            settlement.submitted_by,
            settlement.remarks,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新结算
#[command]
pub fn update_settlement(
    state: State<'_, AppState>,
    settlement: Settlement,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE settlements SET project_id = ?1, contract_id = ?2, partner_id = ?3,
             type = ?4, sub_type = ?5, status = ?6, settlement_no = ?7, name = ?8,
             amount = ?9, settlement_date = ?10, submitted_by = ?11, approved_by = ?12,
             approved_at = ?13, paid_at = ?14, remarks = ?15, items = ?16, files = ?17,
             updated_at = datetime('now')
             WHERE id = ?18",
            params![
                settlement.project_id,
                settlement.contract_id,
                settlement.partner_id,
                settlement.settlement_type,
                settlement.sub_type,
                settlement.status,
                settlement.settlement_no,
                settlement.name,
                settlement.amount,
                settlement.settlement_date,
                settlement.submitted_by,
                settlement.approved_by,
                settlement.approved_at,
                settlement.paid_at,
                settlement.remarks,
                settlement.items,
                settlement.files,
                settlement.id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "结算 {} 不存在",
            settlement.id
        )));
    }

    Ok(())
}

/// 删除结算
#[command]
pub fn delete_settlement(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM settlements WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("结算 {} 不存在", id)));
    }

    Ok(())
}

/// 办理结算（自动核验付款+发票）
#[command]
pub fn process_settlement(state: State<'_, AppState>, id: i64) -> AppResult<Vec<String>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 获取结算信息
    let settlement = db.query_row(
        "SELECT type, partner_id, amount FROM settlements WHERE id = ?1",
        params![id],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<i64>>(1)?,
                row.get::<_, f64>(2)?,
            ))
        },
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("结算 {} 不存在", id)),
        _ => AppError::Database(e.to_string()),
    })?;

    let (settlement_type, partner_id, amount) = settlement;
    let mut warnings = Vec::new();

    // 核验付款
    if let Some(pid) = partner_id {
        let paid: f64 = db.query_row(
            &format!(
                "SELECT COALESCE(SUM(amount), 0) FROM payment_records WHERE type = 'invoice_{}' AND partner_id = ?1",
                if settlement_type == "income" { "out" } else { "in" }
            ),
            params![pid],
            |row| row.get(0),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        if paid < amount {
            warnings.push(format!(
                "付款金额不足：已付 {:.2}，应收 {:.2}，差额 {:.2}",
                paid,
                amount,
                amount - paid
            ));
        }
    }

    // 更新状态为已办理
    db.execute(
        "UPDATE settlements SET status = 'completed', approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1",
        params![id],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(warnings)
}

/// 取消归档
#[command]
pub fn unarchive_settlement(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE settlements SET status = 'completed', updated_at = datetime('now') WHERE id = ?1 AND status = 'archived'",
            params![id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "结算 {} 不存在或未归档",
            id
        )));
    }

    Ok(())
}
