#!/usr/bin/env python3
"""
从 tsc_errors.txt 解析错误并自动修复未使用的导入
"""

import os
import re

def parse_errors(error_file):
    """解析错误文件，返回 {file_path: [error_lines]}"""
    errors_by_file = {}
    
    with open(error_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or not line.startswith('src/'):
                continue
            
            # 解析错误格式: src/file.tsx(line,col): error TSxxxx: message
            match = re.match(r'(src/[^:]+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)', line)
            if match:
                file_path = match.group(1)
                line_num = int(match.group(2))
                col_num = int(match.group(3))
                error_code = match.group(4)
                message = match.group(5)
                
                if file_path not in errors_by_file:
                    errors_by_file[file_path] = []
                errors_by_file[file_path].append({
                    'line': line_num,
                    'col': col_num,
                    'code': error_code,
                    'message': message
                })
    
    return errors_by_file

def fix_unused_react_import(file_path):
    """修复未使用的 React 导入"""
    full_path = os.path.join('E:/测试', file_path)
    
    if not os.path.exists(full_path):
        return False, "文件不存在"
    
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        original_lines = lines.copy()
        
        # 检查是否使用了 React 命名空间
        content = ''.join(lines)
        uses_react_namespace = bool(re.search(r'\bReact\.', content))
        
        if uses_react_namespace:
            return False, "使用了 React 命名空间"
        
        # 移除 React 导入
        new_lines = []
        for line in lines:
            stripped = line.strip()
            # import React from 'react'
            if re.match(r"^\s*import\s+React\s+from\s+['\"]react['\"]", stripped):
                continue
            # import * as React from 'react'
            if re.match(r"^\s*import\s+\*\s+as\s+React\s+from\s+['\"]react['\"]", stripped):
                continue
            # import React, { ... } from 'react' -> import { ... } from 'react'
            match = re.match(r"^\s*import\s+React,\s*(\{[^}]+\})\s+from\s+['\"]react['\"].*", stripped)
            if match:
                new_lines.append(line.replace('React, ', ''))
                continue
            new_lines.append(line)
        
        if new_lines != original_lines:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            return True, "已移除 React 导入"
        
        return False, "无需修改"
        
    except Exception as e:
        return False, f"错误: {str(e)}"

def fix_unused_type_import(file_path, error):
    """修复未使用的类型导入 - 添加 'type' 关键字"""
    # TS6196: 'X' is declared but never used -> 应该改为 import type
    # 这个比较复杂，暂时跳过
    return False, "跳过类型导入修复"

def fix_unused_local(file_path, error):
    """修复未使用的局部变量 - 前缀加 _"""
    # TS6133: 'X' is declared but its value is never read
    # 这个需要修改变量名，比较复杂，暂时跳过
    return False, "跳过局部变量修复"

def main():
    error_file = 'E:/测试/tsc_errors.txt'
    
    if not os.path.exists(error_file):
        print(f"错误文件不存在: {error_file}")
        return
    
    print("🔍 解析 TypeScript 错误...")
    errors_by_file = parse_errors(error_file)
    
    print(f"找到 {len(errors_by_file)} 个文件有错误\n")
    
    # 先修复未使用的 React 导入
    react_files = []
    for file_path, errors in errors_by_file.items():
        for error in errors:
            if error['code'] == 'TS6133' and "React'" in error['message']:
                react_files.append(file_path)
                break
    
    print(f"📝 修复未使用的 React 导入 ({len(react_files)} 个文件)...")
    fixed = 0
    skipped = 0
    
    for file_path in react_files:
        success, msg = fix_unused_react_import(file_path)
        if success:
            print(f"  ✓ {file_path}: {msg}")
            fixed += 1
        else:
            print(f"  ⚠ {file_path}: {msg}")
            skipped += 1
    
    print(f"\n📊 完成: {fixed} 个文件已修复, {skipped} 个文件跳过")
    print("\n⚠️  注意: 还有大量其他错误需要手动修复")
    print("   建议: 逐步修复，或禁用 noUnusedLocals 待后续处理")

if __name__ == '__main__':
    main()
