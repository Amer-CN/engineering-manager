/**
 * 班组管理命令
 *
 * 对应 Electron 版本的 worker-teams.ts（从 members.ts 拆分）
 * Table: worker_teams(id, name, project_id, leader_id, created_at, updated_at)
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerTeam {
    pub id: i64,
    pub name: String,
    pub project_id: i64,
    pub leader_id: Option<i64>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    // JOIN enrichment
    pub project_name: Option<String>,
    pub leader_name: Option<String>,
    pub worker_count: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateWorkerTeam {
    pub name: String,
    pub project_id: Option<i64>,
    pub leader_id: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWorkerTeam {
    pub name: Option<String>,
    pub leader_id: Option<i64>,
    pub notes: Option<String>,
}

/// 获取班组列表（可选项目过滤）
#[command]
pub fn get_worker_teams(
    state: State<'_, AppState>,
    project_id: Option<i64>,
) -> AppResult<Vec<WorkerTeam>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let (sql, param_values): (&str, Vec<Box<dyn rusqlite::types::ToSql>>) = if let Some(pid) = project_id {
        (
            "SELECT wt.id, wt.name, wt.project_id, wt.leader_id, wt.created_at, wt.updated_at,
                    p.name as project_name,
                    m.name as leader_name,
                    (SELECT COUNT(*) FROM project_workers pw WHERE pw.team_id = wt.id) as worker_count
             FROM worker_teams wt
             LEFT JOIN projects p ON wt.project_id = p.id
             LEFT JOIN members m ON wt.leader_id = m.id
             WHERE wt.project_id = ?1
             ORDER BY wt.created_at DESC",
            vec![Box::new(pid)],
        )
    } else {
        (
            "SELECT wt.id, wt.name, wt.project_id, wt.leader_id, wt.created_at, wt.updated_at,
                    p.name as project_name,
                    m.name as leader_name,
                    (SELECT COUNT(*) FROM project_workers pw WHERE pw.team_id = wt.id) as worker_count
             FROM worker_teams wt
             LEFT JOIN projects p ON wt.project_id = p.id
             LEFT JOIN members m ON wt.leader_id = m.id
             ORDER BY wt.created_at DESC",
            vec![],
        )
    };

    let mut stmt = db.prepare(sql).map_err(|e| AppError::Database(e.to_string()))?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let teams = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(WorkerTeam {
                id: row.get(0)?,
                name: row.get(1)?,
                project_id: row.get(2)?,
                leader_id: row.get(3)?,
                notes: None,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                project_name: row.get(6)?,
                leader_name: row.get(7)?,
                worker_count: row.get(8)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(teams)
}

/// 创建班组
#[command]
pub fn create_worker_team(
    state: State<'_, AppState>,
    team: CreateWorkerTeam,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查同名班组
    let exists: bool = db
        .query_row(
            "SELECT COUNT(*) FROM worker_teams WHERE name = ?1 AND project_id = ?2",
            params![team.name, team.project_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?
        > 0;

    if exists {
        return Err(AppError::Validation(
            "该项目下已存在同名班组".to_string(),
        ));
    }

    db.execute(
        "INSERT INTO worker_teams (name, project_id, leader_id) VALUES (?1, ?2, ?3)",
        params![team.name, team.project_id, team.leader_id],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新班组
#[command]
pub fn update_worker_team(
    state: State<'_, AppState>,
    id: i64,
    updates: UpdateWorkerTeam,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE worker_teams SET
             name = COALESCE(?1, name),
             leader_id = ?2,
             updated_at = datetime('now')
             WHERE id = ?3",
            params![updates.name, updates.leader_id, id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("班组 {} 不存在", id)));
    }

    Ok(())
}

/// 删除班组（检查是否有工人关联）
#[command]
pub fn delete_worker_team(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查是否有工人关联
    let worker_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM project_workers WHERE team_id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if worker_count > 0 {
        return Err(AppError::Validation(format!(
            "班组下还有 {} 名工人，请先移除或调组",
            worker_count
        )));
    }

    let affected = db
        .execute("DELETE FROM worker_teams WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("班组 {} 不存在", id)));
    }

    Ok(())
}
