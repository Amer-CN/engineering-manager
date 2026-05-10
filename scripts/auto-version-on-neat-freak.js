#!/usr/bin/env node
/**
 * auto-version-on-neat-freak.js
 * PostToolUse hook 包装脚本：从 stdin 读取 tool call JSON，
 * 仅当 skill 为 "neat-freak" 时才执行版本自动迭代。
 *
 * 版本级别自动判断（读取 CLAUDE.md "本次会话" 段落）：
 *   major — 架构重构、全面重设计、breaking change、数据模型重大变更
 *   minor — 新增模块/功能/系统/路由、独立模块
 *   patch — Bug修复、小优化、UI调整（默认，无特征时回退到此）
 *
 * 手动覆盖: AUTO_VERSION_LEVEL=minor node scripts/auto-version-on-neat-freak.js
 *
 * 用法（在 settings.json hooks 中）:
 *   "command": "node scripts/auto-version-on-neat-freak.js"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * 从 CLAUDE.md "本次会话" 段落提取变更条目，按关键词自动判定版本级别。
 * 判定优先级：环境变量 > major 特征 > minor 特征 > 统计启发 > patch 默认
 */
function detectLevel() {
  // 环境变量手动覆盖
  if (process.env.AUTO_VERSION_LEVEL) {
    const lv = process.env.AUTO_VERSION_LEVEL;
    if (['patch', 'minor', 'major'].includes(lv)) {
      console.log(`[auto-version] 环境变量覆盖 → ${lv}`);
      return lv;
    }
  }

  try {
    const claudeMdPath = path.join(ROOT, 'CLAUDE.md');
    const content = fs.readFileSync(claudeMdPath, 'utf-8');

    // 定位 "本次会话" 段落
    const sectionStart = content.indexOf('\n## 📋 本次会话');
    if (sectionStart === -1) {
      console.log('[auto-version] 未找到"本次会话"段落 → patch');
      return 'patch';
    }

    const contentStart = content.indexOf('\n', sectionStart + 1) + 1;
    let contentEnd = content.indexOf('\n## ', contentStart);
    if (contentEnd === -1) contentEnd = content.indexOf('\n---', contentStart);
    if (contentEnd === -1) contentEnd = content.length;

    const sectionText = content.slice(contentStart, contentEnd);

    // 提取变更条目（排除注释和占位符）
    const items = sectionText
      .split('\n')
      .filter(l => /^\s*- (?!- )/.test(l) && !l.includes('<!--'))
      .map(l => l.replace(/^\s*-\s*/, '').trim())
      .filter(l => l.length > 0 && !l.includes('本次会话暂无变更记录'));

    if (items.length === 0) {
      console.log('[auto-version] 无变更条目 → patch');
      return 'patch';
    }

    const fullText = items.join(' ');

    // ── Major 判断：架构级变更 ──
    const majorPatterns = [
      /架构重构/, /全面重设计/, /全面.*重构/, /彻底.*重构/,
      /breaking.change/i, /不兼容/, /底层改造/,
      /数据模型.*重大/, /推翻重(构|建|写)/, /大版本/,
      /整体.*架构/, /(技术栈|框架).*(升级|迁移|切换)/,
    ];
    for (const p of majorPatterns) {
      if (p.test(fullText)) {
        console.log(`[auto-version] major 特征: ${p} → major`);
        return 'major';
      }
    }

    // ── Minor 判断：新功能/模块 ──
    const minorPatterns = [
      /新增.*模块/, /新增.*功能/, /新增.*系统/, /新增.*页面/,
      /新.*模块/, /新.*系统/, /新.*路由/,
      /添加.*模块/, /新建.*页面/, /独立.*模块/,
      /模块.*独立/, /功能.*新增/,
      /(添|新)加.*(功能|组件|系统)/,
      /全新.*(页面|模块|功能)/, /新.*入口/,
      /重构(?!.*(?:架构|全面|彻底))/, // "重构"但不含"架构/全面/彻底" → minor
    ];
    for (const p of minorPatterns) {
      if (p.test(fullText)) {
        console.log(`[auto-version] minor 特征: ${p} → minor`);
        return 'minor';
      }
    }

    // ── 统计启发：多条重设计 → minor ──
    const redesignCount = (fullText.match(/重设计/g) || []).length;
    if (items.length >= 5 && redesignCount >= 2) {
      console.log('[auto-version] 5+ 变更 + 2+ 重设计 → minor');
      return 'minor';
    }

    // ── 默认 ──
    console.log('[auto-version] 无 major/minor 特征 → patch');
    return 'patch';

  } catch (e) {
    console.warn('[auto-version] 级别检测异常，回退 patch:', e.message);
    return 'patch';
  }
}

// ── 主流程 ──

let data = '';

const timer = setTimeout(() => {
  if (!data) process.exit(0);
}, 5000);

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { data += chunk; });
process.stdin.on('end', () => {
  clearTimeout(timer);
  try {
    const parsed = JSON.parse(data);
    const skill = parsed?.tool_input?.skill;
    if (skill === 'neat-freak') {
      const level = detectLevel();
      console.log(`[auto-version] neat-freak 触发 → ${level} 版本迭代`);
      execSync(`node "${path.join(ROOT, 'scripts', 'bump-version.js')}" ${level}`, {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env }
      });
    }
  } catch (e) {
    // JSON 解析失败或其他错误，静默忽略，不阻塞用户操作
  }
  process.exit(0);
});

process.stdin.on('error', () => {
  clearTimeout(timer);
  process.exit(0);
});
