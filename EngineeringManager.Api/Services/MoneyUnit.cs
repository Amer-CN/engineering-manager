namespace EngineeringManager.Api;

/// <summary>
/// 金额单位换算单点（2026-09 分制契约）：
///   · DB = 分（整数值）；API = 元（double，前端契约不变）
///   · 全项目禁止在本类之外散写 ×100 / ÷100（含 SQL 表达式）
///   · 历史 ToFen 实验（v0.93~0.96 仅 wages 模块执行）造成的分制行由迁移 051 按行修复
/// </summary>
public static class MoneyUnit
{
    /// <summary>元 → 分（四舍五入到分，不用 CAST 截断——审计 D-13 教训）</summary>
    public static long ToFen(double yuan) => (long)Math.Round(yuan * 100);

    /// <summary>元（可空）→ 分（可空）</summary>
    public static long? ToFen(double? yuan) => yuan.HasValue ? (long)Math.Round(yuan.Value * 100) : null;

    /// <summary>元（decimal 可空，前端 JSON 金额）→ 分（可空）</summary>
    public static long? ToFen(decimal? yuan) => yuan.HasValue ? (long)Math.Round(yuan.Value * 100) : null;

    /// <summary>分 → 元</summary>
    public static double ToYuan(long fen) => fen / 100.0;

    /// <summary>分（可空）→ 元（可空）</summary>
    public static double? ToYuan(long? fen) => fen.HasValue ? fen.Value / 100.0 : null;

    /// <summary>分 → 元（decimal 精确十进制，供既有显示/比对路径使用）</summary>
    public static decimal ToYuanDecimal(long fen) => fen / 100m;

    /// <summary>DB 取出的金额值（long 或 REAL 列存整数值时的 double）→ 元。
    /// 历史库列亲和性可能是 REAL（存整数值的 double），先归一到分再换算。</summary>
    public static double ToYuanFromDb(object? v) => v == null || v == DBNull.Value ? 0 : Convert.ToDouble(v) / 100.0;

    /// <summary>批量查询行：把指定金额列（分）转成元后输出（GET 列表端点用，
    /// 与 WageEndpoints.ToYuanRows 同构；moneyCols 之外的列原样保留）。</summary>
    public static IDictionary<string, object?>[] ToYuanRows(IEnumerable<dynamic> rows, params string[] moneyCols)
    {
        return rows.Select(r =>
        {
            var d = (IDictionary<string, object?>)r;
            foreach (var k in moneyCols)
                if (d.TryGetValue(k, out var v) && v != null && !(v is DBNull))
                    d[k] = Convert.ToDouble(v) / 100.0;
            return d;
        }).ToArray();
    }
}
