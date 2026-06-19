/**
 * 项目管理命令
 *
 * 对应 Electron 版本的 projects.ts
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub address: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<String>,
    pub budget: f64,
    pub project_manager_id: Option<i64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub project_manager_name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProject {
    pub name: String,
    pub description: Option<String>,
    pub address: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<String>,
    pub budget: Option<f64>,
    pub project_manager_id: Option<i64>,
}

/// 获取所有项目
#[command]
pub fn get_projects(state: State<'_, AppState>) -> AppResult<Vec<Project>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT p.id, p.name, p.description, p.address, p.start_date, p.end_date,
                    p.status, p.budget, p.project_manager_id, p.created_at, p.updated_at,
                    m.name as project_manager_name
             FROM projects p
             LEFT JOIN members m ON p.project_manager_id = m.id
             ORDER BY p.id DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let projects = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                address: row.get(3)?,
                start_date: row.get(4)?,
                end_date: row.get(5)?,
                status: row.get(6)?,
                budget: row.get(7)?,
                project_manager_id: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                project_manager_name: row.get(11)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(projects)
}

/// 获取单个项目
#[command]
pub fn get_project(state: State<'_, AppState>, id: i64) -> AppResult<Project> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.query_row(
        "SELECT p.id, p.name, p.description, p.address, p.start_date, p.end_date,
                p.status, p.budget, p.project_manager_id, p.created_at, p.updated_at,
                m.name as project_manager_name
         FROM projects p
         LEFT JOIN members m ON p.project_manager_id = m.id
         WHERE p.id = ?1",
        params![id],
        |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                address: row.get(3)?,
                start_date: row.get(4)?,
                end_date: row.get(5)?,
                status: row.get(6)?,
                budget: row.get(7)?,
                project_manager_id: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                project_manager_name: row.get(11)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("项目 {} 不存在", id))
        }
        _ => AppError::Database(e.to_string()),
    })
}

/// 创建项目
#[command]
pub fn create_project(state: State<'_, AppState>, project: CreateProject) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    db.execute(
        "INSERT INTO projects (name, description, address, start_date, end_date, status, budget, project_manager_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            project.name,
            project.description,
            project.address,
            project.start_date,
            project.end_date,
            project.status.unwrap_or_else(|| "planning".to_string()),
            project.budget.unwrap_or(0.0),
            project.project_manager_id,
            now,
            now,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(db.last_insert_rowid())
}

/// 更新项目
#[command]
pub fn update_project(state: State<'_, AppState>, project: Project) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE projects SET name = ?1, description = ?2, address = ?3, start_date = ?4,
             end_date = ?5, status = ?6, budget = ?7, project_manager_id = ?8, updated_at = datetime('now')
             WHERE id = ?9",
            params![
                project.name,
                project.description,
                project.address,
                project.start_date,
                project.end_date,
                project.status,
                project.budget,
                project.project_manager_id,
                project.id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("项目 {} 不存在", project.id)));
    }

    Ok(())
}

/// 删除项目
#[command]
pub fn delete_project(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查是否有关联数据
    let checks = vec![
        ("project_workers", "工人"),
        ("income_contracts", "收入合同"),
        ("expense_contracts", "支出合同"),
        ("invoices", "发票"),
        ("settlements", "结算"),
    ];

    for (table, label) in checks {
        let count: i64 = db
            .query_row(
                &format!("SELECT COUNT(*) FROM {} WHERE project_id = ?1", table),
                params![id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if count > 0 {
            return Err(AppError::Validation(format!(
                "项目下还有 {} 条{}记录，请先删除",
                count, label
            )));
        }
    }

    let affected = db
        .execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("项目 {} 不存在", id)));
    }

    // 级联删除成本台账
    db.execute(
        "DELETE FROM cost_ledger WHERE project_id = ?1",
        params![id],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}
