/**
 * 成本台账共享工具函数
 */
import { db, saveDatabase } from '../database';
/** 获取项目最新且有数据的版本号（不传 batchId 时默认使用） */
export function getLatestBatch(projectId) {
    if (!db.costLedgerBatches)
        db.costLedgerBatches = [];
    var projectBatches = db.costLedgerBatches
        .filter(function (b) { return b.projectId === projectId; })
        .sort(function (a, b) { return b.id - a.id; }); // ID 从大到小
    var _loop_1 = function (batch) {
        var count = (db.costLedger || []).filter(function (e) {
            return e.projectId === projectId && (e.batchId || 0) === batch.id;
        }).length;
        if (count > 0)
            return { value: batch.id };
    };
    // 从最新的版本开始往下找，找到第一个有数据的
    for (var _i = 0, projectBatches_1 = projectBatches; _i < projectBatches_1.length; _i++) {
        var batch = projectBatches_1[_i];
        var state_1 = _loop_1(batch);
        if (typeof state_1 === "object")
            return state_1.value;
    }
    return 0;
}
/** 初始化批次（向后兼容：无 batchId 的老数据自动归入 batchId=0） */
export function ensureBatchesInit() {
    if (!db.costLedgerBatches)
        db.costLedgerBatches = [];
    var changed = false;
    if (db.costLedger && db.costLedger.length > 0) {
        var projectIds = new Set(db.costLedger.map(function (e) { return e.projectId; }));
        var _loop_2 = function (pid) {
            if (!db.costLedgerBatches.some(function (b) { return b.projectId === pid && b.id === 0; })) {
                db.costLedgerBatches.push({
                    id: 0,
                    projectId: pid,
                    name: '初始版',
                    createdAt: new Date().toISOString(),
                });
                changed = true;
            }
        };
        for (var _i = 0, projectIds_1 = projectIds; _i < projectIds_1.length; _i++) {
            var pid = projectIds_1[_i];
            _loop_2(pid);
        }
        if (changed)
            saveDatabase();
    }
}
