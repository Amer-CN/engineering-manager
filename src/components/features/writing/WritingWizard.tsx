/**
 * WritingWizard — 新建文档向导（R2：右侧 Drawer 形态）
 *
 * 形态对齐仓库/发票的表单惯例（S17 Drawer 480px 侧滑）：
 *   · 纵向步骤：高频文体卡（≤8）→ 更多文体折叠 → 标题/素材 → 风格四档
 *   · footer 固定「空白文档（手写）/ AI 起草」双出路
 *   · dirty 防误关：选了文体或写了素材，Esc/遮罩/X 先弹确认
 */

import React, { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
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

/** 高频文体（展示优先级排序；code/group 对齐后端 WritingSkillService 注册表） */
const PINNED_TYPES = [
  { code: "minutes_items", label: "会议纪要", desc: "班子会/专题会/协调会记录成文", icon: "Users", group: "会议纪要" },
  { code: "notice_general", label: "工作通知", desc: "对内对外发布事项通知", icon: "Bell", group: "通知" },
  { code: "weekly_report", label: "周报/日报", desc: "周期性工作进展汇报", icon: "CalendarDays", group: "周报汇报" },
  { code: "summary", label: "工作总结", desc: "阶段工作回顾与成效", icon: "ClipboardCheck", group: "简报总结" },
  { code: "briefing_material", label: "汇报材料", desc: "向上级汇报的专项材料", icon: "Presentation", group: "周报汇报" },
  { code: "notice_meeting", label: "会议通知", desc: "召集会议的时间地点议程", icon: "Mail", group: "通知" },
  { code: "survey_problem", label: "情况说明", desc: "问题经过、原因与处理说明", icon: "FileSearch", group: "调研报告" },
  { code: "plan", label: "工作计划", desc: "下阶段任务与安排", icon: "Target", group: "计划方案" },
];

/** 风格四档 → 后端 S1-S6 映射；auto 在 Index 层经 next-style 端点 resolve 为真实编号 */
const STYLE_TIERS = [
  { tier: "简洁", styleId: "S6", desc: "要点直给，适合日常快报" },
  { tier: "标准", styleId: "S3", desc: "成果清单式，结构清晰（推荐）" },
  { tier: "详实", styleId: "S1", desc: "数据详尽，适合正式汇报" },
  { tier: "自动轮换", styleId: "auto", desc: "记住上次风格，S1-S6 每周自动换，避免一个腔调" },
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
      else showToast("文体选项加载失败，请刷新重试", "error");
    });
  }, [open, showToast]);

  // 「更多文体」= 全量 - 高频
  const pinnedCodes = useMemo(() => new Set(PINNED_TYPES.map((t) => t.code)), []);
  const moreTypes = useMemo(
    () => allTypes.flatMap((g) => g.types.filter((t) => !pinnedCodes.has(t.code)).map((t) => ({ ...t, group: g.group }))),
    [allTypes, pinnedCodes],
  );

  const selected = PINNED_TYPES.find((t) => t.code === docType) ?? moreTypes.find((t) => t.code === docType);
  const selectedLabel = selected?.label ?? "";
  // 选了文体或写了任何内容 = 有进度，误关需确认
  const dirty = !!docType || !!title.trim() || !!material.trim();

  const reset = () => {
    setDocType("");
    setTitle("");
    setMaterial("");
    setStyleId("S3");
    setShowMore(false);
  };

  // 选文体同时定风格默认：周报汇报组默认「自动轮换」（R4），其余保持 S3
  const pickDocType = (code: string, group: string) => {
    setDocType(code);
    setStyleId(group === "周报汇报" ? "auto" : "S3");
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
    <Drawer
      open={open}
      onClose={() => { reset(); onClose(); }}
      icon="PenLine"
      title="新建文档"
      dirty={dirty}
      width={480}
      footer={
        <div className="flex items-center gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={handleBlank}>
            <Icon name="PenLine" size={15} />
            空白文档（手写）
          </Button>
          <Button className="flex-1" onClick={handleDraft}>
            <Icon name="Sparkles" size={15} />
            AI 起草
          </Button>
        </div>
      }
    >
      <div className="space-y-5" style={{ padding: "20px 24px" }}>
        {/* ① 文体 */}
        <section>
          <div className="text-xs font-medium mb-2" style={{ color: "var(--fg-2)" }}>
            ① 选文体
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PINNED_TYPES.map((t) => (
              <button
                key={t.code}
                onClick={() => pickDocType(t.code, t.group)}
                className="rounded-xl border p-3 text-left transition-colors"
                style={{
                  borderColor: docType === t.code ? "var(--accent)" : "var(--border)",
                  background: docType === t.code ? "var(--accent-soft)" : "var(--panel)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon name={t.icon} size={16} />
                  <span className="text-sm font-medium" style={{ color: "var(--fg)" }}>{t.label}</span>
                </div>
                <div className="text-xs mt-1 leading-tight" style={{ color: "var(--muted)" }}>{t.desc}</div>
              </button>
            ))}
          </div>
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
              <div className="grid grid-cols-2 gap-1.5">
                {moreTypes.map((t) => (
                  <button
                    key={t.code}
                    onClick={() => pickDocType(t.code, t.group)}
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
        </section>

        {/* ② 标题 + 素材 */}
        <section>
          <div className="text-xs font-medium mb-2" style={{ color: "var(--fg-2)" }}>
            ② 标题与素材（AI 起草时必填素材）
          </div>
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
            placeholder={"列出关键信息即可，AI 来成文：\n· 时间/地点/事项\n· 关键数据（用 [[双括号]] 括住的数字不会被改动）\n· 涉及人员/单位\n\n例：8月12日项目部召开安全专题会，参会[[42]]人，排查隐患[[15]]项，已整改[[12]]项。"}
            className="w-full min-h-[110px] p-3 text-sm rounded-lg border resize-y"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--fg)" }}
          />
        </section>

        {/* ③ 风格（仅 AI 起草用） */}
        <section>
          <div className="text-xs font-medium mb-2" style={{ color: "var(--fg-2)" }}>
            ③ 风格（AI 起草时生效）
          </div>
          <div className="space-y-2">
            {STYLE_TIERS.map((s) => (
              <button
                key={s.tier}
                onClick={() => setStyleId(s.styleId)}
                className="w-full rounded-lg border px-3 py-2 text-left"
                style={{
                  borderColor: styleId === s.styleId ? "var(--accent)" : "var(--border)",
                  background: styleId === s.styleId ? "var(--accent-soft)" : "var(--panel)",
                }}
              >
                <div className="text-sm font-medium" style={{ color: "var(--fg)" }}>
                  {s.tier}
                  {s.styleId === "S3" && <span className="ml-1 text-xs" style={{ color: "var(--accent)" }}>推荐</span>}
                  {s.styleId === "auto" && <span className="ml-1 text-xs" style={{ color: "var(--accent)" }}>周报推荐</span>}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </Drawer>
  );
};

export default WritingWizard;
