/**
 * 工资管理命令
 *
 * 对应 Electron 版本的 wages.ts + wage-calc.ts + wage-utils.ts + wage-bank-receipt-batch.ts
 * 包含工资 CRUD、项目工资生成、银行回单匹配
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

// ============ 类型定义 ============

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Wage {
    pub id: i64,
    pub project_id: Option<i64>,
    pub member_id: Option<i64>,
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
    pub member_name: Option<String>,
    pub member_type: Option<String>,
    pub team_name: Option<String>,
    pub bank_account: Option<String>,
    pub project_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateWageRecord {
    pub project_id: Option<i64>,
    pub member_id: Option<i64>,
    pub project_worker_id: Option<i64>,
    pub year_month: String,
    pub daily_wage: Option<f64>,
    pub work_days: Option<f64>,
    pub bonus: Option<f64>,
    pub deduction: Option<f64>,
    pub actual_wage: Option<f64>,
    pub paid_amount: Option<f64>,
    pub paid_date: Option<String>,
    pub bank_receipt_path: Option<String>,
    pub payment_locked: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWageRecord {
    pub id: i64,
    pub daily_wage: Option<f64>,
    pub work_days: Option<f64>,
    pub bonus: Option<f64>,
    pub deduction: Option<f64>,
    pub actual_wage: Option<f64>,
    pub paid_amount: Option<f64>,
    pub paid_date: Option<String>,
    pub bank_receipt_path: Option<String>,
    pub payment_locked: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WageStats {
    pub total_wage: f64,
    pub count: i64,
    pub project_breakdown: Vec<ProjectBreakdown>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectBreakdown {
    pub project_id: i64,
    pub project_name: String,
    pub total_wage: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BankReceiptMatch {
    pub parsed_name: String,
    pub parsed_amount: f64,
    pub matched_worker_id: Option<i64>,
    pub matched_wage_id: Option<i64>,
    pub worker_confidence: f64,
    pub wage_confidence: f64,
    pub status: String, // matched | ambiguous | archived | unmatched
}

// ============ 工具函数 ============

/// 计算实发工资
fn calculate_actual_wage(daily_wage: f64, work_days: f64, bonus: f64, deduction: f64) -> f64 {
    ((daily_wage * work_days + bonus - deduction) * 100.0).round() / 100.0
}

/// 获取有效日工资（从 wage_history 查找最近记录）
fn get_effective_daily_wage(
    db: &rusqlite::Connection,
    project_worker_id: i64,
    year_month: &str,
) -> f64 {
    // 先查 wage_history
    let history_wage: Option<f64> = db
        .query_row(
            "SELECT daily_wage FROM wage_history
             WHERE project_worker_id = ?1 AND year_month <= ?2
             ORDER BY year_month DESC LIMIT 1",
            params![project_worker_id, year_month],
            |row| row.get(0),
        )
        .ok();

    if let Some(w) = history_wage {
        return w;
    }

    // 回退到 project_workers.daily_wage
    db.query_row(
        "SELECT daily_wage FROM project_workers WHERE id = ?1",
        params![project_worker_id],
        |row| row.get(0),
    )
    .unwrap_or(0.0)
}

/// Levenshtein 距离（用于银行回单模糊匹配）
fn levenshtein_distance(s1: &str, s2: &str) -> usize {
    let len1 = s1.chars().count();
    let len2 = s2.chars().count();
    let mut matrix = vec![vec![0usize; len2 + 1]; len1 + 1];

    for i in 0..=len1 {
        matrix[i][0] = i;
    }
    for j in 0..=len2 {
        matrix[0][j] = j;
    }

    let chars1: Vec<char> = s1.chars().collect();
    let chars2: Vec<char> = s2.chars().collect();

    for i in 1..=len1 {
        for j in 1..=len2 {
            let cost = if chars1[i - 1] == chars2[j - 1] { 0 } else { 1 };
            matrix[i][j] = (matrix[i - 1][j] + 1)
                .min(matrix[i][j - 1] + 1)
                .min(matrix[i - 1][j - 1] + cost);
        }
    }

    matrix[len1][len2]
}

/// 字符串相似度（0-100）
fn string_similarity(s1: &str, s2: &str) -> f64 {
    if s1.is_empty() && s2.is_empty() {
        return 100.0;
    }
    let max_len = s1.chars().count().max(s2.chars().count());
    if max_len == 0 {
        return 100.0;
    }
    let dist = levenshtein_distance(s1, s2);
    ((1.0 - dist as f64 / max_len as f64) * 100.0).round()
}

// ============ 命令实现 ============

/// 获取工资列表（带 enrichment）
#[command]
pub fn get_wages(
    state: State<'_, AppState>,
    project_id: Option<i64>,
    year_month: Option<String>,
) -> AppResult<Vec<Wage>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let base_sql = "
        SELECT w.id, w.project_id, w.member_id, w.project_worker_id,
               w.year_month, w.daily_wage, w.work_days, w.bonus, w.deduction,
               w.actual_wage, w.paid_amount, w.paid_date, w.bank_receipt_path,
               w.payment_locked, w.created_at, w.updated_at,
               COALESCE(m.name, wr.name) as member_name,
               COALESCE(m.member_type, 'worker') as member_type,
               wt.name as team_name,
               COALESCE(m.phone, wr.bank_account) as bank_account,
               p.name as project_name
        FROM wages w
        LEFT JOIN members m ON w.member_id = m.id
        LEFT JOIN project_workers pw ON w.project_worker_id = pw.id
        LEFT JOIN workers wr ON pw.worker_id = wr.id
        LEFT JOIN worker_teams wt ON pw.team_id = wt.id
        LEFT JOIN projects p ON w.project_id = p.id
    ";

    let (where_clause, query_params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = {
        let mut conditions = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        let mut idx = 1;

        if let Some(pid) = project_id {
            conditions.push(format!("w.project_id = ?{}", idx));
            params.push(Box::new(pid));
            idx += 1;
        }
        if let Some(ref ym) = year_month {
            conditions.push(format!("w.year_month = ?{}", idx));
            params.push(Box::new(ym.clone()));
        }

        let clause = if conditions.is_empty() {
            String::new()
        } else {
            format!(" WHERE {}", conditions.join(" AND "))
        };
        (clause, params)
    };

    let full_sql = format!("{}{} ORDER BY w.updated_at DESC", base_sql, where_clause);
    let mut stmt = db.prepare(&full_sql).map_err(|e| AppError::Database(e.to_string()))?;

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = query_params.iter().map(|p| p.as_ref()).collect();

    let wages = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(Wage {
                id: row.get(0)?,
                project_id: row.get(1)?,
                member_id: row.get(2)?,
                project_worker_id: row.get(3)?,
                year_month: row.get(4)?,
                daily_wage: row.get(5)?,
                work_days: row.get(6)?,
                bonus: row.get(7)?,
                deduction: row.get(8)?,
                actual_wage: row.get(9)?,
                paid_amount: row.get(10)?,
                paid_date: row.get(11)?,
                bank_receipt_path: row.get(12)?,
                payment_locked: row.get::<_, i64>(13)? != 0,
                created_at: row.get(14)?,
                updated_at: row.get(15)?,
                member_name: row.get(16)?,
                member_type: row.get(17)?,
                team_name: row.get(18)?,
                bank_account: row.get(19)?,
                project_name: row.get(20)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(wages)
}

/// 为项目生成工资（核心逻辑）
#[command]
pub fn generate_for_project(
    state: State<'_, AppState>,
    project_id: i64,
    year_month: String,
) -> AppResult<serde_json::Value> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 1. 删除未归档的旧记录
    let _deleted = db
        .execute(
            "DELETE FROM wages WHERE project_id = ?1 AND year_month = ?2 AND (payment_locked = 0 OR payment_locked IS NULL)",
            params![project_id, year_month],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    // 2. 统计归档跳过数
    let archived_skipped: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM wages WHERE project_id = ?1 AND year_month = ?2 AND payment_locked = 1",
            params![project_id, year_month],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // 3. 加载活跃的 project_workers
    let mut pw_stmt = db
        .prepare(
            "SELECT pw.id, pw.worker_id, pw.daily_wage
             FROM project_workers pw
             WHERE pw.project_id = ?1 AND (pw.status IS NULL OR pw.status != 'left')",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let workers: Vec<(i64, Option<i64>, f64)> = pw_stmt
        .query_map(params![project_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, Option<i64>>(1)?,
                row.get::<_, f64>(2)?,
            ))
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut new_count: i64 = 0;

    for (pw_id, _worker_id, _pw_daily_wage) in &workers {
        // 检查是否有考勤记录
        let has_attendance: bool = db
            .query_row(
                "SELECT COUNT(*) FROM attendances WHERE project_worker_id = ?1 AND year_month = ?2",
                params![pw_id, year_month],
                |row| row.get::<_, i64>(0),
            )
            .map(|c| c > 0)
            .unwrap_or(false);

        if !has_attendance {
            continue;
        }

        // 检查是否已有归档记录
        let has_archived: bool = db
            .query_row(
                "SELECT COUNT(*) FROM wages WHERE project_worker_id = ?1 AND year_month = ?2 AND payment_locked = 1",
                params![pw_id, year_month],
                |row| row.get::<_, i64>(0),
            )
            .map(|c| c > 0)
            .unwrap_or(false);

        if has_archived {
            continue;
        }

        // 获取考勤数据
        let (work_days, bonus, deduction): (f64, f64, f64) = db
            .query_row(
                "SELECT work_days, COALESCE(bonus, 0), COALESCE(deduction, 0) FROM attendances WHERE project_worker_id = ?1 AND year_month = ?2 LIMIT 1",
                params![pw_id, year_month],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap_or((0.0, 0.0, 0.0));

        // 获取有效日工资
        let daily_wage = get_effective_daily_wage(&db, *pw_id, &year_month);
        if daily_wage <= 0.0 {
            continue;
        }

        let actual_wage = calculate_actual_wage(daily_wage, work_days, bonus, deduction);

        db.execute(
            "INSERT INTO wages (project_id, project_worker_id, year_month,
             daily_wage, work_days, bonus, deduction, actual_wage, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                project_id,
                pw_id,
                year_month,
                daily_wage,
                work_days,
                bonus,
                deduction,
                actual_wage,
                now,
                now,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        new_count += 1;
    }

    Ok(serde_json::json!({
        "newCount": new_count,
        "archivedSkipped": archived_skipped,
    }))
}

/// 创建工资记录
#[command]
pub fn create_wage(state: State<'_, AppState>, record: CreateWageRecord) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let daily_wage = record.daily_wage.unwrap_or(0.0);
    let work_days = record.work_days.unwrap_or(0.0);
    let bonus = record.bonus.unwrap_or(0.0);
    let deduction = record.deduction.unwrap_or(0.0);
    let actual_wage = record
        .actual_wage
        .unwrap_or_else(|| calculate_actual_wage(daily_wage, work_days, bonus, deduction));

    db.execute(
        "INSERT INTO wages (project_id, member_id, project_worker_id, year_month,
         daily_wage, work_days, bonus, deduction, actual_wage,
         paid_amount, paid_date, bank_receipt_path, payment_locked, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        params![
            record.project_id,
            record.member_id,
            record.project_worker_id,
            record.year_month,
            daily_wage,
            work_days,
            bonus,
            deduction,
            actual_wage,
            record.paid_amount,
            record.paid_date,
            record.bank_receipt_path,
            record.payment_locked.unwrap_or(false) as i64,
            now,
            now,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(db.last_insert_rowid())
}

/// 更新工资记录
#[command]
pub fn update_wage(state: State<'_, AppState>, record: UpdateWageRecord) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 查询现有记录
    let existing = db
        .query_row(
            "SELECT daily_wage, work_days, bonus, deduction, actual_wage,
                    paid_amount, paid_date, bank_receipt_path, payment_locked
             FROM wages WHERE id = ?1",
            params![record.id],
            |row| {
                Ok((
                    row.get::<_, f64>(0)?,
                    row.get::<_, f64>(1)?,
                    row.get::<_, f64>(2)?,
                    row.get::<_, f64>(3)?,
                    row.get::<_, f64>(4)?,
                    row.get::<_, Option<f64>>(5)?,
                    row.get::<_, Option<String>>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, i64>(8)?,
                ))
            },
        )
        .map_err(|_| AppError::NotFound(format!("工资记录 {} 不存在", record.id)))?;

    let (old_dw, old_wd, old_bonus, old_ded, old_actual, old_pa, old_pd, old_brp, old_locked) =
        existing;

    let daily_wage = record.daily_wage.unwrap_or(old_dw);
    let work_days = record.work_days.unwrap_or(old_wd);
    let bonus = record.bonus.unwrap_or(old_bonus);
    let deduction = record.deduction.unwrap_or(old_ded);

    // 如果基础数据变化，重算 actual_wage
    let actual_wage = if record.daily_wage.is_some()
        || record.work_days.is_some()
        || record.bonus.is_some()
        || record.deduction.is_some()
    {
        calculate_actual_wage(daily_wage, work_days, bonus, deduction)
    } else {
        record.actual_wage.unwrap_or(old_actual)
    };

    db.execute(
        "UPDATE wages SET daily_wage = ?1, work_days = ?2, bonus = ?3, deduction = ?4,
         actual_wage = ?5, paid_amount = ?6, paid_date = ?7, bank_receipt_path = ?8,
         payment_locked = ?9, updated_at = ?10
         WHERE id = ?11",
        params![
            daily_wage,
            work_days,
            bonus,
            deduction,
            actual_wage,
            record.paid_amount.or(old_pa),
            record.paid_date.or(old_pd),
            record.bank_receipt_path.or(old_brp),
            record.payment_locked.unwrap_or(old_locked != 0) as i64,
            now,
            record.id,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}

/// 删除工资记录
#[command]
pub fn delete_wage(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM wages WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("工资记录 {} 不存在", id)));
    }
    Ok(())
}

/// 批量删除工资记录
#[command]
pub fn batch_delete_wages(state: State<'_, AppState>, ids: Vec<i64>) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let mut total: i64 = 0;

    for id in &ids {
        let affected = db
            .execute("DELETE FROM wages WHERE id = ?1", params![id])
            .map_err(|e| AppError::Database(e.to_string()))?;
        total += affected as i64;
    }

    Ok(total)
}

/// 清空发放记录（仅清空 paid_amount/paid_date，不删除记录）
#[command]
pub fn batch_clear_payments(state: State<'_, AppState>, ids: Vec<i64>) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut total: i64 = 0;

    for id in &ids {
        let affected = db
            .execute(
                "UPDATE wages SET paid_amount = NULL, paid_date = NULL, bank_receipt_path = NULL, updated_at = ?1
                 WHERE id = ?2 AND (payment_locked = 0 OR payment_locked IS NULL)",
                params![now, id],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
        total += affected as i64;
    }

    Ok(total)
}

/// 归档工资记录（锁定发放字段）
#[command]
pub fn archive_wages(state: State<'_, AppState>, ids: Vec<i64>) -> AppResult<i64> {
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

/// 获取工资统计
#[command]
pub fn get_wage_stats(
    state: State<'_, AppState>,
    project_id: Option<i64>,
    year_month: Option<String>,
) -> AppResult<WageStats> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let (where_clause, query_params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = {
        let mut conditions = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        let mut idx = 1;

        if let Some(pid) = project_id {
            conditions.push(format!("w.project_id = ?{}", idx));
            params.push(Box::new(pid));
            idx += 1;
        }
        if let Some(ref ym) = year_month {
            conditions.push(format!("w.year_month = ?{}", idx));
            params.push(Box::new(ym.clone()));
        }

        let clause = if conditions.is_empty() {
            String::new()
        } else {
            format!(" WHERE {}", conditions.join(" AND "))
        };
        (clause, params)
    };

    // 总计
    let total_sql = format!(
        "SELECT COALESCE(SUM(actual_wage), 0), COUNT(*) FROM wages w{}",
        where_clause
    );
    let mut total_stmt = db.prepare(&total_sql).map_err(|e| AppError::Database(e.to_string()))?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = query_params.iter().map(|p| p.as_ref()).collect();

    let (total_wage, count): (f64, i64) = total_stmt
        .query_row(param_refs.as_slice(), |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| AppError::Database(e.to_string()))?;

    // 按项目分组
    let breakdown_sql = format!(
        "SELECT w.project_id, COALESCE(p.name, ''), COALESCE(SUM(w.actual_wage), 0)
         FROM wages w
         LEFT JOIN projects p ON w.project_id = p.id
         {}
         GROUP BY w.project_id
         ORDER BY COALESCE(SUM(w.actual_wage), 0) DESC",
        if where_clause.is_empty() {
            String::new()
        } else {
            where_clause.clone()
        }
    );
    let mut breakdown_stmt = db
        .prepare(&breakdown_sql)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let breakdown_refs: Vec<&dyn rusqlite::types::ToSql> = query_params.iter().map(|p| p.as_ref()).collect();

    let breakdown = breakdown_stmt
        .query_map(breakdown_refs.as_slice(), |row| {
            let pid: i64 = row.get(0)?;
            let pname: String = row.get(1)?;
            let tw: f64 = row.get(2)?;
            Ok((pid, pname, tw))
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    let project_breakdown: Vec<ProjectBreakdown> = breakdown
        .into_iter()
        .map(|(pid, pname, tw)| ProjectBreakdown {
            project_id: pid,
            project_name: pname,
            total_wage: (tw * 100.0).round() / 100.0,
            percentage: if total_wage > 0.0 {
                ((tw / total_wage * 100.0) * 100.0).round() / 100.0
            } else {
                0.0
            },
        })
        .collect();

    Ok(WageStats {
        total_wage: (total_wage * 100.0).round() / 100.0,
        count,
        project_breakdown,
    })
}

/// 银行回单智能匹配（纯 Rust，不需要 Python）
/// 前端传入已解析的回单条目，后端匹配工人和工资记录
#[command]
pub fn match_bank_receipt_items(
    state: State<'_, AppState>,
    project_id: Option<i64>,
    year_month: Option<String>,
    items: Vec<BankReceiptMatch>,
) -> AppResult<Vec<BankReceiptMatch>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 加载所有工人（用于姓名匹配）
    let mut worker_stmt = db
        .prepare(
            "SELECT pw.id, pw.worker_id, w.name, pw.project_id
             FROM project_workers pw
             LEFT JOIN workers w ON pw.worker_id = w.id
             WHERE pw.status IS NULL OR pw.status != 'left'",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let workers: Vec<(i64, String, Option<i64>)> = worker_stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                row.get::<_, Option<i64>>(3)?,
            ))
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    // 加载工资记录
    let wage_sql = if let (Some(pid), Some(ref ym)) = (project_id, &year_month) {
        format!(
            "SELECT id, project_worker_id, actual_wage, paid_amount, payment_locked
             FROM wages WHERE project_id = {} AND year_month = '{}'",
            pid, ym
        )
    } else if let Some(pid) = project_id {
        format!(
            "SELECT id, project_worker_id, actual_wage, paid_amount, payment_locked
             FROM wages WHERE project_id = {}",
            pid
        )
    } else {
        "SELECT id, project_worker_id, actual_wage, paid_amount, payment_locked FROM wages"
            .to_string()
    };

    let mut wage_stmt = db.prepare(&wage_sql).map_err(|e| AppError::Database(e.to_string()))?;
    let wage_records: Vec<(i64, Option<i64>, f64, Option<f64>, bool)> = wage_stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, Option<i64>>(1)?,
                row.get::<_, f64>(2)?,
                row.get::<_, Option<f64>>(3)?,
                row.get::<_, i64>(4)? != 0,
            ))
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut results = Vec::new();

    for item in &items {
        let mut best_worker: Option<(i64, f64)> = None; // (pw_id, confidence)

        // 1. 姓名匹配
        for (pw_id, name, w_project_id) in &workers {
            // 如果指定了项目，过滤
            if let Some(pid) = project_id {
                if let Some(wpid) = w_project_id {
                    if *wpid != pid {
                        continue;
                    }
                }
            }

            let confidence = if name == &item.parsed_name {
                100.0
            } else if name.contains(&item.parsed_name) || item.parsed_name.contains(name) {
                90.0
            } else {
                let sim = string_similarity(name, &item.parsed_name);
                if sim > 60.0 {
                    sim
                } else {
                    0.0
                }
            };

            if confidence > 0.0 {
                if let Some((_, best_conf)) = best_worker {
                    if confidence > best_conf {
                        best_worker = Some((*pw_id, confidence));
                    }
                } else {
                    best_worker = Some((*pw_id, confidence));
                }
            }
        }

        let (matched_pw_id, worker_confidence) = best_worker.unwrap_or((0, 0.0));

        // 2. 金额匹配
        let mut best_wage: Option<(i64, f64)> = None; // (wage_id, confidence)

        if matched_pw_id > 0 {
            for (wage_id, pw_id, actual_wage, paid_amount, locked) in &wage_records {
                if Some(matched_pw_id) != *pw_id {
                    continue;
                }
                if *locked {
                    continue;
                }
                if paid_amount.is_some() && paid_amount.unwrap() > 0.0 {
                    continue; // 已发放
                }

                let diff = (item.parsed_amount - actual_wage).abs();
                let confidence = if diff < 0.01 {
                    100.0
                } else if diff / actual_wage.max(0.01) < 0.01 {
                    80.0
                } else {
                    30.0 // 容忍
                };

                if confidence > 0.0 {
                    if let Some((_, best_conf)) = best_wage {
                        if confidence > best_conf {
                            best_wage = Some((*wage_id, confidence));
                        }
                    } else {
                        best_wage = Some((*wage_id, confidence));
                    }
                }
            }
        }

        let (matched_wage_id, wage_confidence) = best_wage.unwrap_or((0, 0.0));
        let combined_confidence = worker_confidence.min(wage_confidence);

        let status = if matched_pw_id > 0 && matched_wage_id > 0 && combined_confidence >= 80.0 {
            "matched".to_string()
        } else if matched_pw_id > 0 && matched_wage_id > 0 {
            "ambiguous".to_string()
        } else {
            "unmatched".to_string()
        };

        results.push(BankReceiptMatch {
            parsed_name: item.parsed_name.clone(),
            parsed_amount: item.parsed_amount,
            matched_worker_id: if matched_pw_id > 0 {
                Some(matched_pw_id)
            } else {
                None
            },
            matched_wage_id: if matched_wage_id > 0 {
                Some(matched_wage_id)
            } else {
                None
            },
            worker_confidence,
            wage_confidence,
            status,
        });
    }

    Ok(results)
}

/// 确认银行回单匹配（更新工资发放记录）
#[command]
pub fn batch_confirm_matches(
    state: State<'_, AppState>,
    matches: Vec<BankReceiptMatch>,
    _year_month: Option<String>,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut updated: i64 = 0;

    for m in &matches {
        if let Some(wage_id) = m.matched_wage_id {
            let affected = db
                .execute(
                    "UPDATE wages SET paid_amount = ?1, paid_date = ?2, updated_at = ?3 WHERE id = ?4",
                    params![m.parsed_amount, m.parsed_amount.to_string(), now, wage_id],
                )
                .map_err(|e| AppError::Database(e.to_string()))?;

            if affected > 0 {
                // 记录审计日志
                let _ = db.execute(
                    "INSERT INTO audit_logs (user_id, username, action, module, target_id, details, created_at)
                     VALUES ('system', 'system', 'update', 'wages', ?1, ?2, ?3)",
                    params![
                        wage_id,
                        format!("银行回单匹配：{} 金额 {:.2}", m.parsed_name, m.parsed_amount),
                        now,
                    ],
                );
                updated += 1;
            }
        }
    }

    Ok(updated)
}
