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
import { useToastContext } from "@/components/ui/Toast/ToastProvider";
import { useWritingPrefill, type WritingPrefill } from "@/hooks/useWritingPrefill";
import WritingEditor from "./WritingEditor";
import WritingWizard from "./WritingWizard";
import WritingFolderFilter from "./WritingFolderFilter";
import {
  fetchWritingDocs,
  fetchWritingDocTypes,
  fetchWritingFolders,
  fetchNextWritingStyle,
  createWritingDoc,
  createWritingFolder,
  deleteWritingDoc,
  moveWritingDoc,
  type WritingDoc,
  type WritingFolder,
} from "@/services/writing-client";
import { DropdownMenu } from "@/components/ui/DropdownMenu";

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
  const { showToast } = useToastContext();
  const [docs, setDocs] = useState<WritingDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [docType, setDocType] = useState("");
  const [options, setOptions] = useState<DocTypeOption[]>([]);
  const [folders, setFolders] = useState<WritingFolder[]>([]);
  const [folderFilter, setFolderFilter] = useState<string>(""); // ""=全部, "0"=未分组, "N"=文件夹 id
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WritingDoc | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const loadDocs = useCallback(() => {
    setLoading(true);
    const folderId = folderFilter === "" ? undefined : Number(folderFilter);
    void fetchWritingDocs({ docType: docType || undefined, folderId, page, size }).then((res) => {
      setLoading(false);
      if (res.success && res.data) {
        setDocs(res.data.items || []);
        setTotal(res.data.total || 0);
      } else {
        showToast(res.error || "获取失败", "error");
      }
    });
  }, [docType, folderFilter, page, size, showToast]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  // 文体选项（单一真源）
  useEffect(() => {
    void fetchWritingDocTypes().then((res) => {
      if (res.success && res.data) setOptions(flattenDocTypes(res.data.groups));
    });
  }, []);

  // R3：文件夹列表
  const loadFolders = useCallback(() => {
    void fetchWritingFolders().then((res) => {
      if (res.success && res.data) setFolders(res.data);
    });
  }, []);
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // R3：新建文件夹（window.prompt 简单实现）
  const handleCreateFolder = () => {
    const name = window.prompt("新建文件夹名称：");
    if (!name || !name.trim()) return;
    void createWritingFolder(name.trim()).then((res) => {
      if (res.success) {
        showToast("文件夹已创建", "success");
        loadFolders();
      } else {
        showToast(res.error || "创建失败", "error");
      }
    });
  };

  // R3：移入/移出文件夹
  const handleMoveDoc = (doc: WritingDoc, folderId: number | null) => {
    void moveWritingDoc(doc.id, folderId).then((res) => {
      if (res.success) {
        showToast(folderId == null ? "已移出文件夹" : "已移入文件夹", "success");
        loadDocs();
      } else {
        showToast(res.error || "移动失败", "error");
      }
    });
  };

  const handleCreate = () => {
    if (!can("writing:create")) {
      showToast("无权限", "error");
      return;
    }
    setWizardOpen(true);
  };  // R1 向导：AI 起草 → 建文档 → 进编辑器自动开起草面板；R4「自动轮换」先查 next-style
  // 拿真实编号（库里不落 "auto"，失败 toast 回落 S3）；styleLabel 供拼「本周风格」标注
  const handleWizardDraft = async (opts: { title: string; docType: string; styleId: string; material: string }) => {
    let styleId = opts.styleId;
    let styleLabel = "";
    if (opts.styleId === "auto") {
      const res = await fetchNextWritingStyle(opts.docType);
      const next = res.success && res.data ? res.data : null;
      styleId = next ? next.styleId : "S3";
      if (next) styleLabel = `${next.styleId} ${next.styleName}`;
      else showToast(res.error || "风格轮换查询失败，已回落 S3", "error");
    }
    const cre = await createWritingDoc({ title: opts.title, docType: opts.docType, styleId, contentMd: "" });
    if (!cre.success || !cre.data?.id) return showToast(cre.error || "新建失败", "error");
    loadDocs();
    sessionStorage.setItem("writing:draftMaterial", JSON.stringify({ material: opts.material, docId: cre.data.id, ...(styleLabel && { styleLabel }) }));
    if (styleLabel) sessionStorage.setItem("writing:styleLabel", JSON.stringify({ styleLabel, docId: cre.data.id }));
    setEditingId(cre.data.id);
  };

  // R1 向导：空白文档 → 建文档 → 直接进编辑器手写
  const handleWizardBlank = (opts: { title: string; docType: string }) => {
    void createWritingDoc({
      title: opts.title,
      docType: opts.docType,
      contentMd: "",
    }).then((res) => {
      if (res.success && res.data?.id) {
        loadDocs();
        setEditingId(res.data.id);
      } else {
        showToast(res.error || "新建失败", "error");
      }
    });
  };

  // W3：消费外部预填（如语音页「生成会议纪要」）→ 自动建文档并进编辑器
  const handlePrefill = (p: WritingPrefill) => {
    if (!can("writing:create")) {
      showToast("无权限", "error");
      return;
    }
    void createWritingDoc({
      title: p.title || "会议纪要",
      docType: p.docType || "minutes_items",
      styleId: p.styleId || "S1",
      sourceType: p.sourceType || "stt",
      sourceRef: p.sourceRef,
      contentMd: "",
    }).then((res) => {
      if (res.success) {
        showToast("已创建，可开始起草", "success");
        loadDocs();
        if (res.data?.id) {
          // 把素材暂存到 sessionStorage，由编辑器读入填充素材
          sessionStorage.setItem("writing:draftMaterial", JSON.stringify({ material: p.material ?? "", docId: res.data.id }));
          setEditingId(res.data.id);
        }
      } else {
        showToast(res.error || "创建失败", "error");
      }
    });
  };
  useWritingPrefill(handlePrefill);

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

  if (editingId != null) {
    return (
      <RequirePermission permission="writing:update" fallback={<NoAccessState />}>
        <WritingEditor docId={editingId} onBack={() => { setEditingId(null); loadDocs(); }} />
      </RequirePermission>
    );
  }

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
                给素材让 AI 成文，或空白手写；选中文字随时 AI 改写
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
                <option key={t.code} value={t.code}>{t.group} / {t.label}</option>
              ))}
            </select>

            {/* R3：文件夹筛选（0=未分组）+ 新建文件夹入口 */}
            <WritingFolderFilter
              folders={folders}
              value={folderFilter}
              onChange={(v) => {
                setFolderFilter(v);
                setPage(1);
              }}
              onCreate={handleCreateFolder}
              canCreate={can("writing:create")}
            />

            {can("writing:create") && (
              <Button onClick={handleCreate}>
                <Icon name="Sparkles" size={16} />
                新建文档
              </Button>
            )}
          </div>
        </div>

        {/* 固定高度列表卡片：列表区恒占 10 条高度，分页条固定底部 */}
        <Card className="flex flex-col overflow-hidden min-h-[640px]">
          <div className="flex-1 flex flex-col justify-start">
            {loading ? (
              <div className="flex justify-center py-16" style={{ color: "var(--muted)" }}>加载中…</div>
            ) : docs.length === 0 ? (
              <EmptyState
                icon="FileText"
                title="还没有文档"
                description="选文体、给素材，AI 起草或空白手写都可以"
                action={
                  can("writing:create") ? <Button onClick={handleCreate}>新建文档</Button> : undefined
                }
              />
            ) : (
              docs.map((d) => {
                const folderName = folders.find((f) => f.id === d.folderId)?.name;
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between px-5 py-4 border-b cursor-pointer hover:bg-[color:var(--panel-2)]"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => setEditingId(d.id)}
                  >
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--fg)" }}>
                        {d.title}
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        {d.docType} · {formatTime(d.updatedAt)}
                        {folderName && ` · ${folderName}`}
                      </div>
                    </div>
                    {/* 容器拦住冒泡：点击「移入/删除」不触发行点击进编辑器；
                        DropdownMenu 的开关 toggle div 在本容器内层，先于此拦截收到冒泡，菜单可正常打开 */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* R3：移入/移出文件夹 */}
                      {can("writing:update") && folders.length > 0 && (
                        <DropdownMenu
                          align="end"
                          trigger={
                            <Button variant="ghost" size="sm">
                              <Icon name="FolderOpen" size={15} />
                              移入
                            </Button>
                          }
                          items={[
                            ...folders.map((f) => ({
                              key: `f-${f.id}`,
                              label: f.name,
                              disabled: d.folderId === f.id,
                              onClick: () => handleMoveDoc(d, f.id),
                            })),
                            {
                              key: "move-out",
                              label: "移出文件夹",
                              divider: true,
                              disabled: d.folderId == null,
                              onClick: () => handleMoveDoc(d, null),
                            },
                          ]}
                        />
                      )}
                      {can("writing:delete") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(d);
                          }}
                        >
                          <Icon name="Trash2" size={15} />
                          删除
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* 底部固定分页条：total 换算为总页数（Pagination.total 语义是页数不是条数） */}
          <div className="px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <Pagination
              current={page}
              total={Math.max(1, Math.ceil(total / size))}
              pageSize={size}
              onChange={setPage}
              showTotal
            />
          </div>
        </Card>

        <ConfirmDialog
          isOpen={deleteTarget != null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="删除文档"
          content="删除后不可恢复，确定删除？"
          confirmText="删除"
          confirmVariant="danger"
        />

        {/* R1 新建向导：文体 → 素材 → 风格 → AI 起草 / 空白手写 */}
        <WritingWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onDraft={handleWizardDraft}
          onBlank={handleWizardBlank}
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
