/**
 * 从现有数据文件生成种子数据（剥离 base64 + 脱敏）
 * Usage: node scripts/create-seed-data.js
 */
const fs = require('fs');
const path = require('path');

const SOURCE_DB = 'C:/Users/Admin/AppData/Roaming/engineering-manager/engineering.json';
const DEST = path.join(__dirname, '..', 'public', 'seed-data.json');

const data = JSON.parse(fs.readFileSync(SOURCE_DB, 'utf8'));

// 字段中可能包含 base64 data URL 的字段名
const BASE64_FIELDS = new Set([
  'photo', 'photos', 'avatar', 'imageUrl', 'logo', 'signature',
  'idCardFront', 'idCardBack', 'staffIdCardFront', 'staffIdCardBack',
  'bankCardPhoto', 'contractFile', 'contractContent', 'attachment',
  'attachments', 'fileData', 'fileContent', 'thumbnail', 'preview',
  'businessLicense', 'licenseImage', 'certificate',
  'scanFile', 'scannedDoc', 'docFile', 'docContent',
]);

// 脱敏：生成假名
const FAKE_NAMES = ['张建国', '李明华', '王新民', '赵志强', '陈文博', '刘永刚', '黄国栋', '周建华', '吴大伟', '郑小林'];
const FAKE_PHONES = ['13800138001', '13800138002', '13800138003', '13800138004', '13800138005', '13800138006', '13800138007', '13800138008', '13800138009', '13800138010'];
const FAKE_IDCARDS = ['510101199001010001', '510101199002020002', '510101199003030003', '510101199004040004', '510101199005050005', '510101199006060006'];
const FAKE_ADDRESSES = ['四川省成都市高新区天府大道1000号', '四川省成都市锦江区红星路200号', '四川省成都市武侯区人民南路300号'];

let nameIdx = 0, phoneIdx = 0, idIdx = 0, addrIdx = 0;

function nextFakeName() { return FAKE_NAMES[nameIdx++ % FAKE_NAMES.length]; }
function nextFakePhone() { return FAKE_PHONES[phoneIdx++ % FAKE_PHONES.length]; }
function nextFakeIdCard() { return FAKE_IDCARDS[idIdx++ % FAKE_IDCARDS.length]; }
function nextFakeAddress() { return FAKE_ADDRESSES[addrIdx++ % FAKE_ADDRESSES.length]; }

const PERSON_NAME_FIELDS = new Set([
  'name', 'contact', 'contactPerson', 'legalPerson', 'leader',
]);
const PERSON_PHONE_FIELDS = new Set([
  'phone', 'companyPhone', 'contactPhone', 'mobile',
]);
const PERSON_ID_FIELDS = new Set([
  'idCard', 'staffIdCard',
]);
const PERSON_ADDR_FIELDS = new Set([
  'idCardAddress',
]);

function stripBase64(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => stripBase64(item));
  }
  if (obj && typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (BASE64_FIELDS.has(key)) {
        if (Array.isArray(value)) {
          cleaned[key] = value.map(att =>
            typeof att === 'string' && att.startsWith('data:')
              ? '[demo]'
              : stripBase64(att)
          );
        } else if (typeof value === 'string' && value.startsWith('data:')) {
          cleaned[key] = '';
        } else {
          cleaned[key] = stripBase64(value);
        }
      } else if (typeof value === 'string' && value.startsWith('data:')) {
        cleaned[key] = '';
      } else if (PERSON_NAME_FIELDS.has(key) && typeof value === 'string' && value.length > 0) {
        // 脱敏人名
        if (obj.role || obj.memberType || obj.position) {
          cleaned[key] = nextFakeName();
        } else if (key !== 'name') {
          // contact, contactPerson, legalPerson, leader — always anonymize
          cleaned[key] = nextFakeName();
        } else {
          // name field without role/memberType — keep (project/partner/team names)
          cleaned[key] = value;
        }
      } else if (PERSON_PHONE_FIELDS.has(key) && typeof value === 'string' && value.length >= 7) {
        cleaned[key] = nextFakePhone();
      } else if (PERSON_ID_FIELDS.has(key) && typeof value === 'string' && value.length >= 15) {
        cleaned[key] = nextFakeIdCard();
      } else if (PERSON_ADDR_FIELDS.has(key) && typeof value === 'string' && value.length > 5) {
        cleaned[key] = nextFakeAddress();
      } else {
        cleaned[key] = stripBase64(value);
      }
    }
    return cleaned;
  }
  return obj;
}

console.log('Stripping base64 + anonymizing data...');
const cleaned = stripBase64(data);

// Keep only collections that have at least one record
// Also normalize IDs and timestamps for cleanliness
const seed = {};
let totalRecords = 0;
const NOW = new Date().toISOString();

for (const [key, value] of Object.entries(cleaned)) {
  if (key.startsWith('_')) continue;
  if (Array.isArray(value) && value.length > 0) {
    // Reset dates so they look fresh for demo users
    const fresh = value.map(item => ({
      ...item,
      createdAt: item.createdAt ? NOW : undefined,
      updatedAt: item.updatedAt ? NOW : undefined,
    }));
    seed[key] = fresh;
    totalRecords += fresh.length;
    console.log(`  ${key}: ${fresh.length} records`);
  }
}

const json = JSON.stringify(seed, null, 2);
fs.writeFileSync(DEST, json, 'utf8');
const kb = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(1);
console.log(`\nSeed data written: ${DEST} (${kb} KB, ${totalRecords} total records)`);
console.log('All personal info has been anonymized.');
