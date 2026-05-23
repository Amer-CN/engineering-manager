/**
 * 文件服务模块
 *
 * 统一管理所有上传文件的磁盘读写，按类型分目录存储
 */
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import { getUploadsPath } from './database';
export var FOLDER_MAP = {
    members: {
        'id-cards': '成员/身份证',
        'contracts': '成员/劳动合同',
        'training': '成员/安全培训',
        'health': '成员/健康报告',
        'certificates': '成员/特种证书',
    },
    invoices: {
        'invoice_in': '发票/收票',
        'invoice_out': '发票/开票',
    },
    payments: {
        'payment_in': '收付款/回款',
        'payment_out': '收付款/付款',
    },
    partners: {
        licenses: '合作单位/营业执照',
        attachments: '合作单位/附件',
    },
    contracts: {
        income: '合同/收入',
        expense: '合同/支出',
    },
    drawings: {
        files: '图纸',
    },
    attendance: {
        files: '考勤/记录',
    },
    settlement: {
        files: '结算/凭证',
    },
    templates: {
        files: '模板/文件',
    },
    costLedger: {
        files: '成本台账/凭证',
    },
    wages: {
        'bank-receipts': '工资/银行回单',
    },
};
// ═══════════════════════════════════════════════════════════════════════════════
// 路径
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 获取某个分类的子目录绝对路径
 */
function sanitizeProjectName(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').substring(0, 40).trim() || '未命名项目';
}
function getProjectPrefix(projectName) {
    if (projectName !== undefined && projectName !== null && projectName !== '') {
        return sanitizeProjectName(projectName);
    }
    return '未分类';
}
export function getCategoryDir(category, subCategory, projectName) {
    var _a;
    var key = (_a = FOLDER_MAP[category]) === null || _a === void 0 ? void 0 : _a[subCategory];
    var relativePath = key || "".concat(category, "/").concat(subCategory);
    return path.join(getUploadsPath(), getProjectPrefix(projectName), relativePath);
}
export function getLegacyFlatDir(category, subCategory) {
    var _a;
    var key = (_a = FOLDER_MAP[category]) === null || _a === void 0 ? void 0 : _a[subCategory];
    if (!key) {
        return path.join(getUploadsPath(), category, subCategory);
    }
    return path.join(getUploadsPath(), key);
}
/**
 * 获取文件的绝对路径
 */
export function getFileAbsolutePath(category, subCategory, fileName, projectName) {
    return path.join(getCategoryDir(category, subCategory, projectName), fileName);
}
// ═══════════════════════════════════════════════════════════════════════════════
// 目录初始化
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 确保未分类子目录存在（文件按项目存储，无项目的进未分类）
 * 不再在 uploads 根目录下创建扁平分类目录
 */
export function ensureUploadDirs() {
    ensureUnclassifiedDirs();
}
/**
 * Ensure _common subdirectories exist (for files without project association)
 */
