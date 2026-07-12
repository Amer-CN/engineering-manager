#!/usr/bin/env python3
"""
M4 第六轮审查包（改动文件版）
只包含本轮改动的文件 + git 证据 + 测试输出
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
    lines.append("# M4 第六轮审查包（改动文件版）")
    lines.append(f"\n> 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("> 本包针对 GPT-5.6 第五轮审核结论的整改回复\n")

    # Git 证据
    lines.append("\n---\n\n## Git 证据\n")
    lines.append("### git log --oneline -3")
    lines.append("```")
    lines.append(run_cmd("git log --oneline -3").strip())
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

    # 测试输出
    lines.append("\n---\n\n## 测试结果\n")
    lines.append("### 后端 M4 测试 (35 tests)")
    lines.append("```")
    lines.append(run_cmd('cd EngineeringManager.Tests && dotnet test --filter "FullyQualifiedName~M4" 2>&1 | Select-String -Pattern "通过|失败|总计|M4").strip())
    lines.append("```\n")

    lines.append("### 前端测试 (60 tests)")
    lines.append("```")
    lines.append(run_cmd('npx vitest run src/components/features/knowledge/__tests__/ src/components/features/agent/__tests__/KnowledgeSourceCard.test.tsx 2>&1 | Select-String -Pattern "Test Files|Tests|通过|失败").strip())
    lines.append("```\n")

    # 改动文件
    changed_files = [
        "EngineeringManager.Tests/Endpoints/M4ThirdRoundTests.cs",
        "src/components/features/knowledge/TranscriptEditor.tsx",
    ]

    lines.append("\n---\n\n## 改动文件源码\n")
    for path in changed_files:
        lines.append(f"\n### `{path}`\n")
        ext = "csharp" if path.endswith(".cs") else "tsx"
        lines.append(f"```{ext}\n{read_file(path)}\n```\n")

    # 写入
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