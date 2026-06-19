pub mod commands;
pub mod config;
pub mod db;
pub mod error;
pub mod file_service;
pub mod health_check;
pub mod snapshots;

use db::AppState;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

/// URL 解码（处理中文路径）
fn urldecode(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.bytes();
    while let Some(b) = chars.next() {
        if b == b'%' {
            let hi = chars.next().unwrap_or(0);
            let lo = chars.next().unwrap_or(0);
            let byte = u8::from_str_radix(
                &format!("{}{}", hi as char, lo as char),
                16,
            )
            .unwrap_or(b'?');
            result.push(byte as char);
        } else if b == b'+' {
            result.push(' ');
        } else {
            result.push(b as char);
        }
    }
    result
}

/// 上传目录路径状态
pub struct UploadsPath(pub PathBuf);

/// 配置状态
pub struct ConfigState(pub Mutex<config::AppConfig>);

/// 初始化 Tauri 应用
pub fn run() {
    // 预计算数据目录（用于 contract-file 协议注册）
    let pre_data_path = config::AppConfig::default().data_path;
    let pre_uploads_path = PathBuf::from(&pre_data_path).join("uploads");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .register_uri_scheme_protocol("contract-file", {
            let uploads_path = pre_uploads_path.clone();
            move |_ctx, request| {
                let uploads_path = &uploads_path;
                let url_str = request.uri().to_string();
                let raw_path = url_str
                    .strip_prefix("contract-file:///")
                    .unwrap_or(&url_str);
                let raw_path = urldecode(raw_path);

                // 解析路径
                let parts: Vec<&str> = raw_path.split('/').collect();
                let mut project_name: Option<&str> = None;
                let mut sub_category: Option<&str> = None;
                let mut file_name = raw_path.as_str();
                let mut idx = 0;

                if parts.len() >= 2
                    && parts[0] != "income"
                    && parts[0] != "expense"
                    && parts[0].parse::<u64>().is_err()
                {
                    project_name = Some(parts[0]);
                    idx = 1;
                } else if parts.len() >= 2 && parts[0].parse::<u64>().is_ok() {
                    idx = 1;
                }

                if idx < parts.len() && (parts[idx] == "income" || parts[idx] == "expense") {
                    sub_category = Some(parts[idx]);
                    if let Some(rest) = raw_path.get(parts[..idx + 1].join("/").len() + 1..) {
                        file_name = rest;
                    }
                } else if idx == 0 {
                    file_name = &raw_path;
                } else if let Some(rest) = raw_path.get(parts[..idx].join("/").len() + 1..) {
                    file_name = rest;
                }

                let cn_name = |sub: &str| -> String {
                    match sub {
                        "income" => "合同/收入".to_string(),
                        "expense" => "合同/支出".to_string(),
                        _ => sub.to_string(),
                    }
                };

                let sub_cats: Vec<&str> = if let Some(sc) = sub_category {
                    vec![sc]
                } else {
                    vec!["income", "expense"]
                };

                let mut prefixes: Vec<Option<&str>> = Vec::new();
                if let Some(pn) = project_name {
                    if !pn.is_empty() {
                        prefixes.push(Some(pn));
                        prefixes.push(Some("未分类"));
                    }
                } else {
                    prefixes.push(Some("未分类"));
                }
                prefixes.push(Some("_common"));
                prefixes.push(None);

                let mut paths_to_try: Vec<std::path::PathBuf> = Vec::new();
                for prefix in &prefixes {
                    for sub in &sub_cats {
                        if let Some(p) = prefix {
                            paths_to_try.push(uploads_path.join(p).join(cn_name(sub)).join(file_name));
                            paths_to_try.push(uploads_path.join(p).join("contracts").join(sub).join(file_name));
                        } else {
                            paths_to_try.push(uploads_path.join(cn_name(sub)).join(file_name));
                            paths_to_try.push(uploads_path.join("contracts").join(sub).join(file_name));
                        }
                    }
                }
                paths_to_try.push(uploads_path.join("contracts").join(file_name));

                for path in &paths_to_try {
                    if path.exists() && path.starts_with(uploads_path) {
                        log::info!("Serving contract file: {}", file_name);
                        let mime = mime_guess::from_path(path)
                            .first_or_octet_stream()
                            .to_string();
                        if let Ok(content) = std::fs::read(path) {
                            return http::Response::builder()
                                .status(200)
                                .header("Content-Type", mime)
                                .header("Access-Control-Allow-Origin", "*")
                                .body(content)
                                .unwrap();
                        }
                    }
                }

                log::warn!("Contract file not found: {}", raw_path);
                http::Response::builder()
                    .status(404)
                    .body(b"Not Found".to_vec())
                    .unwrap()
            }
        })
        .setup(|app| {
            // 获取应用资源目录
            let resource_dir = app
                .path()
                .resource_dir()
                .unwrap_or_else(|_| app.path().app_data_dir().unwrap_or_default());

            // 加载配置
            let config_path = config::get_config_path(&resource_dir);
            let app_config = config::load_config(&config_path);

            log::info!("配置文件: {:?}", config_path);
            log::info!("数据路径: {}", app_config.data_path);

            // 使用配置中的数据路径
            let data_dir = PathBuf::from(&app_config.data_path);
            let db_path = data_dir.join("engineering.db");
            let uploads_path = data_dir.join("uploads");

            log::info!("数据库路径: {:?}", db_path);
            log::info!("上传目录: {:?}", uploads_path);

            // 确保目录存在
            std::fs::create_dir_all(&data_dir)
                .expect("创建数据目录失败");
            std::fs::create_dir_all(&uploads_path)
                .expect("创建上传目录失败");

            // 初始化文件目录结构
            file_service::ensure_unclassified_dirs(&uploads_path);

            // 初始化数据库
            let conn = db::init_database(&db_path).expect("数据库初始化失败");

            // 注册状态
            app.manage(AppState {
                db: Mutex::new(conn),
                data_path: data_dir.clone(),
            });
            app.manage(UploadsPath(uploads_path));
            app.manage(ConfigState(Mutex::new(app_config)));

            log::info!("Tauri 应用初始化完成");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 系统命令
            commands::system::get_app_version,
            commands::system::get_data_path,
            commands::system::get_uploads_path,
            commands::system::open_external,
            commands::system::open_file_location,
            // 窗口控制命令
            commands::system::minimize_window,
            commands::system::toggle_maximize,
            commands::system::close_window,
            commands::system::is_maximized,
            commands::system::set_fullscreen,
            commands::system::is_fullscreen,
            commands::system::set_window_title,
            commands::system::set_window_size,
            commands::system::center_window,
            // 统计命令
            commands::database::get_dashboard_stats,
            commands::database::get_member_stats,
            commands::database::get_invoice_stats,
            // 成员命令
            commands::members::get_members,
            commands::members::create_member,
            commands::members::update_member,
            commands::members::delete_member,
            // 合作伙伴命令
            commands::partners::get_partners,
            commands::partners::create_partner,
            commands::partners::update_partner,
            commands::partners::delete_partner,
            // 工人命令
            commands::workers::get_workers,
            commands::workers::create_worker,
            commands::workers::update_worker,
            commands::workers::delete_worker,
            commands::workers::get_project_workers,
            commands::workers::create_project_worker,
            commands::workers::batch_create_project_workers,
            commands::workers::update_project_worker,
            commands::workers::delete_project_worker,
            commands::workers::get_worker_stats,
            // 项目命令
            commands::projects::get_projects,
            commands::projects::get_project,
            commands::projects::create_project,
            commands::projects::update_project,
            commands::projects::delete_project,
            // 合同命令
            commands::contracts::get_income_contracts,
            commands::contracts::create_income_contract,
            commands::contracts::update_income_contract,
            commands::contracts::delete_income_contract,
            commands::contracts::get_expense_contracts,
            commands::contracts::create_expense_contract,
            commands::contracts::update_expense_contract,
            commands::contracts::delete_expense_contract,
            commands::contracts::get_contract_stats,
            // 发票命令
            commands::invoices::get_invoices,
            commands::invoices::create_invoice,
            commands::invoices::update_invoice,
            commands::invoices::delete_invoice,
            commands::invoices::update_invoice_status,
            // 结算命令
            commands::settlements::get_settlements,
            commands::settlements::create_settlement,
            commands::settlements::update_settlement,
            commands::settlements::delete_settlement,
            commands::settlements::process_settlement,
            commands::settlements::unarchive_settlement,
            // 成本台账命令
            commands::cost_ledger::get_cost_ledger,
            commands::cost_ledger::create_cost_ledger,
            commands::cost_ledger::batch_create_cost_ledger,
            commands::cost_ledger::update_cost_ledger,
            commands::cost_ledger::delete_cost_ledger,
            commands::cost_ledger::delete_cost_ledger_by_project,
            commands::cost_ledger::get_cost_ledger_summary,
            commands::cost_ledger::get_cost_ledger_batches,
            commands::cost_ledger::create_cost_ledger_batch,
            commands::cost_ledger::copy_cost_ledger_batch,
            commands::cost_ledger::rename_cost_ledger_batch,
            commands::cost_ledger::delete_cost_ledger_batch,
            commands::cost_ledger::get_cost_ledger_categories,
            commands::cost_ledger::create_cost_ledger_category,
            commands::cost_ledger::update_cost_ledger_category,
            commands::cost_ledger::delete_cost_ledger_category,
            commands::cost_ledger::reset_cost_ledger_categories,
            // 模板命令
            commands::templates::get_templates,
            commands::templates::create_template,
            commands::templates::update_template,
            commands::templates::delete_template,
            commands::templates::get_template_stats,
            // 部门命令
            commands::departments::get_departments,
            commands::departments::create_department,
            commands::departments::update_department,
            commands::departments::delete_department,
            // 薪资历史命令
            commands::salary_history::get_salary_history,
            commands::salary_history::create_salary_history,
            commands::salary_history::delete_salary_history,
            commands::salary_history::get_effective_salary,
            commands::salary_history::get_wage_history,
            commands::salary_history::save_wage_history,
            commands::salary_history::delete_wage_history,
            commands::salary_history::get_effective_wage,
            // 考勤命令
            commands::attendance::get_attendances,
            commands::attendance::get_attendances_by_member,
            commands::attendance::create_attendance,
            commands::attendance::delete_attendance,
            commands::attendance::batch_delete_attendances,
            commands::attendance::update_attendance,
            commands::attendance::batch_create_attendances,
            commands::attendance::generate_default_attendances,
            commands::attendance::generate_default_attendances_v2,
            commands::attendance::batch_import_attendances,
            // 工资命令
            commands::wages::get_wages,
            commands::wages::generate_for_project,
            commands::wages::create_wage,
            commands::wages::update_wage,
            commands::wages::delete_wage,
            commands::wages::batch_delete_wages,
            commands::wages::batch_clear_payments,
            commands::wages::archive_wages,
            commands::wages::get_wage_stats,
            commands::wages::match_bank_receipt_items,
            commands::wages::batch_confirm_matches,
            // 审计日志命令
            commands::audit::audit_log,
            commands::audit::audit_query,
            commands::audit::audit_stats,
            commands::audit::audit_clear,
            // 角色权限命令
            commands::roles::get_roles,
            commands::roles::update_role,
            commands::roles::reset_role,
            // OCR 命令
            commands::ocr::ocr_baidu_id_card,
            commands::ocr::ocr_baidu_invoice,
            commands::ocr::ocr_baidu_bank_card,
            commands::ocr::ocr_baidu_business_license,
            commands::ocr::ocr_baidu_bank_receipt,
            commands::ocr::ocr_baidu_permit,
            commands::ocr::ocr_baidu_bank_statement,
            commands::ocr::ocr_baidu_general_receipt,
            commands::ocr::ocr_baidu_company_query,
            commands::ocr::ocr_check_network,
            commands::ocr::ocr_clear_token_cache,
            commands::ocr::ocr_get_stats,
            // 认证命令
            commands::auth::auth_login,
            commands::auth::auth_get_all_users,
            commands::auth::auth_get_current_user,
            commands::auth::auth_create_user,
            commands::auth::auth_update_user,
            commands::auth::auth_delete_user,
            // 配置管理命令
            commands::system::get_config,
            commands::system::set_data_path,
            commands::system::get_gpu_acceleration,
            commands::system::set_gpu_acceleration,
            // 数据健康检查命令
            commands::data::data_consistency_check,
            commands::data::data_integrity_check,
            commands::data::data_export_json,
            commands::data::data_reconcile,
            // SQLite 状态命令
            commands::sqlite_status::sqlite_status,
            commands::sqlite_status::sqlite_enable,
            commands::sqlite_status::sqlite_migrate,
            commands::sqlite_status::sqlite_get_read_mode,
            commands::sqlite_status::sqlite_set_read_mode,
            // 图纸命令
            commands::drawings::get_drawings,
            commands::drawings::upload_drawing,
            commands::drawings::update_drawing,
            commands::drawings::delete_drawing,
            // 费用命令
            commands::expenses::get_expenses,
            commands::expenses::create_expense,
            commands::expenses::update_expense,
            commands::expenses::delete_expense,
            // 进销存命令
            commands::inventory::get_inventory_items,
            commands::inventory::create_inventory_item,
            commands::inventory::update_inventory_item,
            commands::inventory::delete_inventory_item,
            commands::inventory::get_inventory_transactions,
            commands::inventory::create_inventory_transaction,
            // 材料命令
            commands::materials::get_materials,
            commands::materials::create_material,
            commands::materials::update_material,
            commands::materials::delete_material,
            // 地区与监管单位命令
            commands::regions::get_regions,
            commands::regions::create_region,
            commands::regions::delete_region,
            commands::regions::get_supervisors,
            commands::regions::create_supervisor,
            commands::regions::update_supervisor,
            commands::regions::delete_supervisor,
            // 文件命令
            commands::files::save_file,
            commands::files::read_file,
            commands::files::delete_file,
            commands::files::open_file_external,
            // 项目成员关联命令（独立模块）
            commands::project_members::get_project_members,
            commands::project_members::add_project_member,
            commands::project_members::remove_project_member,
            commands::project_members::update_project_member,
            // 班组管理命令（独立模块）
            commands::worker_teams::get_worker_teams,
            commands::worker_teams::create_worker_team,
            commands::worker_teams::update_worker_team,
            commands::worker_teams::delete_worker_team,
            // 收付款记录命令（独立模块）
            commands::payment_records::get_payment_records,
            commands::payment_records::create_payment_record,
            commands::payment_records::update_payment_record,
            commands::payment_records::delete_payment_record,
            // 合同模板命令（独立模块）
            commands::contract_templates::get_contract_templates,
            commands::contract_templates::create_contract_template,
            commands::contract_templates::update_contract_template,
            commands::contract_templates::delete_contract_template,
            // 工资扩展命令
            commands::wages_extra::get_wage_payment_records,
            commands::wages_extra::get_wage_overdue_stats,
            commands::wages_extra::get_wage_overdue_list,
            commands::wages_extra::batch_archive_wages,
            commands::wages_extra::batch_save_wages,
            // 成本台账匹配规则命令
            commands::cost_ledger_match_rules::get_cost_ledger_match_rules,
            commands::cost_ledger_match_rules::save_cost_ledger_match_rule,
            // 快照系统命令
            snapshots::get_snapshots,
            snapshots::get_max_snapshots,
            snapshots::create_snapshot,
            snapshots::restore_snapshot,
            snapshots::delete_snapshot,
            snapshots::set_max_snapshots,
        ])
        .run(tauri::generate_context!())
        .expect("启动 Tauri 应用失败");
}
