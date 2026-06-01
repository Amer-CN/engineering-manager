/**
 * 认证与用户管理命令
 *
 * 对应 Electron 版本的 auth.ts
 * 包含用户登录、CRUD、会话管理
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

// ============ 类型定义 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub username: String,
    pub display_name: String,
    pub role_id: String,
    pub status: Option<String>,
    pub created_at: Option<String>,
    pub last_login_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResult {
    pub user_id: String,
    pub username: String,
    pub display_name: String,
    pub role_id: String,
    pub role_name: String,
    pub permissions: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub display_name: String,
    pub role_id: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub id: String,
    pub display_name: Option<String>,
    pub role_id: Option<String>,
    pub status: Option<String>,
    pub password: Option<String>,
}

// ============ PBKDF2-SHA512 密码哈希（与 Electron 版本一致）============

fn hash_password(password: &str, salt: &str, version: u32) -> String {
    use ring::pbkdf2;
    use std::num::NonZeroU32;

    let iterations = if version >= 2 { 210000 } else { 10000 };
    let n_iter = NonZeroU32::new(iterations).unwrap();
    let mut hash = [0u8; 64]; // 64 bytes = 512 bits

    pbkdf2::derive(
        pbkdf2::PBKDF2_HMAC_SHA512,
        n_iter,
        salt.as_bytes(),
        password.as_bytes(),
        &mut hash,
    );

    hex::encode(hash)
}

// ============ 命令实现 ============

/// 用户登录
#[command]
pub fn auth_login(
    state: State<'_, AppState>,
    username: String,
    password: String,
) -> AppResult<LoginResult> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let user = db
        .query_row(
            "SELECT id, username, password_hash, password_salt, password_hash_version, display_name, role_id, status, last_login_at
             FROM users WHERE username = ?1",
            params![username],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, u32>(4).unwrap_or(1),
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, Option<String>>(8)?,
                ))
            },
        )
        .map_err(|_| AppError::Validation("用户名或密码错误".to_string()))?;

    let (user_id, _username, password_hash, password_salt, hash_version, display_name, role_id, status, _last_login_at) = &user;

    // 检查账户状态
    if status.as_deref() != Some("active") {
        return Err(AppError::Permission("账户已被禁用".to_string()));
    }

    // 验证密码
    let computed = hash_password(&password, password_salt, *hash_version);
    if computed != *password_hash {
        return Err(AppError::Validation("用户名或密码错误".to_string()));
    }

    // 更新最后登录时间
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    db.execute(
        "UPDATE users SET last_login_at = ?1 WHERE id = ?2",
        params![now, user_id],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    // 获取角色名称
    let role_name: String = db
        .query_row(
            "SELECT name FROM roles WHERE id = ?1",
            params![role_id],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| role_id.clone());

    // 获取权限
    let permissions: String = db
        .query_row(
            "SELECT permissions FROM roles WHERE id = ?1",
            params![role_id],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "[]".to_string());

    Ok(LoginResult {
        user_id: user_id.clone(),
        username: username.clone(),
        display_name: display_name.clone(),
        role_id: role_id.clone(),
        role_name,
        permissions,
    })
}

/// 获取所有用户（不包含密码）
#[command]
pub fn auth_get_all_users(state: State<'_, AppState>) -> AppResult<Vec<User>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT id, username, display_name, role_id, status, created_at, last_login_at
             FROM users ORDER BY created_at DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let users = stmt
        .query_map([], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                display_name: row.get(2)?,
                role_id: row.get(3)?,
                status: row.get(4)?,
                created_at: row.get(5)?,
                last_login_at: row.get(6)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(users)
}

/// 获取当前登录用户（Stub，前端可通过 localStorage 持久化 userId 后调用）
#[command]
pub fn auth_get_current_user(
    state: State<'_, AppState>,
    user_id: String,
) -> AppResult<User> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let user = db
        .query_row(
            "SELECT id, username, display_name, role_id, status, created_at, last_login_at
             FROM users WHERE id = ?1",
            params![user_id],
            |row| {
                Ok(User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    display_name: row.get(2)?,
                    role_id: row.get(3)?,
                    status: row.get(4)?,
                    created_at: row.get(5)?,
                    last_login_at: row.get(6)?,
                })
            },
        )
        .map_err(|_| AppError::NotFound(format!("用户 {} 不存在", user_id)))?;

    Ok(user)
}

/// 创建用户
#[command]
pub fn auth_create_user(
    state: State<'_, AppState>,
    user: CreateUserRequest,
) -> AppResult<String> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查用户名是否已存在
    let exists: bool = db
        .query_row(
            "SELECT COUNT(*) FROM users WHERE username = ?1",
            params![user.username],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?
        > 0;

    if exists {
        return Err(AppError::Validation("用户名已存在".to_string()));
    }

    let id = format!("user-{}", chrono::Local::now().timestamp_millis());
    // 生成随机 salt（16 字节 = 32 个 hex 字符）
    let salt_bytes: Vec<u8> = (0..16).map(|_| rand::random::<u8>()).collect();
    let salt = hex::encode(&salt_bytes);
    let password_hash = hash_password(&user.password, &salt, 2);
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    db.execute(
        "INSERT INTO users (id, username, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
         VALUES (?1, ?2, ?3, ?4, 2, ?5, ?6, 'active', ?7)",
        params![id, user.username, password_hash, salt, user.display_name, user.role_id, now],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(id)
}

/// 更新用户
#[command]
pub fn auth_update_user(
    state: State<'_, AppState>,
    user: UpdateUserRequest,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查用户是否存在
    let exists: bool = db
        .query_row(
            "SELECT COUNT(*) FROM users WHERE id = ?1",
            params![user.id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?
        > 0;

    if !exists {
        return Err(AppError::NotFound(format!("用户 {} 不存在", user.id)));
    }

    // 动态构建 UPDATE 语句
    let mut updates: Vec<String> = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(ref display_name) = user.display_name {
        updates.push(format!("display_name = ?{}", idx));
        param_values.push(Box::new(display_name.clone()));
        idx += 1;
    }
    if let Some(ref role_id) = user.role_id {
        // 不允许移除最后一个管理员
        if role_id != "admin" {
            let admin_count: i64 = db
                .query_row(
                    "SELECT COUNT(*) FROM users WHERE role_id = 'admin' AND id != ?1",
                    params![user.id],
                    |row| row.get(0),
                )
                .unwrap_or(0);
            if admin_count == 0 {
                return Err(AppError::Validation(
                    "不能移除最后一个管理员".to_string(),
                ));
            }
        }
        updates.push(format!("role_id = ?{}", idx));
        param_values.push(Box::new(role_id.clone()));
        idx += 1;
    }
    if let Some(ref status) = user.status {
        updates.push(format!("status = ?{}", idx));
        param_values.push(Box::new(status.clone()));
        idx += 1;
    }
    if let Some(ref password) = user.password {
        let salt_bytes: Vec<u8> = (0..16).map(|_| rand::random::<u8>()).collect();
        let salt = hex::encode(&salt_bytes);
        let hash = hash_password(password, &salt, 2);
        updates.push(format!("password_hash = ?{}", idx));
        param_values.push(Box::new(hash));
        idx += 1;
        updates.push(format!("password_salt = ?{}", idx));
        param_values.push(Box::new(salt));
        idx += 1;
        updates.push(format!("password_hash_version = ?{}", idx));
        param_values.push(Box::new(2u32));
        idx += 1;
    }

    if updates.is_empty() {
        return Ok(());
    }

    // 最后一个参数是 id
    let sql = format!(
        "UPDATE users SET {} WHERE id = ?{}",
        updates.join(", "),
        idx
    );
    param_values.push(Box::new(user.id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    db.execute(&sql, param_refs.as_slice())
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}

/// 删除用户
#[command]
pub fn auth_delete_user(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 不允许删除最后一个管理员
    let user_role: String = db
        .query_row(
            "SELECT role_id FROM users WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|_| AppError::NotFound(format!("用户 {} 不存在", id)))?;

    if user_role == "admin" {
        let admin_count: i64 = db
            .query_row(
                "SELECT COUNT(*) FROM users WHERE role_id = 'admin'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if admin_count <= 1 {
            return Err(AppError::Validation(
                "不能删除最后一个管理员账户".to_string(),
            ));
        }
    }

    db.execute("DELETE FROM users WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}
