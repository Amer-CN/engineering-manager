/**
 * 模板管理命令
 *
 * 对应 Electron 版本的 templates.ts
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Template {
    pub id: i64,
    pub name: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub file_name: Option<String>,
    pub stored_file_name: Option<String>,
    pub file_type: Option<String>,
    pub variables: Option<String>, // JSON array
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

/// 获取模板列表
#[command]
pub fn get_templates(
    state: State<'_, AppState>,
    category: Option<String>,
) -> AppResult<Vec<Template>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let sql = if category.is_some() {
        "SELECT id, name, category, description, file_name, stored_file_name, file_type,
                variables, created_at, updated_at
         FROM templates
         WHERE category = ?1
         ORDER BY created_at DESC"
    } else {
        "SELECT id, name, category, description, file_name, stored_file_name, file_type,
                variables, created_at, updated_at
         FROM templates
         ORDER BY created_at DESC"
    };

    let mut stmt = db.prepare(sql).map_err(|e| AppError::Database(e.to_string()))?;

    let templates = if let Some(ref cat) = category {
        stmt.query_map(params![cat], |row| {
            Ok(Template {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                description: row.get(3)?,
                file_name: row.get(4)?,
                stored_file_name: row.get(5)?,
                file_type: row.get(6)?,
                variables: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    } else {
        stmt.query_map([], |row| {
            Ok(Template {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                description: row.get(3)?,
                file_name: row.get(4)?,
                stored_file_name: row.get(5)?,
                file_type: row.get(6)?,
                variables: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    };

    Ok(templates)
}

/// 创建模板
#[command]
pub fn create_template(state: State<'_, AppState>, template: Template) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO templates (name, category, description, file_name, stored_file_name, file_type, variables)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            template.name,
            template.category,
            template.description,
            template.file_name,
            template.stored_file_name,
            template.file_type,
            template.variables,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新模板
#[command]
pub fn update_template(state: State<'_, AppState>, template: Template) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE templates SET name = ?1, category = ?2, description = ?3, file_name = ?4,
             stored_file_name = ?5, file_type = ?6, variables = ?7, updated_at = datetime('now')
             WHERE id = ?8",
            params![
                template.name,
                template.category,
                template.description,
                template.file_name,
                template.stored_file_name,
                template.file_type,
                template.variables,
                template.id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("模板 {} 不存在", template.id)));
    }

    Ok(())
}

/// 删除模板
#[command]
pub fn delete_template(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM templates WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("模板 {} 不存在", id)));
    }

    Ok(())
}

/// 获取模板统计
#[command]
pub fn get_template_stats(state: State<'_, AppState>) -> AppResult<std::collections::HashMap<String, i64>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare("SELECT category, COUNT(*) FROM templates GROUP BY category")
        .map_err(|e| AppError::Database(e.to_string()))?;

    let stats = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<std::collections::HashMap<String, i64>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(stats)
}
