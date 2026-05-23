/**
 * 考勤工具函数
 * 从 attendance.ts 拆分，供多个 handler 共用
 */
export type DayStatus = 'work' | 'holiday' | 'sick_leave' | 'personal_leave' | 'unset';
export declare function getDaysInMonth(yearMonth: string): number;
/**
 * 生成默认每日考勤状态
 * 管理人员：前4天默认"法定节假日"（近似周末），其余"出勤"
 * 工人：全部默认"出勤"
 */
export declare function generateDailyStatus(yearMonth: string, _isStaff: boolean): Record<number, DayStatus>;
/**
 * 从每日状态计算汇总数据
 * 法定节假日不算缺勤（法定带薪），只计病假/事假/缺勤为"休假"
 * workDays 包含出勤+法定节假日（均为带薪日）
 */
export declare function computeFromDailyStatus(dailyStatus: Record<number, DayStatus>, daysInMonth: number, startDay?: number): {
    workDays: number;
    daysOff: number;
    isFullAttendance: boolean;
    applicableDays: number;
};
export declare function getEntryDay(memberId: number, yearMonth: string, members: any[]): number;
