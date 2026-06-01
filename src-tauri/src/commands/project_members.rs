/**
 * 项目成员关联命令
 *
 * 对应 Electron 版本的 project-members.ts
 * Table: project_members(id, project_id, member_id, joined_at)
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMember {
    pub id: i64,
    pub project_id: i64,
    pub member_id: i64,
    pub joined_at: Option<String>,
    pub member_name: Option<String>,
    pub member_role: Option<String>,
    pub member_type: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectMember {
    pub joined_at: Option<String>,
}

/// 获取项目成员列表（JOIN members 获取姓名/角色）
#[command]
pub fn get_project_members(
    state: State<'_, AppState>,
    project_id: i64,
) -> AppResult<Vec<ProjectMember>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT pm.id, pm.project_id, pm.member_id, pm.joined_at,
                    m.name as member_name, m.role as member_role,
                    m.member_type, m.phone
             FROM project_members pm
             LEFT JOIN members m ON pm.member_id = m.id
             WHERE pm.project_id = ?1
             ORDER BY pm.joined_at DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let members = stmt
        .query_map(params![project_id], |row| {
            Ok(ProjectMember {
                id: row.get(0)?,
                project_id: row.get(1)?,
                member_id: row.get(2)?,
                joined_at: row.get(3)?,
                member_name: row.get(4)?,
                member_role: row.get(5)?,
                member_type: row.get(6)?,
                phone: row.get(7)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(members)
}

/// 添加项目成员
#[command]
pub fn add_project_member(
    state: State<'_, AppState>,
    project_id: i64,
    member_id: i64,
    joined_at: Option<String>,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查是否已存在
    let exists: bool = db
        .query_row(
            "SELECT COUNT(*) FROM project_members WHERE project_id = ?1 AND member_id = ?2",
            params![project_id, member_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?
        > 0;

    if exists {
        return Err(AppError::Validation("该成员已在项目中".to_string()));
    }

    let joined = joined_at.unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d").to_string());

    db.execute(
        "INSERT INTO project_members (project_id, member_id, joined_at) VALUES (?1, ?2, ?3)",
        params![project_id, member_id, joined],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(db.last_insert_rowid())
}

/// 移除项目成员（硬删除）
#[command]
pub fn remove_project_member(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM project_members WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("项目成员关系 {} 不存在", id)));
    }

    Ok(())
}

/// 更新项目成员
#[command]
pub fn update_project_member(
    state: State<'_, AppState>,
    id: i64,
    updates: UpdateProjectMember,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE project_members SET joined_at = COALESCE(?1, joined_at) WHERE id = ?2",
            params![updates.joined_at, id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("项目成员关系 {} 不存在", id)));
    }

    Ok(())
}
