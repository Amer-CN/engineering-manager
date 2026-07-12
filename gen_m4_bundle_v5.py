#!/usr/bin/env python3
"""
M4 第五轮审查包生成脚本
包含：
- 6 个核心前端组件完整源码
- 后端关键端点/服务/安全文件
- 全部测试文件
- Git HEAD + status
- 后端编译/测试输出
- 前端测试输出
"""

import os
import subprocess
import hashlib
from datetime import datetime

BASE = r"E:\测试"

def read_file(path):
    full = os.path.join(BASE, path)
    if not os.path.exists(full):
        return f"[文件不存在: {path}]"
    try:
        with open(full, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"[读取失败: {path}: {e}]"

def run_cmd(cmd):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=BASE, timeout=120, encoding="utf-8", errors="replace")
        return result.stdout + result.stderr
    except Exception as e:
        return str(e)

def main():
    lines = []
    lines.append("# M4 第五轮审查包 (Source Bundle v5)")
    lines.append(f"\n> 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("> 本包针对 GPT-5.6 第四轮审核结论的整改回复\n")

    # ═══════════════════════════════════════════════════════════════
    # 1. Git 证据
    # ═══════════════════════════════════════════════════════════════
    lines.append("\n---\n\n## 1. Git 证据\n")
    lines.append("### git log --oneline -5")
    lines.append("```")
    lines.append(run_cmd("git log --oneline -5").strip())
    lines.append("```\n")

    lines.append("### git status --short")
    lines.append("```")
    status = run_cmd("git status --short").strip()
    lines.append(status if status else "(working tree clean)")
    lines.append("```\n")

    lines.append("### git show --stat HEAD")
    lines.append("```")
    lines.append(run_cmd("git show --stat HEAD").strip())
    lines.append("```\n")

    # ═══════════════════════════════════════════════════════════════
    # 2. 后端编译输出
    # ═══════════════════════════════════════════════════════════════
    lines.append("\n---\n\n## 2. 后端编译输出\n")
    lines.append("```")
    lines.append(run_cmd('cd EngineeringManager.Api && dotnet build 2>&1').strip())
    lines.append("```\n")

    # ═══════════════════════════════════════════════════════════════
    # 3. 后端测试输出
    # ═══════════════════════════════════════════════════════════════
    lines.append("\n---\n\n## 3. 后端测试输出\n")
    lines.append("```")
    test_output = run_cmd('cd EngineeringManager.Tests && dotnet test --filter "FullyQualifiedName~M4" 2>&1')
    lines.append(test_output.strip())
    lines.append("```\n")

    # ═══════════════════════════════════════════════════════════════
    # 4. 前端测试输出
    # ═══════════════════════════════════════════════════════════════
    lines.append("\n---\n\n## 4. 前端测试输出\n")
    lines.append("```")
    lines.append(run_cmd('npx vitest run src/components/features/knowledge/__tests__/ src/components/features/agent/__tests__/KnowledgeSourceCard.test.tsx 2>&1').strip())
    lines.append("```\n")

    # ═══════════════════════════════════════════════════════════════
    # 5. 核心前端组件源码（6 个之前缺失的）
    # ═══════════════════════════════════════════════════════════════
    frontend_components = [
        "src/components/features/knowledge/TranscriptionWorkspace.tsx",
        "src/components/features/knowledge/AudioUploadCard.tsx",
        "src/components/features/knowledge/TranscriptEditor.tsx",
        "src/components/features/knowledge/SttJobList.tsx",
        "src/components/features/knowledge/KnowledgeLibrary.tsx",
        "src/components/features/knowledge/KnowledgeDocumentDrawer.tsx",
        "src/components/features/knowledge/SpeechKnowledgePage.tsx",
        "src/components/features/knowledge/knowledgeTextMask.ts",
    ]

    lines.append("\n---\n\n## 5. 核心前端组件源码\n")
    for path in frontend_components:
        lines.append(f"\n### `{path}`\n")
        lines.append(f"```tsx\n{read_file(path)}\n```\n")

    # ═══════════════════════════════════════════════════════════════
    # 6. 前端 API 客户端
    # ═══════════════════════════════════════════════════════════════
    frontend_services = [
        "src/services/stt-client.ts",
        "src/services/knowledge-client.ts",
    ]
    lines.append("\n---\n\n## 6. 前端 API 客户端\n")
    for path in frontend_services:
        lines.append(f"\n### `{path}`\n")
        lines.append(f"```typescript\n{read_file(path)}\n```\n")

    # ═══════════════════════════════════════════════════════════════
    # 7. 后端端点源码
    # ═══════════════════════════════════════════════════════════════
    backend_endpoints = [
        "EngineeringManager.Api/Endpoints/SttEndpoints.cs",
        "EngineeringManager.Api/Endpoints/KnowledgeEndpoints.cs",
    ]
    lines.append("\n---\n\n## 7. 后端端点源码\n")
    for path in backend_endpoints:
        lines.append(f"\n### `{path}`\n")
        lines.append(f"```csharp\n{read_file(path)}\n```\n")

    # ═══════════════════════════════════════════════════════════════
    # 8. 后端安全和服务
    # ═══════════════════════════════════════════════════════════════
    backend_security = [
        "EngineeringManager.Api/Security/CurrentUser.cs",
        "EngineeringManager.Api/Services/Stt/SttModels.cs",
        "EngineeringManager.Api/Services/Stt/SpeakerLabelNormalizer.cs",
        "EngineeringManager.Api/Program.cs",
    ]
    lines.append("\n---\n\n## 8. 后端安全和服务\n")
    for path in backend_security:
        lines.append(f"\n### `{path}`\n")
        lines.append(f"```csharp\n{read_file(path)}\n```\n")

    # ═══════════════════════════════════════════════════════════════
    # 9. 测试文件
    # ═══════════════════════════════════════════════════════════════
    test_files = [
        "EngineeringManager.Tests/Endpoints/M4ThirdRoundTests.cs",
        "EngineeringManager.Tests/Endpoints/M4SttUploadAndIngestTests.cs",
        "src/components/features/knowledge/__tests__/SpeechKnowledgePage.test.tsx",
        "src/components/features/knowledge/__tests__/TranscriptEditor.rebuild.test.ts",
        "src/components/features/knowledge/__tests__/knowledge-client.contract.test.ts",
        "src/components/features/knowledge/__tests__/stt-client.contract.test.ts",
        "src/components/features/knowledge/__tests__/sessionStorage-pendingDoc.test.ts",
        "src/components/features/knowledge/__tests__/knowledgeTextMask.test.ts",
        "src/components/features/agent/__tests__/KnowledgeSourceCard.test.tsx",
    ]
    lines.append("\n---\n\n## 9. 测试文件源码\n")
    for path in test_files:
        lines.append(f"\n### `{path}`\n")
        ext = "tsx" if path.endswith(".tsx") else ("ts" if path.endswith(".ts") else "csharp")
        lines.append(f"```{ext}\n{read_file(path)}\n```\n")

    # ═══════════════════════════════════════════════════════════════
    # 10. Agent 来源卡片
    # ═══════════════════════════════════════════════════════════════
    lines.append("\n---\n\n## 10. Agent 来源卡片\n")
    lines.append(f"\n### `src/components/features/agent/KnowledgeSourceCard.tsx`\n")
    lines.append(f"```tsx\n{read_file('src/components/features/agent/KnowledgeSourceCard.tsx')}\n```\n")

    # ═══════════════════════════════════════════════════════════════
    # 11. 迁移脚本
    # ═══════════════════════════════════════════════════════════════
    migrations = [
        "EngineeringManager.Api/Migrations/Scripts/028_AddSpeechToText.sql",
        "EngineeringManager.Api/Migrations/Scripts/029_AddKnowledgeBase.sql",
        "EngineeringManager.Api/Migrations/Scripts/030_AddKnowledgeDocUniqueIndex.sql",
    ]
    lines.append("\n---\n\n## 11. 迁移脚本\n")
    for path in migrations:
        lines.append(f"\n### `{path}`\n")
        lines.append(f"```sql\n{read_file(path)}\n```\n")

    # ═══════════════════════════════════════════════════════════════
    # 12. 整改对照表
    # ═══════════════════════════════════════════════════════════════
    lines.append("\n---\n\n## 12. 第四轮审核整改对照表\n")
    lines.append("""
| # | 审核问题 | 整改措施 | 证据 |
|---|---------|---------|------|
| 1 | 后端按 segment.Text 换行拼接，与前端 `【说话人N】文本` 格式冲突 | 后端重组逻辑改为 `string.Join("\\n", segments.Select(s => $"【说话人{s.Speaker}】{s.Text.Trim()}"))` | SttEndpoints.cs L414-420, TranscriptEditor.rebuild.test.ts 7 tests |
| 2 | 缺少 6 个核心前端组件源码 | 审查包包含 TranscriptionWorkspace, AudioUploadCard, TranscriptEditor, SttJobList, KnowledgeLibrary, KnowledgeDocumentDrawer 完整源码 | 本包第 5 节 |
| 3 | 上传中断测试在 PostAsync 前执行 cts.Cancel() | 改用 `cts.CancelAfter(200ms)` + `SlowStreamContent` 慢速流（每 1KB 延时 1ms），确保请求到达服务端后仍在传输中被取消 | M4ThirdRoundTests.cs `UploadAudio_CancelledMidStream_CleansUpTempFile` |
| 4 | sessionStorage 测试只是手工复制逻辑 | 新增 `SpeechKnowledgePage.test.tsx`（15 tests），真实渲染 SpeechKnowledgePage 组件，验证 sessionStorage 消费、Tab 切换、openDocId 传递 | SpeechKnowledgePage.test.tsx |
| 5 | Git HEAD 仍是 M3 的 fba841fe | 新 commit `dcf2880`，64 files changed, 13274 insertions | git log, git show --stat |
| 6 | 缺少 XSS 防护测试 | 新增 3 个 XSS 测试：fullText 恶意 HTML、chunk text 恶意 HTML、title 恶意 HTML，验证 React 自动转义 | SpeechKnowledgePage.test.tsx XSS prevention suite |
| 7 | 缺少 MaskContext 脱敏测试 | 新增 4 个脱敏测试：手机号、身份证、银行卡、masked=false 对照 | SpeechKnowledgePage.test.tsx MaskContext integration suite |
| 8 | 缺少 TranscriptEditor rebuild 契约测试 | 新增 `TranscriptEditor.rebuild.test.ts`（7 tests），验证前端 rebuildFullText 与后端重组格式完全一致 | TranscriptEditor.rebuild.test.ts |
""")

    # Write output
    output = "\n".join(lines)
    out_path = os.path.join(BASE, "M4_source_bundle.md")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(output)

    # SHA-256
    sha = hashlib.sha256(output.encode("utf-8")).hexdigest()
    print(f"M4_source_bundle.md generated successfully.")
    print(f"SHA-256: {sha}")
    print(f"Size: {len(output)} chars, {len(lines)} lines")

if __name__ == "__main__":
    main()
