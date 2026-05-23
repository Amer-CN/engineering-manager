/**
 * 合作/监管单位相关 SQLite 查询模块
 *
 * 实现 partners、regions、supervisors 三张表的 CRUD 操作。
 */
export declare function listPartners(): any[] | null;
export declare function createPartner(partner: any): boolean;
export declare function updatePartner(partner: any): boolean;
export declare function deletePartner(id: number): boolean;
export declare function listPartnersByProject(projectId: number): any[] | null;
export declare function listRegions(): any[] | null;
export declare function createRegion(region: any): boolean;
/** 检查地区是否被监管单位引用 */
export declare function countRegionRefs(regionId: number): number | null;
export declare function deleteRegion(id: number): boolean;
export declare function listSupervisors(): any[] | null;
export declare function createSupervisor(supervisor: any): boolean;
export declare function updateSupervisor(supervisor: any): boolean;
export declare function deleteSupervisor(id: number): boolean;
