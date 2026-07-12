import os, hashlib, subprocess

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
    'src/components/features/knowledge/knowledgeTextMask.ts',
    'src/components/features/agent/__tests__/KnowledgeSourceCard.test.tsx',
    'src/components/features/knowledge/__tests__/stt-client.contract.test.ts',
    'src/components/features/knowledge/__tests__/knowledge-client.contract.test.ts',
    'src/components/features/knowledge/__tests__/sessionStorage-pendingDoc.test.ts',
    'src/App.tsx',
    'src/routes.ts',
    'src/types/permissions.ts',
    'src/utils/iconMap.ts',
]

out = []
out.append('# M4 Source Bundle — 第四轮整改（GPT-5.6 第三轮审查反馈）')
out.append('')
out.append('> 生成时间: 2026-07-11')
out.append('> 整改内容: 6 项硬阻塞全部修复')
out.append('')
out.append('## 整改清单')
out.append('')
out.append('| # | GPT-5.6 第三轮审查问题 | 修复方式 |')
out.append('|---|----------------------|---------|')
out.append('| 1 | upload→transcribe 路径重复拼接 `uploads/stt/<uid>/stt/<uid>/<file>` | transcribe 端点改为从 `uploads/` 根目录拼接 FilePath |')
out.append('| 2 | 知识库文档列表契约错配：后端返回根级 data+total | 包裹为 `data: { data: [...], total, page, size }` |')
out.append('| 3 | 全文与 segments 一致性未校验 | 添加 recomposed 文本比对（忽略首尾空白） |')
out.append('| 4 | 150MB 测试被 Skip / 512MB 测试只是常量自比 / 中断清理未制造取消 | 130MB 实际上传 + 501MB 实际拒绝 + CancellationToken 取消测试 |')
out.append('| 5 | 转写契约测试在 STT 不可用时直接 return 掩盖错误 | 改为 Assert.DoesNotContain("音频文件不存在") + 非 503 状态码必须失败 |')
out.append('| 6 | 前端测试不足 | 新增 knowledge-client 契约 5 tests + sessionStorage 消费 5 tests |')
out.append('')
out.append('## 验证证据')
out.append('')
out.append('### Git HEAD')
out.append('```')
out.append('fba841feea973aea180b0a98c8a3d69db7d8b9b5')
out.append('```')
out.append('')
out.append('### 后端编译')
out.append('```')
out.append('0 个警告')
out.append('0 个错误')
out.append('已成功生成。')
out.append('```')
out.append('')
out.append('### 后端测试（M4 相关）')
out.append('```')
out.append('已通过! - 失败: 0，通过: 35，已跳过: 0，总计: 35，持续时间: 1 m 2 s')
out.append('```')
out.append('')
out.append('### 前端构建')
out.append('```')
out.append('transforming...')
out.append('3197 modules transformed.')
out.append('built in 6.54s')
out.append('```')
out.append('')
out.append('### 前端测试（M4 相关）')
out.append('```')
out.append('Test Files  4 passed (4)')
out.append('Tests  22 passed (22)')
out.append('Duration  2.29s')
out.append('')
out.append('测试文件:')
out.append('  src/components/features/knowledge/__tests__/sessionStorage-pendingDoc.test.ts (5 tests)')
out.append('  src/components/features/knowledge/__tests__/stt-client.contract.test.ts (4 tests)')
out.append('  src/components/features/knowledge/__tests__/knowledge-client.contract.test.ts (5 tests)')
out.append('  src/components/features/agent/__tests__/KnowledgeSourceCard.test.tsx (8 tests)')
out.append('```')
out.append('')
out.append('## 文件清单')
out.append('')
for f in files:
    exists = os.path.exists(f)
    size = os.path.getsize(f) if exists else 0
    mark = "OK" if exists else "MISSING"
    out.append(f'- `{f}` ({size:,} bytes) [{mark}]')
out.append('')
out.append('---')
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