export function ensureUnclassifiedDirs() {
    var uploadsPath = getUploadsPath();
    var base = path.join(uploadsPath, '未分类');
    for (var _i = 0, _a = Object.entries(FOLDER_MAP); _i < _a.length; _i++) {
        var _b = _a[_i], subs = _b[1];
        for (var _c = 0, _d = Object.entries(subs); _c < _d.length; _c++) {
            var _e = _d[_c], relativePath = _e[1];
            var dir = path.join(base, relativePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 从 data URL 中提取纯 base64 数据
 * data:image/png;base64,iVBOR... → iVBOR...
 */
export function extractBase64Data(dataUrl) {
    if (dataUrl.startsWith('data:')) {
        return dataUrl.split(',')[1] || dataUrl;
    }
    return dataUrl;
}
/**
 * 生成存储文件名：描述信息_时间戳.扩展名
 * originalFileName 包含描述信息和扩展名，如 "张三_身份证人像.jpg"
 * 限制描述部分长度避免文件名过长
 */
export function generateStoredFileName(originalFileName) {
    var ext = path.extname(originalFileName) || '';
    var base = path.basename(originalFileName, ext);
    var desc = base.replace(/[<>:"\/\\|?*\x00-\x1f]/g, '').substring(0, 80);
    return desc ? "".concat(desc).concat(ext) : "file".concat(ext);
}
/**
 * 根据扩展名获取 MIME 类型
 */
export function getMimeType(ext) {
    switch (ext.toLowerCase()) {
        case '.pdf': return 'application/pdf';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.png': return 'image/png';
        case '.webp': return 'image/webp';
        case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case '.gif': return 'image/gif';
        case '.bmp': return 'image/bmp';
        case '.dwg': return 'application/acad';
        case '.dxf': return 'application/dxf';
        default: return 'application/octet-stream';
    }
}
/**
 * 从 data URL 中推断文件扩展名
 * data:image/jpeg;base64,... → .jpg
 */
export function guessExtFromDataUrl(dataUrl) {
    var match = dataUrl.match(/^data:([^;]+);/);
    if (!match)
        return '.bin';
    var mime = match[1];
    switch (mime) {
        case 'image/jpeg': return '.jpg';
        case 'image/png': return '.png';
        case 'image/webp': return '.webp';
        case 'image/gif': return '.gif';
        case 'image/bmp': return '.bmp';
        case 'application/pdf': return '.pdf';
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return '.docx';
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': return '.xlsx';
        case 'application/acad':
        case 'image/vnd.dwg': return '.dwg';
        case 'application/dxf':
        case 'image/vnd.dxf': return '.dxf';
        default: return '.bin';
    }
}
/**
 * 判断字符串是否为 data URL
 */
export function isDataUrl(value) {
    return typeof value === 'string' && value.startsWith('data:');
}
/**
 * 保存文件到磁盘
 * @param category 分类（如 members, invoices）
 * @param subCategory 子分类（如 id-cards, files）
 * @param options 文件数据和原始文件名
 * @returns 存储后的文件名
 */
export function saveFile(category, subCategory, options, projectName) {
    try {
        var base64Data = extractBase64Data(options.fileData);
        var buffer = Buffer.from(base64Data, 'base64');
        var storedName = generateStoredFileName(options.fileName);
        var dir = getCategoryDir(category, subCategory, projectName);
        if (options.subDir) {
            dir = path.join(dir, options.subDir);
        }
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        var filePath = path.join(dir, storedName);
        if (fs.existsSync(filePath)) {
            return { success: false, error: "\u6587\u4EF6 \"".concat(storedName, "\" \u5DF2\u5B58\u5728\uFF0C\u8BF7\u4FEE\u6539\u6587\u4EF6\u540D\u540E\u91CD\u65B0\u4E0A\u4F20") };
        }
        fs.writeFileSync(filePath, buffer);
        log.info("File saved: ".concat(category, "/").concat(subCategory, "/").concat(storedName, " (").concat(buffer.length, " bytes)"));
        return { success: true, data: { fileName: storedName } };
    }
    catch (error) {
        log.error("Failed to save file (".concat(category, "/").concat(subCategory, "):"), error);
        return { success: false, error: error.message };
    }
}
/**
 * 从磁盘读取文件，返回 data URL
 * @param category 分类
 * @param subCategory 子分类
 * @param fileName 存储的文件名
 * @returns data URL
 */
export function readFile(category, subCategory, fileName, projectName) {
    var _a;
    try {
        // 三级回退：项目路径 → 未分类/ → 旧版平铺路径
        var prefixesToTry = [];
        if (projectName !== undefined && projectName !== null && projectName !== '') {
            prefixesToTry.push(sanitizeProjectName(projectName));
        }
        prefixesToTry.push('未分类');
        // 旧版平铺路径（无前缀）+ _common 兼容
        prefixesToTry.push('_common');
        prefixesToTry.push(undefined);
        for (var _i = 0, prefixesToTry_1 = prefixesToTry; _i < prefixesToTry_1.length; _i++) {
            var prefix = prefixesToTry_1[_i];
            var filePath = void 0;
            if (prefix !== undefined) {
                var key = (_a = FOLDER_MAP[category]) === null || _a === void 0 ? void 0 : _a[subCategory];
                var relativePath = key || "".concat(category, "/").concat(subCategory);
                filePath = path.join(getUploadsPath(), prefix, relativePath, fileName);
            }
            else {
                filePath = path.join(getLegacyFlatDir(category, subCategory), fileName);
            }
            if (fs.existsSync(filePath)) {
                var buffer = fs.readFileSync(filePath);
                var ext = path.extname(fileName);
                var mimeType = getMimeType(ext);
                var dataUrl = "data:".concat(mimeType, ";base64,").concat(buffer.toString('base64'));
                log.info("File read: ".concat(filePath));
                return { success: true, data: { dataUrl: dataUrl, mimeType: mimeType } };
            }
        }
        return { success: false, error: '文件不存在' };
    }
    catch (error) {
        log.error("Failed to read file (".concat(category, "/").concat(subCategory, "/").concat(fileName, "):"), error);
        return { success: false, error: error.message };
    }
}
/**
 * 从磁盘删除文件
 */
export function deleteFile(category, subCategory, fileName, projectName) {
    var _a;
    try {
        // 三级回退：项目路径 → 未分类/ → 旧版平铺路径
        var prefixesToTry = [];
        if (projectName !== undefined && projectName !== null && projectName !== '') {
            prefixesToTry.push(sanitizeProjectName(projectName));
        }
        prefixesToTry.push('未分类');
        prefixesToTry.push('_common');
        prefixesToTry.push(undefined);
        for (var _i = 0, prefixesToTry_2 = prefixesToTry; _i < prefixesToTry_2.length; _i++) {
            var prefix = prefixesToTry_2[_i];
            var filePath = void 0;
            if (prefix !== undefined) {
                var key = (_a = FOLDER_MAP[category]) === null || _a === void 0 ? void 0 : _a[subCategory];
                var relativePath = key || "".concat(category, "/").concat(subCategory);
                filePath = path.join(getUploadsPath(), prefix, relativePath, fileName);
            }
            else {
                filePath = path.join(getLegacyFlatDir(category, subCategory), fileName);
            }
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                log.info("File deleted: ".concat(filePath));
                return { success: true };
            }
        }
        return { success: true }; // 文件不存在也算成功
    }
    catch (error) {
        log.error("Failed to delete file (".concat(category, "/").concat(subCategory, "/").concat(fileName, "):"), error);
        return { success: false, error: error.message };
    }
}
