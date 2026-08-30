/**
 * WritingDocRow — 写作中心文档列表行（P3 批量删除时从 WritingIndex 原样拆出）
 *
 * 渲染逻辑与 WritingIndex 原行零差异，仅新增行首复选框：
 *   · 复选框：onClick stopPropagation，勾选不触发行点击进编辑器
 *   · 标题/元信息 + 移入 DropdownMenu（canUpdate && folders.length>0）+ 删除按钮
 *   · showCheckbox 与删除按钮同源于 can("writing:delete")（父层统一计算后传入）
 */

import React from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import type { WritingDoc, WritingFolder } from "@/services/writing-client";

interface WritingDocRowProps {
  doc: WritingDoc;
  folderName?: string;
  /** 行首复选框开关（= can("writing:delete")）；行内删除按钮同源此权限 */
  showCheckbox: boolean;
  checked: boolean;
  onToggleCheckbox: (id: number) => void;
  canUpdate: boolean;
  folders: WritingFolder[];
  onMoveDoc: (doc: WritingDoc, folderId: number | null) => void;
  onDelete: (doc: WritingDoc) => void;
  onOpen: (doc: WritingDoc) => void;
}

const WritingDocRow: React.FC<WritingDocRowProps> = ({
  doc,
  folderName,
  showCheckbox,
  checked,
  onToggleCheckbox,
  canUpdate,
  folders,
  onMoveDoc,
  onDelete,
  onOpen,
}) => {
  return (
    <div
      className="flex items-center justify-between px-5 py-4 border-b cursor-pointer hover:bg-[color:var(--panel-2)]"
      style={{ borderColor: "var(--border)" }}
      onClick={() => onOpen(doc)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        // 仅行自身聚焦时响应 Enter/Space；行内按钮/复选框的键盘事件（e.target≠行）不受影响
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault(); // Space 防页面滚动
          onOpen(doc);
        }
      }}
    >
      {/* 左组：复选框 + 标题/元信息（保持原有 justify-between 两栏布局不变） */}
      <div className="flex items-center">
        {showCheckbox && (
          <label
            className="p-2 -m-2 mr-3 flex items-center cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggleCheckbox(doc.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`选中 ${doc.title}`}
              className="rounded border-[color:var(--border)] text-[color:var(--accent)] focus:ring-[color:var(--accent-soft)]"
            />
          </label>
        )}
        <div>
          <div className="text-sm font-medium" style={{ color: "var(--fg)" }}>
            {doc.title}
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {doc.docType} · {formatTime(doc.updatedAt)}
            {folderName && ` · ${folderName}`}
          </div>
        </div>
      </div>
      {/* 容器拦住冒泡：点击「移入/删除」不触发行点击进编辑器；
          DropdownMenu 的开关 toggle div 在本容器内层，先于此拦截收到冒泡，菜单可正常打开 */}
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {/* R3：移入/移出文件夹 */}
        {canUpdate && folders.length > 0 && (
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
                disabled: doc.folderId === f.id,
                onClick: () => onMoveDoc(doc, f.id),
              })),
              {
                key: "move-out",
                label: "移出文件夹",
                divider: true,
                disabled: doc.folderId == null,
                onClick: () => onMoveDoc(doc, null),
              },
            ]}
          />
        )}
        {showCheckbox && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(doc);
            }}
          >
            <Icon name="Trash2" size={15} />
            删除
          </Button>
        )}
      </div>
    </div>
  );
};

function formatTime(s: string): string {
  if (!s) return "";
  return s.slice(0, 16).replace("T", " ");
}

export default WritingDocRow;
