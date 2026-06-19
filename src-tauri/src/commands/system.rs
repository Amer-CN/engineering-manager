use crate::config;
use crate::error::{AppError, AppResult};
use crate::ConfigState;
use serde::{Deserialize, Serialize};
use tauri::command;
use tauri::{Manager, State};

/// 获取应用版本号
#[command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// 获取数据目录路径
#[command]
pub fn get_data_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取数据目录失败: {}", e))?;
    Ok(data_dir.to_string_lossy().to_string())
}

/// 获取上传文件目录路径
#[command]
pub fn get_uploads_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取数据目录失败: {}", e))?;
    let uploads_dir = data_dir.join("uploads");
    Ok(uploads_dir.to_string_lossy().to_string())
}

/// 打开外部链接
#[command]
pub fn open_external(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("打开链接失败: {}", e))
}

/// 打开文件所在目录
#[command]
pub fn open_file_location(path: String) -> Result<(), String> {
    let path = std::path::Path::new(&path);
    let dir = if path.is_dir() {
        path
    } else {
        path.parent().unwrap_or(path)
    };
    open::that(dir).map_err(|e| format!("打开目录失败: {}", e))
}

// ============ 窗口控制命令 ============

/// 最小化窗口
#[command]
pub fn minimize_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or("未找到主窗口")?;
    window.minimize().map_err(|e| format!("最小化失败: {}", e))
}

/// 切换最大化状态
#[command]
pub fn toggle_maximize(app_handle: tauri::AppHandle) -> Result<(), String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or("未找到主窗口")?;
    let is_maximized = window.is_maximized().unwrap_or(false);
    if is_maximized {
        window.unmaximize().map_err(|e| format!("取消最大化失败: {}", e))
    } else {
        window.maximize().map_err(|e| format!("最大化失败: {}", e))
    }
}

/// 关闭窗口
#[command]
pub fn close_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or("未找到主窗口")?;
    window.close().map_err(|e| format!("关闭窗口失败: {}", e))
}

/// 获取窗口是否最大化
#[command]
pub fn is_maximized(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or("未找到主窗口")?;
    window.is_maximized().map_err(|e| format!("获取状态失败: {}", e))
}

/// 设置全屏
#[command]
pub fn set_fullscreen(app_handle: tauri::AppHandle, fullscreen: bool) -> Result<(), String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or("未找到主窗口")?;
    window
        .set_fullscreen(fullscreen)
        .map_err(|e| format!("设置全屏失败: {}", e))
}

/// 获取是否全屏
#[command]
pub fn is_fullscreen(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or("未找到主窗口")?;
    window.is_fullscreen().map_err(|e| format!("获取状态失败: {}", e))
}

/// 设置窗口标题
#[command]
pub fn set_window_title(app_handle: tauri::AppHandle, title: String) -> Result<(), String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or("未找到主窗口")?;
    window
        .set_title(&title)
        .map_err(|e| format!("设置标题失败: {}", e))
}

/// 设置窗口大小
#[command]
pub fn set_window_size(
    app_handle: tauri::AppHandle,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or("未找到主窗口")?;
    window
        .set_size(tauri::LogicalSize::new(width, height))
        .map_err(|e| format!("设置大小失败: {}", e))
}

/// 窗口居中
#[command]
pub fn center_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or("未找到主窗口")?;
    window.center().map_err(|e| format!("居中失败: {}", e))
}

// ============ 配置管理命令 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfigView {
    pub data_path: String,
    pub gpu_acceleration: bool,
}

/// 获取当前应用配置
#[command]
pub fn get_config(state: State<'_, ConfigState>) -> AppResult<AppConfigView> {
    let cfg = state.0.lock().map_err(|e| AppError::Database(e.to_string()))?;
    Ok(AppConfigView {
        data_path: cfg.data_path.clone(),
        gpu_acceleration: cfg.gpu_acceleration,
    })
}

