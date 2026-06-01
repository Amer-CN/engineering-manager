/**
 * 快照管理模块
 *
 * 对应 Electron 版本的 snapshots.ts
 * 支持 SQLite 数据库快照的创建、列表、还原、删除
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::{command, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotInfo {
    pub timestamp: String,
    pub file_size: u64,
    pub db_summary: std::collections::HashMap<String, i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SnapshotIndex {
    pub snapshots: Vec<SnapshotInfo>,
    pub max_count: usize,
}

impl Default for SnapshotIndex {
    fn default() -> Self {
        Self {
            snapshots: Vec::new(),
            max_count: 200,
        }
    }
}

/// 获取快照目录
fn get_snapshots_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("snapshots")
}

/// 获取快照索引文件路径
fn get_index_path(data_dir: &Path) -> PathBuf {
    get_snapshots_dir(data_dir).join("index.json")
}

/// 加载快照索引
fn load_index(data_dir: &Path) -> SnapshotIndex {
    let index_path = get_index_path(data_dir);
    if index_path.exists() {
        match std::fs::read_to_string(&index_path) {
            Ok(content) => match serde_json::from_str(&content) {
                Ok(index) => return index,
                Err(e) => log::warn!("解析快照索引失败: {}", e),
            },
            Err(e) => log::warn!("读取快照索引失败: {}", e),
        }
    }
    SnapshotIndex::default()
}

/// 保存快照索引
fn save_index(data_dir: &Path, index: &SnapshotIndex) -> AppResult<()> {
    let snapshots_dir = get_snapshots_dir(data_dir);
    std::fs::create_dir_all(&snapshots_dir)
        .map_err(|e| AppError::FileIO(format!("创建快照目录失败: {}", e)))?;

    let index_path = get_index_path(data_dir);
    let content = serde_json::to_string_pretty(index)
        .map_err(|e| AppError::Serialization(format!("序列化索引失败: {}", e)))?;

    std::fs::write(&index_path, content)
        .map_err(|e| AppError::FileIO(format!("写入索引失败: {}", e)))?;

    Ok(())
}

/// 生成时间戳
fn generate_timestamp() -> String {
    chrono::Local::now().format("%Y%m%d_%H%M%S").to_string()
}

/// 列出所有快照
#[command]
pub fn get_snapshots(state: State<'_, AppState>) -> AppResult<Vec<SnapshotInfo>> {
    let data_dir = &state.data_path;
    let index = load_index(data_dir);
    Ok(index.snapshots)
}

/// 创建快照
#[command]
pub fn create_snapshot(state: State<'_, AppState>, label: Option<String>) -> AppResult<SnapshotInfo> {
    let data_dir = &state.data_path;
    let db_path = data_dir.join("engineering.db");

    if !db_path.exists() {
        return Err(AppError::NotFound("数据库文件不存在".to_string()));
    }

    let timestamp = generate_timestamp();
    let snapshots_dir = get_snapshots_dir(data_dir);
    std::fs::create_dir_all(&snapshots_dir)
        .map_err(|e| AppError::FileIO(format!("创建快照目录失败: {}", e)))?;

    // 复制数据库文件
    let snapshot_path = snapshots_dir.join(format!("{}.db", timestamp));
    std::fs::copy(&db_path, &snapshot_path)
        .map_err(|e| AppError::FileIO(format!("复制数据库失败: {}", e)))?;

    // 如果存在 WAL 文件，也复制
    let wal_path = db_path.with_extension("db-wal");
    if wal_path.exists() {
        let wal_snapshot = snapshots_dir.join(format!("{}.db-wal", timestamp));
        let _ = std::fs::copy(&wal_path, &wal_snapshot);
    }

    // 获取文件大小
    let file_size = std::fs::metadata(&snapshot_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // 创建快照信息
    let snapshot_info = SnapshotInfo {
        timestamp: timestamp.clone(),
        file_size,
        db_summary: std::collections::HashMap::new(), // TODO: 查询表行数
        label,
    };

    // 更新索引
    let mut index = load_index(data_dir);
    index.snapshots.push(snapshot_info.clone());

    // 如果超过最大数量，删除旧快照
    while index.snapshots.len() > index.max_count {
        let oldest = index.snapshots.remove(0);
        let old_path = snapshots_dir.join(format!("{}.db", oldest.timestamp));
        let _ = std::fs::remove_file(old_path);
        let old_wal = snapshots_dir.join(format!("{}.db-wal", oldest.timestamp));
        let _ = std::fs::remove_file(old_wal);
    }

    save_index(data_dir, &index)?;

    log::info!("快照已创建: {}", timestamp);
    Ok(snapshot_info)
}

/// 还原快照
#[command]
pub fn restore_snapshot(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let data_dir = &state.data_path;
    let timestamp = &id;
    let snapshots_dir = get_snapshots_dir(data_dir);
    let snapshot_path = snapshots_dir.join(format!("{}.db", timestamp));

    if !snapshot_path.exists() {
        return Err(AppError::NotFound(format!(
            "快照 {} 不存在",
            timestamp
        )));
    }

    let db_path = data_dir.join("engineering.db");

    // 备份当前数据库
    let backup_timestamp = generate_timestamp();
    let backup_path = data_dir.join(format!("engineering_before_restore_{}.db", backup_timestamp));
    if db_path.exists() {
        let _ = std::fs::copy(&db_path, &backup_path);
    }

    // 还原快照
    std::fs::copy(&snapshot_path, &db_path)
        .map_err(|e| AppError::FileIO(format!("还原数据库失败: {}", e)))?;

    // 还原 WAL 文件（如果存在）
    let wal_snapshot = snapshots_dir.join(format!("{}.db-wal", timestamp));
    if wal_snapshot.exists() {
        let wal_path = db_path.with_extension("db-wal");
        let _ = std::fs::copy(&wal_snapshot, &wal_path);
    }

    log::info!("快照已还原: {}", timestamp);
    Ok(())
}

/// 删除快照
#[command]
pub fn delete_snapshot(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let data_dir = &state.data_path;
    let timestamp = &id;
    let snapshots_dir = get_snapshots_dir(data_dir);

    // 删除快照文件
    let snapshot_path = snapshots_dir.join(format!("{}.db", timestamp));
    if snapshot_path.exists() {
        std::fs::remove_file(&snapshot_path)
            .map_err(|e| AppError::FileIO(format!("删除快照失败: {}", e)))?;
    }

    let wal_path = snapshots_dir.join(format!("{}.db-wal", timestamp));
    if wal_path.exists() {
        let _ = std::fs::remove_file(&wal_path);
    }

    // 更新索引
    let mut index = load_index(data_dir);
    index.snapshots.retain(|s| &s.timestamp != timestamp);
    save_index(data_dir, &index)?;

    log::info!("快照已删除: {}", timestamp);
    Ok(())
}

/// 设置最大快照数量
#[command]
pub fn set_max_snapshots(state: State<'_, AppState>, count: usize) -> AppResult<usize> {
    let data_dir = &state.data_path;
    let mut index = load_index(data_dir);
    index.max_count = count;

    // 如果当前快照超过新限制，删除旧的
    while index.snapshots.len() > count {
        let oldest = index.snapshots.remove(0);
        let snapshots_dir = get_snapshots_dir(data_dir);
        let old_path = snapshots_dir.join(format!("{}.db", oldest.timestamp));
        let _ = std::fs::remove_file(old_path);
        let old_wal = snapshots_dir.join(format!("{}.db-wal", oldest.timestamp));
        let _ = std::fs::remove_file(old_wal);
    }

    save_index(data_dir, &index)?;
    Ok(count)
}

/// 获取最大快照数量
#[command]
pub fn get_max_snapshots(state: State<'_, AppState>) -> AppResult<usize> {
    let data_dir = &state.data_path;
    let index = load_index(data_dir);
    Ok(index.max_count)
}
