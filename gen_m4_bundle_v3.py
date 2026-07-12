import os, hashlib

files = [
    'EngineeringManager.Api/Program.cs',
    'EngineeringManager.Api/Endpoints/SttEndpoints.cs',
    'EngineeringManager.Api/Endpoints/KnowledgeEndpoints.cs',
    'EngineeringManager.Api/Services/Stt/SpeakerLabelNormalizer.cs',
    'EngineeringManager.Api/Security/CurrentUser.cs',
    'EngineeringManager.Api/Common.cs',
    'EngineeringManager.Tests/Endpoints/M4SttUploadAndIngestTests.cs',
    'EngineeringManager.Tests/Endpoints/M4ThirdRoundTests.cs',
    'EngineeringManager.Tests/Common/ApiTestBase.cs',
    'src/services/stt-client.ts',
    'src/services/knowledge-client.ts',
    'src/components/features/agent/KnowledgeSourceCard.tsx',
    'src/components/features/knowledge/SpeechKnowledgePage.tsx',
    'src/components/features/knowledge/KnowledgeLibrary.tsx',
    'src/components/features/knowledge/TranscriptionWorkspace.tsx',
    'src/components/features/knowledge/knowledgeTextMask.ts',
    'src/components/features/agent/__tests__/KnowledgeSourceCard.test.tsx',
    'src/components/features/knowledge/__tests__/stt-client.contract.test.ts',
    'src/App.tsx',
    'src/routes.ts',
    'src/types/permissions.ts',
    'src/utils/iconMap.ts',
]

out = []
out.append('# M4 Source Bundle — 第三轮整改（GPT-5.6 第二轮审查反馈）')
out.append('')
out.append('> 生成时间: 2026-07-11')
out.append('> 整改内容: 10 项硬阻塞全部修复')
out.append('')
out.append('## 整改清单')
out.append('')
out.append('| # | 审查问题 | 修复方式 |')
out.append('|---|---------|---------|')
out.append('| 1 | ReadFormAsync/CopyToAsync 未传 ctx.RequestAborted | 已传 CancellationToken |')
out.append('| 2 | 路径穿越 stt/<uid>/../<other>/file 可跨用户 | 改用 Path.GetFullPath + StartsWith 目录分隔符检查 |')
out.append('| 3 | IsPathSafe 允许根为整个 uploads | upload 端点改为 sttDir；transcribe 端点改为 resolvedDir |')
out.append('| 4 | create job/ingest 响应 jobId/documentId 在根级 | 包裹在 data 对象中 |')
out.append('| 5 | job/document list 返回根级 data+total | 包裹为 data: { data, total, page, size } |')
out.append('| 6 | segments 未验证连续 1..N | 添加 sortedSpeakers 连续性检查 |')
out.append('| 7 | segments 未限制数量/长度 | 添加 5000 条上限、10KB 单段、100KB 全文 |')
out.append('| 8 | 只传校对文本不传 segments 时丢失元数据 | 保留原始 originalSegments |')
out.append('| 9 | knowledge:read 未覆盖详情/删除/手动入库/STT ingest | 全部端点添加权限检查 |')
out.append('| 10 | 来源跳转 300ms 延迟竞态 | 改用 sessionStorage 可靠传递 |')
out.append('| 11 | UnsafeRelaxedJsonEscaping | 改用 UnicodeRanges.All |')
out.append('| 12 | Program.cs 未包含在包内 | 已加入 |')
out.append('| 13 | 测试不足 | 新增 M4ThirdRoundTests.cs (17 tests) + 前端 12 tests |')
out.append('')
out.append('## 文件清单')
out.append('')
for f in files:
    exists = os.path.exists(f)
    size = os.path.getsize(f) if exists else 0
    mark = "OK" if exists else "MISSING"
    out.append(f'- `{f}` ({size:,} bytes) [{mark}]')
out.append('')

for f in files:
    if not os.path.exists(f):
        out.append(f'## {f}')
        out.append('')
        out.append('```')
        out.append('FILE NOT FOUND')
        out.append('```')
        out.append('')
        continue
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    ext = os.path.splitext(f)[1].lstrip('.')
    out.append(f'## {f}')
    out.append('')
    out.append(f'```{ext}')
    out.append(content)
    out.append('```')
    out.append('')

result = '\n'.join(out)
with open('M4_source_bundle.md', 'w', encoding='utf-8') as fh:
    fh.write(result)

sha = hashlib.sha256(result.encode('utf-8')).hexdigest()
print(f'Files: {len(files)}')
print(f'Size: {len(result):,} bytes')
print(f'SHA-256: {sha}')
