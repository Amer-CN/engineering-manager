import sqlite3

db_path = 'F:/Company Database/engineering.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 列出所有表
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cursor.fetchall()
print(f'SQLite 表数量: {len(tables)}')
for t in tables:
    print(f'  - {t[0]}')

# 检查 cost_ledger_batches 表
print('\n--- cost_ledger_batches 表检查 ---')
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cost_ledger_batches'")
if cursor.fetchone():
    cursor.execute('SELECT COUNT(*) FROM cost_ledger_batches')
    count = cursor.fetchone()[0]
    print(f'表存在，行数: {count}')
    if count > 0:
        cursor.execute('SELECT * FROM cost_ledger_batches LIMIT 5')
        cols = [desc[0] for desc in cursor.description]
        print('列:', cols)
        for row in cursor.fetchall():
            print(dict(zip(cols, row)))
else:
    print('表不存在！')

# 检查 cost_ledger 表
print('\n--- cost_ledger 表检查 ---')
cursor.execute('SELECT COUNT(*) FROM cost_ledger')
count = cursor.fetchone()[0]
print(f'cost_ledger 行数: {count}')

conn.close()
print('\n检查完成')
