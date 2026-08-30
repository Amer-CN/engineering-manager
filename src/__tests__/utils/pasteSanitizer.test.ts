/**
 * pasteSanitizer 单测（写作中心 P1：粘贴保真）
 *
 * - Word 实施工组样本端到端：标题/表格/加粗结构保留，class/style/mso 零残留
 * - 网页脏样本端到端：脏样式零残留，文字/列表/表格/链接/&nbsp;/br 保留
 * - 纯函数单元：script 整树丢弃、img 属性白名单、未知标签上提、空输入
 * - 性能：27KB Word 样本 < 50ms
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sanitizePastedHtml } from '../../utils/pasteSanitizer'

// vitest 模块运行器下 import.meta.url 指向 http://localhost，无法 fileURLToPath；
// 测试从项目根运行（cwd = 项目根），用相对根路径读 fixture
const fixtureDir = join(process.cwd(), 'src/__tests__/fixtures')
const wordHtml = readFileSync(join(fixtureDir, 'word-paste-sample.html'), 'utf-8')
const webHtml = readFileSync(join(fixtureDir, 'web-paste-sample.html'), 'utf-8')

describe('sanitizePastedHtml（Word 实施工组样本端到端）', () => {
  it('MsoHeading1 的 h1 保留，正文文字在', () => {
    const out = sanitizePastedHtml(wordHtml)
    expect(out).toMatch(/<h1[\s>]/)
    expect(out).toContain('施工组织设计')
    expect(out).toContain('河北灵寿抽水蓄能电站')
  })

  it('表格结构保留：table/tr/td 数量与源一致', () => {
    const out = sanitizePastedHtml(wordHtml)
    const count = (s: string, re: RegExp) => (s.match(re) ?? []).length
    expect(count(out, /<table/g)).toBe(count(wordHtml, /<table/g))
    expect(count(out, /<tr/g)).toBe(count(wordHtml, /<tr/g))
    expect(count(out, /<td/g)).toBe(count(wordHtml, /<td/g))
  })

  it('class/style/mso 零残留', () => {
    const out = sanitizePastedHtml(wordHtml)
    expect(out).not.toContain('class=')
    expect(out).not.toContain('style=')
    expect(out).not.toContain('mso-')
  })

  it('加粗保留', () => {
    const out = sanitizePastedHtml(wordHtml)
    expect(out).toMatch(/<(strong|b)(\s|>)/)
  })
})

describe('sanitizePastedHtml（网页脏样本端到端）', () => {
  it('嵌套 div 上提、零 class/style、clear:both 消失', () => {
    const out = sanitizePastedHtml(webHtml)
    expect(out).not.toMatch(/<div[\s>]/i)
    expect(out).not.toContain('class=')
    expect(out).not.toContain('style=')
  })

  it('span 颜色/背景剥除但文字保留，&nbsp; 与 br 保留', () => {
    const out = sanitizePastedHtml(webHtml)
    expect(out).toContain('重点建设项目')
    expect(out).toContain('50000平方米')
    expect(out).toContain('&nbsp;')
    expect(out).toMatch(/<br\s*\/?>/)
  })

  it('ul/li 与 table/th/td 保留', () => {
    const out = sanitizePastedHtml(webHtml)
    expect(out).toMatch(/<ul>/)
    expect(out).toMatch(/<li>/)
    expect(out).toMatch(/<th>/)
    expect(out).toMatch(/<td>/)
    expect(out).toMatch(/<table[\s>]/)
  })

  it('a href 保留、target 剥除', () => {
    const out = sanitizePastedHtml(webHtml)
    expect(out).toContain('href="https://example.com/some-page"')
    expect(out).not.toContain('target')
  })
})

describe('sanitizePastedHtml（纯函数单元）', () => {
  it('script 整树丢弃', () => {
    const out = sanitizePastedHtml('<p>安全</p><script>alert("x")</script><p>正文</p>')
    expect(out).toBe('<p>安全</p><p>正文</p>')
  })

  it('img 只留 src/alt，剥其余属性', () => {
    const out = sanitizePastedHtml('<img src="https://x/1.png" alt="现场图" width="100" class="photo" style="width:100px">')
    expect(out).toMatch(/^<img src="https:\/\/x\/1.png" alt="现场图"\/?>$/)
  })

  it('未知标签上提子节点', () => {
    const out = sanitizePastedHtml('<div><unknown-tag>内容<span>内层</span></unknown-tag>结尾</div>')
    expect(out).toBe('内容内层结尾')
  })

  it('空串 / 纯空白 → 空串', () => {
    expect(sanitizePastedHtml('')).toBe('')
    expect(sanitizePastedHtml('   ')).toBe('')
  })

  it('危险 URL 被剥除：javascript: 链接、SVG data URI 图片（防御纵深）', () => {
    const out = sanitizePastedHtml(
      '<p><a href="javascript:alert(1)">点我</a> <img src="data:image/svg+xml,<svg onload=alert(1)>"> <img src="https://ok.com/a.png" alt="图"></p>',
    )
    expect(out).toContain('点我')
    expect(out).not.toContain('javascript:')
    expect(out).not.toContain('svg+xml')
    expect(out).toContain('https://ok.com/a.png') // 合法图片 URL 保留
  })
})

describe('sanitizePastedHtml（性能）', () => {
  it('27KB Word 样本 < 200ms（宽松上限防 CI 抖动；本机热路径 ~25ms）', () => {
    const start = Date.now()
    sanitizePastedHtml(wordHtml)
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(200)
  })
})
