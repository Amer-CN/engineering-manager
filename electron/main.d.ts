/**
 * 工程管家 - Electron 主进程入口
 *
 * 模块化架构：
 * - database.ts: 数据库初始化和操作
 * - ipc-handlers/: 按业务模块拆分的 IPC 处理器
 */
import './ipc-handlers';
