using System.Data;
using Dapper;
using EngineeringManager.Api.Services.Stt;
using Microsoft.Extensions.Logging;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 知识库实体关联服务：扫描业务表 → 生成实体种子 → 关联 knowledge_documents
///
/// 职责:
///   1. SeedEntitiesAsync   — 一次性全量扫描业务表，为每条记录生成实体种子 + 实体卡片文档
///   2. UpsertEntityAsync   — 增量 upsert 单条实体（业务写端点 fire-and-forget 调用）
///   3. GetEntityContextAsync — 返回"该实体 + 直接关联实体 + 相关语义片段"
///
/// 关联关系基于现有业务外键在查询期拼装，不引入图数据库。
/// entity_type 枚举: project, income_contract, expense_contract, partner,
///                   invoice, settlement, wage, cost_ledger, material
/// </summary>
public class KnowledgeEntityService
{
    private readonly IDbConnection _db;
    private readonly IEmbeddingService _embedding;
    private readonly ILogger? _logger;

    /// <summary>实体卡片文档统一 created_by（系统级，admin 可见）</summary>
    private const string SystemCreator = "system";

    public KnowledgeEntityService(IDbConnection db, IEmbeddingService embedding, ILogger? logger = null)
    {
        _db = db;
        _embedding = embedding;
        _logger = logger;
    }

