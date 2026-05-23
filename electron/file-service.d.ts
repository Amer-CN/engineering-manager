/**
 * 文件服务模块
 *
 * 统一管理所有上传文件的磁盘读写，按类型分目录存储
 */
export interface FileCategory {
    category: string;
    subCategory: string;
}
export declare const FOLDER_MAP: Record<string, Record<string, string>>;
export type FileCategoryKeyFileCategoryKey = keyof typeof FOLDER_MAP;
export type FileSubCategoryKey<C extends FileCategoryKey> = keyof typeof FOLDER_MAP[C];
export declare function getCategoryDir(category: string, subCategory: string, projectName?: string | null): string;
export declare function getLegacyFlatDir(category: string, subCategory: string): string;
/**
 * 获取文件的绝对路径
 */
export declare function getFileAbsolutePath(category: string, subCategory: string, fileName: string, projectName?: string | null): string;
/**
 * 确保未分类子目录存在（文件按项目存储，无项目的进未分类）
 * 不再在 uploads 根目录下创建扁平分类目录
 */
export declare function ensureUploadDirs(): void;
/**
 * Ensure _common subdirectories exist (for files without project association)
 */
export declare function ensureUnclassifiedDirs(): void;
/**
 * 从 data URL 中提取纯 base64 数据
 * data:image/png;base64,iVBOR... → iVBOR...
 */
export declare function extractBase64Data(dataUrl: string): string;
/**
 * 生成存储文件名：描述信息_时间戳.扩展名
 * originalFileName 包含描述信息和扩展名，如 "张三_身份证人像.jpg"
 * 限制描述部分长度避免文件名过长
 */
export declare function generateStoredFileName(originalFileName: string): string;
/**
 * 根据扩展名获取 MIME 类型
 */
export declare function getMimeType(ext: string): string;
/**
 * 从 data URL 中推断文件扩展名
 * data:image/jpeg;base64,... → .jpg
 */
export declare function guessExtFromDataUrl(dataUrl: string): string;
/**
 * 判断字符串是否为 data URL
 */
export declare function isDataUrl(value: string): boolean;
export interface SaveFileOptions {
    fileData: string;
    fileName: string;
    subDir?: string;
}
export interface SaveFileResult {
    success: boolean;
    data?: {
        fileName: string;
    };
    error?: string;
}
export interface ReadFileResult {
    success: boolean;
    data?: {
        dataUrl: string;
        mimeType: string;
    };
    error?: string;
}
export interface DeleteFileResult {
    success: boolean;
    error?: string;
}
/**
 * 保存文件到磁盘
 * @param category 分类（如 members, invoices）
 * @param subCategory 子分类（如 id-cards, files）
 * @param options 文件数据和原始文件名
 * @returns 存储后的文件名
 */
export declare function saveFile(category: string, subCategory: string, options: SaveFileOptions, projectName?: string | null): SaveFileResult;
/**
 * 从磁盘读取文件，返回 data URL
 * @param category 分类
 * @param subCategory 子分类
 * @param fileName 存储的文件名
 * @returns data URL
 */
export declare function readFile(category: string, subCategory: string, fileName: string, projectName?: string | null): ReadFileResult;
/**
 * 从磁盘删除文件
 */
export declare function deleteFile(category: string, subCategory: string, fileName: string, projectName?: string | null): DeleteFileResult;
