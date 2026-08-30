import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Drawer } from "@/components/ui/Drawer";
import { useToastContext } from "@/components/ui/Toast/ToastProvider";
import { fetchWritingDocTypes, streamingDraft, type WritingDocTypesResponse } from "@/services/writing-client";

interface WritingDraftPanelProps {
  docId: number;
  docType?: string;
  styleId?: string;
  material?: string;
  title?: string;
  /** 素材已预填时挂载后自动触发生成（一步到位，免二次点击） */
  autoStart?: boolean;
  onGenerated: (content: string) => void;
  onClose: () => void;
}

/** R4 风格轮换：取与当前 docId 匹配的 sessionStorage 风格标注（用后即删，防重复插） */
const consumeStyleLabel = (docId: number): string | null => {
  try {
    const raw = sessionStorage.getItem("writing:styleLabel");
    if (!raw) return null;
    const entry = JSON.parse(raw) as { styleLabel?: string; docId?: number };
    if (entry.docId !== docId) return null;
    sessionStorage.removeItem("writing:styleLabel");
    return entry.styleLabel ?? null;
  } catch {
    return null;
  }
};

const STYLES = [
  { id: "S6", name: "简洁", desc: "要点直给" },
  { id: "S3", name: "标准", desc: "成果清单式" },
  { id: "S1", name: "详实", desc: "数据详尽" },
  { id: "S2", name: "问题导向", desc: "发现→分析→对策" },
  { id: "S4", name: "叙事", desc: "案例切入" },
  { id: "S5", name: "高位对标", desc: "对照上级精神" },
];

