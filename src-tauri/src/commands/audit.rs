/**
 * 审计日志命令
 *
 * 对应 Electron 版本的 audit.ts
 * 包含日志记录、查询、统计、清理
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

// ============ 类型定义 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogEntry {
    pub id: Option<String>, // 前端传字符串 ID，忽略即可
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub action: String,
    pub resource: Option<String>, // 前端用 resource 字段
    pub resource_id: Option<String>,
    pub resource_name: Option<String>,
    pub level: Option<String>,
    pub description: Option<String>,
    pub details: Option<String>,
    pub ip_address: Option<String>,
    pub timestamp: Option<String>, // 前端用 timestamp 字段
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AuditQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub action: Option<String>,
    pub resource: Option<String>,
    pub level: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditQueryResult {
    pub items: Vec<AuditLogEntry>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditStats {
    pub total_count: i64,
    pub today_count: i64,
    pub action_counts: std::collections::HashMap<String, i64>,
    pub resource_counts: std::collections::HashMap<String, i64>,
    pub top_users: Vec<TopUser>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TopUser {
    pub user_id: String,
    pub username: String,
    pub count: i64,
}

// ============ 命令实现 ============

/// 记录审计日志
#[command]
pub fn audit_log(state: State<'_, AppState>, entry: AuditLogEntry) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = entry
        .created_at
        .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string());

    db.execute(
        "INSERT INTO audit_logs (action, level, user_id, user_name, resource_type, resource_id, details, ip_address, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            entry.action,
            entry.level.unwrap_or_else(|| "info".to_string()),
            entry.user_id.unwrap_or_default(),
            entry.username.unwrap_or_default(),
            entry.resource.unwrap_or_default(),
            entry.resource_id.unwrap_or_default(),
            entry.details.or(entry.description).unwrap_or_default(),
            entry.ip_address.unwrap_or_default(),
            entry.timestamp.unwrap_or(now),
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    // 保持上限 10000 条（与 Electron 版本一致）
    let _ = db.execute(
        "DELETE FROM audit_logs WHERE id NOT IN (SELECT id FROM audit_logs ORDER BY created_at DESC LIMIT 10000)",
        [],
    );

    Ok(())
}

/// 查询审计日志（分页 + 筛选）
#[command]
pub fn audit_query(
    state: State<'_, AppState>,
    query: AuditQuery,
) -> AppResult<AuditQueryResult> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    // 构建 WHERE 子句
    let mut conditions = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(ref start) = query.start_date {
        conditions.push(format!("created_at >= ?{}", idx));
        param_values.push(Box::new(start.clone()));
        idx += 1;
    }
    if let Some(ref end) = query.end_date {
        conditions.push(format!("created_at <= ?{}", idx));
        param_values.push(Box::new(format!("{} 23:59:59", end)));
        idx += 1;
    }
    if let Some(ref action) = query.action {
        conditions.push(format!("action = ?{}", idx));
        param_values.push(Box::new(action.clone()));
        idx += 1;
    }
    if let Some(ref resource) = query.resource {
        conditions.push(format!("resource_type = ?{}", idx));
        param_values.push(Box::new(resource.clone()));
        idx += 1;
    }
    if let Some(ref keyword) = query.keyword {
        conditions.push(format!(
            "(user_name LIKE ?{0} OR details LIKE ?{0} OR resource_id LIKE ?{0})",
            idx
        ));
        param_values.push(Box::new(format!("%{}%", keyword)));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", conditions.join(" AND "))
    };

    // 查询总数
    let count_sql = format!("SELECT COUNT(*) FROM audit_logs{}", where_clause);
    let mut count_stmt = db.prepare(&count_sql).map_err(|e| AppError::Database(e.to_string()))?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let total: i64 = count_stmt
        .query_row(param_refs.as_slice(), |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    // 查询数据
    let data_sql = format!(
        "SELECT id, user_id, user_name, action, resource_type, resource_id, details, ip_address, created_at
         FROM audit_logs{} ORDER BY created_at DESC LIMIT ?{} OFFSET ?{}",
        where_clause,
        idx,
        idx + 1
    );
    param_values.push(Box::new(page_size));
    param_values.push(Box::new(offset));

    let mut data_stmt = db.prepare(&data_sql).map_err(|e| AppError::Database(e.to_string()))?;
    let data_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let items = data_stmt
        .query_map(data_refs.as_slice(), |row| {
            Ok(AuditLogEntry {
                id: row.get(0)?,
                user_id: row.get(1)?,
                username: row.get(2)?,
                action: row.get(3)?,
                resource: row.get(4)?,
                resource_id: row.get(5)?,
                resource_name: None,
                level: None,
                description: None,
                details: row.get(6)?,
                ip_address: row.get(7)?,
                timestamp: None,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    let total_pages = (total as f64 / page_size as f64).ceil() as i64;

    Ok(AuditQueryResult {
        items,
        total,
        page,
        page_size,
        total_pages,
    })
}

/// 审计日志统计
#[command]
pub fn audit_stats(
    state: State<'_, AppState>,
    days: Option<i64>,
) -> AppResult<AuditStats> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now();
    let today_prefix = now.format("%Y-%m-%d").to_string();

    // 时间范围过滤
    let date_filter = if let Some(d) = days {
        let cutoff = (now - chrono::Duration::days(d))
            .format("%Y-%m-%d %H:%M:%S")
            .to_string();
        format!(" WHERE created_at >= '{}'", cutoff)
    } else {
        String::new()
    };

    // 总数
    let total_count: i64 = db
        .query_row(
            &format!("SELECT COUNT(*) FROM audit_logs{}", date_filter),
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // 今日数量
    let today_count: i64 = db
        .query_row(
            &format!(
                "SELECT COUNT(*) FROM audit_logs{} AND created_at >= '{}'",
                if date_filter.is_empty() {
                    " WHERE".to_string()
                } else {
                    format!("{} AND", date_filter)
                },
                today_prefix
            ),
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // 操作分布
    let mut action_counts = std::collections::HashMap::new();
    {
        let sql = format!(
            "SELECT action, COUNT(*) FROM audit_logs{} GROUP BY action",
            date_filter
        );
        let mut stmt = db.prepare(&sql).map_err(|e| AppError::Database(e.to_string()))?;
        let rows = stmt
            .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)))
            .map_err(|e| AppError::Database(e.to_string()))?;
        for row in rows {
            let (action, count) = row.map_err(|e| AppError::Database(e.to_string()))?;
            action_counts.insert(action, count);
        }
    }

    // 资源分布
    let mut resource_counts = std::collections::HashMap::new();
    {
        let sql = format!(
            "SELECT resource_type, COUNT(*) FROM audit_logs{} GROUP BY resource_type",
            date_filter
        );
        let mut stmt = db.prepare(&sql).map_err(|e| AppError::Database(e.to_string()))?;
        let rows = stmt
            .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)))
            .map_err(|e| AppError::Database(e.to_string()))?;
        for row in rows {
            let (resource, count) = row.map_err(|e| AppError::Database(e.to_string()))?;
            resource_counts.insert(resource, count);
        }
    }

    // 活跃用户 TOP 10
    let mut top_users = Vec::new();
    {
        let sql = format!(
            "SELECT user_id, user_name, COUNT(*) FROM audit_logs{} GROUP BY user_id, user_name ORDER BY COUNT(*) DESC LIMIT 10",
            date_filter
        );
        let mut stmt = db.prepare(&sql).map_err(|e| AppError::Database(e.to_string()))?;
        let rows = stmt
            .query_map([], |row| {
                Ok(TopUser {
                    user_id: row.get::<_, String>(0)?,
                    username: row.get::<_, String>(1)?,
                    count: row.get::<_, i64>(2)?,
                })
            })
            .map_err(|e| AppError::Database(e.to_string()))?;
        for row in rows {
            top_users.push(row.map_err(|e| AppError::Database(e.to_string()))?);
        }
    }

    Ok(AuditStats {
        total_count,
        today_count,
        action_counts,
        resource_counts,
        top_users,
    })
}

/// 清理旧日志
#[command]
pub fn audit_clear(
    state: State<'_, AppState>,
    days_to_keep: i64,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let cutoff = (chrono::Local::now() - chrono::Duration::days(days_to_keep))
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    let removed = db
        .execute(
            "DELETE FROM audit_logs WHERE created_at < ?1",
            params![cutoff],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(removed as i64)
}
