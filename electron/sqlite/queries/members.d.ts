/**
 * 成员相关 SQLite 查询模块
 *
 * 实现 members、worker_teams、worker_transfer_records、project_members 四张表的 CRUD 操作。
 */
export declare function listMembers(): any[] | null;
export declare function createMember(member: any): boolean;
export declare function updateMember(member: any): boolean;
export declare function deleteMember(id: number): boolean;
/** 创建薪资历史记录（member create 时的副作用） */
export declare function createSalaryHistory(entry: any): boolean;
export declare function listTeams(): any[] | null;
export declare function createTeam(team: any): boolean;
export declare function updateTeam(team: any): boolean;
export declare function deleteTeam(id: number): boolean;
export declare function listTransferRecords(workerId?: number): any[] | null;
export declare function createTransferRecord(record: any): boolean;
export declare function listProjectMembers(projectId: number): any[] | null;
export declare function addProjectMember(entry: any): boolean;
export declare function updateProjectMember(id: number, changes: any): boolean;
export declare function removeProjectMember(id: number): boolean;
