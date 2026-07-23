import {
  Activity, AlertCircle, AlertTriangle, ArrowDownCircle, ArrowLeft, ArrowLeftRight, ArrowRightLeft, ArrowUpCircle,
  BadgeCheck, Ban, Banknote, BarChart3, Bell, Bot, Briefcase, Building2,
  Calendar, CalendarCheck, Camera, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardList, ClipboardPen, Clock, Construction, CreditCard,
  Database, DollarSign, Download, Droplets,
  Edit3, Eye, EyeOff,
  File, FileCheck, FileJson, FileSpreadsheet, FileText, Filter, FolderKanban, FolderOpen,
  Globe,
  HardHat, HeartPulse, HelpCircle, Home,
  Image, Inbox, Info,
  Key,
  Landmark, LayoutDashboard, Library, Lightbulb, Loader, Loader2, Lock, LogOut,
  Mail, MapPin, Menu, Mic, Monitor, Moon, MoreVertical,
  Package, PaintBucket, Paperclip, Pause, Phone, PieChart, Play, Plug, Plus, Power, Printer,
  Receipt, Redo, RefreshCw, RotateCcw, Ruler,
  Save, Scan, ScrollText, Search, Settings, Shield, ShieldCheck, Snowflake, Sparkles, Square, Stamp, Sun,
  Trash2, TrendingDown, TrendingUp, Truck,
  Undo, Upload, User, UserCheck, UserCircle, UserCog, Users,
  Wallet, WifiOff, Wrench,
  X, XCircle, Zap,
  type LucideIcon,
} from 'lucide-react'

export const iconMap: Record<string, LucideIcon> = {
  Activity, AlertCircle, AlertTriangle, ArrowDownCircle, ArrowLeft, ArrowLeftRight, ArrowRightLeft, ArrowUpCircle,
  BadgeCheck, Ban, Banknote, BarChart3, Bell, Bot, Briefcase, Building2,
  Calendar, CalendarCheck, Camera, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardFile: ClipboardPen, ClipboardList, ClipboardPen, Clock, Construction, CreditCard,
  Database, DollarSign, Download, Droplets,
  Edit: Edit3, Edit3, Eye, EyeOff,
  File, FileCheck, FileJson, FileSpreadsheet, FileText, Filter, FolderKanban, FolderOpen,
  Globe,
  HardHat, HeartPulse, HelpCircle, Home,
  Image, Inbox, Info,
  Key,
  Landmark, LayoutDashboard, Library, Lightbulb, Loader, Loader2, Lock, LogOut,
  Mail, MapPin, Menu, Mic, Monitor, Moon, MoreVertical,
  Package, PaintBucket, Palette: PaintBucket, Paperclip, Pause, Phone, PieChart, Play, Plug, Plus, Power, Printer,
  Receipt, Redo, RefreshCw, RotateCcw, Ruler,
  Save, Scan, ScrollText, Search, Settings, Shield, ShieldCheck, Snowflake, Sparkles, Square, Stamp, Sun,
  Trash2, TrendingDown, TrendingUp, Truck,
  Undo, Upload, User, UserCheck, UserCircle, UserCog, Users,
  Wallet, WifiOff, Wrench,
  X, XCircle, Zap,
}

export function getIcon(name: string): LucideIcon | undefined {
  return iconMap[name]
}
