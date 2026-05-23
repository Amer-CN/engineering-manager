var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
import { getUploadsPath } from '../database';
import { exec } from 'child_process';
// ============ 辅助函数（从 wage-calc.ts 提取时遗漏的内联定义） ============
function hasCJK(text) {
    return /[\u4e00-\u9fff]/.test(text);
}
/** 执行一个Python命令并返回stdout */
function execPython(scriptPath, pdfPath) {
    // Windows常见的python命令形式
    var commands = ['python', 'python3', 'py', 'py -3'];
    return new Promise(function (resolve, reject) {
        function tryNext(i, lastErr) {
            if (i >= commands.length) {
                return reject(new Error("Python\u4E0D\u53EF\u7528 (\u5C1D\u8BD5\u4E86".concat(commands.join(', '), ")\u3002\u6700\u540E\u9519\u8BEF: ").concat(lastErr)));
            }
            var cmd = commands[i];
            exec("\"".concat(cmd, "\" \"").concat(scriptPath, "\" \"").concat(pdfPath, "\""), {
                encoding: 'utf-8',
                timeout: 15000,
                maxBuffer: 10 * 1024 * 1024,
                env: __assign(__assign({}, process.env), { PYTHONIOENCODING: 'utf-8' }),
            }, function (err, stdout, stderr) {
                if (err) {
                    var msg = ((stderr === null || stderr === void 0 ? void 0 : stderr.slice(0, 200)) || err.message || '');
                    return tryNext(i + 1, msg);
                }
                resolve({ text: stdout, stderr: stderr });
            });
        }
        tryNext(0, '');
    });
}
/** 解析银行回单PDF文本 */
function parseBankReceiptText(text) {
    var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    // ── 提取日期：支持 交易日期 / 交易时间 / 处理日期 / 申请日期 / 付款日期 ──
    var date = '';
    var dateMatch = text.match(/(?:交易[日时][期间]|处理日期|付款日期|申请日期)[：:]\s*(\d{4})[-\s./](\d{1,2})[-\s./](\d{1,2})/);
    if (dateMatch) {
        var y = dateMatch[1], m = dateMatch[2], d = dateMatch[3];
        date = "".concat(y, "-").concat(m.padStart(2, '0'), "-").concat(d.padStart(2, '0'));
    }
    // ── 提取总金额：支持 总金额 / 合计金额，可选 ¥ 前缀 ──
    var totalAmount = 0;
    var totalMatch = text.match(/(?:总|合计)金额(?:[（(]元[)）])?[：:]\s*¥?\s*([\d,]+\.?\d*)/);
    if (totalMatch)
        totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
    // ── 提取成功金额：支持可选 ¥ 前缀 ──
    var successAmount = 0;
    var successMatch = text.match(/成功金额(?:[（(]元[)）])?[：:]\s*¥?\s*([\d,]+\.?\d*)/);
    if (successMatch)
        successAmount = parseFloat(successMatch[1].replace(/,/g, ''));
    // ── 提取失败笔数 ──
    var failCount = 0;
    var failMatch = text.match(/失败笔数[：:]\s*(\d+)/);
    if (failMatch)
        failCount = parseInt(failMatch[1], 10);
    // ── 解析明细行：序号 姓名 账号 金额 处理结果 ──
    var items = [];
    var inTable = false;
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        // 检测表头：包含序号/编号 且含 收款人/户名/姓名（兼容各银行表头命名）
        if (!inTable && /(?:序号|编号)/.test(line) && /(?:收款人|户名|姓名)/.test(line)) {
            inTable = true;
            continue;
        }
        if (!inTable)
            continue;
        // ── 尝试匹配为新的明细行 ──
        // 标准格式：序号 姓名 账号(10-25位数字) 金额 处理结果
        var fullMatch = line.match(/^(\d{1,3})\s+(\S+)\s+(\d{10,25})\s+([\d,]+\.?\d*)\s+(.+)$/);
        if (fullMatch) {
            items.push({
                name: fullMatch[2].trim(),
                amount: parseFloat(fullMatch[4].replace(/,/g, '')),
                status: fullMatch[5].trim(),
                account: fullMatch[3].trim()
            });
            continue;
        }
        // 兼容格式：无账号列  "1 陈翔 3840 处理成功"
        var simpleMatch = line.match(/^(\d{1,3})\s+(\S+)\s+([\d,]+\.?\d*)\s+(.+)$/);
        if (simpleMatch) {
            items.push({
                name: simpleMatch[2].trim(),
                amount: parseFloat(simpleMatch[3].replace(/,/g, '')),
                status: simpleMatch[4].trim()
            });
            continue;
        }
        // ── 不匹配新行 → 可能是上一行"处理结果"字段的续行（PDF换行导致） ──
        if (items.length > 0 && line.length > 0) {
            items[items.length - 1].status += line;
        }
    }
    return { date: date, totalAmount: totalAmount, successAmount: successAmount, failCount: failCount, items: items };
}
// ============ 主函数 ============
/**
 * 解析银行回单PDF：复制到uploads → Python pypdf提取文本 → 解析 → 返回结构化数据。
 * 从 wage-calc.ts 提取，独立维护。
 */
