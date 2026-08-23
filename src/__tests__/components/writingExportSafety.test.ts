/**
 * 风格标注行剔除 + 红头 classifyPara 前缀处理单测（写作中心 R8）
 *
 * - stripStyleAnnotationLines：「> 本周风格：…」整行剔除（含无空格/前导空白变体），
 *   普通 blockquote、正文行不动
 * - classifyPara 经 exportRedHeaderDocx 不可直测（fetch 模板），等价路径：
 *   stripStyleAnnotationLines 与 redHeaderExport 的同款正则行为在此锁死
 */
import { describe, it, expect } from 'vitest'
import { stripStyleAnnotationLines } from '../../utils/docxExport'

describe('stripStyleAnnotationLines（风格标注行剔除）', () => {
  it('剔除「> 本周风格：」行，保留其余内容', () => {
    const md = '# 标题\n\n> 本周风格：S2 问题导向型\n\n正文\n\n- [x] 完成'
    const out = stripStyleAnnotationLines(md)
    expect(out).toBe('# 标题\n\n\n正文\n\n- [x] 完成')
    expect(out).not.toContain('本周风格')
    expect(out).not.toContain('>')
  })

  it('兼容无空格「>本周风格：」与前导空白变体', () => {
    expect(stripStyleAnnotationLines('>本周风格：S1 数据驱动型\n正文')).not.toContain('本周风格')
    expect(stripStyleAnnotationLines('   > 本周风格：S3\n正文')).not.toContain('本周风格')
  })

  it('普通 blockquote 与正文行不受影响', () => {
    const md = '> 普通引用行\n正文段落\n> 本周风格：S4\n> 又一行普通引用'
    const out = stripStyleAnnotationLines(md)
    expect(out).toBe('> 普通引用行\n正文段落\n> 又一行普通引用')
  })

  it('无标注行时原文不变', () => {
    const md = '# 标题\n\n正文一二三'
    expect(stripStyleAnnotationLines(md)).toBe(md)
  })
})