/// 递归复制目录
fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let target = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_recursive(&entry.path(), &target)?;
        } else {
            std::fs::copy(entry.path(), &target)?;
        }
    }
    Ok(())
}

/// 设置数据存储路径（含数据迁移）
#[command]
pub fn set_data_path(
    state: State<'_, ConfigState>,
    app_handle: tauri::AppHandle,
    path: String,
) -> AppResult<()> {
    // 拒绝非法路径（Electron 哨兵值或空路径）
    if path.is_empty() || path == "__select_folder__" {
        return Err(AppError::Validation("无效的存储路径".into()));
    }

    let new_path = std::path::PathBuf::from(&path);

    // 创建新目录
    if !new_path.exists() {
        std::fs::create_dir_all(&new_path)
            .map_err(|e| AppError::FileIO(format!("创建数据目录失败: {}", e)))?;
    }

    // 获取当前数据路径（迁移源）
    let cfg = state.0.lock().map_err(|e| AppError::Database(e.to_string()))?;
    let old_path = std::path::PathBuf::from(&cfg.data_path);
    drop(cfg); // 释放锁

    // 迁移数据：复制 engineering.db + uploads 目录
    if old_path.exists() && old_path != new_path {
        // 复制 SQLite 数据库文件
        let old_db = old_path.join("engineering.db");
        let new_db = new_path.join("engineering.db");
        if old_db.exists() {
            std::fs::copy(&old_db, &new_db)
                .map_err(|e| AppError::FileIO(format!("复制数据库文件失败: {}", e)))?;
            log::info!("数据库文件已复制: {:?} -> {:?}", old_db, new_db);

            // 复制 WAL 和 SHM 文件（如果存在）
            for ext in ["-wal", "-shm"] {
                let old_aux = old_path.join(format!("engineering.db{}", ext));
                let new_aux = new_path.join(format!("engineering.db{}", ext));
                if old_aux.exists() {
                    let _ = std::fs::copy(&old_aux, &new_aux);
                }
            }
        }

        // 复制 uploads 目录
        let old_uploads = old_path.join("uploads");
        let new_uploads = new_path.join("uploads");
        if old_uploads.exists() {
            copy_dir_recursive(&old_uploads, &new_uploads)
                .map_err(|e| AppError::FileIO(format!("复制上传文件失败: {}", e)))?;
            log::info!("上传目录已复制: {:?} -> {:?}", old_uploads, new_uploads);
        }
    }

    // 更新配置
    let mut cfg = state.0.lock().map_err(|e| AppError::Database(e.to_string()))?;
    cfg.data_path = path.clone();

    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| AppError::FileIO(format!("获取资源目录失败: {}", e)))?;
    let config_path = config::get_config_path(&resource_dir);
    config::save_config(&config_path, &cfg)
        .map_err(|e| AppError::FileIO(e))?;

    log::info!("数据路径已更新为: {}，重启后生效", path);
    Ok(())
}

/// 获取 GPU 加速设置
#[command]
pub fn get_gpu_acceleration(state: State<'_, ConfigState>) -> AppResult<bool> {
    let cfg = state.0.lock().map_err(|e| AppError::Database(e.to_string()))?;
    Ok(cfg.gpu_acceleration)
}

/// 设置 GPU 加速
#[command]
pub fn set_gpu_acceleration(
    state: State<'_, ConfigState>,
    app_handle: tauri::AppHandle,
    enabled: bool,
) -> AppResult<()> {
    let mut cfg = state.0.lock().map_err(|e| AppError::Database(e.to_string()))?;
    cfg.gpu_acceleration = enabled;

    // 保存配置到文件
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| AppError::FileIO(format!("获取资源目录失败: {}", e)))?;
    let config_path = config::get_config_path(&resource_dir);
    config::save_config(&config_path, &cfg)
        .map_err(|e| AppError::FileIO(e))?;

    Ok(())
}
