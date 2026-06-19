/**
 * 配置管理模块
 *
 * 对应 Electron 版本的 config.ts 和 database.ts 中的配置相关函数
 */

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// 数据存储路径
    #[serde(default = "default_data_path")]
    pub data_path: String,

    /// GPU 加速设置
    #[serde(default = "default_true")]
    pub gpu_acceleration: bool,
}

fn default_data_path() -> String {
    // 默认使用 AppData 目录
    dirs::data_dir()
        .map(|p| p.join("工程管家").to_string_lossy().to_string())
        .unwrap_or_else(|| "./data".to_string())
}

fn default_true() -> bool {
    true
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            data_path: default_data_path(),
            gpu_acceleration: true,
        }
    }
}

/// 获取配置文件路径
/// 优先从项目目录读取（支持多电脑同步开发）
pub fn get_config_path(app_dir: &Path) -> PathBuf {
    // 项目目录下的 config.json
    let project_config = app_dir.join("config.json");
    if project_config.exists() {
        return project_config;
    }

    // AppData 目录下的 config.json（旧版兼容）
    let appdata_config = dirs::config_dir()
        .map(|p| p.join("工程管家").join("config.json"))
        .unwrap_or_else(|| project_config.clone());

    // Electron 版本的配置路径（兼容）
    let electron_config = dirs::config_dir()
        .map(|p| p.join("engineering-manager").join("config.json"))
        .unwrap_or_else(|| project_config.clone());

    // 优先级：工程管家目录 > engineering-manager 目录 > 项目目录
    if appdata_config.exists() {
        return appdata_config;
    }
    if electron_config.exists() {
        return electron_config;
    }

    project_config
}

/// 加载配置
pub fn load_config(config_path: &Path) -> AppConfig {
    if config_path.exists() {
        match std::fs::read_to_string(config_path) {
            Ok(content) => match serde_json::from_str(&content) {
                Ok(config) => {
                    log::info!("配置已加载: {:?}", config_path);
                    return config;
                }
                Err(e) => {
                    log::warn!("配置解析失败: {}", e);
                }
            },
            Err(e) => {
                log::warn!("读取配置文件失败: {}", e);
            }
        }
    }

    log::info!("使用默认配置");
    AppConfig::default()
}

/// 保存配置
pub fn save_config(config_path: &Path, config: &AppConfig) -> Result<(), String> {
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;

    // 确保父目录存在
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("创建配置目录失败: {}", e))?;
    }

    std::fs::write(config_path, content)
        .map_err(|e| format!("写入配置文件失败: {}", e))?;

    log::info!("配置已保存: {:?}", config_path);
    Ok(())
}
