/**
 * WritingWizard — 新建文档向导（R1 交互重设计）
 *
 * 三步一屏：高频文体大卡片（≤8 + 更多折叠）→ 素材输入 → 风格三档
 * 双出路并排：「AI 起草」（进编辑器流式生成）/「空白文档」（纯手动写）
 * 后端 30 种文体契约不变，仅前端收拢展示。
 */

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/hooks/useToast";
import { fetchWritingDocTypes } from "@/services/writing-client";

interface WritingWizardProps {
  open: boolean;
  onClose: () => void;
  /** AI 起草：建文档 → 进编辑器并自动开起草面板（素材/风格已定） */
  onDraft: (opts: { title: string; docType: string; styleId: string; material: string }) => void;
  /** 空白文档：建文档 → 直接进编辑器手动写 */
  onBlank: (opts: { title: string; docType: string }) => void;
}

/** 高频文体（展示优先级排序；code 对齐后端 WritingSkillService 注册表） */
const PINNED_TYPES = [
  { code: "minutes_items", label: "会议纪要", desc: "班子会/专题会/协调会记录成文", icon: "Users" },
  { code: "notice_general", label: "工作通知", desc: "对内对外发布事项通知", icon: "Bell" },
  { code: "weekly_report", label: "周报/日报", desc: "周期性工作进展汇报", icon: "CalendarDays" },
  { code: "summary", label: "工作总结", desc: "阶段工作回顾与成效", icon: "ClipboardCheck" },
  { code: "briefing_material", label: "汇报材料", desc: "向上级汇报的专项材料", icon: "Presentation" },
  { code: "notice_meeting", label: "会议通知", desc: "召集会议的时间地点议程", icon: "Mail" },
  { code: "survey_problem", label: "情况说明", desc: "问题经过、原因与处理说明", icon: "FileSearch" },
  { code: "plan", label: "工作计划", desc: "下阶段任务与安排", icon: "Target" },
];

/** 风格三档 → 后端 S1-S6 映射 */
const STYLE_TIERS = [
  { tier: "简洁", styleId: "S6", desc: "要点直给，适合日常快报" },
  { tier: "标准", styleId: "S3", desc: "成果清单式，结构清晰（推荐）", recommended: true },
  { tier: "详实", styleId: "S1", desc: "数据详尽，适合正式汇报" },
];

