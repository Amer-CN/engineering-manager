/**
 * 成本台账共享工具函数
 */
/** 获取项目最新且有数据的版本号（不传 batchId 时默认使用） */
export declare function getLatestBatch(projectId: number): number;
/** 初始化批次（向后兼容：无 batchId 的老数据自动归入 batchId=0） */
export declare function ensureBatchesInit(): void;
