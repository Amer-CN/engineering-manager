import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/hooks/useToast";
import { fetchWritingDocTypes, streamingDraft, type WritingDocTypesResponse } from "@/services/writing-client";

interface WritingDraftPanelProps {
  docId: number;
  docType?: string;
  styleId?: string;
  material?: string;
  title?: string;
  onGenerated: (content: string) => void;
  onClose: () => void;
}

const STYLES = [
  { id: "S6", name: "简洁", desc: "要点直给" },
  { id: "S3", name: "标准", desc: "成果清单式" },
  { id: "S1", name: "详实", desc: "数据详尽" },
  { id: "S2", name: "问题导向", desc: "发现→分析→对策" },
  { id: "S4", name: "叙事", desc: "案例切入" },
  { id: "S5", name: "高位对标", desc: "对照上级精神" },
];

const WritingDraftPanel: React.FC<WritingDraftPanelProps> = ({ docId, docType, styleId, material, title, onGenerated, onClose }) => {
  const { showToast } = useToast();
  const [groups, setGroups] = useState<WritingDocTypesResponse["groups"]>([]);
  const [selDocType, setSelDocType] = useState(docType ?? "");
  const [selStyle, setSelStyle] = useState(styleId ?? "S1");
  const [detail, setDetail] = useState(3);
  const [materialText, setMaterialText] = useState(material ?? "");
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  // 高级选项（文体/风格/详略度）：无预填时展开引导选择，有预填时收起
  const [advanced, setAdvanced] = useState(!docType);

  useEffect(() => {
    void fetchWritingDocTypes().then((res) => {
      if (res.success && res.data) setGroups(res.data.groups ?? []);
    });
  }, []);

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
    void streamingDraft(
      {
        docType: selDocType,
        title: title || undefined,
        material: materialText,
        styleId: selStyle,
        detailLevel: detail,
      },
      (e) => {
        if (e.type === "content") {
          setStreamText((prev) => prev + e.text);
        } else if (e.type === "done") {
          setGenerating(false);
          onGenerated(e.content);
        } else if (e.type === "error") {
          setGenerating(false);
          showToast(e.error || "生成失败", "error");
        }
      },
    ).then((ok) => {
      // SSE 网络失败 / 流静默中断：复位 generating，避免按钮卡 loading
      if (!ok) {
        setGenerating(false);
        showToast("生成连接失败，请重试", "error");
      }
    });
  };

  const handleApply = () => {
    if (streamText.trim()) onGenerated(streamText);
    else showToast("还没有生成内容", "error");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border shadow-xl p-6"
        style={{ background: "var(--panel)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: "var(--fg)" }}>
            AI 起草
          </h2>
          <button onClick={onClose} className="text-sm" style={{ color: "var(--muted)" }}>
            关闭
          </button>
        </div>

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

        {/* 生成按钮 + 流式预览 */}
        <div className="flex items-center gap-2 mt-4">
          <Button onClick={handleGenerate} loading={generating} disabled={generating}>
            <Icon name="Sparkles" size={16} />
            生成
          </Button>
          {streamText && !generating && (
            <Button variant="success" onClick={handleApply}>
              应用内容
            </Button>
          )}
        </div>

        {/* 流式输出预览 */}
        {(generating || streamText) && (
          <div
            className="mt-4 p-3 rounded-lg border text-sm whitespace-pre-wrap max-h-64 overflow-y-auto"
            style={{ borderColor: "var(--border)", background: "var(--panel-2)", color: "var(--fg)" }}
          >
            {generating ? `${streamText}…` : streamText}
          </div>
        )}
      </div>
    </div>
  );
};

export default WritingDraftPanel;