const WritingWizard: React.FC<WritingWizardProps> = ({ open, onClose, onDraft, onBlank }) => {
  const { showToast } = useToast();
  const [allTypes, setAllTypes] = useState<{ group: string; types: { code: string; label: string }[] }[]>([]);
  const [docType, setDocType] = useState("");
  const [title, setTitle] = useState("");
  const [material, setMaterial] = useState("");
  const [styleId, setStyleId] = useState("S3");
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetchWritingDocTypes().then((res) => {
      if (res.success && res.data) setAllTypes(res.data.groups ?? []);
    });
  }, [open]);

  // 「更多文体」= 全量 - 高频
  const pinnedCodes = useMemo(() => new Set(PINNED_TYPES.map((t) => t.code)), []);
  const moreTypes = useMemo(
    () => allTypes.flatMap((g) => g.types.filter((t) => !pinnedCodes.has(t.code)).map((t) => ({ ...t, group: g.group }))),
    [allTypes, pinnedCodes],
  );

  const selected = PINNED_TYPES.find((t) => t.code === docType) ?? moreTypes.find((t) => t.code === docType);
  const selectedLabel = selected?.label ?? "";

  const reset = () => {
    setDocType("");
    setTitle("");
    setMaterial("");
    setStyleId("S3");
    setShowMore(false);
  };

  const handleDraft = () => {
    if (!docType) return showToast("先选一个文体", "error");
    if (!material.trim()) return showToast("写几句素材（时间/事项/数据/人员）", "error");
    onDraft({ title: title.trim() || `${selectedLabel}（AI 起草）`, docType, styleId, material: material.trim() });
    reset();
    onClose();
  };

  const handleBlank = () => {
    if (!docType) return showToast("先选一个文体", "error");
    onBlank({ title: title.trim() || `未命名${selectedLabel}`, docType });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogTitle>新建文档</DialogTitle>
        <DialogDescription>选文体 → 给素材 → AI 起草或空白手写，两条路都行</DialogDescription>

        {/* ① 文体 */}
        <div className="pt-3">
          <div className="text-xs font-medium mb-2" style={{ color: "var(--fg-2)" }}>① 选文体</div>
          <div className="grid grid-cols-4 gap-2">
            {PINNED_TYPES.map((t) => (
              <button
                key={t.code}
                onClick={() => setDocType(t.code)}
                className="rounded-xl border p-3 text-left transition-colors"
                style={{
                  borderColor: docType === t.code ? "var(--accent)" : "var(--border)",
                  background: docType === t.code ? "var(--accent-soft)" : "var(--panel)",
                }}
              >
                <Icon name={t.icon} size={18} />
                <div className="text-sm font-medium mt-1.5" style={{ color: "var(--fg)" }}>{t.label}</div>
                <div className="text-xs mt-0.5 leading-tight" style={{ color: "var(--muted)" }}>{t.desc}</div>
              </button>
            ))}
          </div>
          {/* 更多文体（折叠） */}
          <button
            onClick={() => setShowMore((v) => !v)}
            className="mt-2 text-xs flex items-center gap-1"
            style={{ color: "var(--muted)" }}
          >
            <Icon name={showMore ? "ChevronUp" : "ChevronDown"} size={13} />
            {showMore ? "收起更多文体" : `更多文体（${moreTypes.length} 种，含公文全类）`}
          </button>
          {showMore && (
            <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
              <div className="grid grid-cols-3 gap-1.5">
                {moreTypes.map((t) => (
                  <button
                    key={t.code}
                    onClick={() => setDocType(t.code)}
                    className="rounded-lg border px-2 py-1.5 text-left text-xs"
                    style={{
                      borderColor: docType === t.code ? "var(--accent)" : "var(--border)",
                      background: docType === t.code ? "var(--accent-soft)" : "var(--panel)",
                      color: "var(--fg)",
                    }}
                  >
                    {t.label}
                    <span className="ml-1" style={{ color: "var(--muted)" }}>{t.group}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ② 标题 + 素材 */}
        <div className="pt-4">
          <div className="text-xs font-medium mb-2" style={{ color: "var(--fg-2)" }}>② 标题与素材（AI 起草时必填素材）</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`标题（留空自动命名，如「未命名${selectedLabel || "文档"}」）`}
            className="w-full h-9 px-3 rounded-lg text-sm border mb-2"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--fg)" }}
          />
          <textarea
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder={"列出关键信息即可，AI 来成文：\n· 时间/地点/事项\n· 关键数据（用 [[双括号]] 括住的数字不会被改动）\n· 涉及人员/单位\n\n例：8月12日项目部召开安全专题会，参会[[42]]人，排查隐患[[15]]项，已整改[[12]]项，剩余[[3]]项本周五前完成。"}
            className="w-full min-h-[110px] p-3 text-sm rounded-lg border resize-y"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--fg)" }}
          />
        </div>

        {/* ③ 风格（仅 AI 起草用） */}
        <div className="pt-4">
          <div className="text-xs font-medium mb-2" style={{ color: "var(--fg-2)" }}>③ 风格（AI 起草时生效）</div>
          <div className="grid grid-cols-3 gap-2">
            {STYLE_TIERS.map((s) => (
              <button
                key={s.tier}
                onClick={() => setStyleId(s.styleId)}
                className="rounded-lg border px-3 py-2 text-left"
                style={{
                  borderColor: styleId === s.styleId ? "var(--accent)" : "var(--border)",
                  background: styleId === s.styleId ? "var(--accent-soft)" : "var(--panel)",
                }}
              >
                <div className="text-sm font-medium" style={{ color: "var(--fg)" }}>
                  {s.tier}
                  {s.recommended && <span className="ml-1 text-xs" style={{ color: "var(--accent)" }}>推荐</span>}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 双出路 */}
        <div className="flex items-center justify-end gap-2 pt-5">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="outline" onClick={handleBlank}>
            <Icon name="PenLine" size={15} />
            空白文档（手写）
          </Button>
          <Button onClick={handleDraft}>
            <Icon name="Sparkles" size={15} />
            AI 起草
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WritingWizard;
