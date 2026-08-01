/**
 * editionFeatures - 前端能力键常量（M-EDITION1 X8）
 *
 * 这些键必须与后端 EditionFeatures.cs 的 6 个常量完全一致。
 * 同步机制：后端 GET /api/config 下发 features 数组，前端 useHasFeature(key) 消费。
 * 若后端新增/删除能力键，此文件必须同步更新，否则 useHasFeature 对该键永远返回 false。
 * 前后端同步机制：useHasFeature 的参数类型为 EditionFeatureKey（派生自本文件），
 * 若后端新增能力键而本文件未同步，tsc 会在调用点报错（类型不匹配）。
 * 后端自洽性由 EditionFeaturesTests 保证；前后端一致性由 tsc 类型检查保证。
 */

export const EDITION_FEATURE_KEYS = {
  UserManagement: 'userManagement',
  RoleManagement: 'roleManagement',
  ProjectAuthorization: 'projectAuthorization',
  MultiUserDataScope: 'multiUserDataScope',
  AuditUserFilter: 'auditUserFilter',
  CloudSync: 'cloudSync',
} as const;

export type EditionFeatureKey = typeof EDITION_FEATURE_KEYS[keyof typeof EDITION_FEATURE_KEYS];
