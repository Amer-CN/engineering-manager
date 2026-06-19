/**
 * 工资管理扩展命令
 *
 * 对应 Electron 版本的 wages.ts（wages-batch.ts + wager-queries.ts 中的额外命令）
 * 补充 wages.rs 中未包含的：发放记录、逾期统计、批量归档、批量保存
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

// ============ 类型定义 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WagePaymentRecord {
    pub id: i64,
    pub project_id: Option<i64>,
    pub project_worker_id: Option<i64>,
    pub year_month: String,
    pub daily_wage: f64,
    pub work_days: f64,
    pub bonus: f64,
    pub deduction: f64,
    pub actual_wage: f64,
    pub paid_amount: Option<f64>,
    pub paid_date: Option<String>,
    pub bank_receipt_path: Option<String>,
    pub payment_locked: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    // JOIN enrichment
    pub worker_name: Option<String>,
    pub worker_type: Option<String>,
    pub team_name: Option<String>,
    pub bank_account: Option<String>,
    pub project_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverdueStats {
    pub total_overdue: i64,
    pub total_amount: f64,
    pub project_breakdown: Vec<OverdueProjectStat>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverdueProjectStat {
    pub project_id: i64,
    pub project_name: String,
    pub overdue_count: i64,
    pub overdue_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverdueWage {
    pub id: i64,
    pub project_id: Option<i64>,
    pub project_worker_id: Option<i64>,
    pub year_month: String,
    pub actual_wage: f64,
    pub worker_name: Option<String>,
    pub team_name: Option<String>,
    pub project_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchSaveWage {
    pub project_id: Option<i64>,
    pub project_worker_id: Option<i64>,
    pub year_month: String,
    pub daily_wage: Option<f64>,
    pub work_days: Option<f64>,
    pub bonus: Option<f64>,
    pub deduction: Option<f64>,
    pub actual_wage: Option<f64>,
    pub paid_amount: Option<f64>,
    pub paid_date: Option<String>,
}

// ============ 工具函数 ============

fn calculate_actual_wage(daily_wage: f64, work_days: f64, bonus: f64, deduction: f64) -> f64 {
    ((daily_wage * work_days + bonus - deduction) * 100.0).round() / 100.0
}

// ============ 命令实现 ============

/// 获取工资发放记录（带工人信息，用于工资发放记录 Tab）
#[command]
pub fn get_wage_payment_records(
    state: State<'_, AppState>,
    project_id: Option<i64>,
    year_month: Option<String>,
) -> AppResult<Vec<WagePaymentRecord>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut conditions = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(pid) = project_id {
        conditions.push(format!("w.project_id = ?{}", idx));
        param_values.push(Box::new(pid));
        idx += 1;
    }
    if let Some(ref ym) = year_month {
        conditions.push(format!("w.year_month = ?{}", idx));
        param_values.push(Box::new(ym.clone()));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT w.id, w.project_id, w.project_worker_id,
               w.year_month, w.daily_wage, w.work_days, w.bonus, w.deduction,
               w.actual_wage, w.paid_amount, w.paid_date, w.bank_receipt_path,
               w.payment_locked, w.created_at, w.updated_at,
               COALESCE(wr.name, m.name) as worker_name,
               COALESCE(pw.worker_type, wr.worker_type) as worker_type,
               wt.name as team_name,
               COALESCE(wr.bank_account, m.wage_bank_account) as bank_account,
               p.name as project_name
        FROM wages w
        LEFT JOIN project_workers pw ON w.project_worker_id = pw.id
        LEFT JOIN workers wr ON pw.worker_id = wr.id
        LEFT JOIN worker_teams wt ON pw.team_id = wt.id
        LEFT JOIN members m ON w.member_id = m.id
        LEFT JOIN projects p ON w.project_id = p.id
        {} ORDER BY w.updated_at DESC",
        where_clause
    );

    let mut stmt = db.prepare(&sql).map_err(|e| AppError::Database(e.to_string()))?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let records = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(WagePaymentRecord {
                id: row.get(0)?,
                project_id: row.get(1)?,
                project_worker_id: row.get(2)?,
                year_month: row.get(3)?,
                daily_wage: row.get(4)?,
                work_days: row.get(5)?,
                bonus: row.get(6)?,
                deduction: row.get(7)?,
                actual_wage: row.get(8)?,
                paid_amount: row.get(9)?,
                paid_date: row.get(10)?,
                bank_receipt_path: row.get(11)?,
                payment_locked: row.get::<_, i64>(12)? != 0,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
                worker_name: row.get(15)?,
                worker_type: row.get(16)?,
                team_name: row.get(17)?,
                bank_account: row.get(18)?,
                project_name: row.get(19)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(records)
}

/// 获取工资逾期统计（未发放且月份已过）
#[command]
pub fn get_wage_overdue_stats(
    state: State<'_, AppState>,
    project_id: Option<i64>,
) -> AppResult<OverdueStats> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let current_month = chrono::Local::now().format("%Y-%m").to_string();

    let (where_extra, param_values): (String, Vec<Box<dyn rusqlite::types::ToSql>>) =
        if let Some(pid) = project_id {
            (
                " AND w.project_id = ?2".to_string(),
                vec![Box::new(current_month.clone()), Box::new(pid)],
            )
        } else {
            (String::new(), vec![Box::new(current_month.clone())])
        };

    // 总计
    let total_sql = format!(
        "SELECT COUNT(*), COALESCE(SUM(w.actual_wage), 0)
         FROM wages w
         WHERE (w.paid_date IS NULL OR w.paid_date = '')
           AND w.year_month < ?1
           AND (w.payment_locked = 0 OR w.payment_locked IS NULL){}",
        where_extra
    );
    let mut total_stmt = db.prepare(&total_sql).map_err(|e| AppError::Database(e.to_string()))?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let (total_overdue, total_amount): (i64, f64) = total_stmt
        .query_row(param_refs.as_slice(), |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| AppError::Database(e.to_string()))?;

    // 按项目分组
    let breakdown_sql = format!(
        "SELECT w.project_id, COALESCE(p.name, ''), COUNT(*), COALESCE(SUM(w.actual_wage), 0)
         FROM wages w
         LEFT JOIN projects p ON w.project_id = p.id
         WHERE (w.paid_date IS NULL OR w.paid_date = '')
           AND w.year_month < ?1
           AND (w.payment_locked = 0 OR w.payment_locked IS NULL){}
         GROUP BY w.project_id
         ORDER BY COALESCE(SUM(w.actual_wage), 0) DESC",
        where_extra
    );
    let mut breakdown_stmt = db.prepare(&breakdown_sql).map_err(|e| AppError::Database(e.to_string()))?;
    let breakdown_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let breakdown = breakdown_stmt
        .query_map(breakdown_refs.as_slice(), |row| {
            Ok(OverdueProjectStat {
                project_id: row.get(0)?,
                project_name: row.get(1)?,
                overdue_count: row.get(2)?,
                overdue_amount: row.get(3)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(OverdueStats {
        total_overdue,
        total_amount: (total_amount * 100.0).round() / 100.0,
        project_breakdown: breakdown,
    })
}

/// 获取逾期工资明细列表
#[command]
pub fn get_wage_overdue_list(
    state: State<'_, AppState>,
    project_id: Option<i64>,
) -> AppResult<Vec<OverdueWage>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let current_month = chrono::Local::now().format("%Y-%m").to_string();

    let (where_extra, param_values): (String, Vec<Box<dyn rusqlite::types::ToSql>>) =
        if let Some(pid) = project_id {
            (
                " AND w.project_id = ?2".to_string(),
                vec![Box::new(current_month.clone()), Box::new(pid)],
            )
        } else {
            (String::new(), vec![Box::new(current_month.clone())])
        };

    let sql = format!(
        "SELECT w.id, w.project_id, w.project_worker_id, w.year_month, w.actual_wage,
               COALESCE(wr.name, m.name) as worker_name,
               wt.name as team_name,
               p.name as project_name
        FROM wages w
        LEFT JOIN project_workers pw ON w.project_worker_id = pw.id
        LEFT JOIN workers wr ON pw.worker_id = wr.id
        LEFT JOIN worker_teams wt ON pw.team_id = wt.id
        LEFT JOIN members m ON w.member_id = m.id
        LEFT JOIN projects p ON w.project_id = p.id
        WHERE (w.paid_date IS NULL OR w.paid_date = '')
          AND w.year_month < ?1
          AND (w.payment_locked = 0 OR w.payment_locked IS NULL){}
        ORDER BY w.year_month DESC, w.project_id",
        where_extra
    );

    let mut stmt = db.prepare(&sql).map_err(|e| AppError::Database(e.to_string()))?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let records = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(OverdueWage {
                id: row.get(0)?,
                project_id: row.get(1)?,
                project_worker_id: row.get(2)?,
                year_month: row.get(3)?,
                actual_wage: row.get(4)?,
                worker_name: row.get(5)?,
                team_name: row.get(6)?,
                project_name: row.get(7)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(records)
}

/// 批量归档工资记录（锁定发放字段）
#[command]
pub fn batch_archive_wages(state: State<'_, AppState>, ids: Vec<i64>) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut total: i64 = 0;

    for id in &ids {
        let affected = db
            .execute(
                "UPDATE wages SET payment_locked = 1, updated_at = ?1 WHERE id = ?2",
                params![now, id],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
        total += affected as i64;
    }

    Ok(total)
}

/// 批量保存工资记录（INSERT OR REPLACE）
#[command]
pub fn batch_save_wages(
    state: State<'_, AppState>,
    records: Vec<BatchSaveWage>,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut total: i64 = 0;

    for record in &records {
        let daily_wage = record.daily_wage.unwrap_or(0.0);
        let work_days = record.work_days.unwrap_or(0.0);
        let bonus = record.bonus.unwrap_or(0.0);
        let deduction = record.deduction.unwrap_or(0.0);
        let actual_wage = record
            .actual_wage
            .unwrap_or_else(|| calculate_actual_wage(daily_wage, work_days, bonus, deduction));

        db.execute(
            "INSERT OR REPLACE INTO wages (project_id, project_worker_id, year_month,
             daily_wage, work_days, bonus, deduction, actual_wage,
             paid_amount, paid_date, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                record.project_id,
                record.project_worker_id,
                record.year_month,
                daily_wage,
                work_days,
                bonus,
                deduction,
                actual_wage,
                record.paid_amount,
                record.paid_date,
                now,
                now,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        total += 1;
    }

    Ok(total)
}
