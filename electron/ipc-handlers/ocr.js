/**
 * OCR IPC 处理器
 *
 * 将百度 OCR API 请求从渲染进程移到主进程，
 * 避免需要关闭 webSecurity 导致的安全风险。
 *
 * 主进程使用 Node.js 的 net.fetch (Electron 内置) 发起 HTTP 请求，
 * 不受浏览器同源策略限制。
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { ipcMain } from 'electron';
import log from 'electron-log';
var tokenCache = null;
/**
 * 获取百度 OCR access_token（带缓存）
 * Token 有效期 30 天，提前 1 小时刷新
 */
function getAccessToken(config) {
    return __awaiter(this, void 0, void 0, function () {
        var tokenUrl, response, data, expiresIn;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // 检查缓存
                    if (tokenCache && tokenCache.expiresAt > Date.now() + 3600000) {
                        log.info('[OCR] 使用缓存的 access_token');
                        return [2 /*return*/, tokenCache.accessToken];
                    }
                    tokenUrl = "https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=".concat(config.apiKey, "&client_secret=").concat(config.secretKey);
                    log.info('[OCR] 获取新的 access_token...');
                    return [4 /*yield*/, net.fetch(tokenUrl, {
                            method: 'POST',
                            signal: AbortSignal.timeout(10000)
                        })];
                case 1:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    if (data.error) {
                        throw new Error("\u83B7\u53D6Token\u5931\u8D25: ".concat(data.error_description || data.error));
                    }
                    expiresIn = data.expires_in || 2592000;
                    tokenCache = {
                        accessToken: data.access_token,
                        expiresAt: Date.now() + expiresIn * 1000
                    };
                    log.info('[OCR] access_token 获取成功，有效期:', Math.round(expiresIn / 86400), '天');
                    return [2 /*return*/, data.access_token];
            }
        });
    });
}
/**
 * 百度身份证 OCR 识别
 */
function baiduIdCardOCR(imageBase64, config) {
    return __awaiter(this, void 0, void 0, function () {
        var accessToken, base64Data, ocrUrl, formData, ocrResponse, ocrData, words, result, error_1;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        return __generator(this, function (_m) {
            switch (_m.label) {
                case 0:
                    _m.trys.push([0, 4, , 5]);
                    log.info('[OCR] 开始百度身份证识别...');
                    return [4 /*yield*/, getAccessToken(config)
                        // Step 2: 调用身份证识别 API
                    ];
                case 1:
                    accessToken = _m.sent();
                    base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
                    ocrUrl = "https://aip.baidubce.com/rest/2.0/ocr/v1/idcard?access_token=".concat(accessToken);
                    formData = new URLSearchParams();
                    formData.append('id_card_side', 'front');
                    formData.append('image', base64Data);
                    log.info('[OCR] 发送识别请求...');
                    return [4 /*yield*/, net.fetch(ocrUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: formData.toString(),
                            signal: AbortSignal.timeout(15000)
                        })];
                case 2:
                    ocrResponse = _m.sent();
                    return [4 /*yield*/, ocrResponse.json()];
                case 3:
                    ocrData = _m.sent();
                    if (ocrData.error_code) {
                        // 如果是 token 过期，清除缓存让下次重新获取
                        if (ocrData.error_code === 110 || ocrData.error_code === 111) {
                            log.warn('[OCR] Token 无效或过期，清除缓存');
                            tokenCache = null;
                        }
                        return [2 /*return*/, { success: false, error: "\u767E\u5EA6OCR\u9519\u8BEF: ".concat(ocrData.error_msg || ocrData.error_code) }];
                    }
                    words = ocrData.words_result || {};
                    result = {
                        success: true,
                        text: JSON.stringify(words),
                        idCard: {
                            number: ((_a = words === null || words === void 0 ? void 0 : words.公民身份号码) === null || _a === void 0 ? void 0 : _a.words) || '',
                            name: (_b = words === null || words === void 0 ? void 0 : words.姓名) === null || _b === void 0 ? void 0 : _b.words,
                            gender: (_c = words === null || words === void 0 ? void 0 : words.性别) === null || _c === void 0 ? void 0 : _c.words,
                            ethnicity: (_d = words === null || words === void 0 ? void 0 : words.民族) === null || _d === void 0 ? void 0 : _d.words,
                            birthDate: formatBirthDate((_e = words === null || words === void 0 ? void 0 : words.出生) === null || _e === void 0 ? void 0 : _e.words),
                            address: (_f = words === null || words === void 0 ? void 0 : words.住址) === null || _f === void 0 ? void 0 : _f.words,
                            issueAuthority: (_g = words === null || words === void 0 ? void 0 : words.签发机关) === null || _g === void 0 ? void 0 : _g.words,
                            validDate: (_h = words === null || words === void 0 ? void 0 : words.有效期限) === null || _h === void 0 ? void 0 : _h.words
                        }
                    };
                    log.info('[OCR] 识别成功, 姓名:', (_j = result.idCard) === null || _j === void 0 ? void 0 : _j.name, '身份证号:', ((_l = (_k = result.idCard) === null || _k === void 0 ? void 0 : _k.number) === null || _l === void 0 ? void 0 : _l.substring(0, 3)) + '****');
                    return [2 /*return*/, result];
                case 4:
                    error_1 = _m.sent();
                    log.error('[OCR] 百度OCR失败:', error_1.message);
                    if (error_1.name === 'AbortError') {
                        return [2 /*return*/, { success: false, error: '百度OCR请求超时，请检查网络连接' }];
                    }
                    return [2 /*return*/, { success: false, error: "\u767E\u5EA6OCR\u8BF7\u6C42\u5931\u8D25: ".concat(error_1.message || '未知错误') }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * 格式化出生日期 (YYYYMMDD -> YYYY-MM-DD)
 */
function formatBirthDate(birth) {
    if (!birth || birth.length !== 8)
        return birth;
    return "".concat(birth.slice(0, 4), "-").concat(birth.slice(4, 6), "-").concat(birth.slice(6, 8));
}
/**
 * 检查网络连通性（从主进程检测，不依赖浏览器 API）
 */
function checkNetworkConnectivity() {
    return __awaiter(this, void 0, void 0, function () {
        var response, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, net.fetch('https://www.baidu.com/favicon.ico', {
                            method: 'HEAD',
                            signal: AbortSignal.timeout(3000)
                        })];
                case 1:
                    response = _b.sent();
                    return [2 /*return*/, response.ok];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ============ 注册 IPC 处理器 ============
export function registerOCRHandlers() {
    var _this = this;
    /**
     * 百度 OCR 身份证识别
     * 渲染进程通过 IPC 调用，避免需要 webSecurity: false
     */
    ipcMain.handle('ocr:baiduIdCard', function (_event, imageBase64, config) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    log.info('[OCR] 收到身份证识别请求');
                    return [4 /*yield*/, baiduIdCardOCR(imageBase64, config)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    /**
     * 检查网络连通性
     */
    ipcMain.handle('ocr:checkNetwork', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, checkNetworkConnectivity()];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    /**
     * 清除 Token 缓存（配置变更时调用）
     */
    ipcMain.handle('ocr:clearTokenCache', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            tokenCache = null;
            log.info('[OCR] Token 缓存已清除');
            return [2 /*return*/, true];
        });
    }); });
    log.info('[OCR] IPC 处理器注册完成');
}
