/**
 * usePaperStyle — 写作中心「公文版式皮肤」开关状态（UI 偏好持久化）
 *
 * 存储 key = "writing.paperStyle"（"1" 开 / "0" 关），localStorage 读写全部封装在本 hook 内，
 * 组件不得直接操作 localStorage（项目红线）。该 key 为 UI 偏好、非敏感数据，按项目现有
 * 模式存放；若未来有专用 preferences context，则迁移至此。
 */
import { useState, useCallback } from "react";

const KEY = "writing.paperStyle";

/** 返回 [当前是否公文版式, 切换函数]；初始值从 localStorage 恢复，toggle 同步写回 */
export function usePaperStyle(): [boolean, () => void] {
  const [on, setOn] = useState(() => localStorage.getItem(KEY) === "1");
  const toggle = useCallback(() => {
    setOn((v) => {
      localStorage.setItem(KEY, v ? "0" : "1");
      return !v;
    });
  }, []);
  return [on, toggle];
}
