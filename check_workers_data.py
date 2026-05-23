import sqlite3

db_path = 'F:/Company Database/engineering.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print('=== SQLite workers 表检查 ===')
cursor.execute("SELECT COUNT(*) FROM workers")
count = cursor.fetchone()[0]
print(f'总行数: {count}')

if count > 0:
    # 查看字段
    cursor.execute("PRAGMA table_info(workers)")
    cols = [row[1] for row in cursor.fetchall()]
    print(f'字段: {cols}')
    
    # 查看前3条数据的关键字段
    cursor.execute("""
        SELECT id, name, gender, birth_date, bank_account, id_card 
        FROM workers 
        LIMIT 3
    """)
    print('\n前3条数据:')
    for row in cursor.fetchall():
        print(f'  ID: {row[0]}, 姓名: {row[1]}, 性别: {row[2]}, 生日: {row[3]}, 银行卡: {row[4]}, 身份证: {row[5]}')

print('\n=== JSON workers 对比 ===')
import json
with open('F:/Company Database/engineering.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    workers = data.get('workers', [])
    print(f'JSON workers 数量: {len(workers)}')
    if workers:
        w = workers[0]
        print(f'字段: {list(w.keys())}')
        print(f'示例: 性别={w.get("gender")}, 生日={w.get("birthDate")}, 银行卡={w.get("bankAccount")}')

conn.close()
print('\n检查完成')
