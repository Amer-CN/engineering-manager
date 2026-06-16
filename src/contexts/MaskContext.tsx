/**
 * PII 脱敏全局开关 Context（2026-06-16）
 *
 * 设计：
 * - 默认明文（用户自己判断何时隐藏）
 * - localStorage 记忆 'workbuddy_mask_mode' 键
 * - 全应用统一开关（一次切=全应用切）
 * - 'plain' = 明文（默认），'masked' = 脱敏
 *
 * 用法：
 *   const { masked } = useMask();
 *   {masked ? maskIdCard(value) : value}
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type MaskMode = 'plain' | 'masked';

const STORAGE_KEY = 'workbuddy_mask_mode';
const DEFAULT_MODE: MaskMode = 'plain';

interface MaskContextValue {
  mode: MaskMode;
  masked: boolean;
  toggle: () => void;
  setMode: (m: MaskMode) => void;
}

const MaskContext = createContext<MaskContextValue | null>(null);

export function MaskProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<MaskMode>(DEFAULT_MODE);

  // 启动时从 localStorage 读取
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'plain' || saved === 'masked') {
        setModeState(saved);
      }
    } catch {
      // localStorage 不可用时保持默认
    }
  }, []);

  const setMode = (m: MaskMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // 静默忽略
    }
  };

  const toggle = () => setMode(mode === 'plain' ? 'masked' : 'plain');

  return (
    <MaskContext.Provider value={{ mode, masked: mode === 'masked', toggle, setMode }}>
      {children}
    </MaskContext.Provider>
  );
}

export function useMask(): MaskContextValue {
  const ctx = useContext(MaskContext);
  if (!ctx) {
    // fallback（未在 Provider 内时）：默认明文
    return { mode: 'plain', masked: false, toggle: () => {}, setMode: () => {} };
  }
  return ctx;
}
