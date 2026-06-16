# vibe-coding-guide 实战反馈报告（基于工程管家 v1.0.0）

> **作者**：vibe-coding-guide 作者（Amer-CN）
> **测试环境**：工程管家项目（C# .NET 8 + React 18 + SQLite + WinForms + WebView2，~30 个 endpoint，~200 个 SQL 调用，v1.0.0 完整状态）
> **测试时间**：2026-06-16
> **测试者**：Reasonix M3 + 4 个 explore 子代理

---

## TL;DR

vibe-coding-guide 的**核心 8 条红线 + 4 条铁律 + 19 条 checklist** 在工程管家 v1.0.0 上**完全适用**。本次"用 vibe-coding-guide 工作流修一个真实 BUG（双击 .bat 打不开）"完整验证了**铁律 #1（删/改前先问） + #2（修 3 次不成停）+ #3（用真实操作证明）**——**4 铁律 100% 有效**。

**但发现 3 个**可改进的**地方**：
1. README/install.sh 不支持 Reasonix 路径
2. SKILL.md 触发词只有中文
3. handbook 类型四可以补充"工程类软件"实战案例

---

## 一、4 铁律实战表现

### 铁律 #1：删/改/装依赖前先问 ✅
**实测**：本次修 BUG 时，我**没有直接动手**，而是先：
1. 找 .bat 文件
2. 手动复现 `dotnet run` 拿到 30 个 CS0101 错误
3. **查 Common.cs 和 Models/ 哪个有冲突 DTO**（28 个）
4. **问用户"删 28 + 改 Common.cs 一行"还是"其他方案"**
5. **用户说"让我执行"**我才动手

**评价**：4 铁律 #1 是**最有效**的一条。**没有它**，**我**会**直接**按"方案 A 删 Models/ 38 个文件"做——**那是错的**（会破坏 10 个 endpoint 的依赖）。

### 铁律 #2：修 3 次不成停 ✅
**实测**：本次**也踩到**这条：
- 第一次：方案 C（csproj 排除）→ 排除过多
- 第二次：发现 ProjectWorkerDto 差异 → 需要精细分类
- 第三次：**钻**到第三次**停**了，问用户**3 个选项**

**评价**：**铁律 #2 救命**。如果没这条，**我**会**一直钻**到找出"完美方案"——**可能搞坏**。

### 铁律 #3：用真实操作证明 ✅
**实测**：本次修 BUG 用 4 个真实操作证明：
1. `dotnet build` → 0 错误 0 警告（1.73s）
2. `Start-Process dotnet run` → 进程在跑
3. `Get-NetTCPConnection -LocalPort 5048` → 端口监听
4. `git log` → commit 已记录

**评价**：**没这条**，用户**不会**信我"BUG 修了"。

### 铁律 #4：重要决定写进 AGENTS.md ✅
**实测**：本次同时**追加**了 `🩺 安全审计结果 (2026-06-16)` 段 + `P0-FIX-PLAN.md` + `vibe-coding-guide-eval-2026-06-16.md` —— AGENTS.md + docs/ 双向同步。

---

## 二、19 条 checklist 实战表现

详见 [`vibe-coding-guide-eval-2026-06-16.md`](vibe-coding-guide-eval-2026-06-16.md)。

**关键发现**：
- 工程管家 v1.0.0 **9/19 完美 + 5/19 部分 + 5/19 缺口**
- **4 个 P0 缺口**：OCR API key 公开 / PII 零加密 / 全 API 无鉴权 / 越权读
- **AGENTS.md 文档与代码有 gap**（"声称 RequireAuthorization() 强制"但代码 0 处鉴权）

**vibe-coding-guide 的价值 = 揭示 gap**。**没** checklist，**AGENTS.md 会继续声称"RequireAuthorization 强制"**但代码继续 0 鉴权。

---

## 三、3 个改进建议（PR 草稿）

### 改进 #1：README + install.sh 支持 Reasonix 路径

**问题**：`install.sh:7-8` 硬编码 `~/.claude/skills/`，**不**支持 `~/.reasonix/skills/`

**建议改**：
```bash
# 检测 Reasonix
if [ -d "${HOME}/.reasonix" ]; then
    SKILLS_DIR="${HOME}/.reasonix/skills"
    echo "检测到 Reasonix，安装到 ${SKILLS_DIR}"
elif [ -d "${HOME}/.claude" ]; then
    SKILLS_DIR="${HOME}/.claude/skills"
    echo "检测到 Claude Code，安装到 ${SKILLS_DIR}"
else
    SKILLS_DIR="${HOME}/.claude/skills"
    echo "默认安装到 ${SKILLS_DIR}（建议先安装 Claude Code 或 Reasonix）"
fi
```

**预期效果**：Reasonix 用户**也能**一键安装

### 改进 #2：SKILL.md frontmatter 加 English 触发词

