/**
 * 部门管理命令
 *
 * 对应 Electron 版本的 departments.ts
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

/// 解析 JSON 字符串为 Vec<String>
fn parse_positions(json: Option<String>) -> Option<Vec<String>> {
    json.and_then(|s| serde_json::from_str(&s).ok())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Department {
    pub id: i64,
    pub name: String,
    pub manager_id: Option<i64>,
    pub positions: Option<Vec<String>>,
    pub created_at: Option<String>,
    pub manager_name: Option<String>,
    pub member_count: Option<i64>,
}

/// 获取所有部门
#[command]
pub fn get_departments(state: State<'_, AppState>) -> AppResult<Vec<Department>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT d.id, d.name, d.manager_id, d.positions, d.created_at,
                    m.name as manager_name,
                    (SELECT COUNT(*) FROM members WHERE department_id = d.id) as member_count
             FROM departments d
             LEFT JOIN members m ON d.manager_id = m.id
             ORDER BY d.name",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let departments = stmt
        .query_map([], |row| {
            Ok(Department {
                id: row.get(0)?,
                name: row.get(1)?,
                manager_id: row.get(2)?,
                positions: parse_positions(row.get(3)?),
                created_at: row.get(4)?,
                manager_name: row.get(5)?,
                member_count: row.get(6)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(departments)
}

/// 创建部门
#[command]
pub fn create_department(
    state: State<'_, AppState>,
    name: String,
    manager_id: Option<i64>,
    positions: Option<String>,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查同名部门
    let exists: bool = db
        .query_row(
            "SELECT COUNT(*) FROM departments WHERE name = ?1",
            params![name],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?
        > 0;

    if exists {
        return Err(AppError::Validation(
            "已存在同名部门".to_string(),
        ));
    }

    db.execute(
        "INSERT INTO departments (name, manager_id, positions) VALUES (?1, ?2, ?3)",
        params![name, manager_id, positions],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新部门
#[command]
pub fn update_department(
    state: State<'_, AppState>,
    id: i64,
    name: Option<String>,
    manager_id: Option<i64>,
    positions: Option<String>,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE departments SET
             name = COALESCE(?1, name),
             manager_id = ?2,
             positions = COALESCE(?3, positions)
             WHERE id = ?4",
            params![name, manager_id, positions, id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("部门 {} 不存在", id)));
    }

    Ok(())
}

/// 删除部门
#[command]
pub fn delete_department(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查是否有成员关联
    let member_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM members WHERE department_id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if member_count > 0 {
        return Err(AppError::Validation(format!(
            "部门下还有 {} 名成员，请先调部门",
            member_count
        )));
    }

    let affected = db
        .execute("DELETE FROM departments WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("部门 {} 不存在", id)));
    }

    Ok(())
}
