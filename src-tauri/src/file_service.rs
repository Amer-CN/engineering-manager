/**
 * 文件服务模块
 *
 * 统一管理所有上传文件的磁盘读写，按类型分目录存储
 * 对应 Electron 版本的 electron/file-service.ts
 */

use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

// ═══════════════════════════════════════════════════════════════════════════════
// 文件夹结构映射
// ═══════════════════════════════════════════════════════════════════════════════

/// 获取 FOLDER_MAP（静态初始化）
fn get_folder_map() -> HashMap<&'static str, HashMap<&'static str, &'static str>> {
    let mut map = HashMap::new();

    let mut members = HashMap::new();
    members.insert("id-cards", "成员/身份证");
    members.insert("contracts", "成员/劳动合同");
    members.insert("training", "成员/安全培训");
    members.insert("health", "成员/健康报告");
    members.insert("certificates", "成员/特种证书");
    map.insert("members", members);

    let mut invoices = HashMap::new();
    invoices.insert("invoice_in", "发票/收票");
    invoices.insert("invoice_out", "发票/开票");
    map.insert("invoices", invoices);

    let mut payments = HashMap::new();
    payments.insert("payment_in", "收付款/回款");
    payments.insert("payment_out", "收付款/付款");
    map.insert("payments", payments);

    let mut partners = HashMap::new();
    partners.insert("licenses", "合作单位/营业执照");
    partners.insert("attachments", "合作单位/附件");
    map.insert("partners", partners);

    let mut contracts = HashMap::new();
    contracts.insert("income", "合同/收入");
    contracts.insert("expense", "合同/支出");
    map.insert("contracts", contracts);

    let mut drawings = HashMap::new();
    drawings.insert("files", "图纸");
    map.insert("drawings", drawings);

    let mut attendance = HashMap::new();
    attendance.insert("files", "考勤/记录");
    map.insert("attendance", attendance);

    let mut settlement = HashMap::new();
    settlement.insert("files", "结算/凭证");
    map.insert("settlement", settlement);

    let mut templates = HashMap::new();
    templates.insert("files", "模板/文件");
    map.insert("templates", templates);

    let mut cost_ledger = HashMap::new();
    cost_ledger.insert("files", "成本台账/凭证");
    map.insert("costLedger", cost_ledger);

    let mut wages = HashMap::new();
    wages.insert("bank-receipts", "工资/银行回单");
    map.insert("wages", wages);

    map
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════════

/// 清理项目名称中的非法字符
fn sanitize_project_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .filter(|c| !matches!(c, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*'))
        .take(40)
        .collect();
    let trimmed = cleaned.trim().to_string();
    if trimmed.is_empty() {
        "未命名项目".to_string()
    } else {
        trimmed
    }
}

/// 获取项目前缀
fn get_project_prefix(project_name: Option<&str>) -> String {
    match project_name {
        Some(name) if !name.is_empty() => sanitize_project_name(name),
        _ => "未分类".to_string(),
    }
}

/// 获取分类目录
fn get_category_dir(
    uploads_path: &Path,
    category: &str,
    sub_category: &str,
    project_name: Option<&str>,
) -> PathBuf {
    let folder_map = get_folder_map();
    let relative_path = folder_map
        .get(category)
        .and_then(|subs| subs.get(sub_category))
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("{}/{}", category, sub_category));

    uploads_path
        .join(get_project_prefix(project_name))
        .join(relative_path)
}

/// 获取旧版平铺目录
fn get_legacy_flat_dir(uploads_path: &Path, category: &str, sub_category: &str) -> PathBuf {
    let folder_map = get_folder_map();
    let relative_path = folder_map
        .get(category)
        .and_then(|subs| subs.get(sub_category))
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("{}/{}", category, sub_category));

    uploads_path.join(relative_path)
}

