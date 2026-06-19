/**
 * 进销存管理命令
 *
 * 对应 Electron 版本的 inventory.ts
 * 表: inventory_items(id, code, name, category, unit, specifications, purchase_price,
 *                     sale_price, current_stock, min_stock, max_stock, supplier_id,
 *                     remarks, created_at, updated_at)
 * 表: inventory_transactions(id, item_id, type, quantity, unit_price, total_amount,
 *                           project_id, contract_id, counterparty_id, transaction_date,
 *                           document_no, remarks, created_at)
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

// ============ 物料 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryItem {
    pub id: i64,
    pub code: Option<String>,
    pub name: String,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub specifications: Option<String>,
    pub purchase_price: f64,
    pub sale_price: f64,
    pub current_stock: f64,
    pub min_stock: f64,
    pub max_stock: f64,
    pub supplier_id: Option<i64>,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewInventoryItem {
    pub code: Option<String>,
    pub name: String,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub specifications: Option<String>,
    pub purchase_price: Option<f64>,
    pub sale_price: Option<f64>,
    pub current_stock: Option<f64>,
    pub min_stock: Option<f64>,
    pub max_stock: Option<f64>,
    pub supplier_id: Option<i64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryItemUpdate {
    pub code: Option<String>,
    pub name: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub specifications: Option<String>,
    pub purchase_price: Option<f64>,
    pub sale_price: Option<f64>,
    pub min_stock: Option<f64>,
    pub max_stock: Option<f64>,
    pub supplier_id: Option<i64>,
    pub remarks: Option<String>,
}

// ============ 出入库记录 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryTransaction {
    pub id: i64,
    pub item_id: i64,
    #[serde(rename = "type")]
    pub tx_type: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_amount: f64,
    pub project_id: Option<i64>,
    pub contract_id: Option<i64>,
    pub counterparty_id: Option<i64>,
    pub transaction_date: Option<String>,
    pub document_no: Option<String>,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
    // JOIN 字段
    pub item_name: Option<String>,
    pub project_name: Option<String>,
    pub counterparty_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewInventoryTransaction {
    pub item_id: i64,
    #[serde(rename = "type")]
    pub tx_type: String,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub total_amount: Option<f64>,
    pub project_id: Option<i64>,
    pub contract_id: Option<i64>,
    pub counterparty_id: Option<i64>,
    pub transaction_date: Option<String>,
    pub document_no: Option<String>,
    pub remarks: Option<String>,
}

/// 获取所有物料
#[command]
pub fn get_inventory_items(state: State<'_, AppState>) -> AppResult<Vec<InventoryItem>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT id, code, name, category, unit, specifications,
                    purchase_price, sale_price, current_stock, min_stock,
                    max_stock, supplier_id, remarks, created_at, updated_at
             FROM inventory_items
             ORDER BY created_at DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let items = stmt
        .query_map([], |row| {
            Ok(InventoryItem {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                unit: row.get(4)?,
                specifications: row.get(5)?,
                purchase_price: row.get(6)?,
                sale_price: row.get(7)?,
                current_stock: row.get(8)?,
                min_stock: row.get(9)?,
                max_stock: row.get(10)?,
                supplier_id: row.get(11)?,
                remarks: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(items)
}

/// 新增物料
#[command]
pub fn create_inventory_item(
    state: State<'_, AppState>,
    item: NewInventoryItem,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO inventory_items
         (code, name, category, unit, specifications, purchase_price, sale_price,
          current_stock, min_stock, max_stock, supplier_id, remarks)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            item.code,
            item.name,
            item.category,
            item.unit,
            item.specifications,
            item.purchase_price.unwrap_or(0.0),
            item.sale_price.unwrap_or(0.0),
            item.current_stock.unwrap_or(0.0),
            item.min_stock.unwrap_or(0.0),
            item.max_stock.unwrap_or(0.0),
            item.supplier_id,
            item.remarks,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}

/// 更新物料
#[command]
pub fn update_inventory_item(
    state: State<'_, AppState>,
    id: i64,
    updates: InventoryItemUpdate,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE inventory_items SET
             code = COALESCE(?1, code),
             name = COALESCE(?2, name),
             category = COALESCE(?3, category),
             unit = COALESCE(?4, unit),
             specifications = COALESCE(?5, specifications),
             purchase_price = COALESCE(?6, purchase_price),
             sale_price = COALESCE(?7, sale_price),
             min_stock = COALESCE(?8, min_stock),
             max_stock = COALESCE(?9, max_stock),
             supplier_id = ?10,
             remarks = COALESCE(?11, remarks),
             updated_at = datetime('now')
             WHERE id = ?12",
            params![
                updates.code,
                updates.name,
                updates.category,
                updates.unit,
                updates.specifications,
                updates.purchase_price,
                updates.sale_price,
                updates.min_stock,
                updates.max_stock,
                updates.supplier_id,
                updates.remarks,
                id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("物料 {} 不存在", id)));
    }

    Ok(())
}

/// 删除物料
#[command]
pub fn delete_inventory_item(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 检查是否有关联的出入库记录
    let tx_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM inventory_transactions WHERE item_id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if tx_count > 0 {
        return Err(AppError::Validation(format!(
            "该物料有 {} 条出入库记录，请先删除相关记录",
            tx_count
        )));
    }

    let affected = db
        .execute("DELETE FROM inventory_items WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("物料 {} 不存在", id)));
    }

    Ok(())
}

/// 获取出入库记录（可按物料过滤）
#[command]
pub fn get_inventory_transactions(
    state: State<'_, AppState>,
    item_id: Option<i64>,
) -> AppResult<Vec<InventoryTransaction>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let sql = if item_id.is_some() {
        "SELECT t.id, t.item_id, t.type, t.quantity, t.unit_price, t.total_amount,
                t.project_id, t.contract_id, t.counterparty_id, t.transaction_date,
                t.document_no, t.remarks, t.created_at,
                i.name as item_name,
                p.name as project_name,
                pt.name as counterparty_name
         FROM inventory_transactions t
         LEFT JOIN inventory_items i ON t.item_id = i.id
         LEFT JOIN projects p ON t.project_id = p.id
         LEFT JOIN partners pt ON t.counterparty_id = pt.id
         WHERE t.item_id = ?1
         ORDER BY t.transaction_date DESC, t.created_at DESC"
    } else {
        "SELECT t.id, t.item_id, t.type, t.quantity, t.unit_price, t.total_amount,
                t.project_id, t.contract_id, t.counterparty_id, t.transaction_date,
                t.document_no, t.remarks, t.created_at,
                i.name as item_name,
                p.name as project_name,
                pt.name as counterparty_name
         FROM inventory_transactions t
         LEFT JOIN inventory_items i ON t.item_id = i.id
         LEFT JOIN projects p ON t.project_id = p.id
         LEFT JOIN partners pt ON t.counterparty_id = pt.id
         ORDER BY t.transaction_date DESC, t.created_at DESC"
    };

    let mut stmt = db
        .prepare(sql)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let map_row = |row: &rusqlite::Row| {
        Ok(InventoryTransaction {
            id: row.get(0)?,
            item_id: row.get(1)?,
            tx_type: row.get(2)?,
            quantity: row.get(3)?,
            unit_price: row.get(4)?,
            total_amount: row.get(5)?,
            project_id: row.get(6)?,
            contract_id: row.get(7)?,
            counterparty_id: row.get(8)?,
            transaction_date: row.get(9)?,
            document_no: row.get(10)?,
            remarks: row.get(11)?,
            created_at: row.get(12)?,
            item_name: row.get(13)?,
            project_name: row.get(14)?,
            counterparty_name: row.get(15)?,
        })
    };

    let transactions = if let Some(iid) = item_id {
        stmt.query_map(params![iid], map_row)
            .map_err(|e| AppError::Database(e.to_string()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| AppError::Database(e.to_string()))?
    } else {
        stmt.query_map([], map_row)
            .map_err(|e| AppError::Database(e.to_string()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| AppError::Database(e.to_string()))?
    };

    Ok(transactions)
}

/// 新增出入库记录（同时更新物料库存）
#[command]
pub fn create_inventory_transaction(
    state: State<'_, AppState>,
    transaction: NewInventoryTransaction,
) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    // 计算总金额
    let unit_price = transaction.unit_price.unwrap_or(0.0);
    let total_amount = transaction.total_amount.unwrap_or(unit_price * transaction.quantity);

    db.execute(
        "INSERT INTO inventory_transactions
         (item_id, type, quantity, unit_price, total_amount, project_id,
          contract_id, counterparty_id, transaction_date, document_no, remarks)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            transaction.item_id,
            transaction.tx_type,
            transaction.quantity,
            unit_price,
            total_amount,
            transaction.project_id,
            transaction.contract_id,
            transaction.counterparty_id,
            transaction.transaction_date,
            transaction.document_no,
            transaction.remarks,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    // 根据出入库类型更新物料库存
    // "in" = 入库增加, "out" = 出库减少
    let stock_delta = if transaction.tx_type == "in" {
        transaction.quantity
    } else {
        -transaction.quantity
    };

    db.execute(
        "UPDATE inventory_items
         SET current_stock = current_stock + ?1, updated_at = datetime('now')
         WHERE id = ?2",
        params![stock_delta, transaction.item_id],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();
    Ok(id)
}
