/**
 * 材料管理命令
 *
 * 对应 Electron 版本的 materials.ts（材料部分）
 * 表: materials(id, project_id, name, category, unit, quantity, price, created_at)
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Material {
    pub id: i64,
    pub project_id: i64,
    pub name: String,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub price: f64,
    pub created_at: Option<String>,
    // JOIN 字段
    pub project_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewMaterial {
    pub project_id: i64,
    pub name: String,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub quantity: Option<f64>,
    pub price: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialUpdate {
    pub name: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub quantity: Option<f64>,
    pub price: Option<f64>,
}

/// 获取材料列表（可按项目过滤）
#[command]
pub fn get_materials(
    state: State<'_, AppState>,
    project_id: Option<i64>,
) -> AppResult<Vec<Material>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let sql = if project_id.is_some() {
        "SELECT m.id, m.project_id, m.name, m.category, m.unit, m.quantity,
                m.price, m.created_at, p.name as project_name
         FROM materials m
         LEFT JOIN projects p ON m.project_id = p.id
         WHERE m.project_id = ?1
         ORDER BY m.created_at DESC"
    } else {
        "SELECT m.id, m.project_id, m.name, m.category, m.unit, m.quantity,
                m.price, m.created_at, p.name as project_name
         FROM materials m
         LEFT JOIN projects p ON m.project_id = p.id
         ORDER BY m.created_at DESC"
    };

    let mut stmt = db
        .prepare(sql)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let materials = if let Some(pid) = project_id {
        stmt.query_map(params![pid], |row| {
            Ok(Material {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                unit: row.get(4)?,
                quantity: row.get(5)?,
                price: row.get(6)?,
                created_at: row.get(7)?,
                project_name: row.get(8)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    } else {
        stmt.query_map([], |row| {
            Ok(Material {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                unit: row.get(4)?,
                quantity: row.get(5)?,
                price: row.get(6)?,
                created_at: row.get(7)?,
                project_name: row.get(8)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    };

    Ok(materials)
}

/// 新增材料
#[command]
pub fn create_material(state: State<'_, AppState>, material: NewMaterial) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO materials (project_id, name, category, unit, quantity, price)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            material.project_id,
            material.name,
            material.category,
            material.unit,
            material.quantity.unwrap_or(0.0),
            material.price.unwrap_or(0.0),
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新材料
#[command]
pub fn update_material(
    state: State<'_, AppState>,
    id: i64,
    updates: MaterialUpdate,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE materials SET
             name = COALESCE(?1, name),
             category = COALESCE(?2, category),
             unit = COALESCE(?3, unit),
             quantity = COALESCE(?4, quantity),
             price = COALESCE(?5, price)
             WHERE id = ?6",
            params![
                updates.name,
                updates.category,
                updates.unit,
                updates.quantity,
                updates.price,
                id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("材料 {} 不存在", id)));
    }

    Ok(())
}

/// 删除材料
#[command]
pub fn delete_material(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM materials WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("材料 {} 不存在", id)));
    }

    Ok(())
}