/// 从扩展名获取 MIME 类型
fn get_mime_type(ext: &str) -> &'static str {
    match ext.to_lowercase().as_str() {
        "pdf" => "application/pdf",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "dwg" => "application/acad",
        "dxf" => "application/dxf",
        _ => "application/octet-stream",
    }
}

/// 从 MIME 类型猜测扩展名
fn guess_ext_from_mime(mime: &str) -> &'static str {
    match mime {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        "image/gif" => ".gif",
        "image/bmp" => ".bmp",
        "application/pdf" => ".pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => ".docx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" => ".xlsx",
        "application/acad" | "image/vnd.dwg" => ".dwg",
        "application/dxf" | "image/vnd.dxf" => ".dxf",
        _ => ".bin",
    }
}

/// 生成存储文件名
fn generate_stored_file_name(original_file_name: &str) -> String {
    let path = Path::new(original_file_name);
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e))
        .unwrap_or_default();
    let base = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("file");

    let cleaned: String = base
        .chars()
        .filter(|c| !matches!(c, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*'))
        .take(80)
        .collect();

    if cleaned.is_empty() {
        format!("file{}", ext)
    } else {
        format!("{}{}", cleaned, ext)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 核心文件操作
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize)]
pub struct SaveFileOptions {
    pub file_data: String,      // Base64 编码或 data URL
    pub file_name: String,      // 原始文件名
    #[serde(default)]
    pub sub_dir: Option<String>, // 可选的子目录
}

#[derive(Debug, Serialize)]
pub struct SaveFileResult {
    pub file_name: String,
}

#[derive(Debug, Serialize)]
pub struct ReadFileResult {
    pub data_url: String,
    pub mime_type: String,
}

/// 保存文件到磁盘
pub fn save_file(
    uploads_path: &Path,
    category: &str,
    sub_category: &str,
    options: &SaveFileOptions,
    project_name: Option<&str>,
) -> AppResult<SaveFileResult> {
    // 解析 Base64 数据
    use base64::Engine as _;
    let engine = base64::engine::general_purpose::STANDARD;

    let base64_data = if options.file_data.starts_with("data:") {
        // 处理 data URL 格式: data:image/png;base64,xxxx
        let parts: Vec<&str> = options.file_data.splitn(2, ',').collect();
        if parts.len() != 2 {
            return Err(AppError::Validation("无效的 data URL 格式".to_string()));
        }
        parts[1]
    } else {
        &options.file_data
    };

    let buffer = engine
        .decode(base64_data)
        .map_err(|e| AppError::Validation(format!("Base64 解码失败: {}", e)))?;

    let stored_name = generate_stored_file_name(&options.file_name);
    let mut dir = get_category_dir(uploads_path, category, sub_category, project_name);

    if let Some(sub_dir) = &options.sub_dir {
        dir = dir.join(sub_dir);
    }

    // 创建目录
    std::fs::create_dir_all(&dir)
        .map_err(|e| AppError::FileIO(format!("创建目录失败: {}", e)))?;

    let file_path = dir.join(&stored_name);

    // 检查文件是否已存在
    if file_path.exists() {
        return Err(AppError::Validation(format!(
            "文件 \"{}\" 已存在，请修改文件名后重新上传",
            stored_name
        )));
    }

    // 写入文件
    std::fs::write(&file_path, &buffer)
        .map_err(|e| AppError::FileIO(format!("写入文件失败: {}", e)))?;

    log::info!(
        "File saved: {}/{}/{} ({} bytes)",
        category,
        sub_category,
        stored_name,
        buffer.len()
    );

    Ok(SaveFileResult {
        file_name: stored_name,
    })
}

/// 从磁盘读取文件，返回 data URL
pub fn read_file(
    uploads_path: &Path,
    category: &str,
    sub_category: &str,
    file_name: &str,
    project_name: Option<&str>,
) -> AppResult<ReadFileResult> {
    // 三级回退：项目路径 → 未分类/ → _common → 旧版平铺路径
    let mut prefixes_to_try: Vec<Option<String>> = Vec::new();

    if let Some(proj) = project_name {
        if !proj.is_empty() {
            prefixes_to_try.push(Some(sanitize_project_name(proj)));
        }
    }

    prefixes_to_try.push(Some("未分类".to_string()));
    prefixes_to_try.push(Some("_common".to_string()));
    prefixes_to_try.push(None); // 旧版平铺路径

    let folder_map = get_folder_map();
    let relative_path = folder_map
        .get(category)
        .and_then(|subs| subs.get(sub_category))
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("{}/{}", category, sub_category));

    for prefix in &prefixes_to_try {
        let file_path = match prefix {
            Some(p) => uploads_path.join(p).join(&relative_path).join(file_name),
            None => get_legacy_flat_dir(uploads_path, category, sub_category).join(file_name),
        };

        if file_path.exists() {
            let buffer = std::fs::read(&file_path)
                .map_err(|e| AppError::FileIO(format!("读取文件失败: {}", e)))?;

            let ext = file_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("");
            let mime_type = get_mime_type(ext);

            use base64::Engine as _;
            let engine = base64::engine::general_purpose::STANDARD;
            let base64_str = engine.encode(&buffer);

            log::info!("File read: {:?}", file_path);

            return Ok(ReadFileResult {
                data_url: format!("data:{};base64,{}", mime_type, base64_str),
                mime_type: mime_type.to_string(),
            });
        }
    }

    Err(AppError::NotFound(format!(
        "文件 {}/{}/{} 不存在",
        category, sub_category, file_name
    )))
}

