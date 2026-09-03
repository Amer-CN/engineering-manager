/**
 * ChartPickerModal — 写作中心「/图表」数据源选择器（阶段三：编辑风图表入文）
 *
 * 斜杠菜单「图表」项触发（open 由 WritingSlashMenu 的 useSlashMenu 内聚管理）。
 * 流程：选数据源卡片 → getAPI() 拉真实业务数据 → EditorialDonut 预览（与最终 PNG
 * 同尺寸同几何：computeDonutSegments 同源）→「插入图表」→ buildDonutSvg + svgToPngDataUrl
 * 转 2 倍 PNG dataURL → onInsert 回调（WritingEditor 里 setImage 插入文档）。
 * 失败路径静默：行内错误文案，不弹 toast，不阻塞写作主流程。
 * 数据诚实：金额/计数全部来自前端真实聚合；底注写数据来源与取数时间；不含随机数。
 */

import React, { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EditorialDonut, type EditorialDonutDatum } from "@/components/ui/charts/EditorialDonut";
import { getCategoryLabel } from "@/components/features/costLedger/config";
import { invoiceStatusLabels } from "@/components/features/dashboard/dashboardConstants";
import { CHART_COLORS, COLORS } from "@/components/features/dashboard/dashboardColors";
import { formatMoney } from "@/utils/format";
import { formatDateTime } from "@/utils/date";
import {
  buildDonutSvg,
  svgToPngDataUrl,
  DONUT_SVG_WIDTH,
  DONUT_SVG_HEIGHT,
} from "@/utils/chartImage";
import { getAPI } from "@/services/api-adapter";

interface ChartPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** 确认插入：已光栅化的 PNG dataURL（WritingEditor 里 setImage 写进文档） */
  onInsert: (dataUrl: string) => void;
}

type ChartSource = "expense" | "invoice";

interface ChartPayload {
  data: EditorialDonutDatum[];
  title: string;
  /** 底注：数据来源 + 取数时间（+ 其余 N 类并入其他） */
  note: string;
  formatValue: (n: number) => string;
}

const SOURCE_CARDS: { key: ChartSource; title: string; desc: string; icon: string }[] = [
  { key: "expense", title: "成本分类占比", desc: "成本台账按分类聚合，TOP 6 + 其余合并", icon: "BarChart3" },
  { key: "invoice", title: "发票状态分布", desc: "发票台账按状态聚合计数", icon: "PieChart" },
];

/**
 * 发票状态语义色：映射语义同 ReportCharts.tsx 的 DOT_FILL（success/warning/danger/muted）。
 * SVG 进 <img> 后读不到 CSS 变量，这里取 dashboardColors 同语义 hex（emerald/amber/red/slate）。
 */
const INVOICE_STATUS_FILL: Record<string, string> = {
  "bg-success-500": COLORS.invoiceReceived,
  "bg-warning-500": COLORS.invoicePartiallyPaid,
  "bg-danger-500": COLORS.invoiceRedFlushed,
  "bg-[color:var(--muted)]": COLORS.invoiceFallback,
};

