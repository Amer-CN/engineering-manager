use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{command, Manager};

#[derive(Debug, Deserialize)]
pub struct SaveFileOptions {
    pub category: String,
    pub sub_category: String,
    pub file_data: String, // Base64 编码
    pub file_name: String,
    #[serde(default)]
    pub project_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReadFileOptions {
    pub category: String,
    pub sub_category: String,
    pub file_name: String,
    #[serde(default)]
    pub project_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DeleteFileOptions {
    pub category: String,
    pub sub_category: String,
    pub file_name: String,
    #[serde(default)]
    pub project_name: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub file_name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileData {
    pub data_url: String,
    pub mime_type: String,
}

/// 获取文件存储的基础路径
fn get_uploads_base(app_handle: &tauri::AppHandle) -> AppResult<PathBuf> {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| AppError::FileIO(format!("获取数据目录失败: {}", e)))?;
    Ok(data_dir.join("uploads"))
}

/// 构建文件完整路径
fn build_file_path(
    app_handle: &tauri::AppHandle,
    category: &str,
    sub_category: &str,
    file_name: &str,
    project_name: Option<&str>,
) -> AppResult<PathBuf> {
    let base = get_uploads_base(app_handle)?;

    let dir = if let Some(proj) = project_name {
        if !proj.is_empty() {
            base.join(proj).join(category).join(sub_category)
        } else {
            base.join("未分类").join(category).join(sub_category)
        }
    } else {
        base.join("未分类").join(category).join(sub_category)
    };

    Ok(dir.join(file_name))
}

/// 保存文件
#[command]
pub fn save_file(
    app_handle: tauri::AppHandle,
    options: SaveFileOptions,
) -> AppResult<FileInfo> {
    use base64::Engine as _;
    let engine = base64::engine::general_purpose::STANDARD;

    // 解析 Base64 数据
    let file_data = if let Some(data) = options.file_data.strip_prefix("data:") {
        // 处理 data URL 格式: data:image/png;base64,xxxx
        let parts: Vec<&str> = data.splitn(2, ',').collect();
        if parts.len() != 2 {
            return Err(AppError::Validation("无效的 data URL 格式".to_string()));
        }
        engine
            .decode(parts[1])
            .map_err(|e| AppError::Validation(format!("Base64 解码失败: {}", e)))?
    } else {
        engine
            .decode(&options.file_data)
            .map_err(|e| AppError::Validation(format!("Base64 解码失败: {}", e)))?
    };

    let file_path = build_file_path(
        &app_handle,
        &options.category,
        &options.sub_category,
        &options.file_name,
        options.project_name.as_deref(),
    )?;

    // 创建目录
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::FileIO(format!("创建目录失败: {}", e)))?;
    }

    // 检查文件是否已存在
    if file_path.exists() {
        return Err(AppError::Validation(format!(
            "文件 {} 已存在",
            options.file_name
        )));
    }

    // 写入文件
    std::fs::write(&file_path, &file_data)
        .map_err(|e| AppError::FileIO(format!("写入文件失败: {}", e)))?;

    log::info!("文件已保存: {:?}", file_path);

    Ok(FileInfo {
        file_name: options.file_name,
    })
}

/// 读取文件
#[command]
pub fn read_file(
    app_handle: tauri::AppHandle,
    options: ReadFileOptions,
) -> AppResult<FileData> {
    let file_path = build_file_path(
        &app_handle,
        &options.category,
        &options.sub_category,
        &options.file_name,
        options.project_name.as_deref(),
    )?;

    // 尝试读取文件，支持回退链
    let actual_path = if file_path.exists() {
        file_path
    } else {
        // 回退链：项目文件夹 → 未分类 → _common → 旧版平铺路径
        let base = get_uploads_base(&app_handle)?;
        let fallback_paths = vec![
            base.join("未分类")
                .join(&options.category)
                .join(&options.sub_category)
                .join(&options.file_name),
            base.join("_common")
                .join(&options.category)
                .join(&options.sub_category)
                .join(&options.file_name),
            base.join(&options.file_name), // 旧版平铺路径
        ];

        let mut found = None;
        for path in fallback_paths {
            if path.exists() {
                found = Some(path);
                break;
            }
        }

        found.ok_or_else(|| {
            AppError::NotFound(format!("文件 {} 不存在", options.file_name))
        })?
    };

    // 读取文件内容
    let file_data = std::fs::read(&actual_path)
        .map_err(|e| AppError::FileIO(format!("读取文件失败: {}", e)))?;

    // 转换为 Base64
    use base64::Engine as _;
    let engine = base64::engine::general_purpose::STANDARD;
    let base64_data = engine.encode(&file_data);

    // 猜测 MIME 类型
    let mime_type = mime_guess::from_path(&actual_path)
        .first_or_octet_stream()
        .to_string();

    Ok(FileData {
        data_url: format!("data:{};base64,{}", mime_type, base64_data),
        mime_type,
    })
}

/// 删除文件
#[command]
pub fn delete_file(
    app_handle: tauri::AppHandle,
    options: DeleteFileOptions,
) -> AppResult<()> {
    let file_path = build_file_path(
        &app_handle,
        &options.category,
        &options.sub_category,
        &options.file_name,
        options.project_name.as_deref(),
    )?;

    if !file_path.exists() {
        return Err(AppError::NotFound(format!(
            "文件 {} 不存在",
            options.file_name
        )));
    }

    std::fs::remove_file(&file_path)
        .map_err(|e| AppError::FileIO(format!("删除文件失败: {}", e)))?;

    log::info!("文件已删除: {:?}", file_path);

    Ok(())
}

/// 在系统默认程序中打开文件
#[command]
pub fn open_file_external(
    app_handle: tauri::AppHandle,
    options: DeleteFileOptions, // 复用同一个选项结构
) -> AppResult<()> {
    let file_path = build_file_path(
        &app_handle,
        &options.category,
        &options.sub_category,
        &options.file_name,
        options.project_name.as_deref(),
    )?;

    if !file_path.exists() {
        return Err(AppError::NotFound(format!(
            "文件 {} 不存在",
            options.file_name
        )));
    }

    open::that(&file_path).map_err(|e| AppError::FileIO(format!("打开文件失败: {}", e)))?;

    Ok(())
}
