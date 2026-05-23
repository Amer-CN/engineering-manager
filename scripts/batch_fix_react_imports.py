#!/usr/bin/env python3
"""
从 tsc_errors.txt 读取错误，批量修复未使用的 React 导入
"""

import os
import re

# 读取错误文件，提取有未使用 React 导入的文件
def get_react_error_files(error_file):
    files = set()
    with open(error_file, 'r', encoding='utf-8') as f:
        for line in f:
            # 匹配: src/...tsx(line,col): error TS6133: 'React' is declared but its value is never read
            if "'React' is declared but its value is never read" in line:
                # 提取文件路径（冒号前的部分）
                file_path = line.split('(')[0].strip()
                if file_path:
                    files.add(file_path)
    return list(files)

# 检查文件是否使用了 React 命名空间
def uses_react_namespace(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查是否使用了 React. 命名空间（排除以 import 开头的行）
        lines = content.split('\n')
        for line in lines:
            if line.strip().startswith('import'):
                continue
            if re.search(r'\bReact\.', line):
                return True
        return False
    except:
        return True  # 读取失败，保守处理

# 移除文件中的 React 导入
def remove_react_import(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # 移除： import React from 'react'
        content = re.sub(
            r"^\s*import\s+React\s+from\s+['\"]react['\"]\s*;\n?",
            '',
            content,
            flags=re.MULTILINE
        )
        
        # 移除： import * as React from 'react'
        content = re.sub(
            r"^\s*import\s+\*\s+as\s+React\s+from\s+['\"]react['\"]\s*;\n?",
            '',
            content,
            flags=re.MULTILINE
        )
        
        # 转换： import React, { ... } from 'react' -> import { ... } from 'react'
        content = re.sub(
            r"^\s*import\s+React,\s*(\{[^}]+\})\s+from\s+['\"]react['\"]\s*;\n*",
            r"import \1 from 'react';",
            content,
            flags=re.MULTILINE
        )
        
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"    ✗ 错误: {e}")
        return False

def main():
    error_file = 'E:/测试/tsc_errors.txt'
    
    if not os.path.exists(error_file):
        print(f"错误文件不存在: {error_file}")
        return
    
    print("🔍 解析 TypeScript 错误...")
    files = get_react_error_files(error_file)
    print(f"找到 {len(files)} 个文件有未使用的 React 导入\n")
    
    if not files:
        print("✓ 没有找到未使用的 React 导入")
        return
    
    removed = 0
    skipped = 0
    failed = 0
    
    for file in files:
        full_path = os.path.join('E:/测试', file) if not os.path.isabs(file) else file
        
        if not os.path.exists(full_path):
            print(f"  ⚠ 文件不存在: {file}")
            skipped += 1
            continue
        
        if uses_react_namespace(full_path):
            print(f"  ⚠ 跳过（使用 React 命名空间）: {file}")
            skipped += 1
            continue
        
        if remove_react_import(full_path):
            print(f"  ✓ 已修复: {file}")
            removed += 1
        else:
            print(f"  ⚠ 无需修改: {file}")
            skipped += 1
    
    print(f"\n📊 完成: {removed} 个文件已修复, {skipped} 个跳过, {failed} 个失败")
    print("\n⚠️  注意: 请运行 TypeScript 编译验证修复结果")

if __name__ == '__main__':
    main()
