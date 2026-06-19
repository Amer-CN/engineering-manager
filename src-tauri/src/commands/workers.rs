/**
 * 工人管理命令
 *
 * 对应 Electron 版本的 workers.ts + project-workers.ts
 * 包含全局工人信息库、项目用工关系
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

// ============ 全局工人信息库 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Worker {
    pub id: i64,
    pub name: String,
    pub id_card: Option<String>,
    pub gender: Option<String>,
    pub birth_date: Option<String>,
    pub ethnicity: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub bank_account: Option<String>,
    pub bank_name: Option<String>,
    pub bank_line_no: Option<String>,
    pub worker_type: Option<String>,
    pub daily_wage: Option<f64>,
    pub created_at: Option<String>,
}

/// 获取所有工人（支持搜索和工种筛选）
#[command]
pub fn get_workers(
    state: State<'_, AppState>,
    search: Option<String>,
    worker_type: Option<String>,
) -> AppResult<Vec<Worker>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut sql = String::from(
        "SELECT id, name, id_card, gender, birth_date, ethnicity, phone, address,
                bank_account, bank_name, bank_line_no, worker_type, daily_wage, created_at
         FROM workers WHERE 1=1"
    );

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut param_index = 1;

    if let Some(ref s) = search {
        if !s.is_empty() {
            sql.push_str(&format!(
                " AND (name LIKE ?{} OR id_card LIKE ?{} OR phone LIKE ?{})",
                param_index, param_index + 1, param_index + 2
            ));
            let pattern = format!("%{}%", s);
            params.push(Box::new(pattern.clone()));
            params.push(Box::new(pattern.clone()));
            params.push(Box::new(pattern));
            param_index += 3;
        }
    }

    if let Some(ref wt) = worker_type {
        if !wt.is_empty() {
            sql.push_str(&format!(" AND worker_type = ?{}", param_index));
            params.push(Box::new(wt.clone()));
        }
    }

    sql.push_str(" ORDER BY created_at DESC");

    let mut stmt = db.prepare(&sql).map_err(|e| AppError::Database(e.to_string()))?;

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let workers = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(Worker {
                id: row.get(0)?,
                name: row.get(1)?,
                id_card: row.get(2)?,
                gender: row.get(3)?,
                birth_date: row.get(4)?,
                ethnicity: row.get(5)?,
                phone: row.get(6)?,
                address: row.get(7)?,
                bank_account: row.get(8)?,
                bank_name: row.get(9)?,
                bank_line_no: row.get(10)?,
                worker_type: row.get(11)?,
                daily_wage: row.get(12)?,
                created_at: row.get(13)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(workers)
}

/// 创建工人
#[command]
pub fn create_worker(state: State<'_, AppState>, worker: Worker) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查身份证号是否重复
    if let Some(ref id_card) = worker.id_card {
        if !id_card.is_empty() {
            let exists: bool = db
                .query_row(
                    "SELECT COUNT(*) FROM workers WHERE id_card = ?1",
                    params![id_card],
                    |row| row.get::<_, i64>(0),
                )
                .map_err(|e| AppError::Database(e.to_string()))?
                > 0;

            if exists {
                return Err(AppError::Validation(
                    "该身份证号已存在".to_string(),
                ));
            }
        }
    }

    db.execute(
        "INSERT INTO workers (name, id_card, gender, birth_date, ethnicity, phone, address,
         bank_account, bank_name, bank_line_no, worker_type, daily_wage)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            worker.name,
            worker.id_card,
            worker.gender,
            worker.birth_date,
            worker.ethnicity,
            worker.phone,
            worker.address,
            worker.bank_account,
            worker.bank_name,
            worker.bank_line_no,
            worker.worker_type,
            worker.daily_wage,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新工人
#[command]
pub fn update_worker(state: State<'_, AppState>, worker: Worker) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE workers SET name = ?1, id_card = ?2, gender = ?3, birth_date = ?4,
             ethnicity = ?5, phone = ?6, address = ?7, bank_account = ?8, bank_name = ?9,
             bank_line_no = ?10, worker_type = ?11, daily_wage = ?12
             WHERE id = ?13",
            params![
                worker.name,
                worker.id_card,
                worker.gender,
                worker.birth_date,
                worker.ethnicity,
                worker.phone,
                worker.address,
                worker.bank_account,
                worker.bank_name,
                worker.bank_line_no,
                worker.worker_type,
                worker.daily_wage,
                worker.id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("工人 {} 不存在", worker.id)));
    }

    Ok(())
}

/// 删除工人
#[command]
pub fn delete_worker(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查是否有项目用工关系
    let project_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM project_workers WHERE worker_id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if project_count > 0 {
        return Err(AppError::Validation(format!(
            "该工人还有 {} 个项目用工关系，请先移除",
            project_count
        )));
    }

    let affected = db
        .execute("DELETE FROM workers WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("工人 {} 不存在", id)));
    }

    Ok(())
}

// ============ 项目用工关系 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectWorker {
    pub id: i64,
    pub worker_id: i64,
    pub project_id: i64,
    pub team_id: Option<i64>,
    pub daily_wage: f64,
    pub worker_type: Option<String>,
    pub entry_date: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
    // 关联查询
    pub worker_name: Option<String>,
    pub worker_id_card: Option<String>,
    pub project_name: Option<String>,
    pub team_name: Option<String>,
}

/// 获取项目工人列表
#[command]
pub fn get_project_workers(
    state: State<'_, AppState>,
    project_id: i64,
) -> AppResult<Vec<ProjectWorker>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT pw.id, pw.worker_id, pw.project_id, pw.team_id, pw.daily_wage,
                    pw.worker_type, pw.entry_date, pw.status, pw.remarks, pw.created_at,
                    w.name as worker_name, w.id_card as worker_id_card,
                    p.name as project_name,
                    wt.name as team_name
             FROM project_workers pw
             LEFT JOIN workers w ON pw.worker_id = w.id
             LEFT JOIN projects p ON pw.project_id = p.id
             LEFT JOIN worker_teams wt ON pw.team_id = wt.id
             WHERE pw.project_id = ?1
             ORDER BY pw.created_at DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let workers = stmt
        .query_map(params![project_id], |row| {
            Ok(ProjectWorker {
                id: row.get(0)?,
                worker_id: row.get(1)?,
                project_id: row.get(2)?,
                team_id: row.get(3)?,
                daily_wage: row.get(4)?,
                worker_type: row.get(5)?,
                entry_date: row.get(6)?,
                status: row.get(7)?,
                remarks: row.get(8)?,
                created_at: row.get(9)?,
                worker_name: row.get(10)?,
                worker_id_card: row.get(11)?,
                project_name: row.get(12)?,
                team_name: row.get(13)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(workers)
}

/// 创建项目用工关系
#[command]
pub fn create_project_worker(
    state: State<'_, AppState>,
    worker_id: i64,
    project_id: i64,
    team_id: Option<i64>,
    daily_wage: f64,
    worker_type: String,
    entry_date: String,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查是否已存在
    let exists: bool = db
        .query_row(
            "SELECT COUNT(*) FROM project_workers WHERE worker_id = ?1 AND project_id = ?2",
            params![worker_id, project_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?
        > 0;

    if exists {
        return Err(AppError::Validation(
            "该工人已在此项目中".to_string(),
        ));
    }

    db.execute(
        "INSERT INTO project_workers (worker_id, project_id, team_id, daily_wage, worker_type, entry_date)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![worker_id, project_id, team_id, daily_wage, worker_type, entry_date],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 批量创建时的条目
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchProjectWorkerEntry {
    pub worker_id: i64,
    pub project_id: i64,
    pub team_id: Option<i64>,
    pub daily_wage: f64,
    pub worker_type: String,
    pub entry_date: String,
}

/// 批量创建项目用工关系
#[command]
pub fn batch_create_project_workers(
    state: State<'_, AppState>,
    pws: Vec<BatchProjectWorkerEntry>,
) -> AppResult<Vec<i64>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut ids = Vec::new();

    for entry in pws {
        let worker_id = entry.worker_id;
        let project_id = entry.project_id;
        let team_id = entry.team_id;
        let daily_wage = entry.daily_wage;
        let worker_type = entry.worker_type;
        let entry_date = entry.entry_date;
        // 检查是否已存在
        let exists: bool = db
            .query_row(
                "SELECT COUNT(*) FROM project_workers WHERE worker_id = ?1 AND project_id = ?2",
                params![worker_id, project_id],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))?
            > 0;

        if !exists {
            db.execute(
                "INSERT INTO project_workers (worker_id, project_id, team_id, daily_wage, worker_type, entry_date)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![worker_id, project_id, team_id, daily_wage, worker_type, entry_date],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

            ids.push(db.last_insert_rowid());
        }
    }

    Ok(ids)
}

/// 更新项目用工关系
#[command]
pub fn update_project_worker(
    state: State<'_, AppState>,
    id: i64,
    team_id: Option<i64>,
    daily_wage: Option<f64>,
    worker_type: Option<String>,
    status: Option<String>,
    remarks: Option<String>,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE project_workers SET
             team_id = COALESCE(?1, team_id),
             daily_wage = COALESCE(?2, daily_wage),
             worker_type = COALESCE(?3, worker_type),
             status = COALESCE(?4, status),
             remarks = COALESCE(?5, remarks)
             WHERE id = ?6",
            params![team_id, daily_wage, worker_type, status, remarks, id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "项目用工关系 {} 不存在",
            id
        )));
    }

    Ok(())
}

/// 工人统计
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerStats {
    pub project_count: i64,
    pub total_earnings: f64,
    pub project_breakdown: Vec<WorkerProjectBreakdown>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerProjectBreakdown {
    pub project_id: i64,
    pub project_name: String,
    pub total: f64,
}

/// 获取工人统计（项目数 + 总收入 + 按项目拆分）
#[command]
pub fn get_worker_stats(
    state: State<'_, AppState>,
    worker_id: i64,
) -> AppResult<WorkerStats> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 项目数
    let project_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM project_workers WHERE worker_id = ?1",
            params![worker_id],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    // 总收入（从 wages 表按 project_worker_id 汇总）
    let total_earnings: f64 = db
        .query_row(
            "SELECT COALESCE(SUM(w.actual_wage), 0)
             FROM wages w
             INNER JOIN project_workers pw ON w.project_worker_id = pw.id
             WHERE pw.worker_id = ?1",
            params![worker_id],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    // 按项目拆分
    let mut stmt = db
        .prepare(
            "SELECT pr.id, pr.name, COALESCE(SUM(w.actual_wage), 0) as total
             FROM project_workers pw
             INNER JOIN projects pr ON pw.project_id = pr.id
             LEFT JOIN wages w ON w.project_worker_id = pw.id
             WHERE pw.worker_id = ?1
             GROUP BY pr.id, pr.name
             ORDER BY total DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let breakdown = stmt
        .query_map(params![worker_id], |row| {
            Ok(WorkerProjectBreakdown {
                project_id: row.get(0)?,
                project_name: row.get(1)?,
                total: row.get(2)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(WorkerStats {
        project_count,
        total_earnings,
        project_breakdown: breakdown,
    })
}

/// 删除项目用工关系
#[command]
pub fn delete_project_worker(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM project_workers WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "项目用工关系 {} 不存在",
            id
        )));
    }

    Ok(())
}
