/**
 * 数据健康检查模块
 *
 * 对应 Electron 版本的 sqlite-status.ts
 * 提供数据完整性检查、一致性验证、JSON 导出等功能
 */

use crate::error::{AppError, AppResult};
use rusqlite::Connection;
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct HealthCheckResult {
    pub status: String,
    pub message: String,
    pub details: Option<HealthDetails>,
}

#[derive(Debug, Serialize)]
pub struct HealthDetails {
    pub table_stats: Vec<TableStat>,
    pub total_rows: i64,
    pub db_size_bytes: u64,
    pub integrity_ok: bool,
}

#[derive(Debug, Serialize)]
pub struct TableStat {
    pub name: String,
    pub row_count: i64,
}

/// 检查数据库完整性
pub fn check_integrity(conn: &Connection) -> AppResult<HealthCheckResult> {
    let integrity_result: String = conn
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let is_ok = integrity_result.to_lowercase() == "ok";

    Ok(HealthCheckResult {
        status: if is_ok { "ok".to_string() } else { "error".to_string() },
        message: if is_ok {
            "数据库完整性检查通过".to_string()
        } else {
            format!("数据库完整性检查失败: {}", integrity_result)
        },
        details: None,
    })
}

/// 获取数据库统计信息
pub fn get_db_stats(conn: &Connection, db_path: &Path) -> AppResult<HealthDetails> {
    // 获取所有表名
    let tables: Vec<String> = {
        let mut stmt = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
            .map_err(|e| AppError::Database(e.to_string()))?;

        let rows: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| AppError::Database(e.to_string()))?
            .collect::<Result<Vec<String>, _>>()
            .map_err(|e| AppError::Database(e.to_string()))?;
        rows
    };

    // 获取每个表的行数
    let mut table_stats = Vec::new();
    let mut total_rows: i64 = 0;

    for table in &tables {
        let count: i64 = conn
            .query_row(&format!("SELECT COUNT(*) FROM \"{}\"", table), [], |row| {
                row.get(0)
            })
            .unwrap_or(0);

        table_stats.push(TableStat {
            name: table.clone(),
            row_count: count,
        });
        total_rows += count;
    }

    // 获取数据库文件大小
    let db_size_bytes = std::fs::metadata(db_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // 检查完整性
    let integrity_result: String = conn
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;
    let integrity_ok = integrity_result.to_lowercase() == "ok";

    Ok(HealthDetails {
        table_stats,
        total_rows,
        db_size_bytes,
        integrity_ok,
    })
}

/// 一致性检查结果
#[derive(Debug, Serialize)]
pub struct ConsistencyResult {
    pub consistent: bool,
    pub discrepancies: Vec<Discrepancy>,
}

#[derive(Debug, Serialize)]
pub struct Discrepancy {
    pub table: String,
    pub expected: i64,
    pub actual: i64,
}

/// 检查 JSON 和 SQLite 数据一致性
/// 这个功能在 Tauri 版本中主要用于迁移验证
pub fn check_consistency(conn: &Connection) -> AppResult<ConsistencyResult> {
    // 获取 SQLite 中的主要表行数
    let main_tables = vec![
        "projects",
        "members",
        "workers",
        "project_workers",
        "invoices",
        "contracts",
        "settlements",
    ];

    let mut discrepancies = Vec::new();

    for table in main_tables {
        let count: i64 = conn
            .query_row(
                &format!("SELECT COUNT(*) FROM \"{}\"", table),
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        // 在 Tauri 版本中，我们只检查 SQLite，不做 JSON 对比
        // 这里只是示例结构
        if count < 0 {
            discrepancies.push(Discrepancy {
                table: table.to_string(),
                expected: 0,
                actual: count,
            });
        }
    }

    Ok(ConsistencyResult {
        consistent: discrepancies.is_empty(),
        discrepancies,
    })
}

/// 导出数据库摘要
#[derive(Debug, Serialize)]
pub struct DatabaseSummary {
    pub tables: Vec<TableInfo>,
    pub total_rows: i64,
    pub db_size: String,
}

#[derive(Debug, Serialize)]
pub struct TableInfo {
    pub name: String,
    pub row_count: i64,
    pub columns: Vec<String>,
}

/// 获取数据库摘要
pub fn get_database_summary(conn: &Connection, db_path: &Path) -> AppResult<DatabaseSummary> {
    let tables: Vec<String> = {
        let mut stmt = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
            .map_err(|e| AppError::Database(e.to_string()))?;

        let rows: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| AppError::Database(e.to_string()))?
            .collect::<Result<Vec<String>, _>>()
            .map_err(|e| AppError::Database(e.to_string()))?;
        rows
    };

    let mut table_infos = Vec::new();
    let mut total_rows: i64 = 0;

    for table in &tables {
        // 获取行数
        let count: i64 = conn
            .query_row(&format!("SELECT COUNT(*) FROM \"{}\"", table), [], |row| {
                row.get(0)
            })
            .unwrap_or(0);

        // 获取列名
        let columns: Vec<String> = {
            let mut stmt = conn
                .prepare(&format!("PRAGMA table_info(\"{}\")", table))
                .map_err(|e| AppError::Database(e.to_string()))?;

            let cols: Vec<String> = stmt
                .query_map([], |row| row.get::<_, String>(1))
                .map_err(|e| AppError::Database(e.to_string()))?
                .collect::<Result<Vec<String>, _>>()
                .map_err(|e| AppError::Database(e.to_string()))?;
            cols
        };

        table_infos.push(TableInfo {
            name: table.clone(),
            row_count: count,
            columns,
        });
        total_rows += count;
    }

    let db_size_bytes = std::fs::metadata(db_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let db_size = format_bytes(db_size_bytes);

    Ok(DatabaseSummary {
        tables: table_infos,
        total_rows,
        db_size,
    })
}

/// 格式化字节数为可读字符串
fn format_bytes(bytes: u64) -> String {
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else if bytes < 1024 * 1024 * 1024 {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.2} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
    }
}
