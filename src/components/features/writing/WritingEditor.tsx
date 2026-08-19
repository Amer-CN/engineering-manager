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
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { usePermission } from "@/hooks/usePermission";
import { ingestKnowledgeDocument } from "@/services/knowledge-client";
import { exportMarkdownAsDocx } from "@/utils/docxExport";
import WritingDraftPanel from "./WritingDraftPanel";
import EditorToolbar from "./EditorToolbar";
import {
  fetchWritingDoc,
  updateWritingDoc,
  writingAssist,
  type WritingDoc,
} from "@/services/writing-client";

/** 粘贴图片体积上限：超过则拒绝插入（base64 内嵌会直接撑大 contentMd，防止数据库膨胀） */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

interface SlashItem {
  label: string;
  hint: string;
  icon: string;
  run: (editor: NonNullable<ReturnType<typeof useEditor> extends infer T ? (T extends null ? never : T) : never>) => void;
}

/** 行内 AI 动作（与后端 /api/writing/assist 的 instruction 对齐） */
const AI_ACTIONS = [
  { id: "rewrite", label: "改写", icon: "Wand2" },
  { id: "polish", label: "润色", icon: "Sparkles" },
  { id: "expand", label: "扩写", icon: "Maximize2" },
  { id: "shorten", label: "缩写", icon: "Minimize2" },
] as const;

interface WritingEditorProps {
  docId: number;
  onBack: () => void;
}

