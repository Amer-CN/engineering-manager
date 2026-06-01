/**
 * 费用管理命令
 *
 * 对应 Electron 版本的 expenses.ts（materials.ts 中的费用部分）
 * 表: expenses(id, project_id, amount, category, description, date, created_at)
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Expense {
    pub id: i64,
    pub project_id: i64,
    pub amount: f64,
    pub category: Option<String>,
    pub description: Option<String>,
    pub date: Option<String>,
    pub created_at: Option<String>,
    // JOIN 字段
    pub project_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewExpense {
    pub project_id: i64,
    pub amount: f64,
    pub category: Option<String>,
    pub description: Option<String>,
    pub date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseUpdate {
    pub amount: Option<f64>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub date: Option<String>,
}

/// 获取费用列表（可按项目过滤）
#[command]
pub fn get_expenses(
    state: State<'_, AppState>,
    project_id: Option<i64>,
) -> AppResult<Vec<Expense>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let sql = if project_id.is_some() {
        "SELECT e.id, e.project_id, e.amount, e.category, e.description,
                e.date, e.created_at, p.name as project_name
         FROM expenses e
         LEFT JOIN projects p ON e.project_id = p.id
         WHERE e.project_id = ?1
         ORDER BY e.date DESC, e.created_at DESC"
    } else {
        "SELECT e.id, e.project_id, e.amount, e.category, e.description,
                e.date, e.created_at, p.name as project_name
         FROM expenses e
         LEFT JOIN projects p ON e.project_id = p.id
         ORDER BY e.date DESC, e.created_at DESC"
    };

    let mut stmt = db
        .prepare(sql)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let expenses = if let Some(pid) = project_id {
        stmt.query_map(params![pid], |row| {
            Ok(Expense {
                id: row.get(0)?,
                project_id: row.get(1)?,
                amount: row.get(2)?,
                category: row.get(3)?,
                description: row.get(4)?,
                date: row.get(5)?,
                created_at: row.get(6)?,
                project_name: row.get(7)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    } else {
        stmt.query_map([], |row| {
            Ok(Expense {
                id: row.get(0)?,
                project_id: row.get(1)?,
                amount: row.get(2)?,
                category: row.get(3)?,
                description: row.get(4)?,
                date: row.get(5)?,
                created_at: row.get(6)?,
                project_name: row.get(7)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    };

    Ok(expenses)
}

/// 新增费用
#[command]
pub fn create_expense(state: State<'_, AppState>, expense: NewExpense) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO expenses (project_id, amount, category, description, date)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            expense.project_id,
            expense.amount,
            expense.category,
            expense.description,
            expense.date,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新费用
#[command]
pub fn update_expense(
    state: State<'_, AppState>,
    id: i64,
    updates: ExpenseUpdate,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE expenses SET
             amount = COALESCE(?1, amount),
             category = COALESCE(?2, category),
             description = COALESCE(?3, description),
             date = COALESCE(?4, date)
             WHERE id = ?5",
            params![updates.amount, updates.category, updates.description, updates.date, id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("费用 {} 不存在", id)));
    }

    Ok(())
}

/// 删除费用
#[command]
pub fn delete_expense(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM expenses WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("费用 {} 不存在", id)));
    }

    Ok(())
}
