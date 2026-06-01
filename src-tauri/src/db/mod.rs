pub mod init;

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

/// 全局数据库连接（Tauri 管理状态）
pub struct AppState {
    pub db: Mutex<Connection>,
    pub data_path: std::path::PathBuf,
}

/// 初始化数据库并返回连接
pub fn init_database(db_path: &Path) -> Result<Connection, String> {
    // 确保父目录存在
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("创建数据目录失败: {}", e))?;
    }

    let conn = Connection::open(db_path)
        .map_err(|e| format!("打开数据库失败: {}", e))?;

    // 启用 WAL 模式（与 better-sqlite3 兼容）
    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|e| format!("设置 WAL 模式失败: {}", e))?;

    // 启用外键约束
    conn.pragma_update(None, "foreign_keys", "ON")
        .map_err(|e| format!("启用外键失败: {}", e))?;

    // 创建表结构
    init::create_tables(&conn)
        .map_err(|e| format!("创建表结构失败: {}", e))?;

    log::info!("数据库初始化完成: {:?}", db_path);
    Ok(conn)
}
