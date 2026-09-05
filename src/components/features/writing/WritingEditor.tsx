import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import { ProtectedSpan } from "./protectedSpan";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import FontSizeMark from "./FontSizeMark";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/ui/Toast/ToastProvider";
import { usePermission } from "@/hooks/usePermission";
import { usePaperStyle } from "@/hooks/usePaperStyle";
import { ingestKnowledgeDocument } from "@/services/knowledge-client";
import WritingDraftPanel from "./WritingDraftPanel";
import WritingSlashMenu, { useSlashMenu } from "./WritingSlashMenu";
import WritingCheckPanel, { runWritingCheck } from "./WritingCheckPanel";
import WritingPreviewModal from "./WritingPreviewModal";
import WritingHistoryModal from "./WritingHistoryModal";
import WritingAiMenu from "./WritingAiMenu";
import EditorToolbar from "./EditorToolbar";
import WritingExportMenu from "./WritingExportMenu";
import ChartPickerModal from "./ChartPickerModal";
import { useA4Zoom } from "@/hooks/useA4Zoom";
import { fetchWritingDoc, updateWritingDoc, writingAssist, type WritingDoc } from "@/services/writing-client";
import { sanitizePastedHtml } from "@/utils/pasteSanitizer";

/** 粘贴图片体积上限：超过则拒绝插入（base64 内嵌会直接撑大 contentMd，防止数据库膨胀） */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

interface WritingEditorProps {
  docId: number;
  onBack: () => void;
}