    // ═══════════════════════════════════════════════════════════
    // SeedEntitiesAsync — 全量扫描
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 一次性扫描所有业务表，为每条记录生成 knowledge_entity_seeds 行 +
    /// knowledge_documents 实体卡片（走现有分块+向量+FTS 管线）。
    /// Upsert 语义：已存在的种子不重复创建。
    /// </summary>
    public async Task<int> SeedEntitiesAsync(CancellationToken ct = default)
    {
        var count = 0;

        // ── projects ──
        foreach (var row in _db.Query<dynamic>(
            "SELECT [id], [name], [project_id] FROM [projects] WHERE [status] != 'deleted' OR [status] IS NULL"))
        {
            await UpsertEntityAsync("project", (long)row.id, (string)row.name, null, ct);
            count++;
        }

        // ── income_contracts ──
        foreach (var row in _db.Query<dynamic>(
            "SELECT [id], [name], [project_id] FROM [income_contracts]"))
        {
            await UpsertEntityAsync("income_contract", (long)row.id, (string)row.name, (long?)row.project_id, ct);
            count++;
        }

        // ── expense_contracts ──
        foreach (var row in _db.Query<dynamic>(
            "SELECT [id], [name], [project_id] FROM [expense_contracts]"))
        {
            await UpsertEntityAsync("expense_contract", (long)row.id, (string)row.name, (long?)row.project_id, ct);
            count++;
        }

        // ── partners ──
        foreach (var row in _db.Query<dynamic>(
            "SELECT [id], [name] FROM [partners]"))
        {
            await UpsertEntityAsync("partner", (long)row.id, (string)row.name, null, ct);
            count++;
        }

        // ── invoices ──
        foreach (var row in _db.Query<dynamic>(
            "SELECT [id], [name], [project_id] FROM [invoices] WHERE [deleted_at] IS NULL"))
        {
            await UpsertEntityAsync("invoice", (long)row.id, (string?)row.name ?? $"发票-{row.id}", (long?)row.project_id, ct);
            count++;
        }

        // ── settlements ──
        foreach (var row in _db.Query<dynamic>(
            "SELECT [id], [name], [project_id] FROM [settlements] WHERE [deleted_at] IS NULL"))
        {
            await UpsertEntityAsync("settlement", (long)row.id, (string?)row.name ?? $"结算-{row.id}", (long?)row.project_id, ct);
            count++;
        }

        // ── wages ──
        foreach (var row in _db.Query<dynamic>(@"
            SELECT w.[id], w.[year_month], w.[project_id],
                   COALESCE(m.[name], '未知') AS worker_name
            FROM [wages] w
            LEFT JOIN [members] m ON w.[member_id] = m.[id]
            WHERE w.[deleted_at] IS NULL"))
        {
            var entityName = $"{(string)row.worker_name} {(string?)row.year_month ?? ""}工资".Trim();
            await UpsertEntityAsync("wage", (long)row.id, entityName, (long?)row.project_id, ct);
            count++;
        }

        // ── cost_ledger ──
        foreach (var row in _db.Query<dynamic>(
            "SELECT [id], [voucher_no], [summary], [project_id] FROM [cost_ledger]"))
        {
            var entityName = (string?)row.summary ?? (string?)row.voucher_no ?? $"台账-{row.id}";
            await UpsertEntityAsync("cost_ledger", (long)row.id, entityName, (long?)row.project_id, ct);
            count++;
        }

        // ── materials ──
        foreach (var row in _db.Query<dynamic>(
            "SELECT [id], [name] FROM [materials]"))
        {
            await UpsertEntityAsync("material", (long)row.id, (string)row.name, null, ct);
            count++;
        }

        _logger?.LogInformation("[KnowledgeEntityService] 全量种子完成: {Count} 条实体", count);
        return count;
    }

    // ═══════════════════════════════════════════════════════════
    // UpsertEntityAsync — 单条 upsert
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 增量 upsert 单条实体：
    ///   1. INSERT OR IGNORE knowledge_entity_seeds（按 entity_type+entity_id 唯一）
    ///   2. 调用 KnowledgeBaseService.IngestAsync 生成/幂等命中实体卡片文档
    ///   3. 回填 reference_doc_id
    /// </summary>
    public async Task UpsertEntityAsync(
        string entityType, long entityId, string entityName, long? projectId,
        CancellationToken ct = default)
    {
        var now = Common.NowString();

        // 1. Upsert 种子行（INSERT OR IGNORE 保证幂等）
        _db.Execute(@"
            INSERT OR IGNORE INTO [knowledge_entity_seeds]
                ([entity_type], [entity_id], [entity_name], [project_id], [created_at])
            VALUES
                (@EntityType, @EntityId, @EntityName, @ProjectId, @Now)",
            new { EntityType = entityType, EntityId = entityId, EntityName = entityName, ProjectId = projectId, Now = now });

        // 更新名称（若已存在但名称变了）
        _db.Execute(@"
            UPDATE [knowledge_entity_seeds]
            SET [entity_name] = @EntityName, [project_id] = @ProjectId
            WHERE [entity_type] = @EntityType AND [entity_id] = @EntityId",
            new { EntityType = entityType, EntityId = entityId, EntityName = entityName, ProjectId = projectId });

        // 2. 生成实体卡片文本
        var cardText = BuildCardText(entityType, entityId, entityName, projectId);
        var title = $"{EntityLabel(entityType)}: {entityName}";
        var sourceRef = $"entity:{entityType}:{entityId}";

        // 3. 走现有分块+向量+FTS 管线（IngestAsync 内部幂等）
        var kb = new KnowledgeBaseService(_db, _embedding, _logger as ILogger<KnowledgeBaseService>);
        var result = await kb.IngestAsync(
            fullText: cardText,
            title: title,
            sourceType: "entity",
            sourceRef: sourceRef,
            projectId: projectId.HasValue ? (int)projectId.Value : null,
            createdBy: SystemCreator,
            segments: null,
            occurredAt: null,
            ct: ct);

        // 4. 回填 reference_doc_id
        _db.Execute(@"
            UPDATE [knowledge_entity_seeds]
            SET [reference_doc_id] = @DocId
            WHERE [entity_type] = @EntityType AND [entity_id] = @EntityId",
            new { DocId = result.DocumentId, EntityType = entityType, EntityId = entityId });
    }

    // ═══════════════════════════════════════════════════════════
    // GetEntityContextAsync — 实体 + 关联 + 语义片段
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 返回"该实体 + 直接关联实体 + 相关语义片段"。
    /// 关联关系基于现有业务外键在查询期拼装。
    /// </summary>
    public EntityContextResult GetEntityContextAsync(
        string entityType, long entityId, string userId, bool isAdmin)
    {
        var result = new EntityContextResult
        {
            EntityType = entityType,
            EntityId = entityId,
        };

        // 1. 查当前实体种子
        var seed = _db.QueryFirstOrDefault<dynamic>(@"
            SELECT [id], [entity_type], [entity_id], [entity_name], [project_id], [reference_doc_id]
            FROM [knowledge_entity_seeds]
            WHERE [entity_type] = @EntityType AND [entity_id] = @EntityId",
            new { EntityType = entityType, EntityId = entityId });

        if (seed == null) return result;

        result.EntityName = (string)seed.entity_name;
        result.ProjectId = (long?)seed.project_id;
        var docId = (long?)seed.reference_doc_id;

        // 2. 查关联实体（基于外键关系）
        result.RelatedEntities = QueryRelatedEntities(entityType, entityId, (long?)seed.project_id);

        // 3. 查关联文档的语义片段
        if (docId.HasValue)
        {
            result.SemanticChunks = _db.Query<dynamic>(@"
                SELECT [id], [chunk_index], [text]
                FROM [knowledge_chunks]
                WHERE [document_id] = @DocId
                ORDER BY [chunk_index]
                LIMIT 10",
                new { DocId = docId.Value }).Select(c => new EntityChunkInfo
                {
                    Id = (long)c.id,
                    Index = (int)c.chunk_index,
                    Text = (string)c.text,
                }).ToList();
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════
    // 关联实体查询（基于现有外键关系，查询期拼装）
    // ═══════════════════════════════════════════════════════════

    private List<RelatedEntity> QueryRelatedEntities(string entityType, long entityId, long? projectId)
    {
        var related = new List<RelatedEntity>();

        switch (entityType)
        {
            case "project":
                AddSeeds(related, "income_contract",
                    "SELECT [id], [entity_name] FROM [knowledge_entity_seeds] WHERE [entity_type]='income_contract' AND [project_id]=@EntityId",
                    entityId);
                AddSeeds(related, "expense_contract",
                    "SELECT [id], [entity_name] FROM [knowledge_entity_seeds] WHERE [entity_type]='expense_contract' AND [project_id]=@EntityId",
                    entityId);
                AddSeeds(related, "invoice",
                    "SELECT [id], [entity_name] FROM [knowledge_entity_seeds] WHERE [entity_type]='invoice' AND [project_id]=@EntityId",
                    entityId);
                AddSeeds(related, "settlement",
                    "SELECT [id], [entity_name] FROM [knowledge_entity_seeds] WHERE [entity_type]='settlement' AND [project_id]=@EntityId",
                    entityId);
                AddSeeds(related, "wage",
                    "SELECT [id], [entity_name] FROM [knowledge_entity_seeds] WHERE [entity_type]='wage' AND [project_id]=@EntityId",
                    entityId);
                AddSeeds(related, "cost_ledger",
                    "SELECT [id], [entity_name] FROM [knowledge_entity_seeds] WHERE [entity_type]='cost_ledger' AND [project_id]=@EntityId",
                    entityId);
                break;

            case "income_contract":
            case "expense_contract":
            {
                var contractTable = entityType == "income_contract" ? "income_contracts" : "expense_contracts";
                var row = _db.QueryFirstOrDefault<dynamic>(
                    $"SELECT [project_id] FROM [{contractTable}] WHERE [id]=@EntityId",
                    new { EntityId = entityId });
                if (row?.project_id != null)
                    AddSeed(related, "project", (long)row.project_id);

                AddSeeds(related, "invoice",
                    "SELECT [id], [entity_name] FROM [knowledge_entity_seeds] WHERE [entity_type]='invoice' AND [entity_id] IN (SELECT [id] FROM [invoices] WHERE [contract_id]=@EntityId AND [deleted_at] IS NULL)",
                    entityId);
                AddSeeds(related, "settlement",
                    "SELECT [id], [entity_name] FROM [knowledge_entity_seeds] WHERE [entity_type]='settlement' AND [entity_id] IN (SELECT [id] FROM [settlements] WHERE [contract_id]=@EntityId AND [deleted_at] IS NULL)",
                    entityId);
                break;
            }

            case "partner":
                AddSeeds(related, "invoice",
                    "SELECT [id], [entity_name] FROM [knowledge_entity_seeds] WHERE [entity_type]='invoice' AND [entity_id] IN (SELECT [id] FROM [invoices] WHERE ([seller_id]=@EntityId OR [buyer_id]=@EntityId) AND [deleted_at] IS NULL)",
                    entityId);
                AddSeeds(related, "settlement",
                    "SELECT [id], [entity_name] FROM [knowledge_entity_seeds] WHERE [entity_type]='settlement' AND [entity_id] IN (SELECT [id] FROM [settlements] WHERE [partner_id]=@EntityId AND [deleted_at] IS NULL)",
                    entityId);
                break;

            case "invoice":
            {
                var inv = _db.QueryFirstOrDefault<dynamic>(
                    "SELECT [project_id], [contract_id], [seller_id], [buyer_id], [settlement_id] FROM [invoices] WHERE [id]=@EntityId AND [deleted_at] IS NULL",
                    new { EntityId = entityId });
                if (inv == null) break;
                if (inv.project_id != null) AddSeed(related, "project", (long)inv.project_id);
                if (inv.contract_id != null)
                {
                    // 尝试匹配收入/支出合同
                    var cid = (long)inv.contract_id;
                    if (_db.ExecuteScalar<int>("SELECT COUNT(*) FROM [income_contracts] WHERE [id]=@Cid", new { Cid = cid }) > 0)
                        AddSeed(related, "income_contract", cid);
                    else if (_db.ExecuteScalar<int>("SELECT COUNT(*) FROM [expense_contracts] WHERE [id]=@Cid", new { Cid = cid }) > 0)
                        AddSeed(related, "expense_contract", cid);
                }
                if (inv.seller_id != null) AddSeed(related, "partner", (long)inv.seller_id);
                if (inv.buyer_id != null) AddSeed(related, "partner", (long)inv.buyer_id);
                if (inv.settlement_id != null) AddSeed(related, "settlement", (long)inv.settlement_id);

                // cost_ledger 通过 linked_invoice_id 关联
                AddSeeds(related, "cost_ledger",
                    "SELECT [id], [entity_name] FROM [knowledge_entity_seeds] WHERE [entity_type]='cost_ledger' AND [entity_id] IN (SELECT [id] FROM [cost_ledger] WHERE [linked_invoice_id]=@EntityId)",
                    entityId);
                break;
            }

            case "settlement":
            {
                var stl = _db.QueryFirstOrDefault<dynamic>(
                    "SELECT [project_id], [contract_id], [partner_id] FROM [settlements] WHERE [id]=@EntityId AND [deleted_at] IS NULL",
                    new { EntityId = entityId });
                if (stl == null) break;
                if (stl.project_id != null) AddSeed(related, "project", (long)stl.project_id);
                if (stl.contract_id != null)
                {
                    var cid = (long)stl.contract_id;
                    if (_db.ExecuteScalar<int>("SELECT COUNT(*) FROM [income_contracts] WHERE [id]=@Cid", new { Cid = cid }) > 0)
                        AddSeed(related, "income_contract", cid);
                    else if (_db.ExecuteScalar<int>("SELECT COUNT(*) FROM [expense_contracts] WHERE [id]=@Cid", new { Cid = cid }) > 0)
                        AddSeed(related, "expense_contract", cid);
                }
                if (stl.partner_id != null) AddSeed(related, "partner", (long)stl.partner_id);

                AddSeeds(related, "invoice",
                    "SELECT [id], [entity_name] FROM [knowledge_entity_seeds] WHERE [entity_type]='invoice' AND [entity_id] IN (SELECT [id] FROM [invoices] WHERE [settlement_id]=@EntityId AND [deleted_at] IS NULL)",
                    entityId);
                break;
            }

            case "wage":
            {
                var w = _db.QueryFirstOrDefault<dynamic>(
                    "SELECT [project_id], [member_id] FROM [wages] WHERE [id]=@EntityId AND [deleted_at] IS NULL",
                    new { EntityId = entityId });
                if (w == null) break;
                if (w.project_id != null) AddSeed(related, "project", (long)w.project_id);
                break;
            }

            case "cost_ledger":
            {
                var cl = _db.QueryFirstOrDefault<dynamic>(
                    "SELECT [project_id], [linked_invoice_id] FROM [cost_ledger] WHERE [id]=@EntityId",
                    new { EntityId = entityId });
                if (cl == null) break;
                if (cl.project_id != null) AddSeed(related, "project", (long)cl.project_id);
                if (cl.linked_invoice_id != null) AddSeed(related, "invoice", (long)cl.linked_invoice_id);
                break;
            }
        }

        return related;
    }

    private void AddSeeds(List<RelatedEntity> list, string entityType, string sql, long entityId)
    {
        var rows = _db.Query<dynamic>(sql, new { EntityId = entityId });
        foreach (var r in rows)
        {
            list.Add(new RelatedEntity
            {
                EntityType = entityType,
                EntityId = (long)r.id,
                EntityName = (string)r.entity_name,
            });
        }
    }

    private void AddSeed(List<RelatedEntity> list, string entityType, long entityId)
    {
        var row = _db.QueryFirstOrDefault<dynamic>(
            "SELECT [entity_name], [project_id] FROM [knowledge_entity_seeds] WHERE [entity_type]=@EntityType AND [entity_id]=@EntityId",
            new { EntityType = entityType, EntityId = entityId });
        if (row != null)
        {
            list.Add(new RelatedEntity
            {
                EntityType = entityType,
                EntityId = entityId,
                EntityName = (string)row.entity_name,
            });
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 实体卡片文本生成
    // ═══════════════════════════════════════════════════════════

    private string BuildCardText(string entityType, long entityId, string entityName, long? projectId)
    {
        try
        {
            return entityType switch
            {
                "project" => BuildProjectCard(entityId, entityName),
                "income_contract" => BuildContractCard("income_contracts", entityId, entityName, "收入合同"),
                "expense_contract" => BuildContractCard("expense_contracts", entityId, entityName, "支出合同"),
                "partner" => BuildPartnerCard(entityId, entityName),
                "invoice" => BuildInvoiceCard(entityId, entityName),
                "settlement" => BuildSettlementCard(entityId, entityName),
                "wage" => BuildWageCard(entityId, entityName),
                "cost_ledger" => BuildCostLedgerCard(entityId, entityName),
                "material" => BuildMaterialCard(entityId, entityName),
                _ => $"实体类型: {entityType}\n名称: {entityName}",
            };
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "[KnowledgeEntityService] 构建实体卡片文本失败: {Type}/{Id}", entityType, entityId);
            return $"实体类型: {entityType}\n名称: {entityName}";
        }
    }

    private string BuildProjectCard(long entityId, string entityName)
    {
        var row = _db.QueryFirstOrDefault<dynamic>(
            "SELECT [name], [description], [address], [start_date], [end_date], [status], [budget] FROM [projects] WHERE [id]=@Id",
            new { Id = entityId });
        if (row == null) return $"项目: {entityName}";
        return $"项目: {row.name}\n描述: {row.description ?? "无"}\n地址: {row.address ?? "未指定"}\n开始日期: {row.start_date ?? "未指定"}\n结束日期: {row.end_date ?? "未指定"}\n状态: {row.status ?? "active"}\n预算: {(row.budget != null ? $"{row.budget}元" : "未设定")}";
    }

    private string BuildContractCard(string table, long entityId, string entityName, string label)
    {
        var row = _db.QueryFirstOrDefault<dynamic>(
            $"SELECT [name], [amount], [counterparty], [sign_date], [status], [remark] FROM [{table}] WHERE [id]=@Id",
            new { Id = entityId });
        if (row == null) return $"{label}: {entityName}";
        return $"{label}: {row.name}\n金额: {(row.amount != null ? $"{row.amount}元" : "未设定")}\n对方: {row.counterparty ?? "未指定"}\n签订日期: {row.sign_date ?? "未指定"}\n状态: {row.status ?? "draft"}\n备注: {row.remark ?? "无"}";
    }

    private string BuildPartnerCard(long entityId, string entityName)
    {
        var row = _db.QueryFirstOrDefault<dynamic>(
            "SELECT [name], [category], [contact], [address], [tax_type], [business_scope] FROM [partners] WHERE [id]=@Id",
            new { Id = entityId });
        if (row == null) return $"合作伙伴: {entityName}";
        // 注意：phone/bank_account/credit_code/tax_number 是 PII 敏感字段，不写入卡片文本
        return $"合作伙伴: {row.name}\n类别: {row.category ?? "未分类"}\n联系人: {row.contact ?? "未指定"}\n地址: {row.address ?? "未指定"}\n纳税人类型: {row.tax_type ?? "未指定"}\n经营范围: {row.business_scope ?? "未指定"}";
    }

    private string BuildInvoiceCard(long entityId, string entityName)
    {
        var row = _db.QueryFirstOrDefault<dynamic>(
            "SELECT [name], [type], [invoice_no], [amount], [tax_amount], [issue_date], [status] FROM [invoices] WHERE [id]=@Id",
            new { Id = entityId });
        if (row == null) return $"发票: {entityName}";
        var typeLabel = (string?)row.type == "invoice_in" ? "进项发票" : "销项发票";
        return $"{typeLabel}: {row.name}\n发票号: {row.invoice_no ?? "无"}\n金额: {(row.amount != null ? $"{row.amount}元" : "0")}\n税额: {(row.tax_amount != null ? $"{row.tax_amount}元" : "0")}\n开票日期: {row.issue_date ?? "未指定"}\n状态: {row.status ?? "pending"}";
    }

    private string BuildSettlementCard(long entityId, string entityName)
    {
        var row = _db.QueryFirstOrDefault<dynamic>(
            "SELECT [name], [type], [sub_type], [amount], [settlement_no], [settlement_date], [status] FROM [settlements] WHERE [id]=@Id",
            new { Id = entityId });
        if (row == null) return $"结算: {entityName}";
        return $"结算: {row.name}\n结算编号: {row.settlement_no ?? "无"}\n类型: {row.type ?? "未指定"}\n子类型: {row.sub_type ?? "未指定"}\n金额: {(row.amount != null ? $"{row.amount}元" : "未设定")}\n结算日期: {row.settlement_date ?? "未指定"}\n状态: {row.status ?? "pending"}";
    }

    private string BuildWageCard(long entityId, string entityName)
    {
        var row = _db.QueryFirstOrDefault<dynamic>(@"
            SELECT w.[year_month], w.[daily_wage], w.[work_days], w.[bonus], w.[deduction], w.[actual_wage], w.[status],
                   COALESCE(m.[name], '未知') AS worker_name
            FROM [wages] w
            LEFT JOIN [members] m ON w.[member_id] = m.[id]
            WHERE w.[id]=@Id",
            new { Id = entityId });
        if (row == null) return $"工资: {entityName}";
        // 注意：bank_account 等 PII 字段不写入卡片
        return $"工资单: {(string)row.worker_name}\n月份: {row.year_month ?? "未指定"}\n日薪: {(row.daily_wage != null ? $"{row.daily_wage}元" : "未设定")}\n工时: {(row.work_days != null ? $"{row.work_days}天" : "未记录")}\n奖金: {(row.bonus != null ? $"{row.bonus}元" : "0")}\n扣款: {(row.deduction != null ? $"{row.deduction}元" : "0")}\n实发: {(row.actual_wage != null ? $"{row.actual_wage}元" : "未计算")}\n状态: {row.status ?? "pending"}";
    }

    private string BuildCostLedgerCard(long entityId, string entityName)
    {
        var row = _db.QueryFirstOrDefault<dynamic>(
            "SELECT [voucher_no], [date], [direction], [category], [amount], [counterparty], [summary], [notes] FROM [cost_ledger] WHERE [id]=@Id",
            new { Id = entityId });
        if (row == null) return $"成本台账: {entityName}";
        return $"成本台账: {row.summary ?? row.voucher_no ?? "无摘要"}\n凭证号: {row.voucher_no ?? "无"}\n日期: {row.date ?? "未指定"}\n方向: {row.direction ?? "未指定"}\n类别: {row.category ?? "未分类"}\n金额: {(row.amount != null ? $"{row.amount}元" : "0")}\n对方: {row.counterparty ?? "未指定"}\n备注: {row.notes ?? "无"}";
    }

    private string BuildMaterialCard(long entityId, string entityName)
    {
        var row = _db.QueryFirstOrDefault<dynamic>(
            "SELECT [name], [category], [unit], [specifications], [supplier], [notes] FROM [materials] WHERE [id]=@Id",
            new { Id = entityId });
        if (row == null) return $"物料: {entityName}";
        return $"物料: {row.name}\n类别: {row.category ?? "未分类"}\n单位: {row.unit ?? "未指定"}\n规格: {row.specifications ?? "未指定"}\n供应商: {row.supplier ?? "未指定"}\n备注: {row.notes ?? "无"}";
    }

    // ═══════════════════════════════════════════════════════════
    // 实体类型中文标签
    // ═══════════════════════════════════════════════════════════

    internal static string EntityLabel(string entityType) => entityType switch
    {
        "project" => "项目",
        "income_contract" => "收入合同",
        "expense_contract" => "支出合同",
        "partner" => "合作伙伴",
        "invoice" => "发票",
        "settlement" => "结算",
        "wage" => "工资单",
        "cost_ledger" => "成本台账",
        "material" => "物料",
        _ => entityType,
    };
}

// ═══════════════════════════════════════════════════════════
// DTO
// ═══════════════════════════════════════════════════════════

public class EntityContextResult
{
    public string EntityType { get; set; } = "";
    public long EntityId { get; set; }
    public string EntityName { get; set; } = "";
    public long? ProjectId { get; set; }
    public List<RelatedEntity> RelatedEntities { get; set; } = new();
    public List<EntityChunkInfo> SemanticChunks { get; set; } = new();
}

public class RelatedEntity
{
    public string EntityType { get; set; } = "";
    public long EntityId { get; set; }
    public string EntityName { get; set; } = "";
}

public class EntityChunkInfo
{
    public long Id { get; set; }
    public int Index { get; set; }
    public string Text { get; set; } = "";
}