export function parseBankReceipt(sourcePath, projectName, yearMonth) {
    return __awaiter(this, void 0, void 0, function () {
        var fs, path, crypto_1, app, resolvedSource, uploadsDir, tempDir, isAllowed, ext, monthLabel, fileHash, storedName, targetDir, targetPath, receiptPath, scriptPath, PYTHON_EXTRACT_SCRIPT, fullText, stderr, extractionError, result, e_1, jsonOk, pages, snippet, snippet, hint, parsed, rawTextSnippet, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    if (!require('fs').existsSync(sourcePath)) {
                        return [2 /*return*/, { success: false, error: "\u6587\u4EF6\u4E0D\u5B58\u5728: ".concat(sourcePath) }];
                    }
                    fs = require('fs');
                    path = require('path');
                    crypto_1 = require('crypto');
                    app = require('electron').app;
                    resolvedSource = path.resolve(sourcePath);
                    uploadsDir = path.resolve(getUploadsPath());
                    tempDir = path.resolve(app.getPath ? app.getPath('temp') : require('os').tmpdir());
                    isAllowed = resolvedSource.startsWith(uploadsDir) || resolvedSource.startsWith(tempDir);
                    if (!isAllowed) {
                        return [2 /*return*/, { success: false, error: '来源文件路径不合法' }];
                    }
                    ext = path.extname(sourcePath) || '.pdf';
                    monthLabel = yearMonth
                        ? yearMonth.replace('-', '年') + '月'
                        : new Date().toISOString().slice(0, 7).replace('-', '年') + '月';
                    fileHash = crypto_1.createHash('md5').update(fs.readFileSync(sourcePath)).digest('hex').slice(0, 12);
                    storedName = "".concat(monthLabel, "_receipt_").concat(fileHash).concat(ext);
                    targetDir = path.join(getUploadsPath(), projectName ? projectName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').substring(0, 40) : '未分类', '工资', '银行回单');
                    fs.mkdirSync(targetDir, { recursive: true });
                    targetPath = path.join(targetDir, storedName);
                    if (!fs.existsSync(targetPath)) {
                        fs.copyFileSync(sourcePath, targetPath);
                    }
                    receiptPath = path.relative(getUploadsPath(), targetPath);
                    scriptPath = path.join(path.dirname(targetPath), "_extract_".concat(Date.now(), ".py"));
                    PYTHON_EXTRACT_SCRIPT = "\nimport sys, json\nif hasattr(sys.stdout, 'reconfigure'):\n    sys.stdout.reconfigure(encoding='utf-8')\nfrom pypdf import PdfReader\nr = PdfReader(sys.argv[1])\nlines = []\nfor p in r.pages:\n    t = p.extract_text()\n    if t.strip():\n        lines.append(t)\nprint(json.dumps(lines, ensure_ascii=False))\n";
                    fs.writeFileSync(scriptPath, PYTHON_EXTRACT_SCRIPT, 'utf-8');
                    fullText = '';
                    stderr = '';
                    extractionError = '';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, execPython(scriptPath, sourcePath)];
                case 2:
                    result = _a.sent();
                    fullText = result.text;
                    stderr = result.stderr;
                    return [3 /*break*/, 5];
                case 3:
                    e_1 = _a.sent();
                    extractionError = e_1.message || String(e_1);
                    return [3 /*break*/, 5];
                case 4:
                    fs.unlink(scriptPath, function () { });
                    return [7 /*endfinally*/];
                case 5:
                    if (extractionError) {
                        return [2 /*return*/, { success: false, error: "\u56DE\u5355\u89E3\u6790\u5931\u8D25: ".concat(extractionError) }];
                    }
                    jsonOk = true;
                    try {
                        pages = JSON.parse(fullText);
                        if (Array.isArray(pages))
                            fullText = pages.join('\n');
                    }
                    catch (_b) {
                        jsonOk = false;
                    }
                    fullText = fullText.trim();
                    if (!jsonOk) {
                        snippet = fullText.substring(0, 300).replace(/[\x00-\x1f]/g, ' ');
                        return [2 /*return*/, { success: false, error: "\u56DE\u5355\u89E3\u6790: JSON\u683C\u5F0F\u9519\u8BEF, \u8F93\u51FA: ".concat(snippet) }];
                    }
                    if (!fullText) {
                        return [2 /*return*/, {
                                success: false,
                                error: "\u56DE\u5355\u89E3\u6790\u5931\u8D25: Python\u8F93\u51FA\u4E3A\u7A7A" + (stderr ? " (stderr: ".concat(stderr.slice(0, 200), ")") : ''),
                            }];
                    }
                    // 内容质量检查
                    if (!hasCJK(fullText)) {
                        snippet = fullText.substring(0, 200).replace(/[\x00-\x1f]/g, ' ');
                        hint = fullText.length < 10
                            ? '提取结果为空，可能为扫描件（图片），请使用银行网银导出的文字版PDF'
                            : "\u63D0\u53D6\u5230\u7684\u6587\u672C\u65E0\u4E2D\u6587\u5185\u5BB9: \"".concat(snippet, "\"");
                        return [2 /*return*/, {
                                success: false,
                                error: "\u56DE\u5355\u89E3\u6790\u5931\u8D25: ".concat(hint),
                                data: {
                                    date: '', totalAmount: 0, successAmount: 0, failCount: 0,
                                    items: [],
                                    receiptPath: receiptPath,
                                    rawTextSnippet: fullText.substring(0, 500),
                                },
                            }];
                    }
                    parsed = parseBankReceiptText(fullText);
                    rawTextSnippet = fullText.substring(0, 500);
                    return [2 /*return*/, {
                            success: true,
                            data: __assign(__assign({}, parsed), { receiptPath: receiptPath, rawTextSnippet: rawTextSnippet }),
                        }];
                case 6:
                    error_1 = _a.sent();
                    return [2 /*return*/, { success: false, error: "\u56DE\u5355\u89E3\u6790\u5931\u8D25: ".concat(error_1.message) }];
                case 7: return [2 /*return*/];
            }
        });
    });
}
