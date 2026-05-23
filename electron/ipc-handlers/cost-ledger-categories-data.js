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
import { db, saveDatabase } from '../database';
export var BUILTIN_CATEGORIES = [
    // 业务费
    { code: 'public_relations', label: '公关招待费', direction: 'expense', color: '#ec4899', sortOrder: 1, level1: '业务费' },
    { code: 'intermediary_fee', label: '居间中介费', direction: 'expense', color: '#ec4899', sortOrder: 2, level1: '业务费' },
    { code: 'other_business', label: '其他业务费', direction: 'expense', color: '#ec4899', sortOrder: 3, level1: '业务费' },
    // 直接工程费
    { code: 'labor', label: '劳务费', direction: 'expense', color: '#f97316', sortOrder: 4, level1: '直接工程费' },
    { code: 'material', label: '材料费', direction: 'expense', color: '#f97316', sortOrder: 5, level1: '直接工程费' },
    { code: 'equipment', label: '机械费', direction: 'expense', color: '#f97316', sortOrder: 6, level1: '直接工程费' },
    { code: 'subcontract', label: '专业分包款', direction: 'expense', color: '#f97316', sortOrder: 7, level1: '直接工程费' },
    // 现场管理费
    { code: 'temp_facility', label: '临建及办公费', direction: 'expense', color: '#14b8a6', sortOrder: 8, level1: '现场管理费' },
    { code: 'manager_salary', label: '管理人员薪酬', direction: 'expense', color: '#14b8a6', sortOrder: 9, level1: '现场管理费' },
    { code: 'travel_misc', label: '差旅及杂项', direction: 'expense', color: '#14b8a6', sortOrder: 10, level1: '现场管理费' },
    // 对公服务及前期投入费
    { code: 'bid_guarantee', label: '投标及保函费', direction: 'expense', color: '#6b7280', sortOrder: 11, level1: '对公服务及前期投入费' },
    { code: 'consult_testing', label: '咨询检测费', direction: 'expense', color: '#6b7280', sortOrder: 12, level1: '对公服务及前期投入费' },
    { code: 'doc_agency', label: '资料代理费', direction: 'expense', color: '#6b7280', sortOrder: 13, level1: '对公服务及前期投入费' },
    { code: 'other_public', label: '其他对公服务费', direction: 'expense', color: '#6b7280', sortOrder: 14, level1: '对公服务及前期投入费' },
    // 财务及其他费
    { code: 'capital_cost', label: '资金成本', direction: 'expense', color: '#9ca3af', sortOrder: 15, level1: '财务及其他费' },
    { code: 'guarantee_fee', label: '保函及规费', direction: 'expense', color: '#9ca3af', sortOrder: 16, level1: '财务及其他费' },
    { code: 'irregular_invoice', label: '非常规发票成本', direction: 'expense', color: '#9ca3af', sortOrder: 17, level1: '财务及其他费' },
    { code: 'fine_other', label: '罚款及其他', direction: 'expense', color: '#9ca3af', sortOrder: 18, level1: '财务及其他费' },
    // 收入分类 — 投资款
    { code: 'shareholder_investment', label: '股东投资', direction: 'income', color: '#059669', sortOrder: 1, level1: '投资款' },
    { code: 'financing', label: '融资款', direction: 'income', color: '#059669', sortOrder: 2, level1: '投资款' },
    { code: 'income_invest_ph', label: '投资款-占位', direction: 'income', color: '#059669', sortOrder: 3, level1: '投资款' },
    // 收入分类 — 项目回款
    { code: 'advance_recovery', label: '垫资回收', direction: 'income', color: '#2563eb', sortOrder: 4, level1: '项目回款' },
    { code: 'income_return_ph', label: '项目回款-占位', direction: 'income', color: '#2563eb', sortOrder: 5, level1: '项目回款' },
    // 收入分类 — 退款
    { code: 'income_refund_ph', label: '退款-占位', direction: 'income', color: '#7c3aed', sortOrder: 6, level1: '退款' },
    // 收入分类 — 其他收入
    { code: 'income_other_ph', label: '其他收入-占位', direction: 'income', color: '#0891b2', sortOrder: 7, level1: '其他收入' },
];
export function seedBuiltinCategories() {
    if (!db.costLedgerCategories)
        db.costLedgerCategories = [];
    var now = Date.now();
    return BUILTIN_CATEGORIES.map(function (c, i) { return (__assign(__assign({}, c), { id: now + i, isBuiltin: true, isEnabled: true })); });
}
/**
 * 将旧版扁平分类迁移为新的二级层级分类。
 * 旧 code 在新系统中保留的（labor/material/equipment）→ 更新 label 和 level1；
 * 旧 code 已废弃的 → isEnabled = false；
 * 新 code 缺失的 → 补建。
 * 自定义分类保持不动。
 */