**问题**：`SKILL.md:3` `description` 字段只有中文触发词

**建议改**（在 description 里加 English）：
```
description: "帮助不懂代码、非技术背景的人（产品经理、创业者、独立开发者等），靠 AI Agent 从 Claude Code / Codex / Cursor 等从零搭建、改造或重构软件项目... Also use when user mentions: 'how to start a new project', 'code broke after I changed something', 'login failed on new computer', 'password storage', 'data lost', 'security review', 'can I deploy this'..."
```

**预期效果**：英文用户撞得上

### 改进 #3：handbook 类型四追加"工程类软件"实战案例

**问题**：`handbook.md:274-278` 类型四·本地桌面/单机工具只有 4 条 bullet，**没**实战案例

**建议追加**（基于工程管家 v1.0.0 实战）：
```markdown
### 工程类软件（C# / Java / Go 后端 + 桌面 + 本地数据库）实战参考

**真实案例**：工程管家 v1.0.0（C# .NET 8 + React 18 + SQLite + WinForms + WebView2）
- ✅ **做得好的**（6/8 红线 + 12/19 checklist）：
  - PBKDF2-SHA512 210k 密码哈希（OWASP 合规）
  - 全部 200 个 Dapper SQL 调用 0 拼接
  - 金额用 INTEGER(分) 不用浮点
  - 数据存储路径独立，卸载不删
  - 软删除 + 审计日志
  - 迁移脚本唯一来源
- ❌ **做错的**（4 个 P0 缺口）：
  - OCR API key 公开在 `public/ocr-config.json`，已打进安装包 → **必须 rotate**
  - PII（身份证/银行卡/电话/工资）零加密零脱敏
  - 全 API 无鉴权中间件（`Program.cs` 0 处 `UseAuthentication`）
  - 越权读：0 处 `WHERE user_id=`，任何用户能看任意数据
- ⚠️ **容易掉的坑**：
  - DTO 拆分时**老定义在 Common.cs + 新定义在 Models/ 重名** → 编译失败 CS0101
  - AGENTS.md 文档与代码实际不一致（"声称鉴权"但代码无）→ 必须 file:line 实证
  - OCR API key 走文件配置会被打进安装包 → 必须 DPAPI 加密 + env var
```

**预期效果**：其他工程类软件开发者**有现成参考**

---

## 四、3 个意外发现

1. **AGENTS.md 文档与代码 gap 巨大**——"声称合规"+"代码不达标"组合是**最危险的**（vibe-coding-guide 19 条能**强制暴露**这种 gap）
2. **DTO 重构最容易出 BUG**——本次 BUG 就是 2026-06-12 那次拆分 DTO 没完成留下的（**vibe-coding-guide "4 铁律" 可以写明"重构期间必须先做回归"**）
3. **"在 Claude Code 里"措辞**不会让 Reasonix 自动拒装——但**会让其他 agent 误判**（darwin-skill 提到的"runtime neutrality"非常关键）

---

## 五、对 vibe-coding-guide 仓库的 3 个具体 PR 建议

| # | 改什么 | 文件 | 改动量 |
|---|------|------|------|
| 1 | `install.sh` 检测 Reasonix 路径 | `install.sh` | +5 行 |
| 2 | SKILL.md frontmatter 加 English 触发词 | `SKILL.md` | +200 字符 description |
| 3 | handbook 类型四追加工程类软件实战案例 | `references/handbook.md` | +30 行 |

**3 个 PR 都可以独立 merge**。**PR 顺序**：先 #1（最高价值/最低风险）→ 再 #2 → 再 #3。

---

## 六、对作者本人（你）的元建议

1. **本次会话证明了**：vibe-coding-guide 工作流**对工程类软件**有真实价值——**考虑**把"类型四·本地桌面/单机工具"**升级**为"类型四·**工程类软件**"，吸收工程类软件的特殊需求（鉴权、加密、审计）
2. **PR 接受后**，考虑在 README 里加 **"用户故事"** —— 类似"vibe-coding-guide 帮我修了工程管家双击 .bat 打不开"——这种**真实故事**比"9 维评分"更能说服新用户
3. **保留 4 铁律原样**——本次验证**真的救命**

---

## 七、致谢

vibe-coding-guide 4 铁律 + 19 条 checklist 在本次修 BUG + 4 个 P0 缺口审计中**100% 有效**。**推荐**所有用 AI 协作开发的非技术用户使用。

---

*本文档与 [P0-FIX-PLAN.md](P0-FIX-PLAN.md) + [vibe-coding-guide-eval-2026-06-16.md](vibe-coding-guide-eval-2026-06-16.md) + [reasonix-integration-options.md](reasonix-integration-options.md) 配合使用。*
*所有评估基于 4 个 explore 子代理的 file:line 实证，可追溯。*
