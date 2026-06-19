/**
 * 合同模板命令
 *
 * 对应 Electron 版本的 contracts.ts（template section）
 * Table: contract_templates(id, name, type, description, file_path, file_name,
 *        variables, created_at, updated_at)
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractTemplate {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub template_type: Option<String>,
    pub description: Option<String>,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub variables: Option<String>, // JSON array
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateContractTemplate {
    pub name: String,
    #[serde(rename = "type")]
    pub template_type: Option<String>,
    pub description: Option<String>,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub variables: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContractTemplate {
    pub name: Option<String>,
    #[serde(rename = "type")]
    pub template_type: Option<String>,
    pub description: Option<String>,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub variables: Option<String>,
}

/// 获取所有合同模板
#[command]
pub fn get_contract_templates(state: State<'_, AppState>) -> AppResult<Vec<ContractTemplate>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT id, name, type, description, file_path, file_name,
                    variables, created_at, updated_at
             FROM contract_templates
             ORDER BY created_at DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let templates = stmt
        .query_map([], |row| {
            Ok(ContractTemplate {
                id: row.get(0)?,
                name: row.get(1)?,
                template_type: row.get(2)?,
                description: row.get(3)?,
                file_path: row.get(4)?,
                file_name: row.get(5)?,
                variables: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(templates)
}

/// 创建合同模板
#[command]
pub fn create_contract_template(
    state: State<'_, AppState>,
    template: CreateContractTemplate,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO contract_templates (name, type, description, file_path, file_name, variables)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            template.name,
            template.template_type.unwrap_or_else(|| "other".to_string()),
            template.description,
            template.file_path,
            template.file_name,
            template.variables,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新合同模板
#[command]
pub fn update_contract_template(
    state: State<'_, AppState>,
    id: i64,
    updates: UpdateContractTemplate,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 查询现有记录
    let existing = db
        .query_row(
            "SELECT name, type, description, file_path, file_name, variables
             FROM contract_templates WHERE id = ?1",
            params![id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                ))
            },
        )
        .map_err(|_| AppError::NotFound(format!("合同模板 {} 不存在", id)))?;

    let (old_name, old_type, old_desc, old_path, old_fname, old_vars) = existing;

    let affected = db
        .execute(
            "UPDATE contract_templates SET name = ?1, type = ?2, description = ?3,
             file_path = ?4, file_name = ?5, variables = ?6, updated_at = datetime('now')
             WHERE id = ?7",
            params![
                updates.name.unwrap_or(old_name),
                updates.template_type.unwrap_or(old_type),
                updates.description.or(old_desc),
                updates.file_path.or(old_path),
                updates.file_name.or(old_fname),
                updates.variables.or(old_vars),
                id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("合同模板 {} 不存在", id)));
    }

    Ok(())
}

/// 删除合同模板
#[command]
pub fn delete_contract_template(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM contract_templates WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("合同模板 {} 不存在", id)));
    }

    Ok(())
}