const WritingEditor: React.FC<WritingEditorProps> = ({ docId, onBack }) => {
  const { showToast } = useToast();
  const { can } = usePermission();
  const [doc, setDoc] = useState<WritingDoc | null>(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMenu, setAiMenu] = useState<{ top: number; left: number } | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftMaterial, setDraftMaterial] = useState("");
  const saveTimer = useRef<number | null>(null);

  // ── 编辑器（Markdown 序列化由 @tiptap/markdown 的 storage.markdown 提供）──
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
      Highlight,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "输入正文…（/ 唤起斜杠菜单，选中文字可 AI 改写）" }),
      Markdown,
    ],
    content: "",
    editorProps: {
      attributes: { class: "prose focus:outline-none" },
      handleKeyDown: (_view, event) => {
        // Ctrl+S 手动保存
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          void saveDoc();
          return true;
        }
        if (event.key === "/" && !event.ctrlKey && !event.metaKey) {
          setSlashOpen(true);
          setSlashQuery("");
          return false;
        }
        return false;
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
      // 变更 → 2s 防抖自动保存
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      setSaveState("saving");
      saveTimer.current = window.setTimeout(() => {
        void saveDoc();
      }, 2000);
    },
  });

  // ── 加载文档 ──
  useEffect(() => {
    void fetchWritingDoc(docId).then((res) => {
      if (res.success && res.data) {
        setDoc(res.data);
        setTitle(res.data.title);
        editor?.commands.setContent(res.data.contentMd || "");
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
    const md = (editor.storage.markdown as unknown as { getMarkdown: () => string }).getMarkdown();
    const res = await updateWritingDoc(docId, { title: title.trim() || "未命名文档", contentMd: md });
    setSaveState(res.success ? "saved" : "idle");
    if (!res.success) showToast(res.error || "保存失败", "error");
  }, [editor, docId, title, showToast]);

  // W3：存入知识库
  const handleIngestToKnowledge = async () => {
    if (!editor) return;
    const md = (editor.storage.markdown as unknown as { getMarkdown: () => string }).getMarkdown();
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

  // W3：导出 docx
  const handleExportDocx = () => {
    if (!editor) return;
    const md = (editor.storage.markdown as unknown as { getMarkdown: () => string }).getMarkdown();
    void exportMarkdownAsDocx(md, title.trim() || "未命名文档").catch(() => {
      showToast("导出失败", "error");
    });
  };

  // 卸载前：若还有未触发的防抖保存，立即落盘（避免最后一击丢失）
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        void saveDoc();
      }
    };
  }, [saveDoc]);

  // ── 斜杠菜单：插入块 ──
  const slashItems: SlashItem[] = [
    { label: "一级标题", hint: "Heading 1", icon: "Heading1", run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "二级标题", hint: "Heading 2", icon: "Heading2", run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "三级标题", hint: "Heading 3", icon: "Heading3", run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "无序列表", hint: "Bullet List", icon: "List", run: (e) => e.chain().focus().toggleBulletList().run() },
    { label: "有序列表", hint: "Ordered List", icon: "ListOrdered", run: (e) => e.chain().focus().toggleOrderedList().run() },
    { label: "任务清单", hint: "Task List", icon: "Square", run: (e) => e.chain().focus().toggleTaskList().run() },
    { label: "代码块", hint: "Code Block", icon: "Braces", run: (e) => e.chain().focus().toggleCodeBlock().run() },
    { label: "高亮", hint: "Highlight", icon: "PaintBucket", run: (e) => e.chain().focus().toggleHighlight().run() },
    { label: "图片", hint: "URL / 粘贴截图", icon: "Image", run: (e) => { const url = window.prompt("输入图片 URL（也可直接粘贴截图）"); if (url) e.chain().focus().setImage({ src: url.trim() }).run(); } },
    { label: "表格", hint: "Table 2×2", icon: "Table", run: (e) => e.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run() },
    { label: "引用", hint: "Blockquote", icon: "Quote", run: (e) => e.chain().focus().toggleBlockquote().run() },
    { label: "分割线", hint: "Horizontal Rule", icon: "Minus", run: (e) => e.chain().focus().setHorizontalRule().run() },
  ];
  const filteredSlash = slashItems.filter(
    (s) => !slashQuery || s.label.includes(slashQuery) || s.hint.toLowerCase().includes(slashQuery.toLowerCase()),
  );

  const runSlash = (item: SlashItem) => {
    if (editor) {
      // 删除刚输入的 "/"（光标前一个字符），再执行命令
      const { from } = editor.state.selection;
      const before = editor.state.doc.textBetween(from - 1, from, " ");
      if (before === "/") {
        editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
      }
      item.run(editor);
    }
    setSlashOpen(false);
  };

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
      editor.chain().focus().insertContentAt({ from, to }, res.data.text).run();
    } else {
      showToast(res.error || "AI 改写失败", "error");
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部条：返回 + 标题 + 保存状态 */}
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <Button variant="ghost" size="sm" onClick={onBack}>
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
        {/* W3：AI 起草 / 存入知识库 / 导出 docx */}
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
          <Button variant="ghost" size="sm" onClick={handleExportDocx}>
            <Icon name="FileDown" size={15} />
            导出
          </Button>
        </div>
      </div>

      {/* 起草面板（W3） */}
      {draftOpen && (
        <WritingDraftPanel
          docId={docId}
          docType={doc?.docType}
          styleId={doc?.styleId ?? undefined}
          material={draftMaterial || undefined}
          title={title}
          onGenerated={(content) => {
            editor?.commands.setContent(content);
            setDraftOpen(false);
            void saveDoc();
          }}
          onClose={() => setDraftOpen(false)}
        />
      )}

      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto flex justify-center bg-[color:var(--panel-2)] py-6">
        <div className="a4-paper">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* 斜杠菜单 */}
      {slashOpen && editor && (
        <div
          className="absolute z-50 w-64 rounded-xl border shadow-lg overflow-hidden bg-white"
          style={{ borderColor: "var(--border)", left: 80, top: 80 }}
        >
          <div className="px-3 py-2 border-b text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
            插入
          </div>
          <input
            autoFocus
            value={slashQuery}
            onChange={(e) => setSlashQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSlashOpen(false);
            }}
            placeholder="搜索命令…"
            className="w-full px-3 py-2 text-sm bg-transparent focus:outline-none"
            style={{ color: "var(--fg)" }}
          />
          <div className="max-h-64 overflow-y-auto">
            {filteredSlash.map((item) => (
              <button
                key={item.label}
                onClick={() => runSlash(item)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[color:var(--panel-2)]"
                style={{ color: "var(--fg)" }}
              >
                <Icon name={item.icon} size={16} />
                <span className="flex-1">{item.label}</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>{item.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 行内 AI 菜单（选中文字后浮出） */}
      {aiMenu && editor && (
        <div
          className="fixed z-50 flex items-center gap-1 rounded-xl border shadow-lg px-2 py-1.5 bg-white"
          style={{ borderColor: "var(--border)", top: aiMenu.top - 40, left: Math.min(aiMenu.left, window.innerWidth - 280) }}
        >
          {AI_ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => void runAiAction(a.id)}
              disabled={aiBusy}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg hover:bg-[color:var(--panel-2)] disabled:opacity-50"
              style={{ color: "var(--fg)" }}
            >
              <Icon name={a.icon} size={13} />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default WritingEditor;
