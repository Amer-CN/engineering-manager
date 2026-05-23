export declare const BUILTIN_CATEGORIES: {
    code: string;
    label: string;
    direction: string;
    color: string;
    sortOrder: number;
    level1: string;
}[];
export declare function seedBuiltinCategories(): {
    id: number;
    isBuiltin: boolean;
    isEnabled: boolean;
    code: string;
    label: string;
    direction: string;
    color: string;
    sortOrder: number;
    level1: string;
}[];
/**
 * 将旧版扁平分类迁移为新的二级层级分类。
 * 旧 code 在新系统中保留的（labor/material/equipment）→ 更新 label 和 level1；
 * 旧 code 已废弃的 → isEnabled = false；
 * 新 code 缺失的 → 补建。
 * 自定义分类保持不动。
 */
export declare function migrateCategoriesToV2(): void;
export declare function ensureCategories(): any[];
