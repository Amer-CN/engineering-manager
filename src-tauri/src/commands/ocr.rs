/**
 * OCR 识别命令
 *
 * 对应 Electron 版本的 ocr.ts
 * 使用 Rust reqwest 调用百度 OCR API
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{command, State};

// ============ 类型定义 ============

#[derive(Debug, Deserialize, Clone)]
pub struct BaiduOCRConfig {
    pub api_key: String,
    pub secret_key: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OCRResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OCRStats {
    pub id_card: u64,
    pub invoice: u64,
    pub bank_card: u64,
    pub business_license: u64,
    pub bank_receipt: u64,
    pub permit: u64,
    pub bank_statement: u64,
    pub general_receipt: u64,
    pub company_query: u64,
    pub last_reset: String,
}

impl Default for OCRStats {
    fn default() -> Self {
        Self {
            id_card: 0,
            invoice: 0,
            bank_card: 0,
            business_license: 0,
            bank_receipt: 0,
            permit: 0,
            bank_statement: 0,
            general_receipt: 0,
            company_query: 0,
            last_reset: chrono::Local::now().format("%Y-%m").to_string(),
        }
    }
}

// ============ Token 缓存 ============

struct TokenCache {
    token: String,
    expires_at: Instant,
}

static TOKEN_CACHE: once_cell::sync::Lazy<Mutex<Option<TokenCache>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(None));

/// 获取百度 OCR Access Token
async fn get_access_token(config: &BaiduOCRConfig) -> AppResult<String> {
    // 检查缓存
    {
        let cache = TOKEN_CACHE.lock().map_err(|e| AppError::Database(e.to_string()))?;
        if let Some(ref cached) = *cache {
            if Instant::now() < cached.expires_at {
                return Ok(cached.token.clone());
            }
        }
    }

    // 请求新 token
    let url = format!(
        "https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={}&client_secret={}",
        config.api_key, config.secret_key
    );

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Network(e.to_string()))?;

    let resp = client
        .post(&url)
        .send()
        .await
        .map_err(|e| AppError::Network(format!("获取 token 失败: {}", e)))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::Network(format!("解析 token 响应失败: {}", e)))?;

    if let Some(err_code) = body.get("error_code") {
        return Err(AppError::Network(format!(
            "百度 API 错误: {} - {}",
            err_code,
            body.get("error_msg")
                .and_then(|v| v.as_str())
                .unwrap_or("未知错误")
        )));
    }

    let token = body
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::Network("响应中没有 access_token".to_string()))?
        .to_string();

    let expires_in = body
        .get("expires_in")
        .and_then(|v| v.as_u64())
        .unwrap_or(2592000);

    // 缓存（提前 1 小时过期）
    let expires_at = Instant::now() + Duration::from_secs(expires_in.saturating_sub(3600));
    {
        let mut cache = TOKEN_CACHE.lock().map_err(|e| AppError::Database(e.to_string()))?;
        *cache = Some(TokenCache {
            token: token.clone(),
            expires_at,
        });
    }

    Ok(token)
}

/// 清除 token 缓存
fn clear_token_cache() {
    if let Ok(mut cache) = TOKEN_CACHE.lock() {
        *cache = None;
    }
}

/// 去掉 data:image/...;base64, 前缀
fn strip_base64_prefix(image_base64: &str) -> &str {
    if let Some(pos) = image_base64.find(",") {
        &image_base64[pos + 1..]
    } else {
        image_base64
    }
}

// ============ Stats 管理 ============

fn get_stats_path(data_path: &PathBuf) -> PathBuf {
    data_path.join("ocr-stats.json")
}

fn load_stats(data_path: &PathBuf) -> OCRStats {
    let path = get_stats_path(data_path);
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(mut stats) = serde_json::from_str::<OCRStats>(&content) {
            let current_month = chrono::Local::now().format("%Y-%m").to_string();
            if stats.last_reset != current_month {
                stats = OCRStats {
                    last_reset: current_month,
                    ..Default::default()
                };
            }
            return stats;
        }
    }
    OCRStats::default()
}

fn save_stats(data_path: &PathBuf, stats: &OCRStats) {
    let path = get_stats_path(data_path);
    if let Ok(content) = serde_json::to_string_pretty(stats) {
        let _ = std::fs::write(&path, content);
    }
}

fn increment_stat(data_path: &PathBuf, key: &str) {
    let mut stats = load_stats(data_path);
    match key {
        "idCard" => stats.id_card += 1,
        "invoice" => stats.invoice += 1,
        "bankCard" => stats.bank_card += 1,
        "businessLicense" => stats.business_license += 1,
        "bankReceipt" => stats.bank_receipt += 1,
        "permit" => stats.permit += 1,
        "bankStatement" => stats.bank_statement += 1,
        "generalReceipt" => stats.general_receipt += 1,
        "companyQuery" => stats.company_query += 1,
        _ => {}
    }
    save_stats(data_path, &stats);
}

// ============ 通用 OCR 请求 ============

async fn call_baidu_ocr(
    endpoint: &str,
    image_base64: &str,
    config: &BaiduOCRConfig,
    extra_fields: &[(&str, &str)],
) -> AppResult<serde_json::Value> {
    let token = get_access_token(config).await?;
    let stripped = strip_base64_prefix(image_base64);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| AppError::Network(e.to_string()))?;

    let mut params = vec![("image", stripped)];
    params.extend_from_slice(extra_fields);

    let url = format!("{}?access_token={}", endpoint, token);

    let resp = client
        .post(&url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&params)
        .send()
        .await
        .map_err(|e| AppError::Network(format!("OCR 请求失败: {}", e)))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::Network(format!("解析 OCR 响应失败: {}", e)))?;

    // 检查 token 错误
    if let Some(err_code) = body.get("error_code").and_then(|v| v.as_i64()) {
        if err_code == 110 || err_code == 111 {
            clear_token_cache();
        }
        return Err(AppError::Network(format!(
            "百度 OCR 错误: {} - {}",
            err_code,
            body.get("error_msg")
                .and_then(|v| v.as_str())
                .unwrap_or("未知错误")
        )));
    }

    Ok(body)
}

/// 从 words_result 中提取字段值
fn get_word(body: &serde_json::Value, key: &str) -> Option<String> {
    body.get("words_result")?
        .get(key)?
        .get("words")?
        .as_str()
        .map(|s| s.to_string())
}

/// 格式化日期（去掉中文字符）
fn format_date(raw: &str) -> String {
    raw.replace("年", "-")
        .replace("月", "-")
        .replace("日", "")
        .trim()
        .to_string()
}

// ============ 命令实现 ============

/// 身份证识别
#[command]
pub async fn ocr_baidu_id_card(
    state: State<'_, AppState>,
    image_base64: String,
    config: BaiduOCRConfig,
) -> AppResult<OCRResult> {
    let body = call_baidu_ocr(
        "https://aip.baidubce.com/rest/2.0/ocr/v1/idcard",
        &image_base64,
        &config,
        &[("id_card_side", "front")],
    )
    .await?;

    let _result = &body["words_result"];
    let data = serde_json::json!({
        "idCard": {
            "idNumber": get_word(&body, "公民身份号码"),
            "name": get_word(&body, "姓名"),
            "gender": get_word(&body, "性别"),
            "ethnicity": get_word(&body, "民族"),
            "birthDate": get_word(&body, "出生").map(|d| format_date(&d)),
            "address": get_word(&body, "住址"),
            "issuer": get_word(&body, "签发机关"),
            "validPeriod": get_word(&body, "有效期限"),
        }
    });

    increment_stat(&state.data_path, "idCard");
    Ok(OCRResult {
        success: true,
        data: Some(data),
        error: None,
    })
}

/// 增值税发票识别
#[command]
pub async fn ocr_baidu_invoice(
    state: State<'_, AppState>,
    image_base64: String,
    config: BaiduOCRConfig,
) -> AppResult<OCRResult> {
    let body = call_baidu_ocr(
        "https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice",
        &image_base64,
        &config,
        &[],
    )
    .await?;

    let result = &body["words_result"];

    let commodity_names = result
        .get("CommodityName")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| item.get("word").and_then(|w| w.as_str()).map(|s| s.to_string()))
                .collect::<Vec<_>>()
                .join(", ")
        });

    let commodity_tax_rates = result
        .get("CommodityTaxRate")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| item.get("word").and_then(|w| w.as_str()).map(|s| s.to_string()))
                .collect::<Vec<_>>()
                .join(", ")
        });

    let raw_date = result
        .get("InvoiceDate")
        .and_then(|v| v.get("word"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let invoice_date = format_date(raw_date);

    let data = serde_json::json!({
        "invoice": {
            "invoiceNumber": result.get("InvoiceNum").and_then(|v| v.get("word")).and_then(|v| v.as_str()),
            "invoiceCode": result.get("InvoiceCode").and_then(|v| v.get("word")).and_then(|v| v.as_str()),
            "invoiceDate": invoice_date,
            "invoiceType": result.get("InvoiceType").and_then(|v| v.get("word")).and_then(|v| v.as_str()),
            "totalAmount": result.get("TotalAmount").and_then(|v| v.get("word")).and_then(|v| v.as_str()),
            "totalTax": result.get("TotalTax").and_then(|v| v.get("word")).and_then(|v| v.as_str()),
            "amountInFigures": result.get("AmountInFiguers").and_then(|v| v.get("word")).and_then(|v| v.as_str()),
            "sellerName": result.get("SellerName").and_then(|v| v.get("word")).and_then(|v| v.as_str()),
            "purchaserName": result.get("PurchaserName").and_then(|v| v.get("word")).and_then(|v| v.as_str()),
            "checkCode": result.get("CheckCode").and_then(|v| v.get("word")).and_then(|v| v.as_str()),
            "commodityNames": commodity_names,
            "commodityTaxRates": commodity_tax_rates,
            "remarks": result.get("Remarks").and_then(|v| v.get("word")).and_then(|v| v.as_str()),
        }
    });

    increment_stat(&state.data_path, "invoice");
    Ok(OCRResult {
        success: true,
        data: Some(data),
        error: None,
    })
}

/// 银行卡识别
#[command]
pub async fn ocr_baidu_bank_card(
    state: State<'_, AppState>,
    image_base64: String,
    config: BaiduOCRConfig,
) -> AppResult<OCRResult> {
    let body = call_baidu_ocr(
        "https://aip.baidubce.com/rest/2.0/ocr/v1/bankcard",
        &image_base64,
        &config,
        &[],
    )
    .await?;

    let result = &body["words_result"];
    let data = serde_json::json!({
        "bankCard": {
            "cardNumber": result.get("bank_card_number").and_then(|v| v.as_str()),
            "bankName": result.get("bank_name").and_then(|v| v.as_str()),
            "cardType": result.get("card_type").and_then(|v| v.as_str()),
            "validDate": result.get("valid_date").and_then(|v| v.as_str()),
        }
    });

    increment_stat(&state.data_path, "bankCard");
    Ok(OCRResult {
        success: true,
        data: Some(data),
        error: None,
    })
}

/// 营业执照识别
#[command]
pub async fn ocr_baidu_business_license(
    state: State<'_, AppState>,
    image_base64: String,
    config: BaiduOCRConfig,
) -> AppResult<OCRResult> {
    let body = call_baidu_ocr(
        "https://aip.baidubce.com/rest/2.0/ocr/v1/business_license",
        &image_base64,
        &config,
        &[],
    )
    .await?;

    let _result = &body["words_result"];
    let data = serde_json::json!({
        "businessLicense": {
            "creditCode": get_word(&body, "社会信用代码"),
            "companyName": get_word(&body, "单位名称"),
            "legalPerson": get_word(&body, "法人"),
            "registeredCapital": get_word(&body, "注册资本"),
            "address": get_word(&body, "地址"),
            "businessScope": get_word(&body, "经营范围"),
            "establishDate": get_word(&body, "成立日期").map(|d| format_date(&d)),
            "validPeriod": get_word(&body, "有效期"),
        }
    });

    increment_stat(&state.data_path, "businessLicense");
    Ok(OCRResult {
        success: true,
        data: Some(data),
        error: None,
    })
}

/// 银行回单识别
#[command]
pub async fn ocr_baidu_bank_receipt(
    state: State<'_, AppState>,
    image_base64: String,
    config: BaiduOCRConfig,
) -> AppResult<OCRResult> {
    let body = call_baidu_ocr(
        "https://aip.baidubce.com/rest/2.0/ocr/v1/receipt",
        &image_base64,
        &config,
        &[],
    )
    .await?;

    let _result = &body["words_result"];
    let amount = get_word(&body, "金额").or_else(|| get_word(&body, "交易金额"));
    let payer = get_word(&body, "付款方").or_else(|| get_word(&body, "付款人"));
    let payee = get_word(&body, "收款方").or_else(|| get_word(&body, "收款人"));
    let txn_no = get_word(&body, "流水号").or_else(|| get_word(&body, "交易流水号"));
    let remark = get_word(&body, "摘要").or_else(|| get_word(&body, "备注"));

    let data = serde_json::json!({
        "bankReceipt": {
            "date": get_word(&body, "交易日期"),
            "time": get_word(&body, "交易时间"),
            "amount": amount,
            "payer": payer,
            "payerAccount": get_word(&body, "付款账号"),
            "payee": payee,
            "payeeAccount": get_word(&body, "收款账号"),
            "transactionNo": txn_no,
            "bankName": get_word(&body, "银行名称"),
            "remark": remark,
        }
    });

    increment_stat(&state.data_path, "bankReceipt");
    Ok(OCRResult {
        success: true,
        data: Some(data),
        error: None,
    })
}

/// 开户许可证识别
#[command]
pub async fn ocr_baidu_permit(
    state: State<'_, AppState>,
    image_base64: String,
    config: BaiduOCRConfig,
) -> AppResult<OCRResult> {
    let body = call_baidu_ocr(
        "https://aip.baidubce.com/rest/2.0/ocr/v1/business_license",
        &image_base64,
        &config,
        &[],
    )
    .await?;

    let data = serde_json::json!({
        "permit": {
            "creditCode": get_word(&body, "社会信用代码"),
            "companyName": get_word(&body, "单位名称"),
            "accountNumber": "",
            "bankName": "",
            "permitNumber": "",
        }
    });

    increment_stat(&state.data_path, "permit");
    Ok(OCRResult {
        success: true,
        data: Some(data),
        error: None,
    })
}

/// 银行单据识别
#[command]
pub async fn ocr_baidu_bank_statement(
    state: State<'_, AppState>,
    image_base64: String,
    config: BaiduOCRConfig,
) -> AppResult<OCRResult> {
    let body = call_baidu_ocr(
        "https://aip.baidubce.com/rest/2.0/ocr/v1/bank_receipt",
        &image_base64,
        &config,
        &[],
    )
    .await?;

    let items = body
        .get("words_result")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .map(|item| {
                    let get = |keys: &[&str]| -> Option<String> {
                        for key in keys {
                            if let Some(v) = item.get(key).and_then(|v| v.as_str()) {
                                if !v.is_empty() {
                                    return Some(v.to_string());
                                }
                            }
                        }
                        None
                    };
                    serde_json::json!({
                        "date": get(&["date", "交易日期", "交易时间"]),
                        "time": get(&["time"]),
                        "amount": get(&["amount", "金额", "交易金额"]),
                        "balance": get(&["balance", "余额"]),
                        "type": get(&["type", "类型"]),
                        "counterparty": get(&["counterparty", "对方"]),
                        "remark": get(&["remark", "摘要", "备注"]),
                    })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let data = serde_json::json!({
        "bankStatement": {
            "transactions": items,
        }
    });

    increment_stat(&state.data_path, "bankStatement");
    Ok(OCRResult {
        success: true,
        data: Some(data),
        error: None,
    })
}

/// 通用票据识别
#[command]
pub async fn ocr_baidu_general_receipt(
    state: State<'_, AppState>,
    image_base64: String,
    config: BaiduOCRConfig,
) -> AppResult<OCRResult> {
    let body = call_baidu_ocr(
        "https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic",
        &image_base64,
        &config,
        &[],
    )
    .await?;

    let words: Vec<String> = body
        .get("words_result")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| item.get("words").and_then(|w| w.as_str()).map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let full_text = words.join("\n");

    // 提取金额和日期
    let amount_regex = regex::Regex::new(r"(\d+(?:\.\d+)?)\s*元").ok();
    let date_regex = regex::Regex::new(r"(\d{4})年(\d{1,2})月(\d{1,2})日").ok();

    let amount = amount_regex
        .and_then(|re| re.captures(&full_text))
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().to_string());

    let date = date_regex
        .and_then(|re| re.captures(&full_text))
        .map(|cap| {
            format!(
                "{}-{:02}-{:02}",
                &cap[1],
                cap[2].parse::<u32>().unwrap_or(1),
                cap[3].parse::<u32>().unwrap_or(1)
            )
        });

    let data = serde_json::json!({
        "generalReceipt": {
            "text": full_text,
            "amount": amount,
            "date": date,
        }
    });

    increment_stat(&state.data_path, "generalReceipt");
    Ok(OCRResult {
        success: true,
        data: Some(data),
        error: None,
    })
}

/// 企业查询（stub，暂不支持）
#[command]
pub async fn ocr_baidu_company_query(
    state: State<'_, AppState>,
    _company_name: String,
    _config: BaiduOCRConfig,
) -> AppResult<OCRResult> {
    increment_stat(&state.data_path, "companyQuery");
    Ok(OCRResult {
        success: false,
        data: None,
        error: Some("企业查询功能需要单独配置 API，请使用营业执照识别".to_string()),
    })
}

/// 网络连通性检查
#[command]
pub async fn ocr_check_network() -> AppResult<bool> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| AppError::Network(e.to_string()))?;

    match client
        .head("https://www.baidu.com/favicon.ico")
        .send()
        .await
    {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false),
    }
}

/// 清除 token 缓存
#[command]
pub fn ocr_clear_token_cache() -> AppResult<bool> {
    clear_token_cache();
    Ok(true)
}

/// 获取 OCR 使用统计
#[command]
pub fn ocr_get_stats(state: State<'_, AppState>) -> AppResult<OCRStats> {
    Ok(load_stats(&state.data_path))
}
