/**
 * 薪资历史命令
 *
 * 对应 Electron 版本的 salary-history.ts
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SalaryHistoryEntry {
    pub id: i64,
    pub member_id: i64,
    pub effective_date: String,
    pub base_salary: f64,
    pub subsidy: f64,
    pub subsidy_note: Option<String>,
    pub note: Option<String>,
    pub created_at: Option<String>,
}

/// 获取成员薪资历史
#[command]
pub fn get_salary_history(
    state: State<'_, AppState>,
    member_id: i64,
) -> AppResult<Vec<SalaryHistoryEntry>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT id, member_id, effective_date, base_salary, subsidy, subsidy_note, note, created_at
             FROM salary_history
             WHERE member_id = ?1
             ORDER BY effective_date DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let entries = stmt
        .query_map(params![member_id], |row| {
            Ok(SalaryHistoryEntry {
                id: row.get(0)?,
                member_id: row.get(1)?,
                effective_date: row.get(2)?,
                base_salary: row.get(3)?,
                subsidy: row.get(4)?,
                subsidy_note: row.get(5)?,
                note: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(entries)
}

/// 创建薪资历史
#[command]
pub fn create_salary_history(
    state: State<'_, AppState>,
    entry: SalaryHistoryEntry,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO salary_history (member_id, effective_date, base_salary, subsidy, subsidy_note, note)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            entry.member_id,
            entry.effective_date,
            entry.base_salary,
            entry.subsidy,
            entry.subsidy_note,
            entry.note,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 删除薪资历史
#[command]
pub fn delete_salary_history(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM salary_history WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("薪资记录 {} 不存在", id)));
    }

    Ok(())
}

/// 获取生效薪资（按月份匹配）
#[command]
pub fn get_effective_salary(
    state: State<'_, AppState>,
    member_id: i64,
    year_month: String,
) -> AppResult<Option<SalaryHistoryEntry>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 查找该月份之前最近的薪资记录
    let result = db.query_row(
        "SELECT id, member_id, effective_date, base_salary, subsidy, subsidy_note, note, created_at
         FROM salary_history
         WHERE member_id = ?1 AND effective_date <= ?2
         ORDER BY effective_date DESC
         LIMIT 1",
        params![member_id, format!("{}-01", year_month)],
        |row| {
            Ok(SalaryHistoryEntry {
                id: row.get(0)?,
                member_id: row.get(1)?,
                effective_date: row.get(2)?,
                base_salary: row.get(3)?,
                subsidy: row.get(4)?,
                subsidy_note: row.get(5)?,
                note: row.get(6)?,
                created_at: row.get(7)?,
            })
        },
    );

    match result {
        Ok(entry) => Ok(Some(entry)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

// ============ 工人工资历史 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WageHistoryEntry {
    pub id: i64,
    pub project_worker_id: i64,
    pub year_month: String,
    pub daily_wage: f64,
    pub note: Option<String>,
    pub created_at: Option<String>,
}

/// 获取工人工资历史
#[command]
pub fn get_wage_history(
    state: State<'_, AppState>,
    project_worker_id: i64,
) -> AppResult<Vec<WageHistoryEntry>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT id, project_worker_id, year_month, daily_wage, note, created_at
             FROM wage_history
             WHERE project_worker_id = ?1
             ORDER BY year_month DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let entries = stmt
        .query_map(params![project_worker_id], |row| {
            Ok(WageHistoryEntry {
                id: row.get(0)?,
                project_worker_id: row.get(1)?,
                year_month: row.get(2)?,
                daily_wage: row.get(3)?,
                note: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(entries)
}

/// 保存工人工资历史
#[command]
pub fn save_wage_history(
    state: State<'_, AppState>,
    project_worker_id: i64,
    year_month: String,
    daily_wage: f64,
    note: Option<String>,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查是否已存在
    let exists: bool = db
        .query_row(
            "SELECT COUNT(*) FROM wage_history WHERE project_worker_id = ?1 AND year_month = ?2",
            params![project_worker_id, year_month],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?
        > 0;

    if exists {
        // 更新
        db.execute(
            "UPDATE wage_history SET daily_wage = ?1, note = ?2 WHERE project_worker_id = ?3 AND year_month = ?4",
            params![daily_wage, note, project_worker_id, year_month],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
    } else {
        // 插入
        db.execute(
            "INSERT INTO wage_history (project_worker_id, year_month, daily_wage, note)
             VALUES (?1, ?2, ?3, ?4)",
            params![project_worker_id, year_month, daily_wage, note],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
    }

    Ok(())
}

/// 删除工人工资历史
#[command]
pub fn delete_wage_history(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM wage_history WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("工资记录 {} 不存在", id)));
    }

    Ok(())
}

/// 获取生效工资（按月份匹配）
#[command]
pub fn get_effective_wage(
    state: State<'_, AppState>,
    project_worker_id: i64,
    year_month: String,
) -> AppResult<Option<WageHistoryEntry>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let result = db.query_row(
        "SELECT id, project_worker_id, year_month, daily_wage, note, created_at
         FROM wage_history
         WHERE project_worker_id = ?1 AND year_month <= ?2
         ORDER BY year_month DESC
         LIMIT 1",
        params![project_worker_id, year_month],
        |row| {
            Ok(WageHistoryEntry {
                id: row.get(0)?,
                project_worker_id: row.get(1)?,
                year_month: row.get(2)?,
                daily_wage: row.get(3)?,
                note: row.get(4)?,
                created_at: row.get(5)?,
            })
        },
    );

    match result {
        Ok(entry) => Ok(Some(entry)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}