export function migrateCategoriesToV2() {
    if (!db.costLedgerCategories)
        db.costLedgerCategories = [];
    var cats = db.costLedgerCategories;
    var newCodes = new Set(BUILTIN_CATEGORIES.map(function (c) { return c.code; }));
    var now = Date.now();
    var _loop_1 = function (cat) {
        if (!cat.isBuiltin)
            return "continue";
        var match = BUILTIN_CATEGORIES.find(function (c) { return c.code === cat.code; });
        if (match) {
            cat.label = match.label;
            cat.color = match.color;
            cat.sortOrder = match.sortOrder;
            cat.level1 = match.level1;
            cat._migrated = true;
        }
    };
    // 1. Update existing builtin categories that have matching new codes
    for (var _i = 0, cats_1 = cats; _i < cats_1.length; _i++) {
        var cat = cats_1[_i];
        _loop_1(cat);
    }
    // 2. Disable old expense codes no longer in the new system
    var oldCodesToDisable = ['pre_project', 'business_expense', 'advance', 'salary', 'tax', 'other'];
    for (var _a = 0, cats_2 = cats; _a < cats_2.length; _a++) {
        var cat = cats_2[_a];
        if (cat.isBuiltin && oldCodesToDisable.includes(cat.code)) {
            cat.isEnabled = false;
            cat._migrated = true;
        }
    }
    var _loop_2 = function (cat) {
        if (!cat.isBuiltin || cat.direction !== 'income')
            return "continue";
        var match = BUILTIN_CATEGORIES.find(function (c) { return c.code === cat.code; });
        if (match && match.level1 && !cat.level1) {
            cat.level1 = match.level1;
            cat.color = match.color;
            cat.sortOrder = match.sortOrder;
            cat._migrated = true;
        }
    };
    // 2b. Update old income codes with level1 (they had no level1 before)
    for (var _b = 0, cats_3 = cats; _b < cats_3.length; _b++) {
        var cat = cats_3[_b];
        _loop_2(cat);
    }
    var _loop_3 = function (i) {
        var bc = BUILTIN_CATEGORIES[i];
        if (!cats.some(function (c) { return c.isBuiltin && c.code === bc.code; })) {
            cats.push(__assign(__assign({}, bc), { id: now + i + 1000, isBuiltin: true, isEnabled: true, _migrated: true }));
        }
    };
    // 3. Add new builtin categories that are missing
    for (var i = 0; i < BUILTIN_CATEGORIES.length; i++) {
        _loop_3(i);
    }
    // 4. Re-sort: builtins first by sortOrder, then customs
    cats.sort(function (a, b) {
        if (a.isBuiltin && !b.isBuiltin)
            return -1;
        if (!a.isBuiltin && b.isBuiltin)
            return 1;
        if (a.isBuiltin && b.isBuiltin)
            return (a.sortOrder || 99) - (b.sortOrder || 99);
        return (a.sortOrder || 99) - (b.sortOrder || 99);
    });
    saveDatabase();
}
export function ensureCategories() {
    if (!db.costLedgerCategories)
        db.costLedgerCategories = [];
    if (db.costLedgerCategories.length === 0) {
        db.costLedgerCategories = seedBuiltinCategories();
        saveDatabase();
        return db.costLedgerCategories;
    }
    // Run migration if any builtin category is missing level1 (pre-v2 database)
    // or old deprecated expense codes are still enabled
    // or new hierarchy codes are missing
    var deprecatedCodes = ['pre_project', 'business_expense', 'advance', 'salary', 'tax', 'other'];
    var needsMigration = db.costLedgerCategories.some(function (c) {
        return c.isBuiltin && !c.level1 && c.direction === 'expense' && !deprecatedCodes.includes(c.code);
    }) || db.costLedgerCategories.some(function (c) {
        return c.isBuiltin && deprecatedCodes.includes(c.code) && c.isEnabled !== false;
    }) || db.costLedgerCategories.some(function (c) {
        return c.isBuiltin && c.direction === 'income' && !c.level1;
    }) || (function () {
        var newCodes = new Set(BUILTIN_CATEGORIES.map(function (c) { return c.code; }));
        return BUILTIN_CATEGORIES.some(function (bc) { return !db.costLedgerCategories.some(function (c) { return c.isBuiltin && c.code === bc.code; }); });
    })();
    if (needsMigration) {
        migrateCategoriesToV2();
    }
    return db.costLedgerCategories;
}
