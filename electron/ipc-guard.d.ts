/**
 * IPC 权限守卫
 *
 * 核心机制：在 ipcMain.handle 注册前劫持，为所有 IPC 调用
 * 添加服务端权限校验。无需修改任何现有 handler 文件。
 *
 * 设计原则：
 * 1. 集中式权限映射（IPC_CHANNEL → PERMISSION_CODE）
 * 2. 主进程 session 管理（不受渲染进程篡改影响）
 * 3. 公开通道白名单（无需登录即可调用）
 * 4. Admin 角色自动绕过权限检查
 * 5. 未定义权限的通道默认放行（日志警告，逐步收紧）
 */
export interface UserSession {
    userId: string;
    username: string;
    roleId: string;
    permissions: string[];
}
/**
 * 设置当前用户 session（由渲染进程登录/恢复后调用）
 */
export declare function setSession(session: UserSession | null): void;
/**
 * 获取当前用户 session
 */
export declare function getSession(): UserSession | null;
/**
 * 检查当前 session 是否有权限调用指定 IPC 通道。
 */
export declare function checkIpcPermission(channel: string): {
    allowed: boolean;
    reason?: string;
};
/**
 * 安装 IPC 权限守卫。
 *
 * 通过劫持 ipcMain.handle，在所有 handler 执行前
 * 插入权限检查逻辑。必须在导入任何 IPC handler 之前调用。
 *
 * 原理：将 ipcMain.handle 替换为带权限检查的版本，
 * 所有后续注册的 handler 自动获得权限保护。
 */
export declare function installIpcGuard(): void;
/**
 * 获取所有已定义的权限映射数量（用于诊断）
 */
export declare function getPermissionMapStats(): {
    total: number;
    channels: number;
    publicChannels: number;
};
