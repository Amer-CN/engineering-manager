export interface DocumentItem {
  id: string;
  title: string;
  code: string;
  priority: '高' | '中' | '低';
  status: '已完成' | '进行中' | '未开始' | '待评审';
  date: string;
  assignee: string;
}

export interface FolderItem {
  id: string;
  title: string;
  englishTitle?: string;
  period: string; // e.g. "2025 · Q2" or "Jan 01 - Mar 31"
  progress: number; // 0 to 100
  memberCount: number;
  highlightColor?: 'emerald' | 'cyan' | 'purple' | 'amber' | 'blue';
  category: string;
  documents: DocumentItem[];
  description?: string;
  icon?: string;
}

export type ViewMode = 'ambient' | 'dashboard';
export type ThemeMode = 'dark' | 'light';
