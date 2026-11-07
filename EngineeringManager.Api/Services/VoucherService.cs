using System.Data;
using Dapper;
using EngineeringManager.Api.Services;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 凭证草稿（T6a）与过账（T6b）。
///
/// 金额全程 long 分；凭证号 记-YYYYMM-#### 由 [voucher_sequences] 按期间在同一事务内分配：
/// 先 INSERT ... ON CONFLICT DO UPDATE SET next_no=next_no+1，再 SELECT next_no-1。
/// 同一事务内天然串行；事务回滚时号段一并回滚（重复生成不会吃掉号）。
/// 过账即终态：不提供反过账；posted 行与分录的不可变由 071 触发器兜底。
/// </summary>
public static class VoucherService
{
    public sealed record DraftResult(long Id, string VoucherNo);

    public sealed record PostResult(long DebitFen, long CreditFen);

    /// <summary>分配本期凭证号（调用方必须传入已开启的事务）。</summary>
    public static string AllocateVoucherNo(IDbConnection db, IDbTransaction tx, string period)
    {
        if (string.IsNullOrWhiteSpace(period))
            throw new ArgumentException("凭证期间不能为空", nameof(period));

        db.Execute(
            @"INSERT INTO [voucher_sequences] ([period],[next_no]) VALUES (@Period,2)
              ON CONFLICT([period]) DO UPDATE SET [next_no]=[next_no]+1;",
            new { Period = period }, tx);

        var no = db.ExecuteScalar<long>(
            "SELECT [next_no]-1 FROM [voucher_sequences] WHERE [period]=@Period",
            new { Period = period }, tx);

        return $"记-{period}-{no:0000}";
    }

    /// <summary>
    /// 写入一张草稿凭证及其分录（调用方负责事务提交/回滚）。
    /// ux_vouchers_source 冲突（同一发票重复生成）由调用方捕获并转 400。
    /// </summary>
    public static DraftResult SaveDraft(
        IDbConnection db,
        IDbTransaction tx,
        long invoiceId,
        long? projectId,
        string templateCode,
        string period,
        string voucherDate,
        IReadOnlyList<VoucherTemplateService.PreviewLine> lines,
        string? createdBy)
    {
        if (lines.Count == 0)
            throw new ArgumentException("凭证分录不能为空", nameof(lines));

        var totalDebit = lines.Where(l => l.Dc == 1).Sum(l => l.AmountFen);
        var totalCredit = lines.Where(l => l.Dc == -1).Sum(l => l.AmountFen);
        if (totalDebit != totalCredit)
            throw new ArgumentException(
                $"凭证不平衡：借 {totalDebit / 100m:0.00} 元，贷 {totalCredit / 100m:0.00} 元", nameof(lines));

        var voucherNo = AllocateVoucherNo(db, tx, period);

        var voucherId = db.ExecuteScalar<long>(
            @"INSERT INTO [vouchers]
                ([voucher_no],[voucher_date],[period],[source_type],[source_id],[project_id],
                 [status],[template_code],[total_debit_fen],[total_credit_fen],[created_by])
              VALUES
                (@VoucherNo,@VoucherDate,@Period,'invoice',@SourceId,@ProjectId,
                 'draft',@TemplateCode,@TotalDebit,@TotalCredit,@CreatedBy);
              SELECT last_insert_rowid();",
            new
            {
                VoucherNo = voucherNo,
                VoucherDate = voucherDate,
                Period = period,
                SourceId = invoiceId,
                ProjectId = projectId,
                TemplateCode = templateCode,
                TotalDebit = totalDebit,
                TotalCredit = totalCredit,
                CreatedBy = createdBy
            }, tx);

        foreach (var line in lines)
        {
            db.Execute(
                @"INSERT INTO [voucher_entries]
                    ([voucher_id],[line_no],[dc],[account_code],[account_name],[summary],[amount_fen])
                  VALUES (@VoucherId,@LineNo,@Dc,@AccountCode,@AccountName,@Summary,@AmountFen)",
                new
                {
                    VoucherId = voucherId,
                    LineNo = line.LineNo,
                    Dc = line.Dc,
                    AccountCode = line.AccountCode,
                    AccountName = line.AccountName,
                    Summary = line.Summary,
                    AmountFen = line.AmountFen
                }, tx);
        }

        return new DraftResult(voucherId, voucherNo);
    }

    /// <summary>
    /// 过账（T6b）：校验分录合计后把 draft 置为 posted（调用方负责事务提交/回滚）。
    /// 过账即终态：不提供反过账；posted 行与分录的不可变由 071 触发器兜底。
    /// 并发：调用方必须用 IMMEDIATE 事务；UPDATE 再带 [status]='draft' 双保险。
    /// 失败抛 InvalidOperationException，由端点转 400。
    /// </summary>
    public static PostResult Post(
        IDbConnection db,
        IDbTransaction tx,
        long voucherId,
        long expectedDebitFen,
        long expectedCreditFen,
        string? postedBy,
        string postedAt)
    {
        var debit = db.ExecuteScalar<long>(
            "SELECT COALESCE(SUM([amount_fen]),0) FROM [voucher_entries] WHERE [voucher_id]=@Id AND [dc]=1",
            new { Id = voucherId }, tx);
        var credit = db.ExecuteScalar<long>(
            "SELECT COALESCE(SUM([amount_fen]),0) FROM [voucher_entries] WHERE [voucher_id]=@Id AND [dc]=-1",
            new { Id = voucherId }, tx);

        if (debit != credit)
            throw new InvalidOperationException(
                $"凭证借贷不平衡：借 {debit / 100m:0.00} 元，贷 {credit / 100m:0.00} 元，禁止过账");
        if (debit != expectedDebitFen || credit != expectedCreditFen)
            throw new InvalidOperationException("凭证分录合计与凭证表合计不一致，禁止过账");

        var affected = db.Execute(
            @"UPDATE [vouchers]
                 SET [status]='posted',[posted_at]=@PostedAt,[posted_by]=@PostedBy
               WHERE [id]=@Id AND [status]='draft'",
            new { Id = voucherId, PostedAt = postedAt, PostedBy = postedBy }, tx);
        if (affected == 0)
            throw new InvalidOperationException("仅草稿凭证可过账");

        return new PostResult(debit, credit);
    }
}
