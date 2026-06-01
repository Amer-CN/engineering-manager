use serde::Serialize;
use std::fmt;

/// 统一的应用错误类型
/// Rust 端返回 Result<T, AppError>，前端统一 catch
#[derive(Debug)]
pub enum AppError {
    /// SQLite 错误
    Database(String),
    /// 记录不存在
    NotFound(String),
    /// 数据校验失败
    Validation(String),
    /// 文件操作错误
    FileIO(String),
    /// HTTP 请求错误（OCR 等）
    Network(String),
    /// 权限不足
    Permission(String),
    /// JSON 序列化/反序列化错误
    Serialization(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Database(msg) => write!(f, "数据库错误: {}", msg),
            AppError::NotFound(msg) => write!(f, "记录不存在: {}", msg),
            AppError::Validation(msg) => write!(f, "数据校验失败: {}", msg),
            AppError::FileIO(msg) => write!(f, "文件操作错误: {}", msg),
            AppError::Network(msg) => write!(f, "网络请求错误: {}", msg),
            AppError::Permission(msg) => write!(f, "权限不足: {}", msg),
            AppError::Serialization(msg) => write!(f, "序列化错误: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

// Tauri 需要错误类型实现 Serialize
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// 从 rusqlite 错误转换
impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::Database(err.to_string())
    }
}

// 从 serde_json 错误转换
impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Serialization(err.to_string())
    }
}

// 从 std::io::Error 转换
impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::FileIO(err.to_string())
    }
}

/// 统一的 Result 类型
pub type AppResult<T> = Result<T, AppError>;

/// 统一的 IPC 响应格式（与 Electron 版本兼容）
#[derive(Serialize)]
pub struct IpcResponse<T: Serialize> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl<T: Serialize> IpcResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(msg: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(msg),
        }
    }
}

impl<T: Serialize> From<AppResult<T>> for IpcResponse<T> {
    fn from(result: AppResult<T>) -> Self {
        match result {
            Ok(data) => Self::ok(data),
            Err(e) => Self::err(e.to_string()),
        }
    }
}
