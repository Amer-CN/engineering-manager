/**
 * PII 脱敏全局开关 Context（v4 调试版）
 *
 * v3 白屏真因排查：可能 createContext 默认值 + Provider 值不匹配
 * v4 改动：
 * 1. createContext 默认值改为完整对象（不是 null）—— 避免 fallback
 * 2. useEffect 用 try-catch 包裹——避免 SSR/沙箱 localStorage 报错
 * 3. 初始值 DEFAULT_MODE = 'plain' + lazy init useState — 避免每次重渲染重读 localStorage
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type MaskMode = 'plain' | 'masked';

const STORAGE_KEY = 'workbuddy_mask_mode';
const DEFAULT_MODE: MaskMode = 'plain';

// 默认值不再是 null —— 完整对象避免 fallback 报错
const defaultValue = {
  mode: DEFAULT_MODE as MaskMode,
  masked: false,
  toggle: () => {},
  setMode: (_: MaskMode) => {},
};

interface MaskContextValue {
  mode: MaskMode;
  masked: boolean;
  toggle: () => void;
  setMode: (m: MaskMode) => void;
}

const MaskContext = createContext<MaskContextValue>(defaultValue);

export function MaskProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<MaskMode>(DEFAULT_MODE);

  // 启动时从 localStorage 读取（包 try-catch 防 SSR 沙箱报错）
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const saved = window.localStorage?.getItem(STORAGE_KEY);
      if (saved === 'plain' || saved === 'masked') {
        setModeState(saved);
      }
    } catch {
      // 静默忽略
    }
  }, []);

  const setMode = (m: MaskMode) => {
    setModeState(m);
    try {
      window.localStorage?.setItem(STORAGE_KEY, m);
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
  return useContext(MaskContext);
}