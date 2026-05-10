/**
 * 成员相关常量
 */

/**
 * 农民工类型标签
 */
export const workerTypes = [
  { value: 'bricklayer', label: '砌筑工' },
  { value: 'concrete', label: '混凝土工' },
  { value: 'carpenter', label: '木工' },
  { value: 'steel', label: '钢筋工' },
  { value: 'painter', label: '抹灰工' },
  { value: 'water', label: '水电工' },
  { value: 'welder', label: '电焊工' },
  { value: 'glass', label: '玻璃工' },
  { value: 'tile', label: '防水工' },
  { value: 'scaffolder', label: '架子工' },
  { value: 'elevator', label: '起重工' },
  { value: 'mechanic', label: '机械工' },
  { value: 'truck_driver', label: '司机' },
  { value: 'foreman', label: '班组长' },
  { value: 'helper', label: '小工/杂工' },
  { value: 'other', label: '其他工种' }
] as const

export type WorkerType = typeof workerTypes[number]['value']

/**
 * 管理人员角色
 */
export const staffRoles = [
  { value: 'manager', label: '项目经理' },
  { value: 'engineer', label: '工程师' },
  { value: 'technician', label: '技术员' },
  { value: 'safety', label: '安全员' },
  { value: 'quality', label: '质量员' },
  { value: 'cost', label: '造价员' },
  { value: 'material', label: '材料员' },
  { value: 'procurement', label: '采购员' },
  { value: 'accountant', label: '会计' },
  { value: 'hr', label: '人事' },
  { value: 'admin', label: '行政' },
  { value: 'other', label: '其他' }
] as const

export type StaffRole = typeof staffRoles[number]['value']

/**
 * 性别
 */
export const genders = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' }
] as const

/**
 * 政治面貌
 */
export const politicalStatuses = [
  { value: 'citizen', label: '群众' },
  { value: 'league', label: '共青团员' },
  { value: 'party', label: '中共党员' },
  { value: 'democratic', label: '民主党派' }
] as const

/**
 * 婚姻状况
 */
export const maritalStatuses = [
  { value: 'single', label: '未婚' },
  { value: 'married', label: '已婚' },
  { value: 'divorced', label: '离异' },
  { value: 'widowed', label: '丧偶' }
] as const

/**
 * 人员状态
 */
export const memberStatuses = [
  { value: 'active', label: '在职' },
  { value: 'left', label: '离场' },
  { value: 'transferred', label: '调离' }
] as const

/**
 * 教育程度
 */
export const educationLevels = [
  { value: 'primary', label: '小学' },
  { value: 'junior', label: '初中' },
  { value: 'senior', label: '高中/中专' },
  { value: 'college', label: '大专' },
  { value: 'bachelor', label: '本科' },
  { value: 'master', label: '硕士' },
  { value: 'doctor', label: '博士' }
] as const

/**
 * 民族
 */
export const ethnicities = [
  '汉族', '蒙古族', '回族', '藏族', '维吾尔族', '苗族', '彝族', '壮族', '布依族', '朝鲜族',
  '满族', '侗族', '瑶族', '白族', '土家族', '哈尼族', '哈萨克族', '傣族', '黎族', '傈僳族',
  '佤族', '畲族', '高山族', '拉祜族', '水族', '东乡族', '纳西族', '景颇族', '科尔克孜族',
  '土族', '达斡尔族', '仫佬族', '羌族', '布朗族', '撒拉族', '毛南族', '仡佬族', '锡伯族',
  '阿昌族', '普米族', '塔吉克族', '怒族', '乌孜别克族', '俄罗斯族', '鄂温克族', '德昂族',
  '保安族', '裕固族', '京族', '塔塔尔族', '独龙族', '鄂伦春族', '赫哲族', '门巴族', '珞巴族', '基诺族'
] as const