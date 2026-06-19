/**
 * 图纸管理命令
 *
 * 对应 Electron 版本的 drawings.ts
 * 表: drawings(id, project_id, name, category, file_path, remarks, position, created_at)
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Drawing {
    pub id: i64,
    pub project_id: Option<i64>,
    pub name: String,
    pub category: Option<String>,
    pub file_path: Option<String>,
    pub remarks: Option<String>,
    pub position: Option<String>,
    pub created_at: Option<String>,
    // JOIN 字段
    pub project_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewDrawing {
    pub project_id: Option<i64>,
    pub name: String,
    pub category: Option<String>,
    pub file_path: Option<String>,
    pub remarks: Option<String>,
    pub position: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrawingUpdate {
    pub name: Option<String>,
    pub category: Option<String>,
    pub file_path: Option<String>,
    pub remarks: Option<String>,
    pub position: Option<String>,
}

/// 获取图纸列表（可按项目过滤）
#[command]
pub fn get_drawings(
    state: State<'_, AppState>,
    project_id: Option<i64>,
) -> AppResult<Vec<Drawing>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let sql = if project_id.is_some() {
        "SELECT d.id, d.project_id, d.name, d.category, d.file_path, d.remarks,
                d.position, d.created_at, p.name as project_name
         FROM drawings d
         LEFT JOIN projects p ON d.project_id = p.id
         WHERE d.project_id = ?1
         ORDER BY d.created_at DESC"
    } else {
        "SELECT d.id, d.project_id, d.name, d.category, d.file_path, d.remarks,
                d.position, d.created_at, p.name as project_name
         FROM drawings d
         LEFT JOIN projects p ON d.project_id = p.id
         ORDER BY d.created_at DESC"
    };

    let mut stmt = db
        .prepare(sql)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let drawings = if let Some(pid) = project_id {
        stmt.query_map(params![pid], |row| {
            Ok(Drawing {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                file_path: row.get(4)?,
                remarks: row.get(5)?,
                position: row.get(6)?,
                created_at: row.get(7)?,
                project_name: row.get(8)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    } else {
        stmt.query_map([], |row| {
            Ok(Drawing {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                file_path: row.get(4)?,
                remarks: row.get(5)?,
                position: row.get(6)?,
                created_at: row.get(7)?,
                project_name: row.get(8)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    };

    Ok(drawings)
}

/// 新增图纸
#[command]
pub fn upload_drawing(state: State<'_, AppState>, drawing: NewDrawing) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO drawings (project_id, name, category, file_path, remarks, position)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            drawing.project_id,
            drawing.name,
            drawing.category,
            drawing.file_path,
            drawing.remarks,
            drawing.position,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新图纸
#[command]
pub fn update_drawing(
    state: State<'_, AppState>,
    id: i64,
    updates: DrawingUpdate,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE drawings SET
             name = COALESCE(?1, name),
             category = COALESCE(?2, category),
             file_path = COALESCE(?3, file_path),
             remarks = COALESCE(?4, remarks),
             position = COALESCE(?5, position)
             WHERE id = ?6",
            params![
                updates.name,
                updates.category,
                updates.file_path,
                updates.remarks,
                updates.position,
                id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("图纸 {} 不存在", id)));
    }

    Ok(())
}

/// 删除图纸
#[command]
pub fn delete_drawing(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM drawings WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("图纸 {} 不存在", id)));
    }

    Ok(())
}
