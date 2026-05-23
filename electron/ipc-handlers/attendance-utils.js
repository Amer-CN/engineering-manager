/**
 * 考勤工具函数
 * 从 attendance.ts 拆分，供多个 handler 共用
 */
export function getDaysInMonth(yearMonth) {
    var _a = yearMonth.split('-').map(Number), year = _a[0], month = _a[1];
    return new Date(year, month, 0).getDate();
}
/**
 * 生成默认每日考勤状态
 * 管理人员：前4天默认"法定节假日"（近似周末），其余"出勤"
 * 工人：全部默认"出勤"
 */
export function generateDailyStatus(yearMonth, _isStaff) {
    var daysInMonth = getDaysInMonth(yearMonth);
    var status = {};
    for (var d = 1; d <= daysInMonth; d++) {
        status[d] = 'work';
    }
    return status;
}
/**
 * 从每日状态计算汇总数据
 * 法定节假日不算缺勤（法定带薪），只计病假/事假/缺勤为"休假"
 * workDays 包含出勤+法定节假日（均为带薪日）
 */
export function computeFromDailyStatus(dailyStatus, daysInMonth, startDay) {
    if (startDay === void 0) { startDay = 1; }
    var workDays = 0;
    var daysOff = 0;
    for (var d = startDay; d <= daysInMonth; d++) {
        var s = dailyStatus[d];
        if (!s)
            continue; // 未定义的天不计入出勤/休假
        if (s === 'work' || s === 'holiday')
            workDays++;
        if (s === 'sick_leave' || s === 'personal_leave')
            daysOff++;
    }
    var applicableDays = daysInMonth - startDay + 1;
    return { workDays: workDays, daysOff: daysOff, isFullAttendance: daysOff <= 4, applicableDays: applicableDays };
}
export function getEntryDay(memberId, yearMonth, members) {
    if (!members)
        return 1;
    var member = members.find(function (m) { return m.id === memberId; });
    if (!(member === null || member === void 0 ? void 0 : member.entryDate))
        return 1;
    var _a = member.entryDate.split('-').map(Number), ey = _a[0], em = _a[1], ed2 = _a[2];
    var _b = yearMonth.split('-').map(Number), cy = _b[0], cm = _b[1];
    return (ey === cy && em === cm) ? ed2 : 1;
}
