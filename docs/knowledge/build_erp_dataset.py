# -*- coding: utf-8 -*-
"""从 蒸馏底稿·锦鲤baba.md 构建 erp_dev 结构化数据集（SOP 第⑦步）。

用法: python build_erp_dataset.py
输入: 同目录 蒸馏底稿·锦鲤baba.md
输出: 同目录 erp_dev_dataset.jsonl + erp_dev_INDEX.md（幂等重生成）
"""
import io
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, '蒸馏底稿·锦鲤baba.md')
OUT_JSONL = os.path.join(BASE, 'erp_dev_dataset.jsonl')
OUT_INDEX = os.path.join(BASE, 'erp_dev_INDEX.md')

LINE_GROUPS = {
    '一、财务 ERP 知识（博主主业线）': '财务ERP知识',
    '二、vibecoding 通用方法论': '开发方法论',
    '三、UI 术语词典（素材库型：把"画面"翻译成 AI 听得懂的组件名）': 'UI术语词典',
}

text = io.open(SRC, encoding='utf-8').read()
# 只取正文，舍弃蒸馏自查记录（--- 分隔线之后）
text = text.split('\n---\n')[0]

current_group = None
entries = []
cur = None
for line in text.splitlines():
    m = re.match(r'^## ([一二三]、[^\n]+)', line)
    if m:
        current_group = LINE_GROUPS.get(m.group(1).strip(), None)
        continue
    m = re.match(r'^### (JL\d+) (.+)$', line)
    if m:
        if cur:
            entries.append(cur)
        cur = {'id': m.group(1), 'title': m.group(2).strip(),
               'group': current_group, 'body': [], 'category_raw': '', 'video_span': ''}
        continue
    if cur is not None:
        if re.match(r'^## ', line):  # 撞上下一大节前兜底
            entries.append(cur)
            cur = None
            continue
        cur['body'].append(line)
if cur:
    entries.append(cur)

rows = []
for e in entries:
    body = [l for l in e['body']]
    # 末尾 "→ 主题（期号）" 行拆出 category_raw 与 video_span
    tail_idx = None
    for i in range(len(body) - 1, -1, -1):
        if body[i].startswith('→ '):
            tail_idx = i
            break
    tail = ''
    if tail_idx is not None:
        tail = body[tail_idx][2:].strip()
        body = body[:tail_idx]
    m = re.search(r'（([^（）]*(?:\([^()]*\)[^（）]*)*)）\s*$', tail)
    span = m.group(1).strip() if m else ''
    cat = tail[:m.start()].strip('（） ') if m else tail
    content = '\n'.join(body).strip()
    rows.append({
        'id': e['id'],
        'source': '锦鲤 baba',
        'batch': 'v1',
        'video_span': span,
        'title': e['title'],
        'category': e['group'],
        'category_raw': cat,
        'content': content,
    })

# 验收：id 唯一、无空 content
ids = [r['id'] for r in rows]
assert len(ids) == len(set(ids)), 'id 重复: %s' % ids
for r in rows:
    assert r['content'], '空条目: %s' % r['id']
    assert r['category'] in LINE_GROUPS.values(), '未知主题分组: %s (%s)' % (r['id'], r['category'])

with io.open(OUT_JSONL, 'w', encoding='utf-8', newline='\n') as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + '\n')

with io.open(OUT_INDEX, 'w', encoding='utf-8', newline='\n') as f:
    f.write('# ERP 开发知识索引（锦鲤 baba，%d 条）\n\n' % len(rows))
    f.write('> 由本目录 build_erp_dataset.py 从蒸馏底稿自动生成，勿手改。\n\n')
    f.write('| id | 标题 | 主题 | 期号 |\n|---|---|---|---|\n')
    for r in rows:
        f.write('| %s | %s | %s | %s |\n' % (r['id'], r['title'], r['category'], r['video_span']))

print('rows=%d -> %s' % (len(rows), OUT_JSONL))
print('groups:', {g: sum(1 for r in rows if r['category'] == g) for g in LINE_GROUPS.values()})