/// 从磁盘删除文件
pub fn delete_file(
    uploads_path: &Path,
    category: &str,
    sub_category: &str,
    file_name: &str,
    project_name: Option<&str>,
) -> AppResult<()> {
    // 三级回退：项目路径 → 未分类/ → _common → 旧版平铺路径
    let mut prefixes_to_try: Vec<Option<String>> = Vec::new();

    if let Some(proj) = project_name {
        if !proj.is_empty() {
            prefixes_to_try.push(Some(sanitize_project_name(proj)));
        }
    }

    prefixes_to_try.push(Some("未分类".to_string()));
    prefixes_to_try.push(Some("_common".to_string()));
    prefixes_to_try.push(None);

    let folder_map = get_folder_map();
    let relative_path = folder_map
        .get(category)
        .and_then(|subs| subs.get(sub_category))
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("{}/{}", category, sub_category));

    for prefix in &prefixes_to_try {
        let file_path = match prefix {
            Some(p) => uploads_path.join(p).join(&relative_path).join(file_name),
            None => get_legacy_flat_dir(uploads_path, category, sub_category).join(file_name),
        };

        if file_path.exists() {
            std::fs::remove_file(&file_path)
                .map_err(|e| AppError::FileIO(format!("删除文件失败: {}", e)))?;

            log::info!("File deleted: {:?}", file_path);
            return Ok(());
        }
    }

    Err(AppError::NotFound(format!(
        "文件 {}/{}/{} 不存在",
        category, sub_category, file_name
    )))
}

/// 确保未分类子目录存在
pub fn ensure_unclassified_dirs(uploads_path: &Path) {
    let folder_map = get_folder_map();
    let base = uploads_path.join("未分类");

    for (_category, subs) in &folder_map {
        for (_sub_key, relative_path) in subs {
            let dir = base.join(relative_path);
            if !dir.exists() {
                if let Err(e) = std::fs::create_dir_all(&dir) {
                    log::warn!("创建目录失败 {:?}: {}", dir, e);
                }
            }
        }
    }
}

/// 在系统默认程序中打开文件
pub fn open_file_external(file_path: &Path) -> AppResult<()> {
    if !file_path.exists() {
        return Err(AppError::NotFound(format!(
            "文件 {:?} 不存在",
            file_path
        )));
    }

    open::that(file_path).map_err(|e| AppError::FileIO(format!("打开文件失败: {}", e)))?;

    Ok(())
}
