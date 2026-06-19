/**
 * 成本台账命令
 *
 * 对应 Electron 版本的 cost-ledger.ts + cost-ledger-categories.ts
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

// ============ 成本台账条目 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostLedgerEntry {
    pub id: i64,
    pub project_id: i64,
    pub batch_id: Option<i64>,
    pub voucher_no: Option<String>,
    pub date: String,
    pub direction: String, // expense | income
    pub amount: f64,
    pub category: String,
    pub summary: Option<String>,
    pub counterparty: Option<String>,
    pub channel: Option<String>,
    pub linked_invoice_id: Option<i64>,
    pub notes: Option<String>,
    pub attachments: Option<String>, // JSON array
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

/// 获取成本台账列表
#[command]
pub fn get_cost_ledger(
    state: State<'_, AppState>,
    project_id: i64,
    batch_id: Option<i64>,
) -> AppResult<Vec<CostLedgerEntry>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let sql = if batch_id.is_some() {
        "SELECT id, project_id, batch_id, voucher_no, date, direction, amount, category,
                summary, counterparty, channel, linked_invoice_id, notes, attachments,
                created_at, updated_at
         FROM cost_ledger
         WHERE project_id = ?1 AND batch_id = ?2
         ORDER BY date DESC, id DESC"
    } else {
        "SELECT id, project_id, batch_id, voucher_no, date, direction, amount, category,
                summary, counterparty, channel, linked_invoice_id, notes, attachments,
                created_at, updated_at
         FROM cost_ledger
         WHERE project_id = ?1
         ORDER BY date DESC, id DESC"
    };

    let mut stmt = db.prepare(sql).map_err(|e| AppError::Database(e.to_string()))?;

    let entries = if let Some(bid) = batch_id {
        stmt.query_map(params![project_id, bid], |row| {
            Ok(CostLedgerEntry {
                id: row.get(0)?,
                project_id: row.get(1)?,
                batch_id: row.get(2)?,
                voucher_no: row.get(3)?,
                date: row.get(4)?,
                direction: row.get(5)?,
                amount: row.get(6)?,
                category: row.get(7)?,
                summary: row.get(8)?,
                counterparty: row.get(9)?,
                channel: row.get(10)?,
                linked_invoice_id: row.get(11)?,
                notes: row.get(12)?,
                attachments: row.get(13)?,
                created_at: row.get(14)?,
                updated_at: row.get(15)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    } else {
        stmt.query_map(params![project_id], |row| {
            Ok(CostLedgerEntry {
                id: row.get(0)?,
                project_id: row.get(1)?,
                batch_id: row.get(2)?,
                voucher_no: row.get(3)?,
                date: row.get(4)?,
                direction: row.get(5)?,
                amount: row.get(6)?,
                category: row.get(7)?,
                summary: row.get(8)?,
                counterparty: row.get(9)?,
                channel: row.get(10)?,
                linked_invoice_id: row.get(11)?,
                notes: row.get(12)?,
                attachments: row.get(13)?,
                created_at: row.get(14)?,
                updated_at: row.get(15)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    };

    Ok(entries)
}

/// 创建成本台账条目
#[command]
pub fn create_cost_ledger(
    state: State<'_, AppState>,
    entry: CostLedgerEntry,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO cost_ledger (project_id, batch_id, voucher_no, date, direction, amount,
         category, summary, counterparty, channel, linked_invoice_id, notes, attachments)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            entry.project_id,
            entry.batch_id,
            entry.voucher_no,
            entry.date,
            entry.direction,
            entry.amount,
            entry.category,
            entry.summary,
            entry.counterparty,
            entry.channel,
            entry.linked_invoice_id,
            entry.notes,
            entry.attachments,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 批量创建成本台账条目
#[command]
pub fn batch_create_cost_ledger(
    state: State<'_, AppState>,
    project_id: i64,
    entries: Vec<CostLedgerEntry>,
    batch_id: i64,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut count = 0;

    for entry in entries {
        db.execute(
            "INSERT INTO cost_ledger (project_id, batch_id, voucher_no, date, direction, amount,
             category, summary, counterparty, channel, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                project_id,
                batch_id,
                entry.voucher_no,
                entry.date,
                entry.direction,
                entry.amount,
                entry.category,
                entry.summary,
                entry.counterparty,
                entry.channel,
                entry.notes,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        count += 1;
    }

    Ok(count)
}

/// 更新成本台账条目
#[command]
pub fn update_cost_ledger(
    state: State<'_, AppState>,
    id: i64,
    changes: CostLedgerEntry,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE cost_ledger SET voucher_no = ?1, date = ?2, direction = ?3, amount = ?4,
             category = ?5, summary = ?6, counterparty = ?7, channel = ?8,
             linked_invoice_id = ?9, notes = ?10, attachments = ?11, updated_at = datetime('now')
             WHERE id = ?12",
            params![
                changes.voucher_no,
                changes.date,
                changes.direction,
                changes.amount,
                changes.category,
                changes.summary,
                changes.counterparty,
                changes.channel,
                changes.linked_invoice_id,
                changes.notes,
                changes.attachments,
                id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "台账条目 {} 不存在",
            id
        )));
    }

    Ok(())
}

/// 删除成本台账条目
#[command]
pub fn delete_cost_ledger(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM cost_ledger WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("台账条目 {} 不存在", id)));
    }

    Ok(())
}

/// 按项目删除所有台账
#[command]
pub fn delete_cost_ledger_by_project(
    state: State<'_, AppState>,
    project_id: i64,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let count = db
        .execute(
            "DELETE FROM cost_ledger WHERE project_id = ?1",
            params![project_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(count as i64)
}

// ============ 成本台账汇总 ============

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CostLedgerSummary {
    pub total_expense: f64,
    pub total_income: f64,
    pub by_category: std::collections::HashMap<String, f64>,
}

/// 获取成本台账汇总
#[command]
pub fn get_cost_ledger_summary(
    state: State<'_, AppState>,
    project_id: i64,
    batch_id: Option<i64>,
) -> AppResult<CostLedgerSummary> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let (where_clause, param_values): (String, Vec<Box<dyn rusqlite::types::ToSql>>) =
        if let Some(bid) = batch_id {
            (
                "WHERE project_id = ?1 AND batch_id = ?2".to_string(),
                vec![Box::new(project_id), Box::new(bid)],
            )
        } else {
            (
                "WHERE project_id = ?1".to_string(),
                vec![Box::new(project_id)],
            )
        };

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    // 总支出
    let total_expense: f64 = db
        .query_row(
            &format!(
                "SELECT COALESCE(SUM(amount), 0) FROM cost_ledger {} AND direction = 'expense'",
                where_clause
            ),
            param_refs.as_slice(),
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    // 总收入
    let total_income: f64 = db
        .query_row(
            &format!(
                "SELECT COALESCE(SUM(amount), 0) FROM cost_ledger {} AND direction = 'income'",
                where_clause
            ),
            param_refs.as_slice(),
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    // 按分类汇总
    let mut stmt = db
        .prepare(&format!(
            "SELECT category, SUM(amount) FROM cost_ledger {} GROUP BY category",
            where_clause
        ))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let by_category: std::collections::HashMap<String, f64> = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<std::collections::HashMap<String, f64>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(CostLedgerSummary {
        total_expense,
        total_income,
        by_category,
    })
}

// ============ 成本台账批次 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostLedgerBatch {
    pub id: i64,
    pub project_id: i64,
    pub name: String,
    pub created_at: Option<String>,
}

/// 获取批次列表
#[command]
pub fn get_cost_ledger_batches(
    state: State<'_, AppState>,
    project_id: i64,
) -> AppResult<Vec<CostLedgerBatch>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT id, project_id, name, created_at
             FROM cost_ledger_batches
             WHERE project_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let batches = stmt
        .query_map(params![project_id], |row| {
            Ok(CostLedgerBatch {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(batches)
}

/// 创建批次
#[command]
pub fn create_cost_ledger_batch(
    state: State<'_, AppState>,
    project_id: i64,
    name: String,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO cost_ledger_batches (project_id, name) VALUES (?1, ?2)",
        params![project_id, name],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 复制批次
#[command]
pub fn copy_cost_ledger_batch(
    state: State<'_, AppState>,
    project_id: i64,
    source_batch_id: i64,
    name: String,
) -> AppResult<(i64, i64)> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 创建新批次
    db.execute(
        "INSERT INTO cost_ledger_batches (project_id, name) VALUES (?1, ?2)",
        params![project_id, name],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let new_batch_id = db.last_insert_rowid();

    // 复制条目
    let count = db
        .execute(
            "INSERT INTO cost_ledger (project_id, batch_id, voucher_no, date, direction, amount,
             category, summary, counterparty, channel, notes)
             SELECT project_id, ?1, voucher_no, date, direction, amount,
             category, summary, counterparty, channel, notes
             FROM cost_ledger WHERE batch_id = ?2",
            params![new_batch_id, source_batch_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok((new_batch_id, count as i64))
}

/// 重命名批次
#[command]
pub fn rename_cost_ledger_batch(
    state: State<'_, AppState>,
    batch_id: i64,
    name: String,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE cost_ledger_batches SET name = ?1 WHERE id = ?2",
            params![name, batch_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("批次 {} 不存在", batch_id)));
    }

    Ok(())
}

/// 删除批次
#[command]
pub fn delete_cost_ledger_batch(
    state: State<'_, AppState>,
    project_id: i64,
    batch_id: i64,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 删除批次下的条目
    db.execute(
        "DELETE FROM cost_ledger WHERE batch_id = ?1",
        params![batch_id],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    // 删除批次
    let affected = db
        .execute(
            "DELETE FROM cost_ledger_batches WHERE id = ?1 AND project_id = ?2",
            params![batch_id, project_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("批次 {} 不存在", batch_id)));
    }

    Ok(())
}

// ============ 成本台账分类 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostLedgerCategory {
    pub id: i64,
    pub code: String,
    pub label: String,
    pub direction: String,
    pub color: Option<String>,
    pub is_builtin: bool,
    pub is_enabled: bool,
    pub sort_order: i32,
    pub level1: Option<String>,
}

/// 获取分类列表
#[command]
pub fn get_cost_ledger_categories(
    state: State<'_, AppState>,
    direction: Option<String>,
) -> AppResult<Vec<CostLedgerCategory>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let sql = if direction.is_some() {
        "SELECT id, code, label, direction, color, is_builtin, is_enabled, sort_order, level1
         FROM cost_ledger_categories
         WHERE direction = ?1 AND is_enabled = 1
         ORDER BY sort_order, code"
    } else {
        "SELECT id, code, label, direction, color, is_builtin, is_enabled, sort_order, level1
         FROM cost_ledger_categories
         WHERE is_enabled = 1
         ORDER BY direction, sort_order, code"
    };

    let mut stmt = db.prepare(sql).map_err(|e| AppError::Database(e.to_string()))?;

    let categories = if let Some(ref dir) = direction {
        stmt.query_map(params![dir], |row| {
            Ok(CostLedgerCategory {
                id: row.get(0)?,
                code: row.get(1)?,
                label: row.get(2)?,
                direction: row.get(3)?,
                color: row.get(4)?,
                is_builtin: row.get::<_, i32>(5)? != 0,
                is_enabled: row.get::<_, i32>(6)? != 0,
                sort_order: row.get(7)?,
                level1: row.get(8)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    } else {
        stmt.query_map([], |row| {
            Ok(CostLedgerCategory {
                id: row.get(0)?,
                code: row.get(1)?,
                label: row.get(2)?,
                direction: row.get(3)?,
                color: row.get(4)?,
                is_builtin: row.get::<_, i32>(5)? != 0,
                is_enabled: row.get::<_, i32>(6)? != 0,
                sort_order: row.get(7)?,
                level1: row.get(8)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    };

    Ok(categories)
}

/// 创建分类
#[command]
pub fn create_cost_ledger_category(
    state: State<'_, AppState>,
    label: String,
    direction: String,
    color: Option<String>,
    level1: Option<String>,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 生成 code
    let count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM cost_ledger_categories WHERE direction = ?1",
            params![direction],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let code = format!(
        "custom_{}_{}",
        if direction == "expense" { "exp" } else { "inc" },
        count + 1
    );

    db.execute(
        "INSERT INTO cost_ledger_categories (code, label, direction, color, is_builtin, is_enabled, sort_order, level1)
         VALUES (?1, ?2, ?3, ?4, 0, 1, ?5, ?6)",
        params![code, label, direction, color.unwrap_or_default(), count, level1],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新分类
#[command]
pub fn update_cost_ledger_category(
    state: State<'_, AppState>,
    id: i64,
    label: Option<String>,
    color: Option<String>,
    level1: Option<String>,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE cost_ledger_categories SET
             label = COALESCE(?1, label),
             color = COALESCE(?2, color),
             level1 = COALESCE(?3, level1)
             WHERE id = ?4",
            params![label, color, level1, id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("分类 {} 不存在", id)));
    }

    Ok(())
}

/// 删除分类
#[command]
pub fn delete_cost_ledger_category(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查是否内置分类
    let is_builtin: bool = db
        .query_row(
            "SELECT is_builtin FROM cost_ledger_categories WHERE id = ?1",
            params![id],
            |row| row.get::<_, i32>(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?
        != 0;

    if is_builtin {
        return Err(AppError::Validation(
            "不能删除内置分类".to_string(),
        ));
    }

    let affected = db
        .execute(
            "DELETE FROM cost_ledger_categories WHERE id = ?1",
            params![id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("分类 {} 不存在", id)));
    }

    Ok(())
}

/// 重置分类为内置默认
#[command]
pub fn reset_cost_ledger_categories(
    state: State<'_, AppState>,
) -> AppResult<Vec<CostLedgerCategory>> {
    {
        let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

        // 删除自定义分类
        db.execute(
            "DELETE FROM cost_ledger_categories WHERE is_builtin = 0",
            [],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        // 重新插入内置分类（如果不存在）
        let builtin_categories = get_builtin_categories();

        for cat in &builtin_categories {
            let exists: bool = db
                .query_row(
                    "SELECT COUNT(*) FROM cost_ledger_categories WHERE code = ?1",
                    params![cat.code],
                    |row| row.get::<_, i64>(0),
                )
                .map_err(|e| AppError::Database(e.to_string()))?
                > 0;

            if !exists {
                db.execute(
                    "INSERT INTO cost_ledger_categories (code, label, direction, color, is_builtin, is_enabled, sort_order, level1)
                     VALUES (?1, ?2, ?3, ?4, 1, 1, ?5, ?6)",
                    params![cat.code, cat.label, cat.direction, cat.color, cat.sort_order, cat.level1],
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            }
        }
    } // 锁在这里释放

    // 返回所有分类
    get_cost_ledger_categories(state, None)
}

/// 获取内置分类定义
fn get_builtin_categories() -> Vec<CostLedgerCategory> {
    // 这里返回内置分类，实际应该从 Electron 版本的 cost-ledger-categories-data.ts 迁移
    vec![
        CostLedgerCategory {
            id: 0,
            code: "material".to_string(),
            label: "材料费".to_string(),
            direction: "expense".to_string(),
            color: Some("#ef4444".to_string()),
            is_builtin: true,
            is_enabled: true,
            sort_order: 1,
            level1: Some("直接工程费".to_string()),
        },
        CostLedgerCategory {
            id: 0,
            code: "labor".to_string(),
            label: "人工费".to_string(),
            direction: "expense".to_string(),
            color: Some("#f97316".to_string()),
            is_builtin: true,
            is_enabled: true,
            sort_order: 2,
            level1: Some("直接工程费".to_string()),
        },
        CostLedgerCategory {
            id: 0,
            code: "machinery".to_string(),
            label: "机械费".to_string(),
            direction: "expense".to_string(),
            color: Some("#eab308".to_string()),
            is_builtin: true,
            is_enabled: true,
            sort_order: 3,
            level1: Some("直接工程费".to_string()),
        },
        CostLedgerCategory {
            id: 0,
            code: "project_income".to_string(),
            label: "项目回款".to_string(),
            direction: "income".to_string(),
            color: Some("#22c55e".to_string()),
            is_builtin: true,
            is_enabled: true,
            sort_order: 1,
            level1: Some("项目回款".to_string()),
        },
    ]
}
