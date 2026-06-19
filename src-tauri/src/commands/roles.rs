/**
 * 角色权限命令
 *
 * 对应 Electron 版本的 roles.ts
 * 包含角色查询、权限更新、权限重置
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;
use tauri::{command, State};

// ============ 系统角色定义 ============

fn system_role_names() -> &'static HashMap<&'static str, &'static str> {
    static MAP: OnceLock<HashMap<&'static str, &'static str>> = OnceLock::new();
    MAP.get_or_init(|| {
        let mut m = HashMap::new();
        m.insert("admin", "管理员");
        m.insert("manager", "项目经理");
        m.insert("accountant", "财务人员");
        m.insert("worker", "普通员工");
        m
    })
}

fn system_role_defaults() -> &'static HashMap<&'static str, Vec<&'static str>> {
    static MAP: OnceLock<HashMap<&'static str, Vec<&'static str>>> = OnceLock::new();
    MAP.get_or_init(|| {
        let mut m = HashMap::new();
        m.insert("admin", vec![
            "dashboard:read", "projects:create", "projects:read", "projects:update", "projects:delete",
            "contracts:create", "contracts:read", "contracts:update", "contracts:delete",
            "partners:create", "partners:read", "partners:update", "partners:delete",
            "members:create", "members:read", "members:update", "members:delete",
            "wages:create", "wages:read", "wages:update", "wages:delete",
            "settlement:create", "settlement:read", "settlement:update", "settlement:delete",
            "inventory:create", "inventory:read", "inventory:update", "inventory:delete",
            "invoices:create", "invoices:read", "invoices:update", "invoices:delete",
            "expenses:create", "expenses:read", "expenses:update", "expenses:delete",
            "costLedger:create", "costLedger:read", "costLedger:update", "costLedger:delete",
            "drawings:create", "drawings:read", "drawings:update", "drawings:delete",
            "settings:read", "settings:update",
            "users:create", "users:read", "users:update", "users:delete",
            "roles:read", "roles:update",
            "audit_logs:read", "audit_logs:export",
        ]);
        m.insert("manager", vec![
            "dashboard:read", "projects:read", "projects:update",
            "contracts:read", "contracts:update",
            "partners:read", "partners:update",
            "members:read", "members:update",
            "wages:read", "wages:update",
            "settlement:read", "settlement:update",
            "inventory:read", "inventory:update",
            "invoices:read", "invoices:update",
            "expenses:read", "expenses:update",
            "costLedger:read", "costLedger:update",
            "drawings:read", "drawings:update",
            "settings:read",
            "users:read",
            "roles:read",
            "audit_logs:read",
        ]);
        m.insert("accountant", vec![
            "dashboard:read", "projects:read",
            "contracts:read", "contracts:update",
            "partners:read",
            "members:read",
            "wages:create", "wages:read", "wages:update",
            "settlement:read", "settlement:update",
            "inventory:read",
            "invoices:create", "invoices:read", "invoices:update",
            "expenses:create", "expenses:read", "expenses:update",
            "costLedger:create", "costLedger:read", "costLedger:update",
            "drawings:read",
            "settings:read",
            "users:read",
            "roles:read",
            "audit_logs:read", "audit_logs:export",
        ]);
        m.insert("worker", vec![
            "dashboard:read", "projects:read",
            "members:read",
            "wages:read",
            "drawings:read",
        ]);
        m
    })
}

// ============ 类型定义 ============

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Role {
    pub id: String,
    pub name: String,
    pub permissions: Vec<String>,
    pub created_at: Option<String>,
}

// ============ 工具函数 ============

/// 获取角色默认权限
fn get_default_permissions(role_id: &str) -> Vec<String> {
    system_role_defaults()
        .get(role_id)
        .map(|v| v.iter().map(|s| s.to_string()).collect())
        .unwrap_or_default()
}

// ============ 命令实现 ============

/// 获取所有角色
#[command]
pub fn get_roles(state: State<'_, AppState>) -> AppResult<Vec<Role>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 查询自定义角色（容错：旧数据库可能没有 created_at 列）
    let has_created_at = db
        .prepare("SELECT COUNT(*) FROM pragma_table_info('roles') WHERE name='created_at'")
        .and_then(|mut s| s.query_row([], |row| row.get::<_, i64>(0)))
        .unwrap_or(0)
        > 0;

    let sql = if has_created_at {
        "SELECT id, name, permissions, created_at FROM roles ORDER BY id"
    } else {
        "SELECT id, name, permissions, NULL as created_at FROM roles ORDER BY id"
    };

    let mut stmt = db
        .prepare(sql)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut roles: Vec<Role> = stmt
        .query_map([], |row| {
            let permissions_json: String = row.get(2)?;
            let permissions: Vec<String> =
                serde_json::from_str(&permissions_json).unwrap_or_default();
            Ok(Role {
                id: row.get(0)?,
                name: row.get(1)?,
                permissions,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    // 补充系统角色（如果数据库中没有）
    let existing_ids: Vec<String> = roles.iter().map(|r| r.id.clone()).collect();
    for (role_id, role_name) in system_role_names().iter() {
        if !existing_ids.contains(&role_id.to_string()) {
            roles.push(Role {
                id: role_id.to_string(),
                name: role_name.to_string(),
                permissions: get_default_permissions(role_id),
                created_at: None,
            });
        }
    }

    Ok(roles)
}

/// 更新角色权限
#[command]
pub fn update_role(
    state: State<'_, AppState>,
    role_id: String,
    permissions: Vec<String>,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let permissions_json =
        serde_json::to_string(&permissions).map_err(|e| AppError::Serialization(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE roles SET permissions = ?1 WHERE id = ?2",
            params![permissions_json, role_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("角色 {} 不存在", role_id)));
    }

    Ok(())
}

/// 重置角色权限为默认值
#[command]
pub fn reset_role(
    state: State<'_, AppState>,
    role_id: String,
) -> AppResult<Vec<String>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 只有系统角色可以重置
    let defaults = get_default_permissions(&role_id);
    if defaults.is_empty() {
        return Err(AppError::Validation(format!(
            "角色 {} 没有默认权限配置",
            role_id
        )));
    }

    let permissions_json =
        serde_json::to_string(&defaults).map_err(|e| AppError::Serialization(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE roles SET permissions = ?1 WHERE id = ?2",
            params![permissions_json, role_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("角色 {} 不存在", role_id)));
    }

    Ok(defaults)
}
