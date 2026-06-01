/**
 * 数据库统计命令
 *
 * 对应 Electron 版本的 stats.ts
 * 只保留仪表盘统计，项目 CRUD 已移至 projects.rs
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use serde::Serialize;
use tauri::{command, State};

// ============ 仪表盘统计 ============

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub projects_count: i64,
    pub members_count: i64,
    pub materials_count: i64,
    pub total_expenses: f64,
    pub settlements_count: i64,
    pub invoices_count: i64,
    pub inventory_items_count: i64,
    pub in_progress_projects: i64,
}

/// 获取仪表盘统计
#[command]
pub fn get_dashboard_stats(state: State<'_, AppState>) -> AppResult<DashboardStats> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let projects_count: i64 = db
        .query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let members_count: i64 = db
        .query_row("SELECT COUNT(*) FROM members", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let workers_count: i64 = db
        .query_row("SELECT COUNT(*) FROM workers", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let materials_count: i64 = db
        .query_row("SELECT COUNT(*) FROM materials", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let total_expenses: f64 = db
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM expenses",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let settlements_count: i64 = db
        .query_row("SELECT COUNT(*) FROM settlements", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let invoices_count: i64 = db
        .query_row("SELECT COUNT(*) FROM invoices", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let inventory_items_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM inventory_items",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let in_progress_projects: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM projects WHERE status = 'in_progress'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(DashboardStats {
        projects_count,
        members_count: members_count + workers_count,
        materials_count,
        total_expenses,
        settlements_count,
        invoices_count,
        inventory_items_count,
        in_progress_projects,
    })
}

// ============ 成员统计 ============

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberStats {
    pub staff_count: i64,
    pub worker_count: i64,
    pub active_count: i64,
    pub left_count: i64,
}

/// 获取成员统计
#[command]
pub fn get_member_stats(state: State<'_, AppState>) -> AppResult<MemberStats> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let staff_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM members WHERE member_type = 'staff'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let worker_count: i64 = db
        .query_row("SELECT COUNT(*) FROM workers", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let active_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM members WHERE status = 'active'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let left_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM members WHERE status = 'left'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(MemberStats {
        staff_count,
        worker_count,
        active_count,
        left_count,
    })
}

// ============ 发票统计 ============

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceStats {
    pub invoice_in_count: i64,
    pub invoice_in_amount: f64,
    pub invoice_out_count: i64,
    pub invoice_out_amount: f64,
    pub pending_count: i64,
}

/// 获取发票统计
#[command]
pub fn get_invoice_stats(state: State<'_, AppState>) -> AppResult<InvoiceStats> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let invoice_in_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM invoices WHERE type = 'invoice_in'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let invoice_in_amount: f64 = db
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE type = 'invoice_in'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let invoice_out_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM invoices WHERE type = 'invoice_out'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let invoice_out_amount: f64 = db
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE type = 'invoice_out'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let pending_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM invoices WHERE status IN ('issued', 'partially_paid')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(InvoiceStats {
        invoice_in_count,
        invoice_in_amount,
        invoice_out_count,
        invoice_out_amount,
        pending_count,
    })
}
