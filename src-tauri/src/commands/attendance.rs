/**
 * 考勤管理命令
 *
 * 对应 Electron 版本的 attendance.ts + attendance-utils.ts + attendance-batch-import.ts
 * 包含考勤 CRUD、默认生成、批量导入
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

// ============ 类型定义 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Attendance {
    pub id: i64,
    pub member_id: Option<i64>,
    pub project_id: Option<i64>,
    pub project_worker_id: Option<i64>,
    pub year_month: String,
    pub work_days: f64,
    pub days_off: i64,
    pub is_full_attendance: bool,
    pub daily_status: Option<String>,
    pub file_url: Option<String>,
    pub file_name: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    // JOIN enrichment
    pub member_name: Option<String>,
    pub member_type: Option<String>,
    pub team_name: Option<String>,
    pub team_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAttendanceRecord {
    pub member_id: Option<i64>,
    pub project_id: Option<i64>,
    pub project_worker_id: Option<i64>,
    pub year_month: String,
    pub work_days: Option<f64>,
    pub days_off: Option<i64>,
    pub is_full_attendance: Option<bool>,
    pub daily_status: Option<String>,
    pub file_url: Option<String>,
    pub file_name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAttendanceRecord {
    pub id: i64,
    pub year_month: Option<String>,
    pub work_days: Option<f64>,
    pub days_off: Option<i64>,
    pub is_full_attendance: Option<bool>,
    pub daily_status: Option<String>,
    pub file_url: Option<String>,
    pub file_name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchImportItem {
    pub project_worker_id: i64,
    pub work_days: f64,
}

// ============ 工具函数 ============

/// 获取指定月份的天数
fn get_days_in_month(year_month: &str) -> i64 {
    let parts: Vec<&str> = year_month.split('-').collect();
    if parts.len() != 2 {
        return 30;
    }
    let year: i32 = parts[0].parse().unwrap_or(2026);
    let month: u32 = parts[1].parse().unwrap_or(1);
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 {
                29
            } else {
                28
            }
        }
        _ => 30,
    }
}

/// 生成默认每日状态 JSON
fn generate_daily_status(year_month: &str, _is_staff: bool) -> String {
    let days = get_days_in_month(year_month);
    let mut map = serde_json::Map::new();
    for d in 1..=days {
        map.insert(d.to_string(), serde_json::Value::String("work".to_string()));
    }
    serde_json::to_string(&serde_json::Value::Object(map)).unwrap_or_else(|_| "{}".to_string())
}

/// 从 daily_status 计算 work_days, days_off, is_full_attendance
fn compute_from_daily_status(daily_status: &str, days_in_month: i64, start_day: i64) -> (f64, i64, bool) {
    let parsed: serde_json::Value = match serde_json::from_str(daily_status) {
        Ok(v) => v,
        Err(_) => return (0.0, 0, false),
    };
    let obj = match parsed.as_object() {
        Some(o) => o,
        None => return (0.0, 0, false),
    };

    let mut work_days: f64 = 0.0;
    let mut days_off: i64 = 0;

    for day in start_day..=days_in_month {
        let key = day.to_string();
        let status = obj.get(&key).and_then(|v| v.as_str()).unwrap_or("unset");
        match status {
            "work" | "holiday" => work_days += 1.0,
            "sick_leave" | "personal_leave" => days_off += 1,
            _ => {}
        }
    }

    let is_full_attendance = days_off <= 4;
    (work_days, days_off, is_full_attendance)
}

/// 获取成员入职日（用于月中入职计算）
fn get_entry_day(
    member_id: Option<i64>,
    project_worker_id: Option<i64>,
    year_month: &str,
    db: &rusqlite::Connection,
) -> i64 {
    let entry_date: Option<String> = if let Some(mid) = member_id {
        db.query_row(
            "SELECT entry_date FROM members WHERE id = ?1",
            params![mid],
            |row| row.get(0),
        )
        .ok()
    } else if let Some(pwid) = project_worker_id {
        // 先从 project_workers 取 worker_id，再从 workers 取 birth_date 作为 fallback
        db.query_row(
            "SELECT w.entry_date FROM project_workers pw
             LEFT JOIN workers w ON pw.worker_id = w.id
             WHERE pw.id = ?1",
            params![pwid],
            |row| row.get(0),
        )
        .ok()
    } else {
        None
    };

    if let Some(ref ed) = entry_date {
        if ed.len() >= 7 && &ed[..7] == year_month {
            // 入职月份与考勤月份相同，取入职日
            if let Some(day_str) = ed.get(8..10) {
                return day_str.parse().unwrap_or(1);
            }
        }
    }
    1
}

// ============ 命令实现 ============

/// 获取考勤列表（带 enrichment）
#[command]
pub fn get_attendances(
    state: State<'_, AppState>,
    project_id: Option<i64>,
    year_month: Option<String>,
) -> AppResult<Vec<Attendance>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let sql = "
        SELECT a.id, a.member_id, a.project_id, a.project_worker_id,
               a.year_month, a.work_days, a.days_off, a.is_full_attendance,
               a.daily_status, a.file_url, a.file_name, a.created_at, a.updated_at,
               m.name as member_name, m.member_type as member_type,
               wt.name as team_name, wt.id as team_id
        FROM attendances a
        LEFT JOIN members m ON a.member_id = m.id
        LEFT JOIN project_workers pw ON a.project_worker_id = pw.id
        LEFT JOIN workers w ON pw.worker_id = w.id
        LEFT JOIN worker_teams wt ON pw.team_id = wt.id
    ";

    let (where_clause, query_params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = {
        let mut conditions = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        let mut idx = 1;

        if let Some(pid) = project_id {
            conditions.push(format!("a.project_id = ?{}", idx));
            params.push(Box::new(pid));
            idx += 1;
        }
        if let Some(ref ym) = year_month {
            conditions.push(format!("a.year_month = ?{}", idx));
            params.push(Box::new(ym.clone()));
        }

        let clause = if conditions.is_empty() {
            String::new()
        } else {
            format!(" WHERE {}", conditions.join(" AND "))
        };
        (clause, params)
    };

    let full_sql = format!("{}{} ORDER BY a.updated_at DESC", sql, where_clause);
    let mut stmt = db.prepare(&full_sql).map_err(|e| AppError::Database(e.to_string()))?;

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = query_params.iter().map(|p| p.as_ref()).collect();

    let attendances = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(Attendance {
                id: row.get(0)?,
                member_id: row.get(1)?,
                project_id: row.get(2)?,
                project_worker_id: row.get(3)?,
                year_month: row.get(4)?,
                work_days: row.get(5)?,
                days_off: row.get(6)?,
                is_full_attendance: row.get::<_, i64>(7)? != 0,
                daily_status: row.get(8)?,
                file_url: row.get(9)?,
                file_name: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
                member_name: row.get(13)?,
                member_type: row.get(14)?,
                team_name: row.get(15)?,
                team_id: row.get(16)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(attendances)
}

/// 按成员获取考勤
#[command]
pub fn get_attendances_by_member(
    state: State<'_, AppState>,
    member_id: i64,
    year_month: Option<String>,
) -> AppResult<Vec<Attendance>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let (sql, query_params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = match &year_month {
        Some(ym) => (
            "SELECT id, member_id, project_id, project_worker_id,
                    year_month, work_days, days_off, is_full_attendance,
                    daily_status, file_url, file_name, created_at, updated_at,
                    NULL, NULL, NULL, NULL
             FROM attendances WHERE member_id = ?1 AND year_month = ?2
             ORDER BY updated_at DESC"
                .to_string(),
            vec![Box::new(member_id), Box::new(ym.clone())],
        ),
        None => (
            "SELECT id, member_id, project_id, project_worker_id,
                    year_month, work_days, days_off, is_full_attendance,
                    daily_status, file_url, file_name, created_at, updated_at,
                    NULL, NULL, NULL, NULL
             FROM attendances WHERE member_id = ?1
             ORDER BY updated_at DESC"
                .to_string(),
            vec![Box::new(member_id)],
        ),
    };

    let mut stmt = db.prepare(&sql).map_err(|e| AppError::Database(e.to_string()))?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = query_params.iter().map(|p| p.as_ref()).collect();

    let attendances = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(Attendance {
                id: row.get(0)?,
                member_id: row.get(1)?,
                project_id: row.get(2)?,
                project_worker_id: row.get(3)?,
                year_month: row.get(4)?,
                work_days: row.get(5)?,
                days_off: row.get(6)?,
                is_full_attendance: row.get::<_, i64>(7)? != 0,
                daily_status: row.get(8)?,
                file_url: row.get(9)?,
                file_name: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
                member_name: row.get(13)?,
                member_type: row.get(14)?,
                team_name: row.get(15)?,
                team_id: row.get(16)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(attendances)
}

/// 创建考勤记录
#[command]
pub fn create_attendance(
    state: State<'_, AppState>,
    record: CreateAttendanceRecord,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    db.execute(
        "INSERT INTO attendances (member_id, project_id, project_worker_id, year_month,
         work_days, days_off, is_full_attendance, daily_status, file_url, file_name, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            record.member_id,
            record.project_id,
            record.project_worker_id,
            record.year_month,
            record.work_days.unwrap_or(0.0),
            record.days_off.unwrap_or(0),
            record.is_full_attendance.unwrap_or(false) as i64,
            record.daily_status,
            record.file_url,
            record.file_name,
            now,
            now,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(db.last_insert_rowid())
}

/// 删除考勤记录
#[command]
pub fn delete_attendance(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM attendances WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("考勤记录 {} 不存在", id)));
    }
    Ok(())
}

/// 批量删除考勤记录
#[command]
pub fn batch_delete_attendances(state: State<'_, AppState>, ids: Vec<i64>) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut total_deleted: i64 = 0;
    for id in &ids {
        let affected = db
            .execute("DELETE FROM attendances WHERE id = ?1", params![id])
            .map_err(|e| AppError::Database(e.to_string()))?;
        total_deleted += affected as i64;
    }

    Ok(total_deleted)
}

/// 更新考勤记录
#[command]
pub fn update_attendance(
    state: State<'_, AppState>,
    record: UpdateAttendanceRecord,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 查询现有记录
    let existing = db
        .query_row(
            "SELECT year_month, work_days, days_off, is_full_attendance, daily_status,
                    member_id, project_worker_id
             FROM attendances WHERE id = ?1",
            params![record.id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, f64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, Option<i64>>(5)?,
                    row.get::<_, Option<i64>>(6)?,
                ))
            },
        )
        .map_err(|_| AppError::NotFound(format!("考勤记录 {} 不存在", record.id)))?;

    let (old_ym, old_work, old_off, old_full, old_ds, member_id, pw_id) = existing;

    let year_month = record.year_month.as_deref().unwrap_or(&old_ym);
    let daily_status = record.daily_status.as_deref().or(old_ds.as_deref());

    // 如果 daily_status 变化，重算统计
    let (work_days, days_off, is_full) = if let Some(ds) = daily_status {
        if record.daily_status.is_some() {
            let days_in_month = get_days_in_month(year_month);
            let start_day = get_entry_day(member_id, pw_id, year_month, &db);
            compute_from_daily_status(ds, days_in_month, start_day)
        } else {
            (
                record.work_days.unwrap_or(old_work),
                record.days_off.unwrap_or(old_off),
                record.is_full_attendance.unwrap_or(old_full != 0),
            )
        }
    } else {
        (
            record.work_days.unwrap_or(old_work),
            record.days_off.unwrap_or(old_off),
            record.is_full_attendance.unwrap_or(old_full != 0),
        )
    };

    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    db.execute(
        "UPDATE attendances SET year_month = ?1, work_days = ?2, days_off = ?3,
         is_full_attendance = ?4, daily_status = ?5, file_url = ?6, file_name = ?7, updated_at = ?8
         WHERE id = ?9",
        params![
            year_month,
            work_days,
            days_off,
            is_full as i64,
            daily_status,
            record.file_url,
            record.file_name,
            now,
            record.id,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}

/// 批量创建考勤记录（带去重）
#[command]
pub fn batch_create_attendances(
    state: State<'_, AppState>,
    records: Vec<CreateAttendanceRecord>,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut count: i64 = 0;

    for rec in &records {
        // 去重检查
        let exists: bool = db
            .query_row(
                "SELECT COUNT(*) FROM attendances
                 WHERE (member_id = ?1 OR ?1 IS NULL)
                   AND (project_worker_id = ?2 OR ?2 IS NULL)
                   AND project_id = ?3
                   AND year_month = ?4",
                params![rec.member_id, rec.project_worker_id, rec.project_id, rec.year_month],
                |row| row.get::<_, i64>(0),
            )
            .map(|c| c > 0)
            .unwrap_or(false);

        if exists {
            continue;
        }

        db.execute(
            "INSERT INTO attendances (member_id, project_id, project_worker_id, year_month,
             work_days, days_off, is_full_attendance, daily_status, file_url, file_name, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                rec.member_id,
                rec.project_id,
                rec.project_worker_id,
                rec.year_month,
                rec.work_days.unwrap_or(0.0),
                rec.days_off.unwrap_or(0),
                rec.is_full_attendance.unwrap_or(false) as i64,
                rec.daily_status,
                rec.file_url,
                rec.file_name,
                now,
                now,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        count += 1;
    }

    Ok(count)
}

/// 生成默认考勤（staff 版，按 memberId）
#[command]
pub fn generate_default_attendances(
    state: State<'_, AppState>,
    project_id: i64,
    year_month: String,
    member_ids: Vec<i64>,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let days_in_month = get_days_in_month(&year_month);
    let mut count: i64 = 0;

    for mid in &member_ids {
        // 去重
        let exists: bool = db
            .query_row(
                "SELECT COUNT(*) FROM attendances WHERE member_id = ?1 AND project_id = ?2 AND year_month = ?3",
                params![mid, project_id, year_month],
                |row| row.get::<_, i64>(0),
            )
            .map(|c| c > 0)
            .unwrap_or(false);

        if exists {
            continue;
        }

        // 判断是否 staff
        let is_staff: bool = db
            .query_row(
                "SELECT member_type FROM members WHERE id = ?1",
                params![mid],
                |row| row.get::<_, String>(0),
            )
            .map(|t| t == "staff")
            .unwrap_or(false);

        let daily_status = generate_daily_status(&year_month, is_staff);
        let start_day = get_entry_day(Some(*mid), None, &year_month, &db);
        let (work_days, days_off, is_full) =
            compute_from_daily_status(&daily_status, days_in_month, start_day);

        db.execute(
            "INSERT INTO attendances (member_id, project_id, year_month,
             work_days, days_off, is_full_attendance, daily_status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![mid, project_id, year_month, work_days, days_off, is_full as i64, daily_status, now, now],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        count += 1;
    }

    Ok(count)
}

/// 生成默认考勤 V2（worker 版，按 projectWorkerId）
#[command]
pub fn generate_default_attendances_v2(
    state: State<'_, AppState>,
    project_id: i64,
    year_month: String,
    project_worker_ids: Vec<i64>,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let days_in_month = get_days_in_month(&year_month);
    let mut count: i64 = 0;

    for pwid in &project_worker_ids {
        // 跳过已离场
        let status: String = db
            .query_row(
                "SELECT status FROM project_workers WHERE id = ?1",
                params![pwid],
                |row| row.get(0),
            )
            .unwrap_or_else(|_| "active".to_string());

        if status == "left" {
            continue;
        }

        // 去重
        let exists: bool = db
            .query_row(
                "SELECT COUNT(*) FROM attendances WHERE project_worker_id = ?1 AND year_month = ?2",
                params![pwid, year_month],
                |row| row.get::<_, i64>(0),
            )
            .map(|c| c > 0)
            .unwrap_or(false);

        if exists {
            continue;
        }

        // 获取 worker_id（备用）
        let _worker_id: Option<i64> = db
            .query_row(
                "SELECT worker_id FROM project_workers WHERE id = ?1",
                params![pwid],
                |row| row.get(0),
            )
            .ok();

        let daily_status = generate_daily_status(&year_month, false);
        let start_day = get_entry_day(None, Some(*pwid), &year_month, &db);
        let (work_days, days_off, is_full) =
            compute_from_daily_status(&daily_status, days_in_month, start_day);

        db.execute(
            "INSERT INTO attendances (project_worker_id, project_id, year_month,
             work_days, days_off, is_full_attendance, daily_status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![pwid, project_id, year_month, work_days, days_off, is_full as i64, daily_status, now, now],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        count += 1;
    }

    Ok(count)
}

/// 批量导入考勤（Excel 导入场景）
#[command]
pub fn batch_import_attendances(
    state: State<'_, AppState>,
    project_id: i64,
    year_month: String,
    records: Vec<BatchImportItem>,
) -> AppResult<serde_json::Value> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let days_in_month = get_days_in_month(&year_month);
    let mut created: i64 = 0;
    let mut updated: i64 = 0;

    for rec in &records {
        // 跳过已离场
        let status: String = db
            .query_row(
                "SELECT status FROM project_workers WHERE id = ?1",
                params![rec.project_worker_id],
                |row| row.get(0),
            )
            .unwrap_or_else(|_| "active".to_string());

        if status == "left" {
            continue;
        }

        // 限制 work_days 范围
        let work_days = rec.work_days.max(0.0).min(days_in_month as f64);

        // 构建 daily_status：前 N 天为 work
        let work_count = work_days as i64;
        let mut map = serde_json::Map::new();
        for d in 1..=days_in_month {
            if d <= work_count {
                map.insert(
                    d.to_string(),
                    serde_json::Value::String("work".to_string()),
                );
            }
        }
        let daily_status = serde_json::to_string(&serde_json::Value::Object(map))
            .unwrap_or_else(|_| "{}".to_string());

        // 查找已有记录
        let existing_id: Option<i64> = db
            .query_row(
                "SELECT id FROM attendances WHERE project_worker_id = ?1 AND year_month = ?2",
                params![rec.project_worker_id, year_month],
                |row| row.get(0),
            )
            .ok();

        if let Some(eid) = existing_id {
            // 更新：保留已有非 work 状态，覆盖前 N 天为 work
            let old_ds: Option<String> = db
                .query_row(
                    "SELECT daily_status FROM attendances WHERE id = ?1",
                    params![eid],
                    |row| row.get(0),
                )
                .unwrap_or(None);

            let merged_status = if let Some(ref old) = old_ds {
                if let Ok(serde_json::Value::Object(old_map)) = serde_json::from_str(old) {
                    let mut merged = old_map;
                    for d in 1..=work_count {
                        merged.insert(
                            d.to_string(),
                            serde_json::Value::String("work".to_string()),
                        );
                    }
                    serde_json::to_string(&serde_json::Value::Object(merged))
                        .unwrap_or_else(|_| daily_status.clone())
                } else {
                    daily_status.clone()
                }
            } else {
                daily_status.clone()
            };

            db.execute(
                "UPDATE attendances SET work_days = ?1, days_off = 0, is_full_attendance = 0,
                 daily_status = ?2, updated_at = ?3 WHERE id = ?4",
                params![work_days, merged_status, now, eid],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

            updated += 1;
        } else {
            // 新建
            db.execute(
                "INSERT INTO attendances (project_worker_id, project_id, year_month,
                 work_days, days_off, is_full_attendance, daily_status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, 0, 0, ?5, ?6, ?7)",
                params![rec.project_worker_id, project_id, year_month, work_days, daily_status, now, now],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

            created += 1;
        }
    }

    Ok(serde_json::json!({ "created": created, "updated": updated }))
}
