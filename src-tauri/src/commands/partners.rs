/**
 * 合作伙伴管理命令
 *
 * 对应 Electron 版本的 partners.ts
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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Partner {
    pub id: i64,
    pub name: String,
    pub category: Option<String>,
    pub contact: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub bank_account: Option<String>,
    pub bank_name: Option<String>,
    pub tax_number: Option<String>,
    pub credit_code: Option<String>,
    pub registered_address: Option<String>,
    pub business_scope: Option<String>,
    pub tax_type: Option<String>,
    pub license_file: Option<String>,
    pub license_file_type: Option<String>,
    pub other_files: Option<String>,
    pub other_files_type: Option<String>,
    pub project_ids: Option<Vec<i64>>,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePartner {
    pub name: String,
    pub category: Option<String>,
    pub contact: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub bank_account: Option<String>,
    pub bank_name: Option<String>,
    pub tax_number: Option<String>,
    pub credit_code: Option<String>,
    pub registered_address: Option<String>,
    pub business_scope: Option<String>,
    pub tax_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePartner {
    pub id: i64,
    pub name: Option<String>,
    pub category: Option<String>,
    pub contact: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub bank_account: Option<String>,
    pub bank_name: Option<String>,
    pub tax_number: Option<String>,
    pub credit_code: Option<String>,
    pub registered_address: Option<String>,
    pub business_scope: Option<String>,
    pub tax_type: Option<String>,
    pub remarks: Option<String>,
}

#[command]
pub fn get_partners(state: State<'_, AppState>, project_id: Option<i64>) -> AppResult<Vec<Partner>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let sql = if project_id.is_some() {
        "SELECT id, name, category, contact, phone, email, address, bank_account, bank_name,
                tax_number, credit_code, registered_address, business_scope, tax_type,
                license_file, license_file_type, other_files, other_files_type,
                project_ids, remarks, created_at, updated_at
         FROM partners WHERE project_ids LIKE ?1 ORDER BY name"
    } else {
        "SELECT id, name, category, contact, phone, email, address, bank_account, bank_name,
                tax_number, credit_code, registered_address, business_scope, tax_type,
                license_file, license_file_type, other_files, other_files_type,
                project_ids, remarks, created_at, updated_at
         FROM partners ORDER BY name"
    };

    let mut stmt = db.prepare(sql).map_err(|e| AppError::Database(e.to_string()))?;

    let partners = if let Some(pid) = project_id {
        let pattern = format!("%{}%", pid);
        stmt.query_map(params![pattern], |row| {
            Ok(Partner {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                contact: row.get(3)?,
                phone: row.get(4)?,
                email: row.get(5)?,
                address: row.get(6)?,
                bank_account: row.get(7)?,
                bank_name: row.get(8)?,
                tax_number: row.get(9)?,
                credit_code: row.get(10)?,
                registered_address: row.get(11)?,
                business_scope: row.get(12)?,
                tax_type: row.get(13)?,
                license_file: row.get(14)?,
                license_file_type: row.get(15)?,
                other_files: row.get(16)?,
                other_files_type: row.get(17)?,
                project_ids: parse_ids(row.get(18)?),
                remarks: row.get(19)?,
                created_at: row.get(20)?,
                updated_at: row.get(21)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    } else {
        stmt.query_map([], |row| {
            Ok(Partner {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                contact: row.get(3)?,
                phone: row.get(4)?,
                email: row.get(5)?,
                address: row.get(6)?,
                bank_account: row.get(7)?,
                bank_name: row.get(8)?,
                tax_number: row.get(9)?,
                credit_code: row.get(10)?,
                registered_address: row.get(11)?,
                business_scope: row.get(12)?,
                tax_type: row.get(13)?,
                license_file: row.get(14)?,
                license_file_type: row.get(15)?,
                other_files: row.get(16)?,
                other_files_type: row.get(17)?,
                project_ids: parse_ids(row.get(18)?),
                remarks: row.get(19)?,
                created_at: row.get(20)?,
                updated_at: row.get(21)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?
    };

    Ok(partners)
}

#[command]
pub fn create_partner(state: State<'_, AppState>, partner: CreatePartner) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    db.execute(
        "INSERT INTO partners (name, category, contact, phone, email, address,
         bank_account, bank_name, tax_number, credit_code, registered_address,
         business_scope, tax_type, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        params![
            partner.name,
            partner.category,
            partner.contact,
            partner.phone,
            partner.email,
            partner.address,
            partner.bank_account,
            partner.bank_name,
            partner.tax_number,
            partner.credit_code,
            partner.registered_address,
            partner.business_scope,
            partner.tax_type,
            now,
            now,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(db.last_insert_rowid())
}

#[command]
pub fn update_partner(state: State<'_, AppState>, partner: UpdatePartner) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let affected = db
        .execute(
            "UPDATE partners SET name = COALESCE(?1, name), category = COALESCE(?2, category),
             contact = COALESCE(?3, contact), phone = COALESCE(?4, phone),
             email = COALESCE(?5, email), address = COALESCE(?6, address),
             bank_account = COALESCE(?7, bank_account), bank_name = COALESCE(?8, bank_name),
             tax_number = COALESCE(?9, tax_number), credit_code = COALESCE(?10, credit_code),
             registered_address = COALESCE(?11, registered_address),
             business_scope = COALESCE(?12, business_scope), tax_type = COALESCE(?13, tax_type),
             remarks = COALESCE(?14, remarks), updated_at = ?15
             WHERE id = ?16",
            params![
                partner.name,
                partner.category,
                partner.contact,
                partner.phone,
                partner.email,
                partner.address,
                partner.bank_account,
                partner.bank_name,
                partner.tax_number,
                partner.credit_code,
                partner.registered_address,
                partner.business_scope,
                partner.tax_type,
                partner.remarks,
                now,
                partner.id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("合作伙伴 {} 不存在", partner.id)));
    }

    Ok(())
}

#[command]
pub fn delete_partner(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM partners WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("合作伙伴 {} 不存在", id)));
    }

    Ok(())
}
