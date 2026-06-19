/**
 * 成本台账分类匹配规则命令
 *
 * 对应 Electron 版本的 cost-ledger-match-rules.ts
 * Table: cost_ledger_match_rules(keyword PRIMARY KEY, category, direction, hit_count, created_at, updated_at)
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchRule {
    pub keyword: String,
    pub category: String,
    pub direction: String,
    pub hit_count: i64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SaveMatchRule {
    pub keyword: String,
    pub category: String,
    pub direction: Option<String>,
}

/// 获取所有匹配规则（按命中次数降序）
#[command]
pub fn get_cost_ledger_match_rules(state: State<'_, AppState>) -> AppResult<Vec<MatchRule>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT keyword, category, direction, hit_count, created_at, updated_at
             FROM cost_ledger_match_rules
             ORDER BY hit_count DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let rules = stmt
        .query_map([], |row| {
            Ok(MatchRule {
                keyword: row.get(0)?,
                category: row.get(1)?,
                direction: row.get(2)?,
                hit_count: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rules)
}

/// 保存匹配规则（INSERT OR UPDATE，命中时 hit_count + 1）
#[command]
pub fn save_cost_ledger_match_rule(
    state: State<'_, AppState>,
    rule: SaveMatchRule,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO cost_ledger_match_rules (keyword, category, direction, hit_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, 1, datetime('now'), datetime('now'))
         ON CONFLICT(keyword) DO UPDATE SET
           category = excluded.category,
           direction = excluded.direction,
           hit_count = hit_count + 1,
           updated_at = datetime('now')",
        params![
            rule.keyword,
            rule.category,
            rule.direction.unwrap_or_else(|| "expense".to_string()),
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}
