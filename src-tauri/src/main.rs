// 阻止 Windows 控制台窗口弹出（release 模式）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // 初始化日志
    env_logger::init();

    engineering_manager_lib::run();
}
