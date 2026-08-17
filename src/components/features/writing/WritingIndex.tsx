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
  createWritingDoc,
  deleteWritingDoc,
} from "@/services/writing-client";

const WritingIndex: React.FC = () => {
  const { can } = usePermission();
  const { showToast } = useToast();
  const [docs, setDocs] = useState<unknown[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [docType] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    title: string;
  } | null>(null);

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
                AI 起草公文、会议纪要、周报等
              </p>
            </div>
          </div>
          {can("writing:create") && (
            <Button onClick={handleCreate}>
              <Icon name="Sparkles" size={16} />
              新建文档
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">加载中…</div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon="FileText"
            title="还没有文档"
            description="点击「新建文档」开始你的第一篇公文写作"
            action={
              can("writing:create") ? (
                <Button onClick={handleCreate}>新建文档</Button>
              ) : undefined
            }
          />
        ) : (
          <Card>
            {docs.map((d: unknown, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <span style={{ color: "var(--fg)" }}>
                  {(d as { title?: string }).title ?? ""}
                </span>
                {can("writing:delete") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDeleteTarget(d as { id: number; title: string })
                    }
                  >
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

export default WritingIndex;
