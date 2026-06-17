/**
 * PII 脱敏全局开关 Context
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
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
    return { mode: 'plain', masked: false, toggle: () => {}, setMode: () => {} };
  }
  return ctx;
}