import sqlite3

# 模拟 rowToCamel 函数
def snake_to_camel(s):
    parts = s.split('_')
    return parts[0] + ''.join(word.capitalize() for word in parts[1:])

def row_to_camel(row):
    result = {}
    for key, value in row.items():
        if isinstance(value, str):
            if value == '[]' or value == '{}':
                result[snake_to_camel(key)] = [] if value == '[]' else {}
            elif (value.startswith('[') and value.endswith(']')) or (value.startswith('{') and value.endswith('}')):
                try:
                    import json
                    result[snake_to_camel(key)] = json.loads(value)
                except:
                    result[snake_to_camel(key)] = value
            else:
                result[snake_to_camel(key)] = value
        else:
            result[snake_to_camel(key)] = value
    return result

db_path = 'F:/Company Database/engineering.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row  # 使结果可以用 dict 方式访问
cursor = conn.cursor()

# 模拟 listWorkers 的查询
sql = """SELECT w.*,
  COUNT(pw.id) AS project_count,
  SUM(CASE WHEN pw.status = 'active' THEN 1 ELSE 0 END) AS active_project_count
FROM workers w
LEFT JOIN project_workers pw ON pw.worker_id = w.id
GROUP BY w.id ORDER BY w.created_at DESC
LIMIT 3"""

cursor.execute(sql)
rows = cursor.fetchall()

print('=== 测试 listWorkers 返回的字段 ===')
for i, row in enumerate(rows):
    camel = row_to_camel(dict(row))
    print(f'\n工人 {i + 1}:')
    print(f'  name: {camel.get("name")}')
    print(f'  gender: {camel.get("gender")}')
    print(f'  birthDate: {camel.get("birthDate")}')
    print(f'  bankAccount: {camel.get("bankAccount")}')
    print(f'  idCard: {camel.get("idCard")}')
    print(f'  projectCount: {camel.get("projectCount")}')

conn.close()
print('\n测试完成')
