# I 窗口测试审查（M-FIX6 V1(b)，只登记不改）

## 审查范围
- ReceiptMatchTests.cs（I-2 新增，11 个 [Fact/Theory]）
- WritePermissionB1Tests.cs（I-1 新增，23 个 [Fact/Theory]）

## 发现
1. **恒真/无正向对照**：ReceiptMatchTests 的 DoesNotContain（:134/:179/:180）**均有配套正向**（:181 Contains("张三")）——非恒真。WritePermissionB1Tests 未发现裸 DoesNotContain/Assert.NotNull 当正向。
2. **confirm-matches 越权覆盖缺口**：有 worker 403（:343）+ 缺字段 400（:325）——但**无「manager/其他角色对未授权项目回单确认」的越权用例**。confirm-matches 是写端点（wages:update），应验证：manager 对已授权项目回单能确认、对未授权项目回单被拒（0 行/403）。当前只测了 worker 全拒——**未授权项目场景缺失**。
3. **登记**：不修（I 窗口代码不动），列入 R9 测试补全清单。

## 修复归属
R9：补 confirm-matches 的「未授权项目确认」用例（正向：授权项目可确认；反向：未授权项目被拒）。
