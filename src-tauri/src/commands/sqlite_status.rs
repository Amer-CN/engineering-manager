/**
 * SQLite 状态管理命令
 *
 * 对应 Electron 版本的 sqlite-status.ts
 * 包含数据库状态查询、启用、迁移、读取模式管理
 *
 * 注意：Tauri 版本原生使用 SQLite，无需 JSON 回退和迁移逻辑。
 * 这些命令主要为前端兼容性保留。
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use serde::Serialize;
use tauri::{command, State};

// ============ 类型定义 ============

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SqliteStatusResult {
    pub ready: bool,
    pub migrated: bool,
    pub db_path: String,
    pub db_size: Option<u64>,
    pub read_mode: String,
    pub table_count: i64,
    pub journal_mode: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableInfo {
    pub name: String,
    pub row_count: i64,
}

// ============ 命令实现 ============

/// 获取 SQLite 数据库状态
#[command]
pub fn sqlite_status(state: State<'_, AppState>) -> AppResult<SqliteStatusResult> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // Tauri 版本始终就绪且已迁移
    let ready = true;
    let migrated = true;
    let read_mode = "sqlite".to_string();

    // 获取数据库路径
    let db_path: String = db
        .query_row("PRAGMA database_list", [], |row| {
            Ok(row.get::<_, String>(2).unwrap_or_default())
        })
        .unwrap_or_default();

    // 获取数据库文件大小
    let db_size: Option<u64> = if !db_path.is_empty() {
        std::fs::metadata(&db_path).ok().map(|m| m.len())
    } else {
        None
    };

    // 获取表数量
    let table_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // 获取日志模式
    let journal_mode: String = db
        .query_row("PRAGMA journal_mode", [], |row| row.get(0))
        .unwrap_or_else(|_| "unknown".to_string());

    Ok(SqliteStatusResult {
        ready,
        migrated,
        db_path,
        db_size,
        read_mode,
        table_count,
        journal_mode,
    })
}

/// 启用 SQLite（No-op，Tauri 版本始终使用 SQLite）
#[command]
pub fn sqlite_enable() -> AppResult<serde_json::Value> {
    Ok(serde_json::json!({
        "success": true,
        "message": "Tauri 版本始终使用 SQLite，无需手动启用"
    }))
}

/// 迁移数据到 SQLite（No-op，Tauri 版本无需迁移）
#[command]
pub fn sqlite_migrate() -> AppResult<serde_json::Value> {
    Ok(serde_json::json!({
        "success": true,
        "message": "Tauri 版本始终使用 SQLite，无需迁移",
        "migratedTables": 0,
        "totalRows": 0,
        "verificationPassed": true,
        "errors": [],
        "warnings": [],
        "duration": 0
    }))
}

/// 获取当前读取模式（始终返回 "sqlite"）
#[command]
pub fn sqlite_get_read_mode() -> AppResult<serde_json::Value> {
    Ok(serde_json::json!({
        "success": true,
        "readMode": "sqlite"
    }))
}

/// 设置读取模式（No-op，Tauri 版本始终使用 SQLite）
#[command]
pub fn sqlite_set_read_mode(mode: String) -> AppResult<serde_json::Value> {
    log::info!("sqlite_set_read_mode: 忽略设置为 '{}'，Tauri 版本始终使用 sqlite", mode);
    Ok(serde_json::json!({
        "success": true,
        "readMode": "sqlite",
        "message": "Tauri 版本始终使用 SQLite 模式"
    }))
}
