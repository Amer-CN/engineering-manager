import React, { useCallback, useEffect, useState } from "react";
import PageContainer from "@/components/ui/PageContainer";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NoAccessState } from "@/components/ui/NoAccessState";
import { usePermission, RequirePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import {
  fetchWritingDocs,
  fetchWritingDocTypes,
  createWritingDoc,
  deleteWritingDoc,
  type WritingDoc,
} from "@/services/writing-client";

interface DocTypeOption {
  code: string;
  label: string;
  group: string;
}

/** 拆平分组后的文体选项（单一 map 渲染，避免嵌套返回 JSX） */
function flattenDocTypes(
  groups: { group: string; types: { code: string; label: string }[] }[] | undefined,
): DocTypeOption[] {
  if (!groups) return [];
  const out: DocTypeOption[] = [];
  for (const g of groups) {
    for (const t of g.types) {
      out.push({ code: t.code, label: t.label, group: g.group });
    }
  }
  return out;
}

const WritingIndex: React.FC = () => {
  const { can } = usePermission();
  const { showToast } = useToast();
  const [docs, setDocs] = useState<WritingDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [docType, setDocType] = useState("");
  const [options, setOptions] = useState<DocTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WritingDoc | null>(null);

  const loadDocs = useCallback(() => {
    setLoading(true);
    void fetchWritingDocs({ docType: docType || undefined, page, size }).then(
      (res) => {
        setLoading(false);
        if (res.success && res.data) {
          setDocs(res.data.items || []);
          setTotal(res.data.total || 0);
        } else {
          showToast(res.error || "获取失败", "error");
        }
      },
    );
  }, [docType, page, size, showToast]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  // 文体选项（单一真源）
  useEffect(() => {
    void fetchWritingDocTypes().then((res) => {
      if (res.success && res.data) setOptions(flattenDocTypes(res.data.groups));
    });
  }, []);

  const handleCreate = () => {
    if (!can("writing:create")) {
      showToast("无权限", "error");
      return;
    }
    void createWritingDoc({
      title: "未命名文档",
      docType: docType || undefined,
    }).then((res) => {
      if (res.success) {
        showToast("已创建", "success");
        loadDocs();
      } else {
        showToast(res.error || "新建失败", "error");
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    void deleteWritingDoc(deleteTarget.id).then((res) => {
      if (res.success) {
        showToast("已删除", "success");
        setDeleteTarget(null);
        loadDocs();
      } else {
        showToast(res.error || "删除失败", "error");
      }
    });
  };

  return (
    <RequirePermission permission="writing:read" fallback={<NoAccessState />}>
      <PageContainer maxWidth="default">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              <Icon name="PenLine" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: "var(--fg)" }}>
                写作中心
              </h1>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                AI 起草公文、会议纪要、周报等，支持 30 种文体
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="文体筛选"
              value={docType}
              onChange={(e) => {
                setDocType(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg text-sm border"
              style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--fg)" }}
            >
              <option value="">全部文体</option>
              {options.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.group} / {t.label}
                </option>
              ))}
            </select>

            {can("writing:create") && (
              <Button onClick={handleCreate}>
                <Icon name="Sparkles" size={16} />
                新建文档
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">加载中…</div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon="FileText"
            title="还没有文档"
            description="点击「新建文档」开始你的第一篇公文写作"
            action={
              can("writing:create") ? <Button onClick={handleCreate}>新建文档</Button> : undefined
            }
          />
        ) : (
          <Card>
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--fg)" }}>
                    {d.title}
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {d.docType} · {formatTime(d.updatedAt)}
                  </div>
                </div>
                {can("writing:delete") && (
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(d)}>
                    <Icon name="Trash2" size={15} />
                    删除
                  </Button>
                )}
              </div>
            ))}
            <div className="px-5 py-4">
              <Pagination
                current={page}
                total={total}
                pageSize={size}
                onChange={setPage}
                showTotal
              />
            </div>
          </Card>
        )}

        <ConfirmDialog
          isOpen={deleteTarget != null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="删除文档"
          content="删除后不可恢复，确定删除？"
          confirmText="删除"
          confirmVariant="danger"
        />
      </PageContainer>
    </RequirePermission>
  );
};

function formatTime(s: string): string {
  if (!s) return "";
  return s.slice(0, 16).replace("T", " ");
}

export default WritingIndex;