/** 拉取并聚合所选数据源的真实业务数据（失败抛错，由调用方行内提示） */
async function fetchPayload(source: ChartSource): Promise<ChartPayload> {
  const api = await getAPI();
  if (source === "expense") {
    if (!api?.getDashboardStats) throw new Error("数据接口不可用");
    const res = await api.getDashboardStats();
    if (!res?.success) throw new Error(res?.error || "仪表盘数据拉取失败");
    const byCategory: Record<string, number> = res.data?.expenseByCategory ?? {};
    const entries = Object.entries(byCategory)
      .map(([code, amount]) => ({ name: getCategoryLabel(code), amount }))
      .filter((d) => d.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const top = entries.slice(0, 6);
    const rest = entries.slice(6);
    const data: EditorialDonutDatum[] = top.map((d, i) => ({
      name: d.name,
      value: d.amount,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
    if (rest.length > 0) {
      data.push({
        name: "其他",
        value: rest.reduce((sum, d) => sum + d.amount, 0),
        color: COLORS.fallbackCategory,
      });
    }
    if (data.length === 0) throw new Error("暂无成本分类数据");
    const merged = rest.length > 0 ? `其余 ${rest.length} 类并入其他 · ` : `共 ${data.length} 类 · `;
    return {
      data,
      title: "成本分类占比",
      note: `${merged}数据来源：成本台账 · 取数时间 ${formatDateTime(new Date())}`,
      formatValue: (n) => formatMoney(n),
    };
  }
  if (!api?.getInvoices) throw new Error("数据接口不可用");
  const res = await api.getInvoices();
  if (!res?.success) throw new Error(res?.error || "发票数据拉取失败");
  const invoices: { status?: string }[] = res.data ?? [];
  const counts: Record<string, number> = {};
  for (const inv of invoices) {
    const s = inv.status || "其他";
    counts[s] = (counts[s] || 0) + 1;
  }
  const data: EditorialDonutDatum[] = [];
  for (const code of Object.keys(invoiceStatusLabels)) {
    const v = counts[code] || 0;
    if (v > 0) {
      data.push({
        name: invoiceStatusLabels[code].text,
        value: v,
        color: INVOICE_STATUS_FILL[invoiceStatusLabels[code].dot] ?? COLORS.invoiceFallback,
      });
    }
  }
  // 未知状态追加在末尾（同 ReportCharts）
  for (const code of Object.keys(counts)) {
    if (!invoiceStatusLabels[code]) {
      data.push({ name: code, value: counts[code], color: COLORS.invoiceFallback });
    }
  }
  if (data.length === 0) throw new Error("暂无发票数据");
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return {
    data,
    title: "发票状态分布",
    note: `共 ${total} 张 · 数据来源：发票台账 · 取数时间 ${formatDateTime(new Date())}`,
    formatValue: String,
  };
}

const ChartPickerModal: React.FC<ChartPickerModalProps> = ({ open, onClose, onInsert }) => {
  const [source, setSource] = useState<ChartSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<ChartPayload | null>(null);
  const [inserting, setInserting] = useState(false);

  // 每次打开复位到「选数据源」步骤
  useEffect(() => {
    if (open) {
      setSource(null);
      setPayload(null);
      setError("");
      setInserting(false);
    }
  }, [open]);

  const pick = useCallback(async (s: ChartSource) => {
    setSource(s);
    setLoading(true);
    setError("");
    try {
      setPayload(await fetchPayload(s));
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "数据拉取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const backToCards = useCallback(() => {
    setSource(null);
    setPayload(null);
    setError("");
  }, []);

  const insert = useCallback(async () => {
    if (!payload) return;
    setInserting(true);
    try {
      const svg = buildDonutSvg(payload.data, {
        title: payload.title,
        note: payload.note,
        formatValue: payload.formatValue,
      });
      const dataUrl = await svgToPngDataUrl(svg, DONUT_SVG_WIDTH, DONUT_SVG_HEIGHT);
      onInsert(dataUrl);
      onClose();
    } catch {
      setError("图表转图片失败，请重试");
    } finally {
      setInserting(false);
    }
  }, [payload, onInsert, onClose]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Icon name="PieChart" size={16} />
          插入图表
        </span>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs" style={{ color: error ? "var(--danger)" : "var(--muted)" }}>
            {error || "图表以 PNG 图片（2 倍图）插入文档，随导出链路走"}
          </span>
          <div className="flex items-center gap-2">
            {payload && (
              <Button variant="ghost" onClick={backToCards}>
                重选数据源
              </Button>
            )}
            <Button variant="primary" size="sm" disabled={!payload || inserting} onClick={() => void insert()}>
              <Icon name="Check" size={14} />
              {inserting ? "转换中…" : "插入图表"}
            </Button>
          </div>
        </div>
      }
    >
      {!source && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOURCE_CARDS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => void pick(c.key)}
              className="text-left p-4 rounded-xl border transition-colors hover:bg-[color:var(--panel-2)]"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--fg)" }}>
                <Icon name={c.icon} size={16} />
                {c.title}
              </div>
              <div className="text-caption mt-1" style={{ color: "var(--muted)" }}>
                {c.desc}
              </div>
            </button>
          ))}
        </div>
      )}
      {source && loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-warning-500 border-t-transparent" />
        </div>
      )}
      {source && !loading && payload && (
        <div>
          <div className="text-sm font-semibold mb-3" style={{ color: "var(--fg)" }}>
            {payload.title}
          </div>
          {/* 预览与最终 PNG 同几何同尺寸（computeDonutSegments 同源、size=150 = SVG 圆环逻辑尺寸） */}
          <EditorialDonut data={payload.data} formatValue={payload.formatValue} size={150} />
          <p className="mt-3 text-caption" style={{ color: "var(--muted)" }}>
            {payload.note}
          </p>
        </div>
      )}
    </Modal>
  );
};

export default ChartPickerModal;
