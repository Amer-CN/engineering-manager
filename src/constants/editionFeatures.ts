/**
 * editionFeatures - 前端能力键常量（M-EDITION1 X8）
 *
 * 这些键必须与后端 EditionFeatures.cs 的 6 个常量完全一致。
 * 同步机制：后端 GET /api/config 下发 features 数组，前端 useHasFeature(key) 消费。
 * 若后端新增/删除能力键，此文件必须同步更新，否则 useHasFeature 对该键永远返回 false。
 * 一致性由 EditionFeaturesTests.ReservedKeys_CoverOrphanedKeys (后端) 保证后端侧完备性。
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