const WritingDraftPanel: React.FC<WritingDraftPanelProps> = ({ docId, docType, styleId, material, title, autoStart, onGenerated, onClose }) => {
  const { showToast } = useToastContext();
  const [groups, setGroups] = useState<WritingDocTypesResponse["groups"]>([]);
  const [selDocType, setSelDocType] = useState(docType ?? "");
  const [selStyle, setSelStyle] = useState(styleId ?? "S1");
  const [detail, setDetail] = useState(3);
  const [materialText, setMaterialText] = useState(material ?? "");
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  // 高级选项（文体/风格/详略度）：无预填时展开引导选择，有预填时收起
  const [advanced, setAdvanced] = useState(!docType);

  // R8 止血：中止控制器 + 丢弃标志——关面板/卸载后中止 fetch，且 done 到达不再写文档
  const abortRef = useRef<AbortController | null>(null);
  const discardedRef = useRef(false);

  // 卸载清理：中止进行中的流并置丢弃标志（emitGenerated 据此拒写）
  useEffect(() => {
    return () => {
      discardedRef.current = true;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    void fetchWritingDocTypes().then((res) => {
      if (res.success && res.data) setGroups(res.data.groups ?? []);
      else showToast("文体选项加载失败，请刷新重试", "error");
    });
  }, [showToast]);

  // 一步到位：素材预填时挂载后自动触发生成
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // R4 风格轮换：有本文档的标注时，生成文本开头拼「本周风格」blockquote 并 toast 提示
  const emitGenerated = (content: string) => {
    if (discardedRef.current) return; // 面板已关闭/卸载，结果作废不写文档
    const label = consumeStyleLabel(docId);
    if (label) showToast(`本周风格：${label}`, "success");
    onGenerated(label ? `> 本周风格：${label}\n\n${content}` : content);
  };

  // 关闭面板：先中止流 + 置丢弃标志，再走外层 onClose
  const handleClose = () => {
    discardedRef.current = true;
    abortRef.current?.abort();
    onClose();
  };

  const handleGenerate = () => {
    if (!selDocType) {
      showToast("请选择文体", "error");
      return;
    }
    if (!materialText.trim()) {
      showToast("请填写素材", "error");
      return;
    }
    setGenerating(true);
    setStreamText("");
    const controller = new AbortController();
    abortRef.current = controller;
    discardedRef.current = false;
    // doneReceived：error 事件也算流已终结论（避免错误 toast 之外再叠加中断 toast）
    let doneReceived = false;
    void streamingDraft(
      {
        docType: selDocType,
        title: title || undefined,
        material: materialText,
        styleId: selStyle,
        detailLevel: detail,
      },
      (e) => {
        if (discardedRef.current) return; // 已丢弃：事件一律不处理
        if (e.type === "content") {
          setStreamText((prev) => prev + e.text);
        } else if (e.type === "done") {
          doneReceived = true;
          emitGenerated(e.content);
        } else if (e.type === "error") {
          doneReceived = true;
          showToast(e.error || "生成失败", "error");
        }
      },
      controller.signal,
    ).then((failMsg) => {
      if (failMsg !== undefined) {
        // 连接失败：failMsg 为后端具体文案（null = 网络层异常无文案，回退通用提示）；
        // fetch 被用户关面板 abort（discardedRef=true）→ 静默
        if (!discardedRef.current) {
          showToast(failMsg ?? "生成连接失败，请重试", "error");
        }
        return;
      }
      // SSE 流静默截断（未收到 done/error 即结束）→ 提示，避免用户误以为生成完成
      if (!doneReceived && !discardedRef.current) showToast("生成连接中断", "error");
    }).finally(() => {
      // generating 统一复位：正常结束 / 中断 / abort 都走这里，杜绝按钮永久卡 loading
      setGenerating(false);
    });
  };

  const handleApply = () => {
    if (streamText.trim()) emitGenerated(streamText);
    else showToast("还没有生成内容", "error");
  };

  return (
    <Drawer
      open
      onClose={handleClose}
      icon="Sparkles"
      title="AI 起草"
      dirty={!!materialText.trim() || !!streamText}
      width={480}
      footer={
        <div className="flex items-center gap-2 w-full">
          <Button
            className="flex-1"
            onClick={handleGenerate}
            loading={generating}
            disabled={generating}
          >
            <Icon name="Sparkles" size={15} />
            {generating ? "生成中…" : "生成"}
          </Button>
          {streamText && !generating && (
            <Button variant="success" className="flex-1" onClick={handleApply}>
              应用内容
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4" style={{ padding: "20px 24px" }}>

        {/* 高级选项：文体/风格/详略度（预填时收起） */}
        <button
          onClick={() => setAdvanced((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium mb-2"
          style={{ color: "var(--muted)" }}
        >
          <Icon name={advanced ? "ChevronUp" : "ChevronDown"} size={13} />
          高级选项（文体 / 风格 / 详略度）
        </button>
        {advanced && (
          <div className="mb-4">
            {/* 文体（分组下拉） */}
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--fg-2)" }}>
              文体
            </label>
            <select
              value={selDocType}
              onChange={(e) => setSelDocType(e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm border mb-3"
              style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--fg)" }}
            >
              <option value="">请选择文体…</option>
              {groups.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.types.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* 风格（三档优先 + 全部） */}
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--fg-2)" }}>
              风格
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelStyle(s.id)}
                  className={`px-3 py-2 rounded-lg border text-left text-xs ${
                    selStyle === s.id ? "border-[color:var(--accent)]" : ""
                  }`}
                  style={{
                    borderColor: selStyle === s.id ? "var(--accent)" : "var(--border)",
                    background: selStyle === s.id ? "var(--accent-soft)" : "var(--panel)",
                    color: "var(--fg)",
                  }}
                  title={s.desc}
                >
                  <div className="font-bold">{s.name}</div>
                </button>
              ))}
            </div>

            {/* 详略度 1-5 */}
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--fg-2)" }}>
              详略度：{detail}（1=极简，5=详实）
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={detail}
              onChange={(e) => setDetail(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        {/* 素材 */}
        <label className="text-xs font-medium block mb-1" style={{ color: "var(--fg-2)" }}>
          素材 / 事实（用 [[双方括号]] 标记不可篡改的数据）
        </label>
        <textarea
          value={materialText}
          onChange={(e) => setMaterialText(e.target.value)}
          placeholder={"例如：2026年8月，项目部完成[[42]]个隐患整改，投入资金[[128.5万元]]…"}
          className="w-full min-h-[140px] p-3 text-sm rounded-lg border resize-y"
          style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--fg)" }}
        />
        {/* 知识库联动能力提示：让用户知道素材之外还有公司资料自动参考这回事 */}
        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          生成时会自动检索公司知识库补充参考资料；知识库暂无内容时仅用以上素材。
        </p>

        {/* 流式输出预览 */}
        {(generating || streamText) && (
          <div
            className="p-3 rounded-lg border text-sm whitespace-pre-wrap max-h-64 overflow-y-auto"
            style={{ borderColor: "var(--border)", background: "var(--panel-2)", color: "var(--fg)" }}
          >
            {generating ? `${streamText}…` : streamText}
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default WritingDraftPanel;
