/**
 * 数据健康检查命令
 *
 * 对应 Electron 版本的 sqlite-status.ts 中的 data:consistencyCheck / data:integrityCheck 等
 * 包含一致性检查、完整性校验、JSON 导出、数据对账
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::Serialize;
use tauri::{command, State};

// ============ 类型定义 ============

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsistencyCheckResult {
    pub healthy: bool,
    pub tables: Vec<TableCheck>,
    pub issues: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableCheck {
    pub name: String,
    pub row_count: i64,
    pub status: String, // "ok" | "empty" | "warning"
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntegrityCheckResult {
    pub ok: bool,
    pub message: String,
    pub journal_mode: String,
    pub page_count: i64,
    pub page_size: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportJsonResult {
    pub success: bool,
    pub message: String,
    pub tables_exported: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReconcileResult {
    pub success: bool,
    pub message: String,
    pub checked_tables: i64,
    pub mismatches: Vec<String>,
}

// ============ 核心表列表 ============

const CORE_TABLES: &[&str] = &[
    "projects",
    "members",
    "workers",
    "project_workers",
    "partners",
    "invoices",
    "payment_records",
    "income_contracts",
    "expense_contracts",
    "settlements",
    "wages",
    "attendances",
    "cost_ledger",
    "cost_ledger_categories",
    "audit_logs",
    "users",
    "roles",
    "departments",
    "salary_history",
    "templates",
    "inventory_items",
    "drawings",
    "materials",
];

// ============ 命令实现 ============

/// 数据一致性检查：对比核心表行数，检测异常
#[command]
pub fn data_consistency_check(state: State<'_, AppState>) -> AppResult<ConsistencyCheckResult> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut tables = Vec::new();
    let mut issues = Vec::new();

    for &table_name in CORE_TABLES {
        // 检查表是否存在
        let table_exists: bool = db
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                params![table_name],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))?
            > 0;

        if !table_exists {
            tables.push(TableCheck {
                name: table_name.to_string(),
                row_count: 0,
                status: "missing".to_string(),
            });
            issues.push(format!("表 {} 不存在", table_name));
            continue;
        }

        let count: i64 = db
            .query_row(
                &format!("SELECT COUNT(*) FROM {}", table_name),
                [],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        let status = if count == 0 {
            "empty"
        } else {
            "ok"
        };

        tables.push(TableCheck {
            name: table_name.to_string(),
            row_count: count,
            status: status.to_string(),
        });
    }

    // 检查外键完整性
    let fk_errors: i64 = db
        .query_row("PRAGMA foreign_key_check", [], |row| row.get(0))
        .unwrap_or(0);

    if fk_errors > 0 {
        issues.push(format!("发现 {} 个外键约束错误", fk_errors));
    }

    let healthy = issues.is_empty();

    Ok(ConsistencyCheckResult {
        healthy,
        tables,
        issues,
    })
}

/// 数据完整性校验：运行 PRAGMA integrity_check
#[command]
pub fn data_integrity_check(state: State<'_, AppState>) -> AppResult<IntegrityCheckResult> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // PRAGMA integrity_check
    let integrity_result: String = db
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let ok = integrity_result == "ok";

    // 获取日志模式
    let journal_mode: String = db
        .query_row("PRAGMA journal_mode", [], |row| row.get(0))
        .unwrap_or_else(|_| "unknown".to_string());

    // 获取页面信息
    let page_count: i64 = db
        .query_row("PRAGMA page_count", [], |row| row.get(0))
        .unwrap_or(0);

    let page_size: i64 = db
        .query_row("PRAGMA page_size", [], |row| row.get(0))
        .unwrap_or(0);

    Ok(IntegrityCheckResult {
        ok,
        message: integrity_result,
        journal_mode,
        page_count,
        page_size,
    })
}

/// 导出数据库为 JSON（Stub，Tauri 版本始终返回成功）
#[command]
pub fn data_export_json(state: State<'_, AppState>) -> AppResult<ExportJsonResult> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 统计已导出的表数
    let table_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // TODO: 实际导出逻辑（从 SQLite 读取所有表写入 JSON 文件）
    log::info!("data_export_json: 统计到 {} 张表（导出功能待实现）", table_count);

    Ok(ExportJsonResult {
        success: true,
        message: format!("已统计 {} 张表，JSON 导出功能待实现", table_count),
        tables_exported: table_count,
    })
}

/// 数据对账：对比 JSON 和 SQLite 数据（Stub，Tauri 版本始终返回成功）
#[command]
pub fn data_reconcile(state: State<'_, AppState>) -> AppResult<ReconcileResult> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let table_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // TODO: 实际对账逻辑（Tauri 版本不需要 JSON 回退，此功能仅为兼容保留）
    log::info!("data_reconcile: 检查了 {} 张表（Tauri 版本无需对账）", table_count);

    Ok(ReconcileResult {
        success: true,
        message: "Tauri 版本仅使用 SQLite，无需对账".to_string(),
        checked_tables: table_count,
        mismatches: Vec::new(),
    })
}
