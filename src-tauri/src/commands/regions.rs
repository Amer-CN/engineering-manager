/**
 * 地区与监管单位命令
 *
 * 对应 Electron 版本的 partners.ts 中的地区/监管单位部分
 * 表: regions(id, province, city, district, created_at)
 * 表: supervisors(id, region_id, name, category, contact, phone, address,
 *                project_ids, remarks, created_at, updated_at)
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

/// 解析 JSON 字符串为 Vec<i64>
fn parse_ids(json: Option<String>) -> Option<Vec<i64>> {
    json.and_then(|s| serde_json::from_str(&s).ok())
}

// ============ 地区 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Region {
    pub id: i64,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewRegion {
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
}

// ============ 监管单位 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Supervisor {
    pub id: i64,
    pub region_id: Option<i64>,
    pub name: String,
    pub category: Option<String>,
    pub contact: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub project_ids: Option<Vec<i64>>,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    // JOIN 字段
    pub region_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewSupervisor {
    pub region_id: Option<i64>,
    pub name: String,
    pub category: Option<String>,
    pub contact: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub project_ids: Option<Vec<i64>>,
    pub remarks: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SupervisorUpdate {
    pub region_id: Option<i64>,
    pub name: Option<String>,
    pub category: Option<String>,
    pub contact: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub project_ids: Option<Vec<i64>>,
    pub remarks: Option<String>,
}

// ============ 地区命令 ============

/// 获取所有地区
#[command]
pub fn get_regions(state: State<'_, AppState>) -> AppResult<Vec<Region>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT id, province, city, district, created_at
             FROM regions
             ORDER BY created_at DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let regions = stmt
        .query_map([], |row| {
            Ok(Region {
                id: row.get(0)?,
                province: row.get(1)?,
                city: row.get(2)?,
                district: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(regions)
}

/// 新增地区
#[command]
pub fn create_region(state: State<'_, AppState>, region: NewRegion) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查是否已存在相同地区
    let exists: bool = db
        .query_row(
            "SELECT COUNT(*) FROM regions
             WHERE province = ?1 AND city = ?2 AND district = ?3",
            params![region.province, region.city, region.district],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?
        > 0;

    if exists {
        return Err(AppError::Validation("该地区已存在".to_string()));
    }

    db.execute(
        "INSERT INTO regions (province, city, district) VALUES (?1, ?2, ?3)",
        params![region.province, region.city, region.district],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 删除地区
#[command]
pub fn delete_region(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查是否被监管单位引用
    let used_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM supervisors WHERE region_id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if used_count > 0 {
        return Err(AppError::Validation(
            "该地区已被监管单位引用，无法删除".to_string(),
        ));
    }

    let affected = db
        .execute("DELETE FROM regions WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("地区 {} 不存在", id)));
    }

    Ok(())
}

// ============ 监管单位命令 ============

/// 获取所有监管单位（含地区名称）
#[command]
pub fn get_supervisors(state: State<'_, AppState>) -> AppResult<Vec<Supervisor>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT s.id, s.region_id, s.name, s.category, s.contact, s.phone,
                    s.address, s.project_ids, s.remarks, s.created_at, s.updated_at,
                    CASE
                        WHEN r.province IS NOT NULL THEN
                            r.province || '-' || r.city || '-' || r.district
                        ELSE ''
                    END as region_name
             FROM supervisors s
             LEFT JOIN regions r ON s.region_id = r.id
             ORDER BY s.created_at DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let supervisors = stmt
        .query_map([], |row| {
            Ok(Supervisor {
                id: row.get(0)?,
                region_id: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                contact: row.get(4)?,
                phone: row.get(5)?,
                address: row.get(6)?,
                project_ids: parse_ids(row.get(7)?),
                remarks: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                region_name: row.get(11)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(supervisors)
}

/// 新增监管单位
#[command]
pub fn create_supervisor(
    state: State<'_, AppState>,
    supervisor: NewSupervisor,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let project_ids_json = supervisor.project_ids.map(|ids| serde_json::to_string(&ids).unwrap_or_else(|_| "[]".to_string()));

    db.execute(
        "INSERT INTO supervisors
         (region_id, name, category, contact, phone, address, project_ids, remarks)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            supervisor.region_id,
            supervisor.name,
            supervisor.category,
            supervisor.contact,
            supervisor.phone,
            supervisor.address,
            project_ids_json,
            supervisor.remarks,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新监管单位
#[command]
pub fn update_supervisor(
    state: State<'_, AppState>,
    id: i64,
    updates: SupervisorUpdate,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let project_ids_json = updates.project_ids.map(|ids| serde_json::to_string(&ids).unwrap_or_else(|_| "[]".to_string()));

    let affected = db
        .execute(
            "UPDATE supervisors SET
             region_id = COALESCE(?1, region_id),
             name = COALESCE(?2, name),
             category = COALESCE(?3, category),
             contact = COALESCE(?4, contact),
             phone = COALESCE(?5, phone),
             address = COALESCE(?6, address),
             project_ids = COALESCE(?7, project_ids),
             remarks = COALESCE(?8, remarks),
             updated_at = datetime('now')
             WHERE id = ?9",
            params![
                updates.region_id,
                updates.name,
                updates.category,
                updates.contact,
                updates.phone,
                updates.address,
                project_ids_json,
                updates.remarks,
                id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("监管单位 {} 不存在", id)));
    }

    Ok(())
}

/// 删除监管单位
#[command]
pub fn delete_supervisor(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM supervisors WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("监管单位 {} 不存在", id)));
    }

    Ok(())
}
