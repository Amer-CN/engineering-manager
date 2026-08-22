import React from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { WritingFolder } from "@/services/writing-client";

interface WritingFolderFilterProps {
  /** 文件夹列表（软删已过滤） */
  folders: WritingFolder[];
  /** 当前筛选值：""=全部文档, "0"=未分组, "N"=文件夹 id */
  value: string;
  onChange: (v: string) => void;
  /** 新建文件夹（已由父级做权限判断） */
  onCreate: () => void;
  /** 是否显示「新建文件夹」按钮（writing:create） */
  canCreate: boolean;
}

/** R3：页头文件夹筛选下拉（全部文档/未分组/各文件夹）+ 新建文件夹入口 */
const WritingFolderFilter: React.FC<WritingFolderFilterProps> = ({
  folders,
  value,
  onChange,
  onCreate,
  canCreate,
}) => {
  return (
    <>
      <select
        aria-label="文件夹筛选"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-3 rounded-lg text-sm border"
        style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--fg)" }}
      >
        <option value="">全部文档</option>
        <option value="0">未分组</option>
        {folders.map((f) => (
          <option key={f.id} value={String(f.id)}>
            {f.name}
          </option>
        ))}
      </select>

      {canCreate && (
        <Button variant="ghost" size="sm" onClick={onCreate}>
          <Icon name="FolderOpen" size={15} />
          新建文件夹
        </Button>
      )}
    </>
  );
};

export default WritingFolderFilter;
