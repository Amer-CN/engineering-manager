#!/usr/bin/env python3
"""
自动移除未使用的 React 导入
基于 TypeScript 错误输出，安全地移除未使用的 React 导入
"""

import os
import re
import subprocess
import sys

def get_unused_react_files():
    """运行 tsc 获取未使用 React 导入的文件列表"""
    result = subprocess.run(
        ['npx', 'tsc', '--noEmit'],
        capture_output=True,
        text=True,
        cwd='E:/测试'
    )
    
    files = set()
    for line in result.stdout.split('\n'):
        # 匹配错误格式: src/file.tsx(line,col): error TS6133: 'React' is declared but its value is never read
        match = re.match(r"src/.*\.tsx\(\d+,\d+\): error TS6133: 'React' is declared but its value is never read", line)
        if match:
            # 提取文件名
            file_path = line.split('(')[0]
            files.add(file_path)
    
    return list(files)

def uses_react_namespace(file_path):
    """检查文件是否使用了 React 命名空间（如 React.FC, React.ReactNode）"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查是否使用了 React. 命名空间
        # 排除以 import 开头的行
        lines = content.split('\n')
        for line in lines:
            if line.strip().startswith('import'):
                continue
            if re.search(r'\bReact\.', line):
                return True
        return False
    except:
        return True  # 如果读取失败，保守处理

def remove_react_import(file_path):
    """移除文件中的 React 导入"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 移除各种形式的 React 导入
        # import React from 'react'
        content = re.sub(r"^\s*import\s+React\s+from\s+['\"]react['\"]\s*;?\s*$\n?", '', content, flags=re.MULTILINE)
        
        # import * as React from 'react'
        content = re.sub(r"^\s*import\s+\*\s+as\s+React\s+from\s+['\"]react['\"]\s*;?\s*$\n?", '', content, flags=re.MULTILINE)
        
        # import React, { ... } from 'react' -> import { ... } from 'react'
        content = re.sub(r"^\s*import\s+React,\s*(\{[^}]+\})\s+from\s+['\"]react['\"]\s*;?\s*$\n?", r"import \1 from 'react';\n", content, flags=re.MULTILINE)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"  ✗ 错误: {e}")
        return False

def main():
    print("🔍 检查未使用的 React 导入...")
    files = get_unused_react_files()
    print(f"找到 {len(files)} 个文件有未使用的 React 导入\n")
    
    if not files:
        print("✓ 没有找到未使用的 React 导入")
        return
    
    removed = 0
    skipped = 0
    
    for file in files:
        full_path = os.path.join('E:/测试', file)
        if not os.path.exists(full_path):
            print(f"  ⚠ 文件不存在: {file}")
            skipped += 1
            continue
        
        if uses_react_namespace(full_path):
            print(f"  ⚠ 跳过（使用 React 命名空间）: {file}")
            skipped += 1
            continue
        
        if remove_react_import(full_path):
            print(f"  ✓ 已移除: {file}")
            removed += 1
        else:
            print(f"  ⚠ 无需修改: {file}")
            skipped += 1
    
    print(f"\n📊 完成: {removed} 个文件已修复, {skipped} 个文件跳过")
    print("\n⚠ 注意: 请运行 TypeScript 编译验证修复结果")

if __name__ == '__main__':
    main()