const WritingEditor: React.FC<WritingEditorProps> = ({ docId, onBack }) => {
  const { showToast } = useToastContext();
  const { can } = usePermission();
  const [doc, setDoc] = useState<WritingDoc | null>(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMenu, setAiMenu] = useState<{ top: number; left: number } | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftMaterial, setDraftMaterial] = useState("");
  const [checkOpen, setCheckOpen] = useState(false);
  // R13 预览态：打印预览弹窗（打开时对当前 markdown 做快照，非实时同步）
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState({ markdown: "", title: "" });
  // 公文版式皮肤开关（usePaperStyle 封装 localStorage 读写，刷新后自动恢复）
  const [paperGongwen, togglePaperStyle] = usePaperStyle();
  const saveTimer = useRef<number | null>(null);
  const { zoom, reset, bindRef, bindWheelRef } = useA4Zoom();
  // R7：斜杠菜单状态机（焦点不离开编辑器，详见 WritingSlashMenu 注释）
  const slash = useSlashMenu();
  const slashRef = useRef(slash);
  slashRef.current = slash;

  // ── 编辑器（Markdown 序列化由 editor.getMarkdown() 提供）──
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TaskItem,
      Image.configure({ allowBase64: true }),
      TextStyle,
      Color,
      FontFamily,
      FontSizeMark,
      TextAlign.configure({ types: ["paragraph"] }),
      Highlight,
      ProtectedSpan,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "输入正文…（/ 唤起斜杠菜单，选中文字可 AI 改写）" }),
      Markdown,
    ],
    content: "",
    editorProps: {
      // 公文皮肤开启时编辑区追加 writing-paper-gongwen 类（版式规则见 index.css，与 printPreview 常量同源）
      attributes: { class: `prose focus:outline-none${paperGongwen ? " writing-paper-gongwen" : ""}` },
      transformPastedHTML: (html) => sanitizePastedHtml(html),
      handleKeyDown: (_view, event) => {
        // Ctrl+S 手动保存
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          void saveDoc();
          return true;
        }
        // R7：斜杠菜单键盘导航/唤起（"/" 照常插入文档，过滤词由 onUpdate 提取）
        return slashRef.current.handleKeyDown(event);
      },
      handlePaste: (_view, event) => {
        const img = Array.from(event.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
        if (!img) return false;
        const file = img.getAsFile();
        if (!file) return true;
        if (file.size > MAX_IMAGE_BYTES) {
          showToast("截图超过 2MB，已拒绝插入（防数据库膨胀）", "error");
          return true;
        }
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = () => editor?.chain().focus().setImage({ src: String(reader.result) }).run();
        return true;
      },
    },
    onUpdate: () => {
      // R7：斜杠菜单开着时从文档提取 "/" 之后的过滤词（"/" 被删或出现空白则收起）
      if (editorRef.current) slashRef.current.onDocUpdate(editorRef.current);
      // 变更 → 2s 防抖自动保存
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      setSaveState("saving");
      saveTimer.current = window.setTimeout(() => {
        void saveDoc();
      }, 2000);
    },
  });

  // ── 加载文档 ──
  // editor ref：useEditor 事件闭包拿不到 editor 变量，用 ref 镜像
  const editorRef = useRef<NonNullable<ReturnType<typeof useEditor>> | null>(null);
  useEffect(() => {
    editorRef.current = editor ?? null;
    slash.attach(editor ?? null);
  }, [editor, slash.attach]);
  useEffect(() => {
    void fetchWritingDoc(docId).then((res) => {
      if (res.success && res.data) {
        setDoc(res.data);
        setTitle(res.data.title);
        // contentType: "markdown" 由 @tiptap/markdown 注入（core 的 SetContentOptions 类型未声明，需 as never），
        // 不传则按 HTML 解析，[[...]] / **...** 等 markdown 语法会变成字面文本
        editor?.commands.setContent(res.data.contentMd || "", { contentType: "markdown" } as never);
        // W3：若存在匹配本文档的起草素材（语音页「生成会议纪要」预填），自动打开起草面板
        try {
          const raw = sessionStorage.getItem("writing:draftMaterial");
          if (raw) {
            const dm = JSON.parse(raw) as { material: string; docId: number };
            if (dm.docId === docId) {
              sessionStorage.removeItem("writing:draftMaterial");
              setDraftMaterial(dm.material);
              setDraftOpen(true);
            }
          }
        } catch { /* 忽略坏 JSON */ }
      } else {
        showToast(res.error || "加载失败", "error");
      }
    });
  }, [docId, editor, showToast]);

  // ── 保存（手动 / 自动共用）──
  const saveDoc = useCallback(async () => {
    if (!editor) return;
    setSaveState("saving");
    const md = editor.getMarkdown();
    const res = await updateWritingDoc(docId, { title: title.trim() || "未命名文档", contentMd: md });
    setSaveState(res.success ? "saved" : "idle");
    if (!res.success) showToast(res.error || "保存失败", "error");
  }, [editor, docId, title, showToast]);

  // W3：存入知识库
  const handleIngestToKnowledge = async () => {
    if (!editor) return;
    const md = editor.getMarkdown();
    if (!md.trim()) {
      showToast("内容为空，无法入库", "error");
      return;
    }
    const res = await ingestKnowledgeDocument({
      text: md,
      title: title.trim() || "未命名文档",
      sourceType: doc?.sourceType === "stt" ? "call" : "manual",
      sourceRef: doc?.sourceRef ?? undefined,
      projectId: doc?.projectId ?? undefined,
    });
    if (res.success) {
      showToast(`已存入知识库（文档 #${res.data?.documentId ?? ""}）`, "success");
    } else {
      showToast(res.error || "入库失败", "error");
    }
  };

  // 卸载前：未触发的防抖保存立即落盘；saveDoc 存 ref（空依赖，卸载 effect 只在真卸载时跑一次，避免 title 每键变化反复重挂触发提前 PUT）
  const saveDocRef = useRef(saveDoc);
  useEffect(() => {
    saveDocRef.current = saveDoc;
  });
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void saveDocRef.current();
      }
    };
  }, []);

  // ── 行内 AI：选中文字 → 浮出菜单 → 调 /api/writing/assist ──
  const handleSelectionChange = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      setAiMenu(null);
      return;
    }
    const sel = editor.state.selection;
    const coords = editor.view.coordsAtPos(sel.to);
    setAiMenu({ top: coords.top, left: coords.left });
  }, [editor]);

  useEffect(() => {
    editor?.on("selectionUpdate", handleSelectionChange);
    return () => {
      editor?.off("selectionUpdate", handleSelectionChange);
    };
  }, [editor, handleSelectionChange]);

  const runAiAction = async (actionId: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const selected = editor.state.doc.textBetween(from, to, " ");
    setAiBusy(true);
    setAiMenu(null);
    const res = await writingAssist({
      instruction: actionId,
      selectedText: selected,
      docType: doc?.docType,
      styleId: doc?.styleId ?? undefined,
      contextBefore: editor.state.doc.textBetween(0, from, " ").slice(-800),
    });
    setAiBusy(false);
    if (res.success && res.data) {
      // 网络往返期间用户可能继续编辑，from/to 是请求前的陈旧位置——
      // 替换错段落比改写失败更糟，先校验选区文本未变再插入（R5 竞态守卫，随 R6 重写重新植入）
      const currentText = editor.state.doc.textBetween(from, to, " ");
      if (currentText !== selected) {
        showToast("等待期间原文已被编辑，AI 结果与选区不再对应，未插入", "error");
        return;
      }
      editor.chain().focus().insertContentAt({ from, to }, res.data.text).run();
    } else {
      showToast(res.error || "AI 改写失败", "error");
    }
  };
  // 返回列表：先把挂起的防抖保存立即落盘（含标题），完成后再刷新列表——
  // 否则列表 GET 与落盘 PUT 竞速，会显示旧标题（验收反馈）
  const handleBack = async () => {
    if (saveTimer.current) { window.clearTimeout(saveTimer.current); saveTimer.current = null; }
    await saveDoc();
    onBack();
  };

  // R15：快照式预览（打开瞬间定格，不实时同步）；顶栏按钮与导出 PDF 项共用
  const openPreview = useCallback(() => {
    setPreviewSnapshot({ markdown: editor?.getMarkdown() ?? "", title });
    setPreviewOpen(true);
  }, [editor, title]);

  // T3 自动体检：AI 初稿常带 [[残留]]/套话/层级跳号，生成完立即自检并弹体检面板
  const handleDraftGenerated = (content: string) => {
    if (!content.trim()) return showToast("AI 未返回内容", "error");
    editor?.commands.setContent(content, { contentType: "markdown" } as never);
    setDraftOpen(false);
    void saveDoc();
    const warnings = runWritingCheck(content).filter((r) => !r.ok);
    if (warnings.length > 0) {
      showToast(`初稿体检：${warnings.map((w) => w.label).join("、")} 有提醒，建议交稿前处理`, "warning");
      setCheckOpen(true);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部条：返回 + 标题 + 保存状态 */}
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <Button variant="ghost" size="sm" onClick={() => void handleBack()} aria-label="返回列表">
          <Icon name="ArrowLeft" size={16} />
        </Button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文档标题…"
          className="flex-1 min-w-0 text-base font-bold bg-transparent focus:outline-none"
          style={{ color: "var(--fg)" }}
        />
        <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>
          {saveState === "saving" ? "保存中…" : saveState === "saved" ? "已保存" : ""}
        </span>
        {/* W3：AI 起草 / 存入知识库 / 导出 docx / R6 交稿体检 */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setDraftOpen(true)}>
            <Icon name="Sparkles" size={15} />
            起草
          </Button>
          {can("knowledge:create") && (
            <Button variant="ghost" size="sm" onClick={handleIngestToKnowledge}>
              <Icon name="Database" size={15} />
              存知识库
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setCheckOpen(true)} disabled={!editor}>
            <Icon name="FileCheck" size={15} />
            体检
          </Button>
          <Button variant="ghost" size="sm" onClick={openPreview} disabled={!editor}>
            <Icon name="Eye" size={15} />
            预览
          </Button>
          <WritingExportMenu editor={editor} title={title.trim() || "未命名文档"} onOpenPreview={openPreview} />
        </div>
      </div>

      {/* R6：A4 缩放百分比（Ctrl+滚轮缩放，双击重置） */}
      <div
        className="flex items-center justify-end px-5 py-1 border-b"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <button
          onDoubleClick={reset}
          title="Ctrl+滚轮缩放视图；双击此数字重置 100%"
          className="text-xs select-none cursor-default"
          style={{ color: "var(--muted)" }}
        >
          {Math.round(zoom * 100)}%
        </button>
      </div>

      {/* 起草面板（W3） */}
      {draftOpen && (
        <WritingDraftPanel
          docId={docId}
          docType={doc?.docType}
          styleId={doc?.styleId ?? undefined}
          material={draftMaterial || undefined}
          autoStart={!!draftMaterial}
          title={title}
          onGenerated={handleDraftGenerated}
          onClose={() => setDraftOpen(false)}
        />
      )}

      {/* R9：Ctrl+滚轮缩放监听范围 = 工具栏 + 纸张滚动区（wheel 监听挂此 wrapper） */}
      <div ref={bindWheelRef} className="flex-1 flex flex-col min-h-0">
        <EditorToolbar editor={editor} onTogglePaperStyle={togglePaperStyle} paperStyleOn={paperGongwen} />
        <div className="flex-1 overflow-y-auto flex justify-center items-start bg-[color:var(--panel-2)] py-6">
          <div className="editor-canvas" ref={bindRef}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* 交稿体检面板（R6） */}
      {editor && (
        <WritingCheckPanel editor={editor} open={checkOpen} onClose={() => setCheckOpen(false)} docType={doc?.docType} />
      )}

      {/* 打印预览（R13 三态之「预览态」：浏览器真实 A4 分页） */}
      <WritingPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        markdown={previewSnapshot.markdown}
        title={previewSnapshot.title}
      />
      {/* 版本历史（T2 草稿找回）：入口按钮 + 弹窗在复合组件里；恢复成功复位保存状态 */}
      <WritingHistoryModal docId={docId} editor={editor} onRestored={() => setSaveState("saved")} />

      {/* 斜杠菜单（R7：光标定位、焦点留编辑器、↑↓Enter 键盘导航） */}
      {editor && (
        <WritingSlashMenu
          editor={editor}
          open={slash.open}
          query={slash.query}
          index={slash.index}
          onHoverIndex={slash.setIndex}
          onSelect={slash.execute}
          onClose={slash.close}
        />
      )}

      <ChartPickerModal open={slash.chartOpen} onClose={slash.closeChartPicker} onInsert={(dataUrl) => editor?.chain().focus().setImage({ src: dataUrl, alt: "图表" }).run()} />
      {/* 行内 AI 菜单（选中文字后浮出，R13 抽成 WritingAiMenu） */}
      {aiMenu && editor && (
        <WritingAiMenu position={aiMenu} busy={aiBusy} onAction={(id) => void runAiAction(id)} />
      )}
    </div>
  );
};

export default WritingEditor;
